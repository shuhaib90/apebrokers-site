import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient, useSwitchChain } from 'wagmi';
import { formatEther, parseEther } from 'viem';
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

export const ALCHEMY_API_KEY = 'alch_008u8jC_qTSIJvqgLbdGY';

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

/**
 * Auto-detect user's Ape Broker NFTs using Alchemy NFT API on Robinhood Chain
 */
export async function fetchOwnedNftsFromAlchemy(ownerAddress) {
  if (!ownerAddress) return [];
  try {
    const url = `https://robinhood-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${ownerAddress}&contractAddresses[]=${APE_BROKER_NFT_ADDRESS}&withMetadata=true`;
    const res = await fetch(url).then((r) => r.json());
    if (res && res.ownedNfts && Array.isArray(res.ownedNfts)) {
      return res.ownedNfts.map((n) => ({
        tokenId: Number(n.tokenId),
        name: n.name || `Ape Broker #${n.tokenId}`,
        image:
          n.image?.cachedUrl ||
          n.image?.thumbnailUrl ||
          `/gifs/${(Number(n.tokenId) % 100) + 1}.gif`,
      }));
    }
  } catch (err) {
    console.warn('Alchemy NFT fetch note:', err);
  }
  return [];
}

/**
 * Direct RPC queries for balances as resilient fallback
 */
async function fetchDirectBalances(ownerAddress) {
  const rpc =
    import.meta.env.VITE_ROBINHOOD_RPC_URL ||
    'https://robinhood-mainnet.g.alchemy.com/v2/alch_008u8jC_qTSIJvqgLbdGY';
  try {
    const [ethRes, tokenRes] = await Promise.all([
      fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [ownerAddress, 'latest'],
        }),
      })
        .then((r) => r.json())
        .catch(() => ({})),
      fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'eth_call',
          params: [
            {
              to: APEBROKE_TOKEN_ADDRESS,
              data:
                '0x70a08231' +
                ownerAddress.toLowerCase().replace('0x', '').padStart(64, '0'),
            },
            'latest',
          ],
        }),
      })
        .then((r) => r.json())
        .catch(() => ({})),
    ]);

    const ethBal =
      ethRes.result && ethRes.result !== '0x' ? BigInt(ethRes.result) : 0n;
    const tokenBal =
      tokenRes.result && tokenRes.result !== '0x' ? BigInt(tokenRes.result) : 0n;
    return { ethBal, tokenBal };
  } catch (err) {
    return { ethBal: 0n, tokenBal: 0n };
  }
}

