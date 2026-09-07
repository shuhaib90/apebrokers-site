// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IApeBrokerStaking {
    // Custom Errors
    error InsufficientNftBalance(uint256 held, uint256 required);
    error StakeStillLocked(uint256 stakeId, uint256 unlockTime);
    error RewardAlreadyClaimed(uint256 stakeId);
    error AlreadyWithdrawn(uint256 stakeId);
    error NotStakeOwner();
    error StakeNotFound();
    error ExceedsMaxRewardRateBps(uint256 rate, uint256 max);
    error BelowMinRewardRateBps(uint256 rate, uint256 min);
    error InsufficientAllowance();
    error InsufficientBalance();
    error ZeroAmount();
    error ZeroAddress();
    error NoRewardsToClaim();
    error DirectEthNotAllowed();
    error TransferFailed();
    error StakingIsPaused();
    error CannotRecoverStakedToken();

    // Position Struct
    struct StakePosition {
        uint256 stakeId;
        address owner;
        uint256 amount;
        uint256 startTime;
        uint256 unlockTime;
        uint256 rewardDebt;
        uint256 pendingRewards;
        bool withdrawn;
        bool claimed;
    }

    // Global Stats Struct
    struct StakingStats {
        uint256 totalStaked;
        uint256 rewardPoolBalance;
        uint256 currentPeriodReward;
        uint256 totalEthRewardsDistributed;
        uint256 totalEthRewardsClaimed;
        uint256 rewardRateBps;
        uint256 currentPeriodId;
        uint256 periodStartTime;
        uint256 periodEndTime;
        uint256 totalPositionsCount;
        uint256 activePositionsCount;
        bool isPaused;
    }

    // Events
    event Staked(
        uint256 indexed stakeId,
        address indexed owner,
        uint256 amount,
        uint256 startTime,
        uint256 unlockTime
    );

    event RewardClaimed(
        uint256 indexed stakeId,
        address indexed owner,
        uint256 rewardAmount
    );

    event Withdrawn(
        uint256 indexed stakeId,
        address indexed owner,
        uint256 amount
    );

    event RewardsDeposited(
        address indexed depositor,
        uint256 amount,
        uint256 newRewardPoolBalance
    );

    event PeriodStarted(
        uint256 indexed periodId,
        uint256 periodReward,
        uint256 remainingPool,
        uint256 startTime,
        uint256 endTime
    );

    event RewardRateUpdated(uint256 oldRateBps, uint256 newRateBps);
    event StakingPaused(address account);
    event StakingUnpaused(address account);

    // User Functions
    function stake(uint256 amount) external returns (uint256 stakeId);
    function claimReward(uint256 stakeId) external returns (uint256 reward);
    function withdraw(uint256 stakeId) external;
    function withdrawAndClaim(uint256 stakeId) external returns (uint256 reward);

    // Views
    function getPendingReward(uint256 stakeId) external view returns (uint256);
    function getUserStakes(address account) external view returns (StakePosition[] memory);
    function isUserEligible(address account) external view returns (bool eligible, uint256 nftBalance);
    function getStakingStats() external view returns (StakingStats memory);

    // Admin Functions
    function depositRewards() external payable;
    function setRewardRateBps(uint256 bps) external;
    function pauseStaking() external;
    function unpauseStaking() external;
}
