// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/IApeBrokerStaking.sol";

/**
 * @title ApeBrokerStaking
 * @notice 24-Hour $APEBROKE Staking Protocol with Dynamic Proportional ETH Rewards.
 * @dev Fully independent from the Ape Broker Desk activation and boost contract.
 *
 * Core Architecture & Guarantees:
 * - 24-Hour Lock: Staked $APEBROKE principal is locked for exactly 24 hours per position.
 * - NFT Holder Gating: Stakers must hold at least 2 Ape Broker NFTs to stake.
 * - Dynamic Proportional ETH Yield: Funded by an admin ETH reward pool.
 * - Solvency: Principal $APEBROKE is never used as reward liquidity; rewards are strictly drawn from held ETH.
 * - Scalability: O(1) continuous cumulative reward index; zero loops over stakers.
 * - Multiple Positions: Each position tracks its own stakeId, amount, timestamps, and rewards.
 */
contract ApeBrokerStaking is IApeBrokerStaking, Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Immutables
    IERC20 public immutable apeBrokeToken;
    IERC721 public immutable apeBrokerNft;

    // Constants
    uint256 public constant LOCK_DURATION = 24 hours;
    uint256 public constant REWARD_PERIOD = 24 hours;
    uint256 public constant MIN_NFT_HOLDING = 2;
    uint256 public constant REWARD_PRECISION = 1e18;
    uint256 public constant DEFAULT_REWARD_RATE_BPS = 1000; // 10.00%
    uint256 public constant MIN_REWARD_RATE_BPS = 100;      // 1.00%
    uint256 public constant MAX_REWARD_RATE_BPS = 5000;     // 50.00% safety cap

    // Staking State
    uint256 public totalStaked;
    uint256 public rewardPoolBalance;
    uint256 public currentPeriodReward;
    uint256 public totalEthRewardsDistributed;
    uint256 public totalEthRewardsClaimed;
    uint256 public rewardRateBps = DEFAULT_REWARD_RATE_BPS;

    // Cumulative Reward Index State (O(1) continuous distribution)
    uint256 public accRewardPerShare;
    uint256 public lastUpdateTime;
    uint256 public currentPeriodId;
    uint256 public periodStartTime;
    uint256 public periodEndTime;

    // Position Tracking
    uint256 public nextStakeId;
    uint256 public activePositionsCount;
    mapping(uint256 => StakePosition) public stakes;
    mapping(address => uint256[]) private _userStakeIds;

    /**
     * @notice Constructor initializes contract with token and NFT addresses.
     * @param _apeBrokeToken Address of $APEBROKE ERC20 token.
     * @param _apeBrokerNft Address of Ape Broker NFT ERC721 contract.
     * @param _admin Initial contract owner and admin.
     */
    constructor(
        address _apeBrokeToken,
        address _apeBrokerNft,
        address _admin
    ) Ownable(_admin) {
        if (_apeBrokeToken == address(0) || _apeBrokerNft == address(0) || _admin == address(0)) {
            revert ZeroAddress();
        }

        apeBrokeToken = IERC20(_apeBrokeToken);
        apeBrokerNft = IERC721(_apeBrokerNft);

        periodStartTime = block.timestamp;
        periodEndTime = block.timestamp + REWARD_PERIOD;
        lastUpdateTime = block.timestamp;
    }

    // =============================================================
    // USER ACTIONS
    // =============================================================

    /**
     * @notice Stake $APEBROKE for 24 hours to earn proportional ETH rewards.
     * @dev Caller must hold at least 2 Ape Broker NFTs.
     * @param amount Amount of $APEBROKE tokens to stake.
     * @return stakeId The ID of the newly created staking position.
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused returns (uint256 stakeId) {
        if (amount == 0) {
            revert ZeroAmount();
        }

        // Enforce NFT Holder Gating: Must hold at least 2 Ape Broker NFTs
        uint256 nftBalance = apeBrokerNft.balanceOf(msg.sender);
        if (nftBalance < MIN_NFT_HOLDING) {
            revert InsufficientNftBalance(nftBalance, MIN_NFT_HOLDING);
        }

        // Check user balance and allowance before updating index
        if (apeBrokeToken.balanceOf(msg.sender) < amount) {
            revert InsufficientBalance();
        }
        if (apeBrokeToken.allowance(msg.sender, address(this)) < amount) {
            revert InsufficientAllowance();
        }

        // Settle index up to current block timestamp
        _updateRewardIndex();

        // Create new stake position
        stakeId = ++nextStakeId;
        uint256 unlockTime = block.timestamp + LOCK_DURATION;
        uint256 rewardDebt = (amount * accRewardPerShare) / REWARD_PRECISION;

        stakes[stakeId] = StakePosition({
            stakeId: stakeId,
            owner: msg.sender,
            amount: amount,
            startTime: block.timestamp,
            unlockTime: unlockTime,
            rewardDebt: rewardDebt,
            pendingRewards: 0,
            withdrawn: false,
            claimed: false
        });

        _userStakeIds[msg.sender].push(stakeId);
        totalStaked += amount;
        activePositionsCount += 1;

        // If currently in an idle period with rewards available, kick off the period now that we have stakers
        if (currentPeriodReward == 0 && rewardPoolBalance > 0) {
            _rollToNextPeriod();
            stakes[stakeId].rewardDebt = (amount * accRewardPerShare) / REWARD_PRECISION;
        }

        // Pull $APEBROKE principal into contract custody
        apeBrokeToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(stakeId, msg.sender, amount, block.timestamp, unlockTime);
    }

    /**
     * @notice Claims accrued ETH reward for a matured position (after 24-hour lock).
     * @param stakeId The ID of the stake position.
     * @return reward The amount of ETH reward transferred.
     */
    function claimReward(uint256 stakeId) public nonReentrant returns (uint256 reward) {
        StakePosition storage pos = stakes[stakeId];
        if (pos.owner == address(0)) {
            revert StakeNotFound();
        }
        if (pos.owner != msg.sender) {
            revert NotStakeOwner();
        }
        if (block.timestamp < pos.unlockTime) {
            revert StakeStillLocked(stakeId, pos.unlockTime);
        }
        if (pos.claimed) {
            revert RewardAlreadyClaimed(stakeId);
        }

        _updateRewardIndex();

        // Calculate total accrued reward
        uint256 currentAccumulated = 0;
        if (!pos.withdrawn) {
            uint256 accumulated = (pos.amount * accRewardPerShare) / REWARD_PRECISION;
            if (accumulated > pos.rewardDebt) {
                currentAccumulated = accumulated - pos.rewardDebt;
            }
        }
        reward = pos.pendingRewards + currentAccumulated;

        if (reward == 0) {
            revert NoRewardsToClaim();
        }

        // Prevent contract insolvency: cap at actual contract ETH balance
        if (reward > address(this).balance) {
            reward = address(this).balance;
        }

        // Checks-Effects-Interactions
        pos.claimed = true;
        pos.pendingRewards = 0;
        pos.rewardDebt = (pos.amount * accRewardPerShare) / REWARD_PRECISION;
        totalEthRewardsClaimed += reward;

        emit RewardClaimed(stakeId, msg.sender, reward);

        // Safe ETH transfer
        (bool success, ) = msg.sender.call{value: reward}("");
        if (!success) {
            revert TransferFailed();
        }
    }

    /**
     * @notice Withdraws the original $APEBROKE principal after the 24-hour lock has elapsed.
     * @dev Unclaimed rewards remain claimable later via claimReward.
     * @param stakeId The ID of the stake position.
     */
    function withdraw(uint256 stakeId) public nonReentrant {
        StakePosition storage pos = stakes[stakeId];
        if (pos.owner == address(0)) {
            revert StakeNotFound();
        }
        if (pos.owner != msg.sender) {
            revert NotStakeOwner();
        }
        if (block.timestamp < pos.unlockTime) {
            revert StakeStillLocked(stakeId, pos.unlockTime);
        }
        if (pos.withdrawn) {
            revert AlreadyWithdrawn(stakeId);
        }

        _updateRewardIndex();

        // Lock in any pending rewards before changing position state
        if (!pos.claimed) {
            uint256 accumulated = (pos.amount * accRewardPerShare) / REWARD_PRECISION;
            if (accumulated > pos.rewardDebt) {
                pos.pendingRewards += accumulated - pos.rewardDebt;
            }
        }

        // Checks-Effects-Interactions
        pos.withdrawn = true;
        totalStaked -= pos.amount;
        if (activePositionsCount > 0) {
            activePositionsCount -= 1;
        }

        emit Withdrawn(stakeId, msg.sender, pos.amount);

        // Return $APEBROKE principal to user
        apeBrokeToken.safeTransfer(msg.sender, pos.amount);
    }

    /**
     * @notice Withdraws $APEBROKE principal and claims ETH reward in a single transaction.
     * @param stakeId The ID of the stake position.
     * @return reward The amount of ETH reward claimed.
     */
    function withdrawAndClaim(uint256 stakeId) external returns (uint256 reward) {
        // Withdraw principal
        withdraw(stakeId);

        // Claim reward if available and not yet claimed
        StakePosition storage pos = stakes[stakeId];
        if (!pos.claimed && pos.pendingRewards > 0) {
            reward = claimReward(stakeId);
        }
    }

    // =============================================================
    // INTERNAL REWARD ACCRUAL & ROLL ENGINE (O(1))
    // =============================================================

    /**
     * @notice Updates the cumulative reward index and automatically rolls expired 24h periods.
     */
    function _updateRewardIndex() internal {
        // 1. Accrue rewards for elapsed time in the active period
        if (totalStaked > 0 && currentPeriodReward > 0 && periodStartTime > 0) {
            uint256 periodEndOrNow = block.timestamp < periodEndTime ? block.timestamp : periodEndTime;
            if (periodEndOrNow > lastUpdateTime) {
                uint256 elapsed = periodEndOrNow - lastUpdateTime;
                uint256 accrued = (elapsed * currentPeriodReward) / REWARD_PERIOD;
                accRewardPerShare += (accrued * REWARD_PRECISION) / totalStaked;
                lastUpdateTime = periodEndOrNow;
            }
        } else {
            lastUpdateTime = block.timestamp;
        }

        // 2. If the active period has expired OR currently idle with pool and stakers, roll into next period
        if (block.timestamp >= periodEndTime || (currentPeriodReward == 0 && rewardPoolBalance > 0 && totalStaked > 0)) {
            _rollToNextPeriod();
        }
    }

    /**
     * @notice Starts a new 24-hour reward period taking a percentage of the remaining ETH pool.
     */
    function _rollToNextPeriod() internal {
        if (rewardPoolBalance > 0 && totalStaked > 0) {
            uint256 periodReward = (rewardPoolBalance * rewardRateBps) / 10000;
            if (periodReward > rewardPoolBalance) {
                periodReward = rewardPoolBalance;
            }
            rewardPoolBalance -= periodReward;
            totalEthRewardsDistributed += periodReward;
            currentPeriodReward = periodReward;
            currentPeriodId += 1;
            periodStartTime = block.timestamp;
            periodEndTime = block.timestamp + REWARD_PERIOD;
            lastUpdateTime = block.timestamp;

            emit PeriodStarted(
                currentPeriodId,
                periodReward,
                rewardPoolBalance,
                periodStartTime,
                periodEndTime
            );
        } else {
            // Idle period when pool is empty or no stakers exist
            currentPeriodReward = 0;
            periodStartTime = block.timestamp;
            periodEndTime = block.timestamp + REWARD_PERIOD;
            lastUpdateTime = block.timestamp;
        }
    }

    // =============================================================
    // ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Admin deposits ETH into the dedicated staking reward pool.
     * @dev Triggers immediate reward index update and period roll if currently idle.
     */
    function depositRewards() external payable onlyOwner nonReentrant {
        if (msg.value == 0) {
            revert ZeroAmount();
        }

        _updateRewardIndex();

        rewardPoolBalance += msg.value;

        // If currently in an idle period with stakers, kick off the period allocation immediately
        if (currentPeriodReward == 0 && totalStaked > 0) {
            _rollToNextPeriod();
        }

        emit RewardsDeposited(msg.sender, msg.value, rewardPoolBalance);
    }

    /**
     * @notice Updates the reward rate BPS used for subsequent 24-hour periods.
     * @param bps New reward rate in basis points (100 = 1%, 5000 = 50% max).
     */
    function setRewardRateBps(uint256 bps) external onlyOwner {
        if (bps < MIN_REWARD_RATE_BPS) {
            revert BelowMinRewardRateBps(bps, MIN_REWARD_RATE_BPS);
        }
        if (bps > MAX_REWARD_RATE_BPS) {
            revert ExceedsMaxRewardRateBps(bps, MAX_REWARD_RATE_BPS);
        }

        uint256 oldRate = rewardRateBps;
        rewardRateBps = bps;

        emit RewardRateUpdated(oldRate, bps);
    }

    /**
     * @notice Pauses new staking positions (emergency or protocol maintenance).
     * @dev Withdrawals and claims remain operational.
     */
    function pauseStaking() external onlyOwner {
        _pause();
        emit StakingPaused(msg.sender);
    }

    /**
     * @notice Unpauses staking.
     */
    function unpauseStaking() external onlyOwner {
        _unpause();
        emit StakingUnpaused(msg.sender);
    }

    /**
     * @notice Recovers accidental ERC20 tokens sent to the contract.
     * @dev Strictly reverts if attempting to withdraw user $APEBROKE staking principal!
     */
    function recoverNonStakingTokens(address token, uint256 amount) external onlyOwner nonReentrant {
        if (token == address(apeBrokeToken)) {
            revert CannotRecoverStakedToken();
        }
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    // =============================================================
    // VIEW / QUERY FUNCTIONS
    // =============================================================

    /**
     * @notice Returns pending ETH reward for a specific stake position.
     * @param stakeId The ID of the stake position.
     */
    function getPendingReward(uint256 stakeId) external view returns (uint256) {
        StakePosition memory pos = stakes[stakeId];
        if (pos.owner == address(0) || pos.claimed) {
            return 0;
        }

        uint256 currentAccRewardPerShare = accRewardPerShare;
        if (totalStaked > 0 && currentPeriodReward > 0 && periodStartTime > 0) {
            uint256 periodEndOrNow = block.timestamp < periodEndTime ? block.timestamp : periodEndTime;
            if (periodEndOrNow > lastUpdateTime) {
                uint256 elapsed = periodEndOrNow - lastUpdateTime;
                uint256 accrued = (elapsed * currentPeriodReward) / REWARD_PERIOD;
                currentAccRewardPerShare += (accrued * REWARD_PRECISION) / totalStaked;
            }
        }

        uint256 currentAccumulated = 0;
        if (!pos.withdrawn) {
            uint256 accumulated = (pos.amount * currentAccRewardPerShare) / REWARD_PRECISION;
            if (accumulated > pos.rewardDebt) {
                currentAccumulated = accumulated - pos.rewardDebt;
            }
        }

        return pos.pendingRewards + currentAccumulated;
    }

    /**
     * @notice Returns all stake positions owned by a wallet address.
     * @param account Wallet address to query.
     */
    function getUserStakes(address account) external view returns (StakePosition[] memory) {
        uint256[] memory ids = _userStakeIds[account];
        StakePosition[] memory list = new StakePosition[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            list[i] = stakes[ids[i]];
        }
        return list;
    }

    /**
     * @notice Checks if a wallet is eligible to stake (holds >= 2 Ape Broker NFTs).
     * @param account Wallet address to check.
     */
    function isUserEligible(address account) external view returns (bool eligible, uint256 nftBalance) {
        if (account == address(0)) {
            return (false, 0);
        }
        nftBalance = apeBrokerNft.balanceOf(account);
        eligible = nftBalance >= MIN_NFT_HOLDING;
    }

    /**
     * @notice Returns global protocol staking metrics in a single RPC query.
     */
    function getStakingStats() external view returns (StakingStats memory) {
        return StakingStats({
            totalStaked: totalStaked,
            rewardPoolBalance: rewardPoolBalance,
            currentPeriodReward: currentPeriodReward,
            totalEthRewardsDistributed: totalEthRewardsDistributed,
            totalEthRewardsClaimed: totalEthRewardsClaimed,
            rewardRateBps: rewardRateBps,
            currentPeriodId: currentPeriodId,
            periodStartTime: periodStartTime,
            periodEndTime: periodEndTime,
            totalPositionsCount: nextStakeId,
            activePositionsCount: activePositionsCount,
            isPaused: paused()
        });
    }

    /**
     * @notice Rejects direct ETH transfers outside depositRewards to prevent unindexed ETH.
     */
    receive() external payable {
        revert DirectEthNotAllowed();
    }

    fallback() external payable {
        revert DirectEthNotAllowed();
    }
}