export function useApeBrokerDesk() {
  const { address, isConnected, chain, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();

  const [isLoading, setIsLoading] = useState(true);
  const [isScanningNfts, setIsScanningNfts] = useState(false);
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

  // Check if connected to correct chain (Robinhood 4663 / 4689, or hardhat 31337 / 1337)
  const isCorrectChain =
    !isConnected ||
    chainId === 4663 ||
    chainId === 4689 ||
    chainId === 31337 ||
    chainId === 1337 ||
    chain?.id === 4663 ||
    chain?.id === 4689 ||
    chain?.id === robinhoodChain.id ||
    Boolean(chain?.name?.toLowerCase().includes('robinhood'));

  // Seamless helper to switch or add Robinhood Chain automatically
  const switchToRobinhoodChain = useCallback(async () => {
    try {
      if (switchChain) {
        await switchChain({ chainId: 4663 });
        return true;
      }
    } catch (err) {
      console.warn('wagmi switchChain failed, trying window.ethereum fallback:', err);
    }

    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x1237' }], // 4663 in hex
        });
        return true;
      } catch (switchError) {
        if (
          switchError?.code === 4902 ||
          switchError?.data?.originalError?.code === 4902 ||
          String(switchError?.message || '').includes('4902')
        ) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x1237',
                  chainName: 'Robinhood Chain',
                  nativeCurrency: {
                    name: 'Ether',
                    symbol: 'ETH',
                    decimals: 18,
                  },
                  rpcUrls: [
                    import.meta.env.VITE_ROBINHOOD_RPC_URL ||
                      'https://robinhood-mainnet.g.alchemy.com/v2/alch_008u8jC_qTSIJvqgLbdGY',
                  ],
                  blockExplorerUrls: ['https://explorer.robinhood.com'],
                },
              ],
            });
            return true;
          } catch (addError) {
            console.error('Failed to add Robinhood Chain:', addError);
          }
        }
      }
    }
    return false;
  }, [switchChain]);

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
        publicClient
          .readContract({
            address: DESK_CONTRACT_ADDRESS,
            abi: deskDeployConfig.abi,
            functionName: 'totalEligibleWeight',
          })
          .catch(() => 0n),
        publicClient
          .readContract({
            address: DESK_CONTRACT_ADDRESS,
            abi: deskDeployConfig.abi,
            functionName: 'getRewardPoolBalance',
          })
          .catch(() => 0n),
        publicClient
          .readContract({
            address: DESK_CONTRACT_ADDRESS,
            abi: deskDeployConfig.abi,
            functionName: 'getProtocolFeeBalance',
          })
          .catch(() => 0n),
        publicClient
          .readContract({
            address: DESK_CONTRACT_ADDRESS,
            abi: deskDeployConfig.abi,
            functionName: 'currentEpoch',
          })
          .catch(() => 0n),
        publicClient
          .readContract({
            address: DESK_CONTRACT_ADDRESS,
            abi: deskDeployConfig.abi,
            functionName: 'timeUntilNextEpoch',
          })
          .catch(() => 0n),
        publicClient
          .readContract({
            address: DESK_CONTRACT_ADDRESS,
            abi: deskDeployConfig.abi,
            functionName: 'totalEthRewardsDeposited',
          })
          .catch(() => 0n),
        publicClient
          .readContract({
            address: DESK_CONTRACT_ADDRESS,
            abi: deskDeployConfig.abi,
            functionName: 'totalEthRewardsClaimed',
          })
          .catch(() => 0n),
        publicClient
          .readContract({
            address: DESK_CONTRACT_ADDRESS,
            abi: deskDeployConfig.abi,
            functionName: 'totalBoostFeesCollected',
          })
          .catch(() => 0n),
        publicClient
          .readContract({
            address: DESK_CONTRACT_ADDRESS,
            abi: deskDeployConfig.abi,
            functionName: 'baseDeskWeight',
          })
          .catch(() => 100n),
        publicClient
          .readContract({
            address: DESK_CONTRACT_ADDRESS,
            abi: deskDeployConfig.abi,
            functionName: 'baseBoostCost',
          })
          .catch(() => 349693n * 10n ** 18n),
        publicClient
          .readContract({
            address: DESK_CONTRACT_ADDRESS,
            abi: deskDeployConfig.abi,
            functionName: 'owner',
          })
          .catch(() => null),
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
   * Refetch User Balances & Auto-detect Owned Desks
   */
  const refetchUserData = useCallback(async () => {
    if (!address) {
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

    setIsScanningNfts(true);

    try {
      // 1. Fetch Balances via publicClient and direct RPC fallback
      const directBalances = await fetchDirectBalances(address);

      let apeBrokeBal = directBalances.tokenBal;
      let ethBal = directBalances.ethBal;
      let allowance = 0n;
      let activeDeskCount = 0n;
      let historicalClaimable = 0n;

      if (publicClient) {
        try {
          const [cTokenBal, cEthBal, cAllowance, cActiveCount, cHistorical] =
            await Promise.all([
              publicClient
                .readContract({
                  address: APEBROKE_TOKEN_ADDRESS,
                  abi: ERC20_ABI,
                  functionName: 'balanceOf',
                  args: [address],
                })
                .catch(() => directBalances.tokenBal),
              publicClient.getBalance({ address }).catch(() => directBalances.ethBal),
              publicClient
                .readContract({
                  address: APEBROKE_TOKEN_ADDRESS,
                  abi: ERC20_ABI,
                  functionName: 'allowance',
                  args: [address, DESK_CONTRACT_ADDRESS],
                })
                .catch(() => 0n),
              publicClient
                .readContract({
                  address: DESK_CONTRACT_ADDRESS,
                  abi: deskDeployConfig.abi,
                  functionName: 'getActiveDeskCount',
                  args: [address],
                })
                .catch(() => 0n),
              publicClient
                .readContract({
                  address: DESK_CONTRACT_ADDRESS,
                  abi: deskDeployConfig.abi,
                  functionName: 'userClaimableRewards',
                  args: [address],
                })
                .catch(() => 0n),
            ]);

          apeBrokeBal = cTokenBal || directBalances.tokenBal;
          ethBal = cEthBal || directBalances.ethBal;
          allowance = cAllowance;
          activeDeskCount = cActiveCount;
          historicalClaimable = cHistorical;
        } catch (e) {
          // Keep direct RPC balances
        }
      }

      setUserBalances({
        apeBrokeBalance: apeBrokeBal,
        ethBalance: ethBal,
        allowance: allowance,
        activeDeskCount: activeDeskCount,
        historicalClaimableEth: historicalClaimable,
      });

      // 2. Auto-Detect Owned NFTs:
      // Priority A: Fetch directly from Alchemy NFT API on Robinhood Chain
      const discoveredTokenIds = new Set(trackedTokenIds);
      const nftMetadataMap = new Map();

      const alchemyNfts = await fetchOwnedNftsFromAlchemy(address);
      alchemyNfts.forEach((n) => {
        discoveredTokenIds.add(n.tokenId);
        nftMetadataMap.set(n.tokenId, n);
      });

      // Priority B: Fetch indexed desks from Supabase
      const dbDesks = await fetchUserDesksFromDb(address);
      dbDesks.forEach((d) => discoveredTokenIds.add(Number(d.token_id)));

      // 3. For each token ID, read on-chain Desk status
      const desksList = [];
      for (const tid of Array.from(discoveredTokenIds)) {
        let deskData = { active: false, baseWeight: 100n };
        let boostCount = 0n;
        let currentWeight = 100n;
        let pendingEth = 0n;
        let nftOwner = address;

        if (publicClient) {
          try {
            const [dData, bCount, cWeight, pEth, nOwner] = await Promise.all([
              publicClient
                .readContract({
                  address: DESK_CONTRACT_ADDRESS,
                  abi: deskDeployConfig.abi,
                  functionName: 'getDesk',
                  args: [BigInt(tid)],
                })
                .catch(() => ({ active: false, baseWeight: 100n })),
              publicClient
                .readContract({
                  address: DESK_CONTRACT_ADDRESS,
                  abi: deskDeployConfig.abi,
                  functionName: 'getBoostCount',
                  args: [BigInt(tid)],
                })
                .catch(() => 0n),
              publicClient
                .readContract({
                  address: DESK_CONTRACT_ADDRESS,
                  abi: deskDeployConfig.abi,
                  functionName: 'getDeskWeight',
                  args: [BigInt(tid)],
                })
                .catch(() => 100n),
              publicClient
                .readContract({
                  address: DESK_CONTRACT_ADDRESS,
                  abi: deskDeployConfig.abi,
                  functionName: 'getPendingRewards',
                  args: [BigInt(tid)],
                })
                .catch(() => 0n),
              publicClient
                .readContract({
                  address: APE_BROKER_NFT_ADDRESS,
                  abi: ERC721_ABI,
                  functionName: 'ownerOf',
                  args: [BigInt(tid)],
                })
                .catch(() => address),
            ]);

            deskData = dData;
            boostCount = bCount;
            currentWeight = cWeight;
            pendingEth = pEth;
            nftOwner = nOwner;
          } catch (e) {
            // Keep default
          }
        }

        // Fallback to Supabase state if on-chain returned inactive
        if (!deskData.active) {
          const dbDesk = dbDesks.find((d) => Number(d.token_id) === tid);
          if (dbDesk && dbDesk.active) {
            deskData = { active: true, baseWeight: BigInt(dbDesk.base_weight || 100) };
            boostCount = BigInt(dbDesk.boost_count || 0);
            currentWeight = BigInt(dbDesk.current_weight || 100);
          }
        }

        const isActive = Boolean(deskData.active);
        const currentBoosts = Number(boostCount);
        const nextBoostNumber = currentBoosts < 5 ? currentBoosts + 1 : 5;
        const nextBoostCost =
          currentBoosts < 5
            ? globalStats.baseBoostCost * (2n * BigInt(nextBoostNumber))
            : 0n;

        const isOwnerOfNft =
          !nftOwner ||
          nftOwner.toLowerCase() === address.toLowerCase();

        const meta = nftMetadataMap.get(tid);

        desksList.push({
          tokenId: tid,
          name: meta?.name || `Ape Broker #${tid}`,
          image: meta?.image || `/gifs/${(tid % 100) + 1}.gif`,
          active: isActive,
          boostCount: currentBoosts,
          currentWeight: Number(currentWeight),
          baseWeight: Number(deskData.baseWeight || 100n),
          pendingRewardsEth: pendingEth,
          nextBoostCost,
          nextBoostNumber,
          nftOwner: nftOwner || address,
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
      }

      desksList.sort((a, b) => a.tokenId - b.tokenId);
      setUserDesks(desksList);
    } catch (err) {
      console.warn('Error reading user data:', err);
    } finally {
      setIsScanningNfts(false);
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
   * Add a Token ID to track manually
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
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: tx });
      }
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
      let receipt = { blockNumber: 0 };
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      }

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
      let receipt = { blockNumber: 0 };
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      }

      recordDeskBoostInDb({
        tokenId,
        owner: address,
        boostNumber,
        cost: formatEther(costRaw),
        weightBefore: currentWeight,
        weightAfter: currentWeight + 100,
        txHash: tx,
        blockNumber: receipt?.blockNumber,
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
      let receipt = { blockNumber: 0 };
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      }

      recordRewardClaimInDb({
        tokenId,
        claimer: address,
        amountEth: formatEther(pendingEth || 0n),
        claimType: 'single',
        txHash: tx,
        blockNumber: receipt?.blockNumber,
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
      let receipt = { blockNumber: 0 };
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      }

      recordRewardClaimInDb({
        tokenId: null,
        claimer: address,
        amountEth: formatEther(totalClaimable || 0n),
        claimType: 'all',
        txHash: tx,
        blockNumber: receipt?.blockNumber,
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
      let receipt = { blockNumber: 0 };
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      }

      recordRewardClaimInDb({
        tokenId: null,
        claimer: address,
        amountEth: formatEther(totalHistorical || 0n),
        claimType: 'historical',
        txHash: tx,
        blockNumber: receipt?.blockNumber,
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
      let receipt = { blockNumber: 0 };
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      }

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
      let receipt = { blockNumber: 0 };
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      }

      recordRewardDepositInDb({
        depositor: address,
        amountEth: ethAmount,
        epoch: Number(globalStats.currentEpoch),
        txHash: tx,
        blockNumber: receipt?.blockNumber,
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
    chainId,
    isScanningNfts,
    switchChain,
    switchToRobinhoodChain,
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
