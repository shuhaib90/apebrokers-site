import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient, useSwitchChain } from 'wagmi';
import { formatEther, parseEther, formatUnits, parseUnits } from 'viem';
import deskDeployConfig from '../config/apeBrokerDesk.json';
import { robinhoodChain } from '../providers/Web3Provider';
import {
  syncDeskToDb,
  recordDeskBoostInDb,
  recordRewardDepositInDb,
  recordRewardClaimInDb,
  recordProtocolFeeClaimInDb,
  fetchUserDesksFromDb,
} from '../utils/supabaseDesk';

export const DESK_CONTRACT_ADDRESS =
  import.meta.env.VITE_DESK_CONTRACT_ADDRESS || deskDeployConfig.contractAddress;

export const APEBROKE_TOKEN_ADDRESS =
  import.meta.env.VITE_APEBROKE_TOKEN_ADDRESS ||
  deskDeployConfig.apeBrokeTokenAddress ||
  '0xe0F384ebCede975342c5431aCad515b4A1B862cc';

export const APE_BROKER_NFT_ADDRESS =
  import.meta.env.VITE_APE_BROKER_NFT_ADDRESS ||
  deskDeployConfig.apeBrokerNftAddress ||
  '0x5b9ca37d499eace8f526320d6edea10fb73d4ec6';

export const ACTIVATION_FEE_RAW = 349693n * 10n ** 18n;

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
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'tokenOfOwnerByIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
];

