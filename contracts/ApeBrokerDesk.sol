// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/IApeBrokerDesk.sol";

/**
 * @title ApeBrokerDesk
 * @notice Production-ready NFT-based Desk Weight and 5-Hour ETH Reward Protocol.
 * @dev Deployed on Robinhood EVM.
 *
 * Core Architecture:
 * - 1 NFT = 1 Desk (tokenId == deskId).
 * - Activation requires exactly 349,693 $APEBROKE.
 * - Max 5 boosts per Desk; costs double each boost (1x, 2x, 4x, 8x, 16x).
 * - Weights scale deterministically (Base x 1, 2, 3, 4, 5, 6).
 * - Rewards are proportional to Desk Weight, distributed over 5-hour epochs.
 * - Rewards funded exclusively via manual admin ETH deposits.
 * - Activation and boost fees are protocol-collected $APEBROKE, strictly isolated from ETH rewards.
 * - Scalable O(1) cumulative reward index; no loops over NFT holders.
 * - Safe transfer accounting: historical rewards remain with the earner; new owner accrues from transfer point.
 */
contract ApeBrokerDesk is IApeBrokerDesk, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Tokens & Addresses
    IERC20 public immutable apeBrokeToken;
    IERC721 public immutable apeBrokerNft;
    address public treasury;

    // Protocol Constants
    uint8 public constant MAX_BOOSTS = 5;
    uint256 public constant MAX_DESKS_PER_WALLET = 5;
    uint256 public constant EPOCH_DURATION = 5 hours; // 18,000 seconds
    uint256 public constant REWARD_PRECISION = 1e18;
    uint256 public constant DEFAULT_EPOCH_EMISSION_BPS = 500; // 5.00%
    uint256 public constant DEFAULT_BENCHMARK_WEIGHT = 2000; // 20 base desks
    uint256 public constant MAX_EPOCH_EMISSION_BPS = 2000; // 20% hard max safety cap

    // Protocol Configuration
    uint256 public activationFee;
    uint256 public baseBoostCost;
    uint256 public baseDeskWeight;
    uint256 public immutable startTimestamp;

    // Dynamic 3-Factor Distribution Engine
    uint256 public epochEmissionBps = DEFAULT_EPOCH_EMISSION_BPS;
    uint256 public benchmarkWeightFloor = DEFAULT_BENCHMARK_WEIGHT;
    uint256 public lastDistributedEpoch;
    uint256 public totalEthDistributedAcrossEpochs;

    // Desk Accounting Structure
    struct Desk {
        bool active;
        uint8 boostCount;
        uint256 currentWeight;
        uint256 rewardDebt;
    }

    // Mappings
    mapping(uint256 => Desk) public desks;
    mapping(uint256 => address) public deskOwner; // Last checkpointed owner of tokenId
    mapping(address => uint256) public userClaimableRewards; // ETH claimable by user address
    mapping(address => uint256) public activeDeskCount; // Active desks count per wallet

    // Global Reward Accounting
    uint256 public totalEligibleWeight;
    uint256 public globalRewardPerWeight;
    uint256 public undistributedRewardRemainder;

    // Protocol Fee & Reward Counters
    uint256 public totalActivationFeesCollected;
    uint256 public totalBoostFeesCollected;
    uint256 public totalProtocolFeesClaimed;
    uint256 public totalEthRewardsDeposited;
    uint256 public totalEthRewardsClaimed;

    /**
     * @notice Constructor initializing contracts, addresses, and initial parameters.
     * @param _apeBrokeToken Address of the $APEBROKE ERC-20 token.
     * @param _apeBrokerNft Address of the Ape Broker ERC-721 NFT collection.
     * @param _admin Address of the initial admin/owner.
     * @param _treasury Address of the protocol treasury recipient.
     * @param _baseBoostCost Base cost for boost #1 (in raw token units).
     * @param _baseDeskWeight Base weight assigned to an activated Desk (e.g. 100).
     */
    constructor(
        address _apeBrokeToken,
        address _apeBrokerNft,
        address _admin,
        address _treasury,
        uint256 _baseBoostCost,
        uint256 _baseDeskWeight
    ) Ownable(_admin) {
        if (_apeBrokeToken == address(0) || _apeBrokerNft == address(0) || _admin == address(0) || _treasury == address(0)) {
            revert ZeroAddress();
        }

        apeBrokeToken = IERC20(_apeBrokeToken);
        apeBrokerNft = IERC721(_apeBrokerNft);
        treasury = _treasury;

        // Determine token decimals for exact 349,693 APEBROKE activation fee
        uint8 decimals = 18;
        if (_apeBrokeToken.code.length > 0) {
            try IERC20Metadata(_apeBrokeToken).decimals() returns (uint8 dec) {
                decimals = dec;
            } catch {}
        }

        activationFee = 349_693 * (10 ** decimals);
        baseBoostCost = _baseBoostCost > 0 ? _baseBoostCost : activationFee;
        baseDeskWeight = _baseDeskWeight > 0 ? _baseDeskWeight : 100;
        startTimestamp = block.timestamp;
    }

    // ==========================================
    // USER ACTIONS
    // ==========================================

    /**
     * @notice Activates a Desk using the corresponding Ape Broker NFT.
     * @param tokenId The NFT token ID representing the Desk.
     */
    function activateDesk(uint256 tokenId) external nonReentrant {
        if (apeBrokerNft.ownerOf(tokenId) != msg.sender) {
            revert NotTokenOwner();
        }

        if (activeDeskCount[msg.sender] >= MAX_DESKS_PER_WALLET) {
            revert MaxDesksPerWalletReached();
        }

        Desk storage desk = desks[tokenId];
        if (desk.active) {
            revert DeskAlreadyActive();
        }

        // Settle any pending elapsed epochs before modifying active weight
        _distributePendingEpochs();

        // Pull exact activation fee in $APEBROKE
        apeBrokeToken.safeTransferFrom(msg.sender, address(this), activationFee);
        totalActivationFeesCollected += activationFee;

        // Initialize Desk state
        desk.active = true;
        desk.boostCount = 0;
        desk.currentWeight = baseDeskWeight;
        desk.rewardDebt = (baseDeskWeight * globalRewardPerWeight) / REWARD_PRECISION;

        deskOwner[tokenId] = msg.sender;
        activeDeskCount[msg.sender] += 1;
        totalEligibleWeight += baseDeskWeight;

        emit DeskActivated(tokenId, msg.sender, activationFee, baseDeskWeight);
    }

    /**
     * @notice Boosts an activated Desk. Increases Desk Weight and boost count.
     * @dev Max 5 boosts. Doubling cost progression: baseBoostCost * 2^(boostNumber - 1).
     * @param tokenId The NFT token ID representing the Desk.
     */
    function boostDesk(uint256 tokenId) external nonReentrant {
        if (apeBrokerNft.ownerOf(tokenId) != msg.sender) {
            revert NotTokenOwner();
        }

        Desk storage desk = desks[tokenId];
        if (!desk.active) {
            revert DeskNotActive();
        }

        uint8 currentBoosts = desk.boostCount;
        if (currentBoosts >= MAX_BOOSTS) {
            revert MaxBoostsReached();
        }

        uint8 nextBoost = currentBoosts + 1;
        uint256 cost = getBoostCost(nextBoost);

        // Pull required $APEBROKE boost fee
        apeBrokeToken.safeTransferFrom(msg.sender, address(this), cost);
        totalBoostFeesCollected += cost;

        // Settle pending rewards accrued up to this moment BEFORE changing weight
        _checkpointDesk(tokenId);

        // Calculate and apply new weight
        uint256 oldWeight = desk.currentWeight;
        uint256 newWeight = baseDeskWeight * (nextBoost + 1);

        totalEligibleWeight = (totalEligibleWeight - oldWeight) + newWeight;
        desk.currentWeight = newWeight;
        desk.boostCount = nextBoost;

        // Checkpoint debt with new weight so future rewards accumulate from current index
        desk.rewardDebt = (newWeight * globalRewardPerWeight) / REWARD_PRECISION;

        emit DeskBoosted(tokenId, msg.sender, nextBoost, cost, newWeight);
    }

    /**
     * @notice Checkpoints a Desk to settle pending rewards.
     * @dev Handles NFT transfer checkpoints safely. Can be called by anyone.
     * @param tokenId The NFT token ID representing the Desk.
     */
    function checkpointDesk(uint256 tokenId) external nonReentrant {
        _checkpointDesk(tokenId);
    }

    /**
     * @notice Claims all accumulated ETH rewards for a specific Desk.
     * @param tokenId The NFT token ID representing the Desk.
     */
    function claimRewards(uint256 tokenId) external nonReentrant {
        if (apeBrokerNft.ownerOf(tokenId) != msg.sender) {
            revert NotTokenOwner();
        }

        _checkpointDesk(tokenId);

        uint256 claimable = userClaimableRewards[msg.sender];
        if (claimable == 0) {
            revert NoRewardsToClaim();
        }

        uint256 contractBalance = address(this).balance;
        if (claimable > contractBalance) {
            claimable = contractBalance;
        }

        userClaimableRewards[msg.sender] = 0;
        totalEthRewardsClaimed += claimable;

        (bool success, ) = msg.sender.call{value: claimable}("");
        if (!success) {
            revert TransferFailed();
        }

        emit RewardsClaimed(tokenId, msg.sender, claimable);
    }

    /**
     * @notice Claims rewards for multiple Desks owned by caller in a single transaction.
     * @param tokenIds Array of NFT token IDs.
     */
    function claimAllRewards(uint256[] calldata tokenIds) external nonReentrant {
        uint256 length = tokenIds.length;
        if (length == 0) {
            revert ZeroAmount();
        }

        for (uint256 i = 0; i < length; ) {
            uint256 tokenId = tokenIds[i];
            if (apeBrokerNft.ownerOf(tokenId) != msg.sender) {
                revert NotTokenOwner();
            }
            _checkpointDesk(tokenId);
            unchecked {
                ++i;
            }
        }

        uint256 claimable = userClaimableRewards[msg.sender];
        if (claimable == 0) {
            revert NoRewardsToClaim();
        }

        uint256 contractBalance = address(this).balance;
        if (claimable > contractBalance) {
            claimable = contractBalance;
        }

        userClaimableRewards[msg.sender] = 0;
        totalEthRewardsClaimed += claimable;

        (bool success, ) = msg.sender.call{value: claimable}("");
        if (!success) {
            revert TransferFailed();
        }

        emit HistoricalRewardsClaimed(msg.sender, claimable);
    }

    /**
     * @notice Allows any user to claim their historical accrued ETH rewards even after transferring NFTs.
     */
    function claimHistoricalRewards() public nonReentrant {
        uint256 claimable = userClaimableRewards[msg.sender];
        if (claimable == 0) {
            revert NoRewardsToClaim();
        }

        uint256 contractBalance = address(this).balance;
        if (claimable > contractBalance) {
            claimable = contractBalance;
        }

        userClaimableRewards[msg.sender] = 0;
        totalEthRewardsClaimed += claimable;

        (bool success, ) = msg.sender.call{value: claimable}("");
        if (!success) {
            revert TransferFailed();
        }

        emit HistoricalRewardsClaimed(msg.sender, claimable);
    }

    /**
     * @notice Checkpoints specified Desks and claims all accrued historical rewards for msg.sender in a single transaction.
     * @param tokenIds Array of NFT token IDs to checkpoint before claiming.
     */
    function claimHistoricalRewardsForDesks(uint256[] calldata tokenIds) external nonReentrant {
        uint256 length = tokenIds.length;
        for (uint256 i = 0; i < length; ) {
            _checkpointDesk(tokenIds[i]);
            unchecked {
                ++i;
            }
        }

        uint256 claimable = userClaimableRewards[msg.sender];
        if (claimable == 0) {
            revert NoRewardsToClaim();
        }

        uint256 contractBalance = address(this).balance;
        if (claimable > contractBalance) {
            claimable = contractBalance;
        }

        userClaimableRewards[msg.sender] = 0;
        totalEthRewardsClaimed += claimable;

        (bool success, ) = msg.sender.call{value: claimable}("");
        if (!success) {
            revert TransferFailed();
        }

        emit HistoricalRewardsClaimed(msg.sender, claimable);
    }

    // ==========================================
    // ADMIN ACTIONS
    // ==========================================

    /**
     * @notice Admin deposits native ETH rewards into the available reward pool.
     * @dev Funds are credited to the pool and distributed dynamically over 5-hour epochs.
     */
    function depositRewards() external payable onlyOwner nonReentrant {
        if (msg.value == 0) {
            revert ZeroAmount();
        }

        totalEthRewardsDeposited += msg.value;

        // Distribute any pending elapsed epochs
        _distributePendingEpochs();

        // If this is the initial distribution and active desks exist, distribute current epoch immediately
        if (totalEthDistributedAcrossEpochs == 0 && totalEligibleWeight > 0) {
            _distributeSingleEpoch(currentEpoch());
            lastDistributedEpoch = currentEpoch();
        }

        emit RewardsDeposited(msg.sender, msg.value, currentEpoch());
    }

    /**
     * @notice Admin distributes immediate rewards to current active desks for marketing, launch campaigns, or epoch bonus.
     * @dev Bypasses benchmark floor and epoch emission limits. Distributes specified amount (or all available pool if amount == 0 or >= pool)
     *      directly across active desks proportionally to their weights.
     * @param amount Amount of native ETH from pool to distribute immediately. If 0 or greater than available pool, distributes the entire available pool.
     */
    function distributeImmediateRewards(uint256 amount) external payable onlyOwner nonReentrant {
        if (msg.value > 0) {
            totalEthRewardsDeposited += msg.value;
        }

        if (totalEligibleWeight == 0) {
            revert ZeroAmount();
        }

        // Settle any pending elapsed epochs first to ensure clean accounting
        _distributePendingEpochs();

        uint256 availablePool = getAvailableRewardPool();
        if (amount == 0 || amount > availablePool) {
            amount = availablePool;
        }

        if (amount == 0) {
            revert ZeroAmount();
        }

        // Calculate added reward per weight directly based on active desk weight
        uint256 addedRewardPerWeight = (amount * REWARD_PRECISION) / totalEligibleWeight;
        if (addedRewardPerWeight == 0) {
            revert ZeroAmount();
        }

        globalRewardPerWeight += addedRewardPerWeight;

        uint256 actualDistributed = (addedRewardPerWeight * totalEligibleWeight) / REWARD_PRECISION;
        totalEthDistributedAcrossEpochs += actualDistributed;

        if (currentEpoch() > lastDistributedEpoch) {
            lastDistributedEpoch = currentEpoch();
        }

        emit ImmediateRewardsDistributed(currentEpoch(), actualDistributed, totalEligibleWeight, msg.sender);
    }

    /**
     * @notice Checks for any elapsed 5-hour epochs and settles their dynamic reward distribution.
     * @dev Publicly callable by anyone or triggered during desk interactions.
     */
    function distributeEpochRewards() public nonReentrant {
        _distributePendingEpochs();
    }

    /**
     * @notice Updates the epoch emission rate in basis points (e.g. 500 = 5.00%).
     * @param bps New emission basis points (max 2000 = 20%).
     */
    function setEpochEmissionBps(uint256 bps) external onlyOwner {
        if (bps > MAX_EPOCH_EMISSION_BPS) {
            revert ExceedsMaxEmissionBps();
        }
        uint256 oldBps = epochEmissionBps;
        epochEmissionBps = bps;
        emit EpochEmissionUpdated(oldBps, bps);
    }

    /**
     * @notice Updates the benchmark weight floor (e.g. 2000 for 20 base desks).
     * @param floorWeight New floor weight.
     */
    function setBenchmarkWeightFloor(uint256 floorWeight) external onlyOwner {
        if (floorWeight == 0) {
            revert ZeroAmount();
        }
        uint256 oldFloor = benchmarkWeightFloor;
        benchmarkWeightFloor = floorWeight;
        emit BenchmarkWeightUpdated(oldFloor, floorWeight);
    }

    /**
     * @notice Admin claims collected $APEBROKE protocol fees to the treasury.
     * @param amount Amount of $APEBROKE to transfer.
     */
    function claimProtocolFees(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) {
            revert ZeroAmount();
        }

        uint256 availableFees = getProtocolFeeBalance();
        if (amount > availableFees) {
            revert ExceedsCollectedFees();
        }

        totalProtocolFeesClaimed += amount;
        apeBrokeToken.safeTransfer(treasury, amount);

        emit ProtocolFeesClaimed(treasury, amount);
    }

    /**
     * @notice Updates the protocol treasury recipient address.
     * @param _treasury New treasury address.
     */
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) {
            revert ZeroAddress();
        }
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    /**
     * @notice Updates the base boost cost for future boosts.
     * @param _newCost New base boost cost in raw token units.
     */
    function setBaseBoostCost(uint256 _newCost) external onlyOwner {
        if (_newCost == 0) {
            revert ZeroAmount();
        }
        uint256 oldCost = baseBoostCost;
        baseBoostCost = _newCost;
        emit BaseBoostCostUpdated(oldCost, _newCost);
    }

    /**
     * @notice Updates the desk activation fee in token units.
     * @dev Allows admin to lower or increase the fee to adjust for token price fluctuations.
     * @param _newFee New activation fee in raw token units.
     */
    function setActivationFee(uint256 _newFee) external onlyOwner {
        if (_newFee == 0) {
            revert ZeroAmount();
        }
        uint256 oldFee = activationFee;
        activationFee = _newFee;
        emit ActivationFeeUpdated(oldFee, _newFee);
    }

    /**
     * @notice Updates the base desk weight for future activations.
     * @param _newWeight New base desk weight.
     */
    function setBaseDeskWeight(uint256 _newWeight) external onlyOwner {
        if (_newWeight == 0) {
            revert ZeroAmount();
        }
        uint256 oldWeight = baseDeskWeight;
        baseDeskWeight = _newWeight;
        emit BaseDeskWeightUpdated(oldWeight, _newWeight);
    }

    // ==========================================
    // INTERNAL REWARD ACCOUNTING
    // ==========================================

    /**
     * @notice Returns the amount of native ETH currently available in the reward pool for future epoch distributions.
     * @dev Excludes ETH reserved for already-distributed but unclaimed user rewards.
     */
    function getAvailableRewardPool() public view returns (uint256) {
        uint256 contractBalance = address(this).balance;
        uint256 reservedRewards = totalEthDistributedAcrossEpochs > totalEthRewardsClaimed
            ? totalEthDistributedAcrossEpochs - totalEthRewardsClaimed
            : 0;
        return contractBalance > reservedRewards ? contractBalance - reservedRewards : 0;
    }

    /**
     * @dev Internal helper to settle distribution for a single epoch.
     */
    function _distributeSingleEpoch(uint256 epochNum) internal {
        uint256 availablePool = getAvailableRewardPool();
        if (availablePool == 0 || totalEligibleWeight == 0) {
            return;
        }

        // Percentage of available pool (e.g. 5% = 500 bps)
        uint256 epochDistributable = (availablePool * epochEmissionBps) / 10000;
        if (epochDistributable == 0) {
            return;
        }

        // Effective divisor is max(totalEligibleWeight, benchmarkWeightFloor)
        uint256 effectiveDivisor = totalEligibleWeight < benchmarkWeightFloor
            ? benchmarkWeightFloor
            : totalEligibleWeight;

        // Calculate added reward per weight unit
        uint256 addedRewardPerWeight = (epochDistributable * REWARD_PRECISION) / effectiveDivisor;
        if (addedRewardPerWeight == 0) {
            return;
        }

        globalRewardPerWeight += addedRewardPerWeight;

        uint256 actualEpochDistributed = (addedRewardPerWeight * totalEligibleWeight) / REWARD_PRECISION;
        totalEthDistributedAcrossEpochs += actualEpochDistributed;

        emit EpochRewardsDistributed(epochNum, actualEpochDistributed, availablePool, totalEligibleWeight);
    }

    /**
     * @dev Internal helper to check and distribute any pending elapsed epochs.
     */
    function _distributePendingEpochs() internal {
        uint256 current = currentEpoch();
        if (current <= lastDistributedEpoch) {
            return;
        }

        uint256 epochsToDistribute = current - lastDistributedEpoch;
        if (epochsToDistribute > 20) {
            epochsToDistribute = 20;
        }

        for (uint256 i = 0; i < epochsToDistribute; ) {
            _distributeSingleEpoch(lastDistributedEpoch + 1 + i);
            unchecked {
                ++i;
            }
        }
        lastDistributedEpoch = current;
    }

    /**
     * @dev Internal helper to checkpoint rewards for a Desk.
     * Accrues pending rewards to the historical earner if the NFT has been transferred.
     */
    function _checkpointDesk(uint256 tokenId) internal {
        _distributePendingEpochs();

        Desk storage desk = desks[tokenId];
        if (!desk.active) return;

        address currentNftOwner = apeBrokerNft.ownerOf(tokenId);
        address recordedOwner = deskOwner[tokenId];

        uint256 accumulated = (desk.currentWeight * globalRewardPerWeight) / REWARD_PRECISION;
        uint256 pending = accumulated > desk.rewardDebt ? accumulated - desk.rewardDebt : 0;

        if (pending > 0) {
            // Credit pending rewards to the recorded owner who earned them
            userClaimableRewards[recordedOwner] += pending;
        }

        // Update ownership and active desk counts if transferred
        if (currentNftOwner != recordedOwner) {
            if (activeDeskCount[recordedOwner] > 0) {
                activeDeskCount[recordedOwner] -= 1;
            }
            activeDeskCount[currentNftOwner] += 1;
            deskOwner[tokenId] = currentNftOwner;
        }

        // Update reward debt to current checkpoint
        desk.rewardDebt = accumulated;
    }

    /**
     * @notice Returns the number of currently active Desks owned by a user.
     * @param user The wallet address.
     */
    function getActiveDeskCount(address user) external view returns (uint256) {
        return activeDeskCount[user];
    }

    // ==========================================
    // VIEW FUNCTIONS
    // ==========================================

    /**
     * @notice Returns whether a Desk is currently active.
     */
    function isDeskActive(uint256 tokenId) external view returns (bool) {
        return desks[tokenId].active;
    }

    /**
     * @notice Returns current weight of a Desk.
     */
    function getDeskWeight(uint256 tokenId) external view returns (uint256) {
        return desks[tokenId].currentWeight;
    }

    /**
     * @notice Returns boost count for a Desk (0 to 5).
     */
    function getBoostCount(uint256 tokenId) external view returns (uint8) {
        return desks[tokenId].boostCount;
    }

    /**
     * @notice Calculates the cost for a given boost number (1..5).
     * @dev Linear progression: 2x, 4x, 6x, 8x, 10x max multiplier.
     * @param boostNumber The boost number (1 to 5).
     */
    function getBoostCost(uint8 boostNumber) public view returns (uint256) {
        if (boostNumber == 0 || boostNumber > MAX_BOOSTS) {
            revert MaxBoostsReached();
        }
        return baseBoostCost * (2 * uint256(boostNumber));
    }

    /**
     * @notice Returns the cost for the next boost on a specific Desk.
     */
    function getNextBoostCost(uint256 tokenId) external view returns (uint256) {
        Desk storage desk = desks[tokenId];
        if (!desk.active) {
            revert DeskNotActive();
        }
        if (desk.boostCount >= MAX_BOOSTS) {
            revert MaxBoostsReached();
        }
        return getBoostCost(desk.boostCount + 1);
    }

    /**
     * @dev Internal view helper to calculate globalRewardPerWeight including any elapsed uncheckpointed epochs.
     */
    function _getSimulatedGlobalRewardPerWeight() internal view returns (uint256) {
        uint256 simulated = globalRewardPerWeight;
        uint256 current = currentEpoch();
        if (current > lastDistributedEpoch && totalEligibleWeight > 0) {
            uint256 availablePool = getAvailableRewardPool();
            uint256 epochsToSimulate = current - lastDistributedEpoch;
            if (epochsToSimulate > 20) epochsToSimulate = 20;

            uint256 effectiveDivisor = totalEligibleWeight < benchmarkWeightFloor
                ? benchmarkWeightFloor
                : totalEligibleWeight;

            for (uint256 i = 0; i < epochsToSimulate; i++) {
                uint256 epochDistributable = (availablePool * epochEmissionBps) / 10000;
                if (epochDistributable == 0) break;
                uint256 added = (epochDistributable * REWARD_PRECISION) / effectiveDivisor;
                simulated += added;
                uint256 actualPaid = (added * totalEligibleWeight) / REWARD_PRECISION;
                if (availablePool > actualPaid) {
                    availablePool -= actualPaid;
                } else {
                    break;
                }
            }
        }
        return simulated;
    }

    /**
     * @notice Calculates pending unclaimed rewards for a Desk.
     * @param tokenId The NFT token ID.
     */
    function getPendingRewards(uint256 tokenId) external view returns (uint256) {
        Desk storage desk = desks[tokenId];
        if (!desk.active) return 0;

        address currentNftOwner = apeBrokerNft.ownerOf(tokenId);
        address recordedOwner = deskOwner[tokenId];

        uint256 simulatedIndex = _getSimulatedGlobalRewardPerWeight();
        uint256 accumulated = (desk.currentWeight * simulatedIndex) / REWARD_PRECISION;
        uint256 pending = accumulated > desk.rewardDebt ? accumulated - desk.rewardDebt : 0;

        if (currentNftOwner == recordedOwner) {
            return pending + userClaimableRewards[currentNftOwner];
        } else {
            // If transferred, pending belongs to recordedOwner, and currentNftOwner has only their existing balance
            return userClaimableRewards[currentNftOwner];
        }
    }

    /**
     * @notice Returns estimated reward for a Desk in the upcoming epoch based on current pool balance and active volume.
     */
    function getEstimatedEpochReward(uint256 tokenId) external view returns (uint256) {
        Desk storage desk = desks[tokenId];
        if (!desk.active || totalEligibleWeight == 0) return 0;

        uint256 availablePool = getAvailableRewardPool();
        if (availablePool == 0) return 0;

        uint256 epochDistributable = (availablePool * epochEmissionBps) / 10000;
        uint256 effectiveDivisor = totalEligibleWeight < benchmarkWeightFloor
            ? benchmarkWeightFloor
            : totalEligibleWeight;

        return (epochDistributable * desk.currentWeight) / effectiveDivisor;
    }

    /**
     * @notice Returns distribution parameters.
     */
    function getDistributionParameters() external view returns (
        uint256 emissionBps,
        uint256 benchmarkWeight,
        uint256 lastEpoch
    ) {
        return (epochEmissionBps, benchmarkWeightFloor, lastDistributedEpoch);
    }

    /**
     * @notice Returns the total active Desk Weight across all activated Desks.
     */
    function getTotalEligibleWeight() external view returns (uint256) {
        return totalEligibleWeight;
    }

    /**
     * @notice Returns total ETH currently in the reward pool.
     */
    function getRewardPoolBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Returns remaining $APEBROKE protocol fees available for admin withdrawal.
     */
    function getProtocolFeeBalance() public view returns (uint256) {
        uint256 collected = totalActivationFeesCollected + totalBoostFeesCollected;
        return collected > totalProtocolFeesClaimed ? collected - totalProtocolFeesClaimed : 0;
    }

    /**
     * @notice Returns the current 5-hour epoch number.
     */
    function currentEpoch() public view returns (uint256) {
        return (block.timestamp - startTimestamp) / EPOCH_DURATION;
    }

    /**
     * @notice Returns seconds remaining until the next 5-hour epoch.
     */
    function timeUntilNextEpoch() external view returns (uint256) {
        uint256 elapsed = (block.timestamp - startTimestamp) % EPOCH_DURATION;
        return EPOCH_DURATION - elapsed;
    }

    /**
     * @notice Returns complete Desk view information.
     */
    function getDesk(uint256 tokenId) external view returns (
        bool active,
        uint8 boostCount,
        uint256 currentWeight,
        address owner,
        uint256 pendingRewards
    ) {
        Desk storage desk = desks[tokenId];
        active = desk.active;
        boostCount = desk.boostCount;
        currentWeight = desk.currentWeight;

        if (active) {
            owner = apeBrokerNft.ownerOf(tokenId);
            uint256 simulatedIndex = _getSimulatedGlobalRewardPerWeight();
            uint256 accumulated = (desk.currentWeight * simulatedIndex) / REWARD_PRECISION;
            uint256 pending = accumulated > desk.rewardDebt ? accumulated - desk.rewardDebt : 0;

            if (owner == deskOwner[tokenId]) {
                pendingRewards = pending + userClaimableRewards[owner];
            } else {
                pendingRewards = userClaimableRewards[owner];
            }
        }
    }

    // ==========================================
    // REJECT ACCIDENTAL ETH
    // ==========================================

    receive() external payable {
        revert DirectEthNotAllowed();
    }

    fallback() external payable {
        revert DirectEthNotAllowed();
    }
}
