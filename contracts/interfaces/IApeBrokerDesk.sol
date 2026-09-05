// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IApeBrokerDesk {
    // Custom Errors
    error NotTokenOwner();
    error DeskAlreadyActive();
    error DeskNotActive();
    error MaxBoostsReached();
    error InsufficientAllowance();
    error InsufficientBalance();
    error ZeroAddress();
    error ZeroAmount();
    error NoRewardsToClaim();
    error DirectEthNotAllowed();
    error TransferFailed();
    error ExceedsCollectedFees();
    error MaxDesksPerWalletReached();
    error ExceedsMaxEmissionBps();

    // Events
    event DeskActivated(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 fee,
        uint256 baseWeight
    );

    event DeskBoosted(
        uint256 indexed tokenId,
        address indexed owner,
        uint8 boostNumber,
        uint256 cost,
        uint256 newWeight
    );

    event ProtocolFeesClaimed(
        address indexed recipient,
        uint256 amount
    );

    event RewardsDeposited(
        address indexed depositor,
        uint256 amount,
        uint256 epoch
    );

    event EpochRewardsDistributed(
        uint256 indexed epoch,
        uint256 amountDistributed,
        uint256 availablePool,
        uint256 totalWeight
    );

    event RewardsClaimed(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 amount
    );

    event HistoricalRewardsClaimed(
        address indexed user,
        uint256 amount
    );

    event BaseBoostCostUpdated(uint256 oldCost, uint256 newCost);
    event BaseDeskWeightUpdated(uint256 oldWeight, uint256 newWeight);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event EpochEmissionUpdated(uint256 oldBps, uint256 newBps);
    event BenchmarkWeightUpdated(uint256 oldFloor, uint256 newFloor);

    // User Operations
    function activateDesk(uint256 tokenId) external;
    function boostDesk(uint256 tokenId) external;
    function claimRewards(uint256 tokenId) external;
    function claimAllRewards(uint256[] calldata tokenIds) external;
    function claimHistoricalRewards() external;
    function claimHistoricalRewardsForDesks(uint256[] calldata tokenIds) external;
    function checkpointDesk(uint256 tokenId) external;
    function distributeEpochRewards() external;

    // Admin Operations
    function depositRewards() external payable;
    function claimProtocolFees(uint256 amount) external;
    function setEpochEmissionBps(uint256 bps) external;
    function setBenchmarkWeightFloor(uint256 floorWeight) external;

    // View Functions
    function isDeskActive(uint256 tokenId) external view returns (bool);
    function getDeskWeight(uint256 tokenId) external view returns (uint256);
    function getBoostCount(uint256 tokenId) external view returns (uint8);
    function getBoostCost(uint8 boostNumber) external view returns (uint256);
    function getNextBoostCost(uint256 tokenId) external view returns (uint256);
    function getPendingRewards(uint256 tokenId) external view returns (uint256);
    function getTotalEligibleWeight() external view returns (uint256);
    function getRewardPoolBalance() external view returns (uint256);
    function getAvailableRewardPool() external view returns (uint256);
    function getEstimatedEpochReward(uint256 tokenId) external view returns (uint256);
    function getDistributionParameters() external view returns (uint256 emissionBps, uint256 benchmarkWeight, uint256 lastEpoch);
    function getProtocolFeeBalance() external view returns (uint256);
    function currentEpoch() external view returns (uint256);
    function timeUntilNextEpoch() external view returns (uint256);
    function getActiveDeskCount(address user) external view returns (uint256);
}
