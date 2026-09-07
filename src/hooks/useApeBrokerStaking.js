import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient, useSwitchChain } from 'wagmi';
import { formatEther, parseEther, maxUint256 } from 'viem';
import stakingDeployConfig from '../config/apeBrokerStaking.json';
import { robinhoodChain } from '../providers/Web3Provider';

export const STAKING_CONTRACT_ADDRESS =
  import.meta.env.VITE_STAKING_CONTRACT_ADDRESS || stakingDeployConfig.contractAddress;

export const APEBROKE_TOKEN_ADDRESS =
  import.meta.env.VITE_APEBROKE_TOKEN_ADDRESS ||
  stakingDeployConfig.apeBrokeTokenAddress ||
  '0xe0F384ebCede975342c5431aCad515b4A1B862cc';

export const APE_BROKER_NFT_ADDRESS =
  import.meta.env.VITE_APE_BROKER_NFT_ADDRESS ||
  stakingDeployConfig.apeBrokerNftAddress ||
  '0xd3b030e9281fcd8797af6dc437636b24bdfe7902';

export const ADMIN_ADDRESS =
  import.meta.env.VITE_ADMIN_ADDRESS ||
  stakingDeployConfig.adminAddress ||
  '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C';

export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
];

export const ERC721_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
];

export function useApeBrokerStaking() {
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Global Staking State
  const [globalStats, setGlobalStats] = useState({
    totalStaked: 0n,
    rewardPoolBalance: 0n,
    currentPeriodReward: 0n,
    totalEthRewardsDistributed: 0n,
    totalEthRewardsClaimed: 0n,
    rewardRateBps: 1000n, // 10%
    currentPeriodId: 0n,
    periodStartTime: 0n,
    periodEndTime: 0n,
    totalPositionsCount: 0,
    activePositionsCount: 0,
    isPaused: false,
    isAdmin: false,
  });

  // User State
  const [userBalances, setUserBalances] = useState({
    apeBrokeBalance: 0n,
    allowance: 0n,
    nftBalance: 0,
    isEligible: false, // At least 2 NFTs required
    totalUserStaked: 0n,
    totalUserPendingEth: 0n,
  });

  // User Staking Positions
  const [userStakes, setUserStakes] = useState([]);

  const isContractConfigured =
    Boolean(STAKING_CONTRACT_ADDRESS) &&
    STAKING_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000';

  const isCorrectChain =
    Boolean(chain?.id) &&
    (chain.id === robinhoodChain.id || chain.id === 4689 || chain.id === 31337);

  const switchToRobinhoodChain = useCallback(async () => {
    if (switchChain) {
      try {
        await switchChain({ chainId: robinhoodChain.id });
      } catch (err) {
        console.warn('Could not switch network automatically:', err);
      }
    }
  }, [switchChain]);

  /**
   * Fetch Global Protocol Staking Stats
   */
  const refetchGlobalStats = useCallback(async () => {
    if (!publicClient || !isContractConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      const stats = await publicClient.readContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: stakingDeployConfig.abi,
        functionName: 'getStakingStats',
      });

      const isAdmin =
        Boolean(address) &&
        (address.toLowerCase() === ADMIN_ADDRESS.toLowerCase() ||
         address.toLowerCase() === '0xb8e3dfdd19b6bf35b9fd87f8373f7f82c53bc93c');

      setGlobalStats({
        totalStaked: stats.totalStaked || 0n,
        rewardPoolBalance: stats.rewardPoolBalance || 0n,
        currentPeriodReward: stats.currentPeriodReward || 0n,
        totalEthRewardsDistributed: stats.totalEthRewardsDistributed || 0n,
        totalEthRewardsClaimed: stats.totalEthRewardsClaimed || 0n,
        rewardRateBps: stats.rewardRateBps || 1000n,
        currentPeriodId: stats.currentPeriodId || 0n,
        periodStartTime: stats.periodStartTime || 0n,
        periodEndTime: stats.periodEndTime || 0n,
        totalPositionsCount: Number(stats.totalPositionsCount || 0),
        activePositionsCount: Number(stats.activePositionsCount || 0),
        isPaused: Boolean(stats.isPaused),
        isAdmin,
      });
    } catch (err) {
      console.warn('Note reading staking global stats:', err);
    }
  }, [publicClient, isContractConfigured, address]);

  /**
   * Fetch User Staking & Token Data
   */
  const refetchUserData = useCallback(async () => {
    if (!publicClient || !address) {
      setUserStakes([]);
      setIsLoading(false);
      return;
    }

    try {
      // 1. Read NFT Balance, Token Balance, and Allowance in parallel
      const [nftBal, tokenBal, allow] = await Promise.all([
        publicClient
          .readContract({
            address: APE_BROKER_NFT_ADDRESS,
            abi: ERC721_ABI,
            functionName: 'balanceOf',
            args: [address],
          })
          .catch(() => 0n),
        publicClient
          .readContract({
            address: APEBROKE_TOKEN_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address],
          })
          .catch(() => 0n),
        isContractConfigured
          ? publicClient
              .readContract({
                address: APEBROKE_TOKEN_ADDRESS,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [address, STAKING_CONTRACT_ADDRESS],
              })
              .catch(() => 0n)
          : 0n,
      ]);

      const nftCount = Number(nftBal);
      const isEligible = nftCount >= 2;

      // 2. Read User Staking Positions from Contract
      let stakesRaw = [];
      if (isContractConfigured) {
        try {
          stakesRaw = await publicClient.readContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: stakingDeployConfig.abi,
            functionName: 'getUserStakes',
            args: [address],
          });
        } catch (e) {
          stakesRaw = [];
        }
      }

      const now = Math.floor(Date.now() / 1000);
      let totalStakedSum = 0n;
      let totalPendingEthSum = 0n;

      // 3. For each position, read live pending reward
      const parsedPositions = await Promise.all(
        (stakesRaw || []).map(async (pos) => {
          const stakeId = Number(pos.stakeId);
          let pendingReward = 0n;

          if (!pos.claimed && isContractConfigured) {
            try {
              pendingReward = await publicClient.readContract({
                address: STAKING_CONTRACT_ADDRESS,
                abi: stakingDeployConfig.abi,
                functionName: 'getPendingReward',
                args: [BigInt(stakeId)],
              });
            } catch (e) {
              pendingReward = 0n;
            }
          }

          const unlockTime = Number(pos.unlockTime);
          const isUnlocked = now >= unlockTime;
          const timeLeftSeconds = Math.max(0, unlockTime - now);

          if (!pos.withdrawn) {
            totalStakedSum += BigInt(pos.amount);
          }
          if (!pos.claimed) {
            totalPendingEthSum += pendingReward;
          }

          return {
            stakeId,
            owner: pos.owner,
            amount: BigInt(pos.amount),
            startTime: Number(pos.startTime),
            unlockTime,
            isUnlocked,
            timeLeftSeconds,
            pendingRewardsEth: pendingReward,
            withdrawn: Boolean(pos.withdrawn),
            claimed: Boolean(pos.claimed),
          };
        })
      );

      parsedPositions.sort((a, b) => {
        // Active (not withdrawn) first, then by stakeId descending
        if (a.withdrawn !== b.withdrawn) return a.withdrawn ? 1 : -1;
        return b.stakeId - a.stakeId;
      });

      setUserBalances({
        apeBrokeBalance: tokenBal,
        allowance: allow,
        nftBalance: nftCount,
        isEligible,
        totalUserStaked: totalStakedSum,
        totalUserPendingEth: totalPendingEthSum,
      });

      setUserStakes(parsedPositions);
    } catch (err) {
      console.warn('Error reading user staking data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, address, isContractConfigured]);

  // Initial & Periodic Data Refresh
  useEffect(() => {
    refetchGlobalStats();
    refetchUserData();

    const interval = setInterval(() => {
      refetchGlobalStats();
      refetchUserData();
    }, 15000); // Polling every 15 seconds

    return () => clearInterval(interval);
  }, [refetchGlobalStats, refetchUserData]);

  // =============================================================
  // USER ACTIONS
  // =============================================================

  /**
   * Approve $APEBROKE for the staking contract
   */
  const approveApebroke = async (amount = maxUint256) => {
    if (!walletClient || !address || !isContractConfigured) {
      throw new Error('Wallet not connected or contract address not set');
    }
    const hash = await walletClient.writeContract({
      address: APEBROKE_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [STAKING_CONTRACT_ADDRESS, amount],
    });
    if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
    await refetchUserData();
    return hash;
  };

  /**
   * Stake $APEBROKE tokens for 24 hours
   */
  const stakeTokens = async (amountTokensRaw) => {
    if (!walletClient || !address || !isContractConfigured) {
      throw new Error('Wallet not connected or contract address not set');
    }
    if (!userBalances.isEligible) {
      throw new Error('Must hold at least 2 Ape Broker NFTs to stake');
    }

    const hash = await walletClient.writeContract({
      address: STAKING_CONTRACT_ADDRESS,
      abi: stakingDeployConfig.abi,
      functionName: 'stake',
      args: [amountTokensRaw],
    });
    if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
    await refetchUserData();
    await refetchGlobalStats();
    return hash;
  };

  /**
   * Claim matured ETH rewards for a position
   */
  const claimReward = async (stakeId) => {
    if (!walletClient || !address || !isContractConfigured) {
      throw new Error('Wallet not connected or contract address not set');
    }
    const hash = await walletClient.writeContract({
      address: STAKING_CONTRACT_ADDRESS,
      abi: stakingDeployConfig.abi,
      functionName: 'claimReward',
      args: [BigInt(stakeId)],
    });
    if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
    await refetchUserData();
    await refetchGlobalStats();
    return hash;
  };

  /**
   * Withdraw principal after 24-hour lock
   */
  const withdrawPrincipal = async (stakeId) => {
    if (!walletClient || !address || !isContractConfigured) {
      throw new Error('Wallet not connected or contract address not set');
    }
    const hash = await walletClient.writeContract({
      address: STAKING_CONTRACT_ADDRESS,
      abi: stakingDeployConfig.abi,
      functionName: 'withdraw',
      args: [BigInt(stakeId)],
    });
    if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
    await refetchUserData();
    await refetchGlobalStats();
    return hash;
  };

  /**
   * Withdraw principal and claim ETH reward in one atomic transaction
   */
  const withdrawAndClaim = async (stakeId) => {
    if (!walletClient || !address || !isContractConfigured) {
      throw new Error('Wallet not connected or contract address not set');
    }
    const hash = await walletClient.writeContract({
      address: STAKING_CONTRACT_ADDRESS,
      abi: stakingDeployConfig.abi,
      functionName: 'withdrawAndClaim',
      args: [BigInt(stakeId)],
    });
    if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
    await refetchUserData();
    await refetchGlobalStats();
    return hash;
  };

  // =============================================================
  // ADMIN ACTIONS
  // =============================================================

  /**
   * Admin deposits ETH into the staking reward pool
   */
  const adminDepositRewards = async (ethAmountStr) => {
    if (!walletClient || !address || !isContractConfigured) {
      throw new Error('Wallet not connected or contract address not set');
    }
    const hash = await walletClient.writeContract({
      address: STAKING_CONTRACT_ADDRESS,
      abi: stakingDeployConfig.abi,
      functionName: 'depositRewards',
      value: parseEther(ethAmountStr),
    });
    if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
    await refetchGlobalStats();
    return hash;
  };

  /**
   * Admin configures reward rate BPS (100 = 1%, 5000 = 50%)
   */
  const adminSetRewardRateBps = async (bps) => {
    if (!walletClient || !address || !isContractConfigured) {
      throw new Error('Wallet not connected or contract address not set');
    }
    const hash = await walletClient.writeContract({
      address: STAKING_CONTRACT_ADDRESS,
      abi: stakingDeployConfig.abi,
      functionName: 'setRewardRateBps',
      args: [BigInt(bps)],
    });
    if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
    await refetchGlobalStats();
    return hash;
  };

  /**
   * Admin emergency pause / unpause
   */
  const adminTogglePause = async (shouldPause) => {
    if (!walletClient || !address || !isContractConfigured) {
      throw new Error('Wallet not connected or contract address not set');
    }
    const fn = shouldPause ? 'pauseStaking' : 'unpauseStaking';
    const hash = await walletClient.writeContract({
      address: STAKING_CONTRACT_ADDRESS,
      abi: stakingDeployConfig.abi,
      functionName: fn,
    });
    if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
    await refetchGlobalStats();
    return hash;
  };

  return {
    address,
    isConnected,
    isCorrectChain,
    isContractConfigured,
    switchToRobinhoodChain,
    isLoading,
    error,
    globalStats,
    userBalances,
    userStakes,
    refetchGlobalStats,
    refetchUserData,
    approveApebroke,
    stakeTokens,
    claimReward,
    withdrawPrincipal,
    withdrawAndClaim,
    adminDepositRewards,
    adminSetRewardRateBps,
    adminTogglePause,
  };
}