export function useApeBrokerDesk() {
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Global Protocol State
  const [globalStats, setGlobalStats] = useState({
    totalEligibleWeight: 0n,
    rewardPoolBalance: 0n,
    protocolFeeBalance: 0n,
    currentEpoch: 0n,
    secondsUntilNextEpoch: 0n,
    totalEthDeposited: 0n,
    totalEthClaimed: 0n,
    totalBoostFeesCollected: 0n,
    baseDeskWeight: 100n,
    baseBoostCost: 349693n * 10n ** 18n,
    contractOwner: null,
    isAdmin: false,
  });

  // User State
  const [userBalances, setUserBalances] = useState({
    apeBrokeBalance: 0n,
    ethBalance: 0n,
    allowance: 0n,
    activeDeskCount: 0n,
    historicalClaimableEth: 0n,
  });

  // User Desks
  const [userDesks, setUserDesks] = useState([]);
  const [trackedTokenIds, setTrackedTokenIds] = useState([]);

  // Check if connected to correct chain
  const isCorrectChain =
    chain?.id === robinhoodChain.id ||
    chain?.id === 31337 ||
    chain?.id === 4689;

  /**
   * Refetch Global Protocol Stats
   */
  const refetchGlobalStats = useCallback(async () => {
    if (!publicClient) return;
    try {
      const [
        totalEligibleWeight,
        rewardPoolBalance,
        protocolFeeBalance,
        currentEpoch,
        secondsUntilNextEpoch,
        totalEthDeposited,
        totalEthClaimed,
        totalBoostFeesCollected,
        baseDeskWeight,
        baseBoostCost,
        contractOwner,
      ] = await Promise.all([
        publicClient.readContract({
          address: DESK_CONTRACT_ADDRESS,
          abi: deskDeployConfig.abi,
          functionName: 'totalEligibleWeight',
        }).catch(() => 0n),
        publicClient.readContract({
          address: DESK_CONTRACT_ADDRESS,
          abi: deskDeployConfig.abi,
          functionName: 'getRewardPoolBalance',
        }).catch(() => 0n),
        publicClient.readContract({
          address: DESK_CONTRACT_ADDRESS,
          abi: deskDeployConfig.abi,
          functionName: 'getProtocolFeeBalance',
        }).catch(() => 0n),
        publicClient.readContract({
          address: DESK_CONTRACT_ADDRESS,
          abi: deskDeployConfig.abi,
          functionName: 'currentEpoch',
        }).catch(() => 0n),
        publicClient.readContract({
          address: DESK_CONTRACT_ADDRESS,
          abi: deskDeployConfig.abi,
          functionName: 'timeUntilNextEpoch',
        }).catch(() => 0n),
        publicClient.readContract({
          address: DESK_CONTRACT_ADDRESS,
          abi: deskDeployConfig.abi,
          functionName: 'totalEthRewardsDeposited',
        }).catch(() => 0n),
        publicClient.readContract({
          address: DESK_CONTRACT_ADDRESS,
          abi: deskDeployConfig.abi,
          functionName: 'totalEthRewardsClaimed',
        }).catch(() => 0n),
        publicClient.readContract({
          address: DESK_CONTRACT_ADDRESS,
          abi: deskDeployConfig.abi,
          functionName: 'totalBoostFeesCollected',
        }).catch(() => 0n),
        publicClient.readContract({
          address: DESK_CONTRACT_ADDRESS,
          abi: deskDeployConfig.abi,
          functionName: 'baseDeskWeight',
        }).catch(() => 100n),
        publicClient.readContract({
          address: DESK_CONTRACT_ADDRESS,
          abi: deskDeployConfig.abi,
          functionName: 'baseBoostCost',
        }).catch(() => 349693n * 10n ** 18n),
        publicClient.readContract({
          address: DESK_CONTRACT_ADDRESS,
          abi: deskDeployConfig.abi,
          functionName: 'owner',
        }).catch(() => null),
      ]);

      const isAdmin =
        Boolean(address && contractOwner) &&
        address.toLowerCase() === contractOwner.toLowerCase();

      setGlobalStats({
        totalEligibleWeight,
        rewardPoolBalance,
        protocolFeeBalance,
        currentEpoch,
        secondsUntilNextEpoch,
        totalEthDeposited,
        totalEthClaimed,
        totalBoostFeesCollected,
        baseDeskWeight,
        baseBoostCost,
        contractOwner,
        isAdmin,
      });
    } catch (err) {
      console.warn('Error reading global desk stats:', err);
    }
  }, [publicClient, address]);

  /**
   * Refetch User Balances & Desks
   */
  const refetchUserData = useCallback(async () => {
    if (!publicClient || !address) {
      setUserDesks([]);
      setUserBalances({
        apeBrokeBalance: 0n,
        ethBalance: 0n,
        allowance: 0n,
        activeDeskCount: 0n,
        historicalClaimableEth: 0n,
      });
      return;
    }

    try {
      // 1. Read User Balances
      const [apeBrokeBal, ethBal, allowance, activeDeskCount, historicalClaimable] =
        await Promise.all([
          publicClient.readContract({
            address: APEBROKE_TOKEN_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address],
          }).catch(() => 0n),
          publicClient.getBalance({ address }).catch(() => 0n),
          publicClient.readContract({
            address: APEBROKE_TOKEN_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [address, DESK_CONTRACT_ADDRESS],
          }).catch(() => 0n),
          publicClient.readContract({
            address: DESK_CONTRACT_ADDRESS,
            abi: deskDeployConfig.abi,
            functionName: 'getActiveDeskCount',
            args: [address],
          }).catch(() => 0n),
          publicClient.readContract({
            address: DESK_CONTRACT_ADDRESS,
            abi: deskDeployConfig.abi,
            functionName: 'userClaimableRewards',
            args: [address],
          }).catch(() => 0n),
        ]);

      setUserBalances({
        apeBrokeBalance: apeBrokeBal,
        ethBalance: ethBal,
        allowance: allowance,
        activeDeskCount: activeDeskCount,
        historicalClaimableEth: historicalClaimable,
      });

      // 2. Discover Owned NFTs and Tracked Token IDs
      const discoveredTokenIds = new Set(trackedTokenIds);

      // A. Check indexed desks from Supabase
      const dbDesks = await fetchUserDesksFromDb(address);
      dbDesks.forEach((d) => discoveredTokenIds.add(Number(d.token_id)));

      // B. Scan ERC-721 tokenOfOwnerByIndex if supported
      try {
        const nftBalance = await publicClient.readContract({
          address: APE_BROKER_NFT_ADDRESS,
          abi: ERC721_ABI,
          functionName: 'balanceOf',
          args: [address],
        });

        const maxScan = Math.min(Number(nftBalance), 10);
        for (let i = 0; i < maxScan; i++) {
          try {
            const tid = await publicClient.readContract({
              address: APE_BROKER_NFT_ADDRESS,
              abi: ERC721_ABI,
              functionName: 'tokenOfOwnerByIndex',
              args: [address, BigInt(i)],
            });
            discoveredTokenIds.add(Number(tid));
          } catch (e) {
            break;
          }
        }
      } catch (e) {
        // Enumerable not supported, continue with discovered
      }

      // 3. For each token ID, read on-chain Desk status
      const desksList = [];
      for (const tid of Array.from(discoveredTokenIds)) {
        try {
          const [deskData, boostCount, currentWeight, pendingEth, nftOwner] =
            await Promise.all([
              publicClient.readContract({
                address: DESK_CONTRACT_ADDRESS,
                abi: deskDeployConfig.abi,
                functionName: 'getDesk',
                args: [BigInt(tid)],
              }),
              publicClient.readContract({
                address: DESK_CONTRACT_ADDRESS,
                abi: deskDeployConfig.abi,
                functionName: 'getBoostCount',
                args: [BigInt(tid)],
              }),
              publicClient.readContract({
                address: DESK_CONTRACT_ADDRESS,
                abi: deskDeployConfig.abi,
                functionName: 'getDeskWeight',
                args: [BigInt(tid)],
              }),
              publicClient.readContract({
                address: DESK_CONTRACT_ADDRESS,
                abi: deskDeployConfig.abi,
                functionName: 'getPendingRewards',
                args: [BigInt(tid)],
              }).catch(() => 0n),
              publicClient.readContract({
                address: APE_BROKER_NFT_ADDRESS,
                abi: ERC721_ABI,
                functionName: 'ownerOf',
                args: [BigInt(tid)],
              }).catch(() => null),
            ]);

          const isActive = Boolean(deskData.active);
          const currentBoosts = Number(boostCount);
          const nextBoostNumber = currentBoosts < 5 ? currentBoosts + 1 : 5;
          const nextBoostCost =
            currentBoosts < 5
              ? globalStats.baseBoostCost * (2n * BigInt(nextBoostNumber))
              : 0n;

          const isOwnerOfNft =
            Boolean(nftOwner && address) &&
            nftOwner.toLowerCase() === address.toLowerCase();

          desksList.push({
            tokenId: tid,
            active: isActive,
            boostCount: currentBoosts,
            currentWeight: Number(currentWeight),
            baseWeight: Number(deskData.baseWeight || 100n),
            pendingRewardsEth: pendingEth,
            nextBoostCost,
            nextBoostNumber,
            nftOwner,
            isOwnerOfNft,
          });

          // Sync active desk to Supabase if caller is owner
          if (isActive && isOwnerOfNft) {
            syncDeskToDb({
              tokenId: tid,
              owner: address,
              active: true,
              boostCount: currentBoosts,
              baseWeight: Number(deskData.baseWeight || 100n),
              currentWeight: Number(currentWeight),
            }).catch(() => {});
          }
        } catch (err) {
          console.warn(`Error querying token #${tid}:`, err);
        }
      }

      desksList.sort((a, b) => a.tokenId - b.tokenId);
      setUserDesks(desksList);
    } catch (err) {
      console.warn('Error reading user data:', err);
    }
  }, [publicClient, address, trackedTokenIds, globalStats.baseBoostCost]);

  // Initial Load & Polling
  useEffect(() => {
    setIsLoading(true);
    refetchGlobalStats().finally(() => setIsLoading(false));
  }, [refetchGlobalStats]);

  useEffect(() => {
    refetchUserData();
    const interval = setInterval(() => {
      refetchGlobalStats();
      refetchUserData();
    }, 12000);
    return () => clearInterval(interval);
  }, [refetchGlobalStats, refetchUserData]);

  /**
   * Add a Token ID to track (e.g. from user input)
   */
  const addTokenToTrack = useCallback((tokenId) => {
    const num = Number(tokenId);
    if (!isNaN(num) && num > 0) {
      setTrackedTokenIds((prev) => Array.from(new Set([...prev, num])));
    }
  }, []);

  /**
   * Action: Approve $APEBROKE
   */
  const approveApebroke = useCallback(
    async (amountRaw) => {
      if (!walletClient) throw new Error('Wallet not connected.');
      const tx = await walletClient.writeContract({
        address: APEBROKE_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [DESK_CONTRACT_ADDRESS, amountRaw],
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });
      await refetchUserData();
      return tx;
    },
    [walletClient, publicClient, refetchUserData]
  );

  /**
   * Action: Activate Desk
   */
  const activateDesk = useCallback(
    async (tokenId) => {
      if (!walletClient) throw new Error('Wallet not connected.');
      const tx = await walletClient.writeContract({
        address: DESK_CONTRACT_ADDRESS,
        abi: deskDeployConfig.abi,
        functionName: 'activateDesk',
        args: [BigInt(tokenId)],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

      // Sync with Supabase
      syncDeskToDb({
        tokenId,
        owner: address,
        active: true,
        boostCount: 0,
        baseWeight: 100,
        currentWeight: 100,
      }).catch(() => {});

      await refetchGlobalStats();
      await refetchUserData();
      return { hash: tx, receipt };
    },
    [walletClient, publicClient, address, refetchGlobalStats, refetchUserData]
  );

  /**
   * Action: Boost Desk
   */
  const boostDesk = useCallback(
    async (tokenId, currentWeight, boostNumber, costRaw) => {
      if (!walletClient) throw new Error('Wallet not connected.');
      const tx = await walletClient.writeContract({
        address: DESK_CONTRACT_ADDRESS,
        abi: deskDeployConfig.abi,
        functionName: 'boostDesk',
        args: [BigInt(tokenId)],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

      // Record in Supabase
      recordDeskBoostInDb({
        tokenId,
        owner: address,
        boostNumber,
        cost: formatEther(costRaw),
        weightBefore: currentWeight,
        weightAfter: currentWeight + 100,
        txHash: tx,
        blockNumber: receipt.blockNumber,
      }).catch(() => {});

      syncDeskToDb({
        tokenId,
        owner: address,
        active: true,
        boostCount: boostNumber,
        baseWeight: 100,
        currentWeight: currentWeight + 100,
      }).catch(() => {});

      await refetchGlobalStats();
      await refetchUserData();
      return { hash: tx, receipt };
    },
    [walletClient, publicClient, address, refetchGlobalStats, refetchUserData]
  );

  /**
   * Action: Claim Single Desk Rewards
   */
  const claimRewards = useCallback(
    async (tokenId, pendingEth) => {
      if (!walletClient) throw new Error('Wallet not connected.');
      const tx = await walletClient.writeContract({
        address: DESK_CONTRACT_ADDRESS,
        abi: deskDeployConfig.abi,
        functionName: 'claimRewards',
        args: [BigInt(tokenId)],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

      recordRewardClaimInDb({
        tokenId,
        claimer: address,
        amountEth: formatEther(pendingEth || 0n),
        claimType: 'single',
        txHash: tx,
        blockNumber: receipt.blockNumber,
      }).catch(() => {});

      await refetchGlobalStats();
      await refetchUserData();
      return { hash: tx, receipt };
    },
    [walletClient, publicClient, address, refetchGlobalStats, refetchUserData]
  );

  /**
   * Action: Claim All Desks Rewards
   */
  const claimAllRewards = useCallback(
    async (tokenIds, totalClaimable) => {
      if (!walletClient) throw new Error('Wallet not connected.');
      const tx = await walletClient.writeContract({
        address: DESK_CONTRACT_ADDRESS,
        abi: deskDeployConfig.abi,
        functionName: 'claimAllRewards',
        args: [tokenIds.map((id) => BigInt(id))],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

      recordRewardClaimInDb({
        tokenId: null,
        claimer: address,
        amountEth: formatEther(totalClaimable || 0n),
        claimType: 'all',
        txHash: tx,
        blockNumber: receipt.blockNumber,
      }).catch(() => {});

      await refetchGlobalStats();
      await refetchUserData();
      return { hash: tx, receipt };
    },
    [walletClient, publicClient, address, refetchGlobalStats, refetchUserData]
  );

  /**
   * Action: Claim Historical Accrued Rewards
   */
  const claimHistoricalRewards = useCallback(
    async (totalHistorical) => {
      if (!walletClient) throw new Error('Wallet not connected.');
      const tx = await walletClient.writeContract({
        address: DESK_CONTRACT_ADDRESS,
        abi: deskDeployConfig.abi,
        functionName: 'claimHistoricalRewards',
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

      recordRewardClaimInDb({
        tokenId: null,
        claimer: address,
        amountEth: formatEther(totalHistorical || 0n),
        claimType: 'historical',
        txHash: tx,
        blockNumber: receipt.blockNumber,
      }).catch(() => {});

      await refetchGlobalStats();
      await refetchUserData();
      return { hash: tx, receipt };
    },
    [walletClient, publicClient, address, refetchGlobalStats, refetchUserData]
  );

  /**
   * Admin: Claim Protocol Fees to Treasury
   */
  const adminClaimFees = useCallback(
    async (amountRaw) => {
      if (!walletClient) throw new Error('Wallet not connected.');
      const tx = await walletClient.writeContract({
        address: DESK_CONTRACT_ADDRESS,
        abi: deskDeployConfig.abi,
        functionName: 'claimProtocolFees',
        args: [amountRaw],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

      recordProtocolFeeClaimInDb({
        treasury: globalStats.contractOwner || address,
        amountApebroke: formatEther(amountRaw),
        txHash: tx,
      }).catch(() => {});

      await refetchGlobalStats();
      return { hash: tx, receipt };
    },
    [walletClient, publicClient, globalStats.contractOwner, address, refetchGlobalStats]
  );

  /**
   * Admin: Deposit Native ETH Rewards
   */
  const adminDepositRewards = useCallback(
    async (ethAmount) => {
      if (!walletClient) throw new Error('Wallet not connected.');
      const value = parseEther(String(ethAmount));
      const tx = await walletClient.writeContract({
        address: DESK_CONTRACT_ADDRESS,
        abi: deskDeployConfig.abi,
        functionName: 'depositRewards',
        value,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

      recordRewardDepositInDb({
        depositor: address,
        amountEth: ethAmount,
        epoch: Number(globalStats.currentEpoch),
        txHash: tx,
        blockNumber: receipt.blockNumber,
      }).catch(() => {});

      await refetchGlobalStats();
      await refetchUserData();
      return { hash: tx, receipt };
    },
    [walletClient, publicClient, address, globalStats.currentEpoch, refetchGlobalStats, refetchUserData]
  );

  return {
    address,
    isConnected,
    isCorrectChain,
    switchChain,
    isLoading,
    error,
    globalStats,
    userBalances,
    userDesks,
    addTokenToTrack,
    refetchGlobalStats,
    refetchUserData,
    approveApebroke,
    activateDesk,
    boostDesk,
    claimRewards,
    claimAllRewards,
    claimHistoricalRewards,
    adminClaimFees,
    adminDepositRewards,
  };
}
