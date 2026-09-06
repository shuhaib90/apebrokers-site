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
  '0xd3b030e9281fcd8797af6dc437636b24bdfe7902';

export const ADMIN_ADDRESS =
  import.meta.env.VITE_ADMIN_ADDRESS ||
  deskDeployConfig.adminAddress ||
  '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C';

export const TREASURY_ADDRESS =
  import.meta.env.VITE_TREASURY_ADDRESS ||
  deskDeployConfig.treasuryAddress ||
  '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C';

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
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
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
 * Decode EVM contract revert errors for ApeBrokerDesk
 */
export function decodeDeskError(err) {
  const msg = String(err?.data || err?.message || err?.shortMessage || '');
  if (msg.includes('0xdf2d9b42') || msg.includes('OwnerQueryForNonexistentToken')) {
    return 'This NFT token ID does not exist or has not been minted on-chain.';
  }
  if (msg.includes('0x59dc379f') || msg.includes('NotTokenOwner')) {
    return 'You are not the on-chain owner of this Ape Broker NFT.';
  }
  if (msg.includes('0x3d5d2027') || msg.includes('DeskNotActive')) {
    return 'This Desk is not active on-chain yet. Please activate it first.';
  }
  if (msg.includes('0x59728258') || msg.includes('DeskAlreadyActive')) {
    return 'This Desk is already active on-chain.';
  }
  if (msg.includes('0x0e45c25e') || msg.includes('MaxBoostsReached')) {
    return 'This Desk has already reached the maximum of 5 boosts.';
  }
  if (
    msg.includes('0x13be252b') ||
    msg.includes('InsufficientAllowance') ||
    msg.includes('0x20352748') ||
    msg.includes('ERC20InsufficientAllowance') ||
    msg.includes('SafeERC20FailedOperation')
  ) {
    return 'Insufficient $APEBROKE allowance. Please click Approve first.';
  }
  if (
    msg.includes('0xf4d678b8') ||
    msg.includes('InsufficientBalance') ||
    msg.includes('0xe450d38c') ||
    msg.includes('ERC20InsufficientBalance')
  ) {
    return 'Insufficient $APEBROKE balance to cover the required fee.';
  }
  return err?.shortMessage || err?.message || 'Transaction reverted on-chain.';
}

export const OFFICIAL_BROKERDESK_NFT_ART =
  'https://gateway.pinata.cloud/ipfs/bafybeicwhp57hmbskcqzvoeu4ru4no4omffi6s4yw5yzbatbz34cjsblgi';

/**
 * Helper to convert ipfs:// URI to robust HTTP gateway URL
 */
export function resolveIpfsUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('ipfs://')) {
    const cleanPath = url.replace(/^ipfs:\/\/?/, '');
    return `https://gateway.pinata.cloud/ipfs/${cleanPath}`;
  }
  if (url.includes('ipfs.io/ipfs/')) {
    return url.replace('https://ipfs.io/ipfs/', 'https://gateway.pinata.cloud/ipfs/');
  }
  return url;
}

/**
 * Reads NFT metadata directly from the smart contract on-chain.
 * 1. Queries tokenURI(tokenId) from the smart contract.
 * 2. Queries baseURI() as fallback.
 * 3. Fetches IPFS metadata JSON to extract the exact artwork.
 */
export async function fetchNftMetadataFromContract(tokenId, publicClient) {
  if (tokenId === undefined || tokenId === null) return null;

  let tokenUri = null;
  if (publicClient) {
    try {
      tokenUri = await publicClient.readContract({
        address: APE_BROKER_NFT_ADDRESS,
        abi: ERC721_ABI,
        functionName: 'tokenURI',
        args: [BigInt(tokenId)],
      });
    } catch (e) {
      try {
        tokenUri = await publicClient.readContract({
          address: APE_BROKER_NFT_ADDRESS,
          abi: [
            {
              name: 'baseURI',
              type: 'function',
              stateMutability: 'view',
              inputs: [],
              outputs: [{ type: 'string' }],
            },
          ],
          functionName: 'baseURI',
        });
      } catch (err) {
        // Fallback
      }
    }
  }

  if (!tokenUri) {
    tokenUri = 'ipfs://bafkreid72lakcttk7mqsruosts276qybzmk5t5auisgvxod2axqbtqg4ya';
  }

  try {
    const httpUri = resolveIpfsUrl(tokenUri);
    if (httpUri.startsWith('http')) {
      const metadata = await fetch(httpUri, { signal: AbortSignal.timeout(6000) }).then((r) =>
        r.json()
      );
      if (metadata && (metadata.image || metadata.image_url)) {
        const rawImg = metadata.image || metadata.image_url;
        return {
          tokenId: Number(tokenId),
          name: metadata.name ? `${metadata.name} #${tokenId}` : `Broker Desk #${tokenId}`,
          image: resolveIpfsUrl(rawImg) || '/brokerdesk-art.png',
          description: metadata.description || '',
          attributes: metadata.attributes || [],
        };
      }
    }
  } catch (err) {
    console.warn(`Contract metadata JSON fetch error for #${tokenId}:`, err);
  }

  return {
    tokenId: Number(tokenId),
    name: `Broker Desk #${tokenId}`,
    image: OFFICIAL_BROKERDESK_NFT_ART,
    description: 'BrokerDesk Operating NFT on Robinhood Chain',
    attributes: [],
  };
}

/**
 * Auto-detect user's Ape Broker NFTs using Alchemy NFT API on Robinhood Chain
 */
export async function fetchOwnedNftsFromAlchemy(ownerAddress) {
  if (!ownerAddress) return [];
  try {
    const url = `https://robinhood-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${ownerAddress}&contractAddresses[]=${APE_BROKER_NFT_ADDRESS}&withMetadata=true`;
    const res = await fetch(url).then((r) => r.json());
    if (res && res.ownedNfts && Array.isArray(res.ownedNfts)) {
      return res.ownedNfts.map((n) => {
        const rawImg =
          n.image?.cachedUrl ||
          n.image?.thumbnailUrl ||
          n.image?.pngUrl ||
          n.image?.originalUrl ||
          n.raw?.metadata?.image ||
          n.raw?.metadata?.image_url;
        const image = resolveIpfsUrl(rawImg) || '/brokerdesk-art.png';
        return {
          tokenId: Number(n.tokenId),
          name: n.name || n.title || `Broker Desk #${n.tokenId}`,
          image,
          description: n.description || '',
          attributes: n.raw?.metadata?.attributes || [],
        };
      });
    }
  } catch (err) {
    console.warn('Alchemy NFT fetch note:', err);
  }
  return [];
}

/**
 * Fetch metadata for an individual NFT token ID from Alchemy on Robinhood Chain
 */
export async function fetchSingleNftMetadataFromAlchemy(tokenId) {
  if (tokenId === undefined || tokenId === null) return null;
  try {
    const url = `https://robinhood-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTMetadata?contractAddress=${APE_BROKER_NFT_ADDRESS}&tokenId=${tokenId}&refreshCache=false`;
    const n = await fetch(url).then((r) => r.json());
    if (n && (n.tokenId !== undefined || n.name || n.image)) {
      const rawImg =
        n.image?.cachedUrl ||
        n.image?.thumbnailUrl ||
        n.image?.pngUrl ||
        n.image?.originalUrl ||
        n.raw?.metadata?.image ||
        n.raw?.metadata?.image_url;
      const image = resolveIpfsUrl(rawImg) || '/brokerdesk-art.png';
      return {
        tokenId: Number(tokenId),
        name: n.name || n.title || `Broker Desk #${tokenId}`,
        image,
        description: n.description || '',
        attributes: n.raw?.metadata?.attributes || [],
      };
    }
  } catch (err) {
    console.warn(`Single NFT metadata fetch note for #${tokenId}:`, err);
  }
  return null;
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
    availableRewardPool: 0n,
    epochEmissionBps: 500n,
    benchmarkWeightFloor: 2000n,
    lastDistributedEpoch: 0n,
    protocolFeeBalance: 0n,
    currentEpoch: 0n,
    secondsUntilNextEpoch: 0n,
    totalEthDeposited: 0n,
    totalEthClaimed: 0n,
    totalBoostFeesCollected: 0n,
    baseDeskWeight: 100n,
    baseBoostCost: 349693n * 10n ** 18n,
    contractOwner: ADMIN_ADDRESS,
    treasuryAddress: TREASURY_ADDRESS,
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
        activationFee,
        contractOwner,
        treasuryAddressOnChain,
        availableRewardPool,
        distParams,
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
          .catch(() => 18000n),
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
            functionName: 'activationFee',
          })
          .catch(() => 349693n * 10n ** 18n),
        publicClient
          .readContract({
            address: DESK_CONTRACT_ADDRESS,
            abi: deskDeployConfig.abi,
            functionName: 'owner',
          })
          .catch(() => null),
        publicClient
          .readContract({
            address: DESK_CONTRACT_ADDRESS,
            abi: deskDeployConfig.abi,
            functionName: 'treasury',
          })
          .catch(() => TREASURY_ADDRESS),
        publicClient
          .readContract({
            address: DESK_CONTRACT_ADDRESS,
            abi: deskDeployConfig.abi,
            functionName: 'getAvailableRewardPool',
          })
          .catch(() => 0n),
        publicClient
          .readContract({
            address: DESK_CONTRACT_ADDRESS,
            abi: deskDeployConfig.abi,
            functionName: 'getDistributionParameters',
          })
          .catch(() => [500n, 2000n, 0n]),
      ]);

      const [emissionBps, benchmarkWeight, lastEpoch] = distParams || [500n, 2000n, 0n];

      const isAdmin =
        Boolean(address) &&
        (address.toLowerCase() === ADMIN_ADDRESS.toLowerCase() ||
         address.toLowerCase() === '0xb8e3dfdd19b6bf35b9fd87f8373f7f82c53bc93c' ||
         (contractOwner && address.toLowerCase() === contractOwner.toLowerCase()));

      setGlobalStats({
        totalEligibleWeight,
        rewardPoolBalance,
        availableRewardPool: availableRewardPool || rewardPoolBalance,
        epochEmissionBps: emissionBps || 500n,
        benchmarkWeightFloor: benchmarkWeight || 2000n,
        lastDistributedEpoch: lastEpoch || 0n,
        protocolFeeBalance,
        currentEpoch,
        secondsUntilNextEpoch,
        totalEthDeposited,
        totalEthClaimed,
        totalBoostFeesCollected,
        baseDeskWeight,
        baseBoostCost: baseBoostCost || 349693n * 10n ** 18n,
        activationFee: activationFee || 349693n * 10n ** 18n,
        contractOwner: contractOwner || ADMIN_ADDRESS,
        treasuryAddress: treasuryAddressOnChain || TREASURY_ADDRESS,
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

      // 2. Auto-Detect Owned NFTs (Capped to max 5 desks / 5 NFTs):
      const nftMetadataMap = new Map();

      const alchemyNfts = await fetchOwnedNftsFromAlchemy(address);
      alchemyNfts.forEach((n) => {
        nftMetadataMap.set(n.tokenId, n);
      });

      // Direct on-chain NFT balance check as guaranteed fallback
      let onChainNftBalance = 0n;
      if (publicClient && address) {
        try {
          onChainNftBalance = await publicClient.readContract({
            address: APE_BROKER_NFT_ADDRESS,
            abi: ERC721_ABI,
            functionName: 'balanceOf',
            args: [address],
          });
        } catch (e) {
          // Ignore
        }
      }

      // Fetch indexed desks from Supabase
      const dbDesks = await fetchUserDesksFromDb(address);

      // Select strictly at most 5 token IDs:
      // Priority 1: User-tracked token ID
      // Priority 2: Known active desks in DB
      // Priority 3: Owned NFTs from Alchemy up to 5 total
      // Priority 4: On-chain detected token IDs if balance > 0
      const selectedTokenIds = new Set();

      trackedTokenIds.forEach((id) => {
        if (selectedTokenIds.size < 5) selectedTokenIds.add(id);
      });

      dbDesks
        .filter((d) => d.active)
        .forEach((d) => {
          if (selectedTokenIds.size < 5) selectedTokenIds.add(Number(d.token_id));
        });

      for (const n of alchemyNfts) {
        if (selectedTokenIds.size >= 5) break;
        selectedTokenIds.add(n.tokenId);
      }

      for (const d of dbDesks) {
        if (selectedTokenIds.size >= 5) break;
        selectedTokenIds.add(Number(d.token_id));
      }

      // If user owns NFTs on-chain but Alchemy had an indexing lag, scan token IDs
      if (onChainNftBalance > 0n && selectedTokenIds.size === 0 && publicClient) {
        const checkRange = Array.from({ length: 50 }, (_, i) => i + 1);
        const ownerChecks = await Promise.allSettled(
          checkRange.map((id) =>
            publicClient.readContract({
              address: APE_BROKER_NFT_ADDRESS,
              abi: ERC721_ABI,
              functionName: 'ownerOf',
              args: [BigInt(id)],
            })
          )
        );
        ownerChecks.forEach((res, idx) => {
          if (
            selectedTokenIds.size < 5 &&
            res.status === 'fulfilled' &&
            res.value &&
            res.value.toLowerCase() === address.toLowerCase()
          ) {
            selectedTokenIds.add(checkRange[idx]);
          }
        });
      }

      // If user has active desks on the Desk contract, ensure those active desks are included
      if (activeDeskCount > 0n && publicClient) {
        const checkRange = Array.from({ length: 50 }, (_, i) => i + 1);
        const deskOwnerChecks = await Promise.allSettled(
          checkRange.map((id) =>
            publicClient.readContract({
              address: DESK_CONTRACT_ADDRESS,
              abi: deskDeployConfig.abi,
              functionName: 'deskOwner',
              args: [BigInt(id)],
            })
          )
        );
        deskOwnerChecks.forEach((res, idx) => {
          if (
            selectedTokenIds.size < 5 &&
            res.status === 'fulfilled' &&
            res.value &&
            res.value.toLowerCase() === address.toLowerCase()
          ) {
            selectedTokenIds.add(checkRange[idx]);
          }
        });
      }

      // 3. For the selected token IDs (max 5), read on-chain Desk status
      const desksList = [];
      for (const tid of Array.from(selectedTokenIds)) {
        let deskData = { active: false, baseWeight: 100n };
        let boostCount = 0n;
        let currentWeight = 100n;
        let pendingEth = 0n;
        let nftOwner = null;
        let onChainEst = 0n;
        let isDeskActiveDirect = false;

        if (publicClient) {
          try {
            const [dData, bCount, cWeight, pEth, nOwner, estReward, activeDirect] = await Promise.all([
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
                .catch(() => null),
              publicClient
                .readContract({
                  address: DESK_CONTRACT_ADDRESS,
                  abi: deskDeployConfig.abi,
                  functionName: 'getEstimatedEpochReward',
                  args: [BigInt(tid)],
                })
                .catch(() => 0n),
              publicClient
                .readContract({
                  address: DESK_CONTRACT_ADDRESS,
                  abi: deskDeployConfig.abi,
                  functionName: 'isDeskActive',
                  args: [BigInt(tid)],
                })
                .catch(() => false),
            ]);

            deskData = dData;
            boostCount = bCount;
            currentWeight = cWeight;
            pendingEth = pEth;
            nftOwner = nOwner;
            onChainEst = estReward;
            isDeskActiveDirect = Boolean(activeDirect);
          } catch (e) {
            // Keep default
          }
        }

        // Parse getDesk returns (handles both viem array [active, boostCount, currentWeight, owner, pendingRewards] and object)
        let deskActiveFromData = false;
        let deskOwnerFromContract = null;
        if (Array.isArray(deskData) && deskData.length >= 5) {
          deskActiveFromData = Boolean(deskData[0]);
          if (boostCount === 0n && deskData[1] !== undefined) {
            boostCount = BigInt(deskData[1]);
          }
          if (currentWeight <= 100n && deskData[2]) {
            currentWeight = BigInt(deskData[2]);
          }
          if (deskData[3] && deskData[3] !== '0x0000000000000000000000000000000000000000') {
            deskOwnerFromContract = deskData[3];
          }
          if (pendingEth === 0n && deskData[4]) {
            pendingEth = BigInt(deskData[4]);
          }
        } else if (deskData && typeof deskData === 'object') {
          deskActiveFromData = Boolean(deskData.active);
          if (deskData.owner) deskOwnerFromContract = deskData.owner;
        }

        // On-chain status is the definitive source of truth for contract state
        const onChainActive = Boolean(isDeskActiveDirect || deskActiveFromData);
        const isActive = onChainActive;
        const currentBoosts = Number(boostCount);
        const nextBoostNumber = currentBoosts < 5 ? currentBoosts + 1 : 5;
        const baseBoost = globalStats.baseBoostCost || 349693n * 10n ** 18n;
        const nextBoostCost =
          currentBoosts < 5
            ? baseBoost * (2n * BigInt(nextBoostNumber))
            : 0n;

        // Dynamic 3-Factor Distribution Engine calculations (ApeBrokerDesk.sol exact math)
        const pool =
          (globalStats.availableRewardPool > 0n
            ? globalStats.availableRewardPool
            : globalStats.rewardPoolBalance) || 1000000000000000n; // Default to 0.001 ETH if initial state
        const emissionBps = globalStats.epochEmissionBps > 0n ? globalStats.epochEmissionBps : 500n;
        const floor = globalStats.benchmarkWeightFloor > 0n ? globalStats.benchmarkWeightFloor : 2000n;
        const deskWgt = BigInt(currentWeight > 0n ? currentWeight : 100n);
        const totalWgt = globalStats.totalEligibleWeight > 0n ? globalStats.totalEligibleWeight : deskWgt;
        const effectiveDivisor = totalWgt < floor ? floor : totalWgt;

        const epochDistributable = (pool * emissionBps) / 10000n;
        const computedEstReward = effectiveDivisor > 0n ? (epochDistributable * deskWgt) / effectiveDivisor : 0n;
        const estimatedEpochRewardEth = onChainEst > 0n ? onChainEst : computedEstReward;
        const estimatedDailyRewardEth = (estimatedEpochRewardEth * 24n) / 5n;
        const poolSharePct = effectiveDivisor > 0n ? (Number(deskWgt) / Number(effectiveDivisor)) * 100 : 0;

        // Check if caller is verified on-chain owner
        const isOwnerInAlchemy = alchemyNfts.some((n) => Number(n.tokenId) === tid);
        const isOwnerOnChainNft = Boolean(
          nftOwner && address && nftOwner.toLowerCase() === address.toLowerCase()
        );
        const isOwnerOnDeskContract = Boolean(
          deskOwnerFromContract && address && deskOwnerFromContract.toLowerCase() === address.toLowerCase()
        );
        const isOwnerOfNft = isOwnerOnChainNft || isOwnerInAlchemy || isOwnerOnDeskContract;

        let meta = nftMetadataMap.get(tid);
        if (!meta) {
          try {
            meta = await fetchSingleNftMetadataFromAlchemy(tid);
            if (!meta || !meta.image || meta.image.includes('/gifs/')) {
              meta = await fetchNftMetadataFromContract(tid, publicClient);
            }
            if (meta) {
              nftMetadataMap.set(tid, meta);
            }
          } catch (e) {
            meta = await fetchNftMetadataFromContract(tid, publicClient);
            if (meta) {
              nftMetadataMap.set(tid, meta);
            }
          }
        }

        desksList.push({
          tokenId: tid,
          name: meta?.name || `Broker Desk #${tid}`,
          image: meta?.image || '/brokerdesk-art.png',
          active: isActive,
          onChainActive,
          boostCount: currentBoosts,
          currentWeight: Number(currentWeight),
          baseWeight: Number(deskData?.baseWeight || 100n),
          pendingRewardsEth: pendingEth,
          estimatedEpochRewardEth,
          estimatedDailyRewardEth,
          poolSharePct,
          effectiveDivisor: Number(effectiveDivisor),
          nextBoostCost,
          nextBoostNumber,
          nftOwner: nftOwner || (isOwnerOfNft ? address : null),
          isOwnerOfNft,
        });

        // Sync active desk to Supabase if caller is owner and active on-chain
        if (isActive && isOwnerOfNft) {
          syncDeskToDb({
            tokenId: tid,
            owner: address,
            active: true,
            boostCount: currentBoosts,
            baseWeight: Number(deskData?.baseWeight || 100n),
            currentWeight: Number(currentWeight),
          }).catch(() => {});
        }
      }

      desksList.sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0) || a.tokenId - b.tokenId);
      setUserDesks(desksList.slice(0, 5));
    } catch (err) {
      console.warn('Error reading user data:', err);
    } finally {
      setIsScanningNfts(false);
    }
  }, [
    publicClient,
    address,
    trackedTokenIds,
    globalStats.baseBoostCost,
    globalStats.availableRewardPool,
    globalStats.rewardPoolBalance,
    globalStats.epochEmissionBps,
    globalStats.benchmarkWeightFloor,
    globalStats.totalEligibleWeight,
  ]);

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
        const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        if (receipt.status === 'reverted' || receipt.status === 0 || receipt.status === '0x0') {
          throw new Error('Approval transaction was reverted on-chain.');
        }
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
      if (!address) throw new Error('Account not connected.');

      // 1. Pre-flight simulation
      if (publicClient) {
        try {
          await publicClient.simulateContract({
            address: DESK_CONTRACT_ADDRESS,
            abi: deskDeployConfig.abi,
            functionName: 'activateDesk',
            args: [BigInt(tokenId)],
            account: address,
          });
        } catch (simErr) {
          throw new Error(decodeDeskError(simErr));
        }
      }

      // 2. Broadcast transaction
      const tx = await walletClient.writeContract({
        address: DESK_CONTRACT_ADDRESS,
        abi: deskDeployConfig.abi,
        functionName: 'activateDesk',
        args: [BigInt(tokenId)],
      });

      // 3. Wait for receipt and verify success
      let receipt = { blockNumber: 0, status: 'success' };
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        if (receipt.status === 'reverted' || receipt.status === 0 || receipt.status === '0x0') {
          throw new Error('Activation transaction was reverted on-chain. Desk was not activated.');
        }
      }

      // 4. Update database only after confirmed on-chain success
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
      if (!address) throw new Error('Account not connected.');

      // Pre-flight check: required $APEBROKE balance must be available
      if (costRaw && (userBalances?.apeBrokeBalance || 0n) < costRaw) {
        throw new Error(
          `Insufficient $APEBROKE balance. You need ${formatEther(costRaw)} $APEBROKE to apply this boost.`
        );
      }

      // 1. Pre-flight simulation
      if (publicClient) {
        try {
          await publicClient.simulateContract({
            address: DESK_CONTRACT_ADDRESS,
            abi: deskDeployConfig.abi,
            functionName: 'boostDesk',
            args: [BigInt(tokenId)],
            account: address,
          });
        } catch (simErr) {
          throw new Error(decodeDeskError(simErr));
        }
      }

      // 2. Broadcast transaction
      const tx = await walletClient.writeContract({
        address: DESK_CONTRACT_ADDRESS,
        abi: deskDeployConfig.abi,
        functionName: 'boostDesk',
        args: [BigInt(tokenId)],
      });

      // 3. Wait for receipt and verify success
      let receipt = { blockNumber: 0, status: 'success' };
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        if (receipt.status === 'reverted' || receipt.status === 0 || receipt.status === '0x0') {
          throw new Error('Boost transaction was reverted on-chain. Boost was not applied.');
        }
      }

      // 4. Update database only after confirmed on-chain success
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
    [walletClient, publicClient, address, userBalances, refetchGlobalStats, refetchUserData]
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
      let receipt = { blockNumber: 0, status: 'success' };
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        if (receipt.status === 'reverted' || receipt.status === 0 || receipt.status === '0x0') {
          throw new Error('Reward claim transaction was reverted on-chain.');
        }
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
      let receipt = { blockNumber: 0, status: 'success' };
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        if (receipt.status === 'reverted' || receipt.status === 0 || receipt.status === '0x0') {
          throw new Error('Claim all rewards transaction was reverted on-chain.');
        }
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
      let receipt = { blockNumber: 0, status: 'success' };
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        if (receipt.status === 'reverted' || receipt.status === 0 || receipt.status === '0x0') {
          throw new Error('Claim historical rewards transaction was reverted on-chain.');
        }
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
      let receipt = { blockNumber: 0, status: 'success' };
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        if (receipt.status === 'reverted' || receipt.status === 0 || receipt.status === '0x0') {
          throw new Error('Claim protocol fees transaction reverted on-chain.');
        }
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
      let receipt = { blockNumber: 0, status: 'success' };
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        if (receipt.status === 'reverted' || receipt.status === 0 || receipt.status === '0x0') {
          throw new Error('Reward deposit transaction reverted on-chain.');
        }
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

  /**
   * Action: Settle & Distribute Pending Epoch Rewards
   */
  const distributeEpochRewards = useCallback(async () => {
    if (!walletClient) throw new Error('Wallet not connected.');
    const tx = await walletClient.writeContract({
      address: DESK_CONTRACT_ADDRESS,
      abi: deskDeployConfig.abi,
      functionName: 'distributeEpochRewards',
    });
    let receipt = { blockNumber: 0, status: 'success' };
    if (publicClient) {
      receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      if (receipt.status === 'reverted' || receipt.status === 0 || receipt.status === '0x0') {
        throw new Error('Distribute epoch rewards transaction reverted on-chain.');
      }
    }
    await refetchGlobalStats();
    await refetchUserData();
    return { hash: tx, receipt };
  }, [walletClient, publicClient, refetchGlobalStats, refetchUserData]);

  /**
   * Admin: Set Epoch Emission Basis Points (e.g. 500 = 5%)
   */
  const adminSetEpochEmissionBps = useCallback(
    async (bps) => {
      if (!walletClient) throw new Error('Wallet not connected.');
      const tx = await walletClient.writeContract({
        address: DESK_CONTRACT_ADDRESS,
        abi: deskDeployConfig.abi,
        functionName: 'setEpochEmissionBps',
        args: [BigInt(bps)],
      });
      let receipt = { blockNumber: 0, status: 'success' };
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        if (receipt.status === 'reverted' || receipt.status === 0 || receipt.status === '0x0') {
          throw new Error('Set epoch emission bps transaction reverted on-chain.');
        }
      }
      await refetchGlobalStats();
      return { hash: tx, receipt };
    },
    [walletClient, publicClient, refetchGlobalStats]
  );

  /**
   * Admin: Set Benchmark Weight Floor (e.g. 2000 for 20 base desks)
   */
  const adminSetBenchmarkWeightFloor = useCallback(
    async (weight) => {
      if (!walletClient) throw new Error('Wallet not connected.');
      const tx = await walletClient.writeContract({
        address: DESK_CONTRACT_ADDRESS,
        abi: deskDeployConfig.abi,
        functionName: 'setBenchmarkWeightFloor',
        args: [BigInt(weight)],
      });
      let receipt = { blockNumber: 0, status: 'success' };
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        if (receipt.status === 'reverted' || receipt.status === 0 || receipt.status === '0x0') {
          throw new Error('Set benchmark weight floor transaction reverted on-chain.');
        }
      }
      await refetchGlobalStats();
      return { hash: tx, receipt };
    },
    [walletClient, publicClient, refetchGlobalStats]
  );

  /**
   * Admin: Distribute Immediate Rewards to Active Desks (Marketing / Stunts / Launch)
   * amountEth: specific ETH amount from pool (if '0' or empty, distributes 100% of available pool)
   * valueEth: optional new ETH to deposit with the call
   */
  const adminDistributeImmediateRewards = useCallback(
    async ({ amountEth = '0', valueEth = '0' } = {}) => {
      if (!walletClient) throw new Error('Wallet not connected.');
      const amountRaw = amountEth && parseFloat(amountEth) > 0 ? parseEther(amountEth) : 0n;
      const valueRaw = valueEth && parseFloat(valueEth) > 0 ? parseEther(valueEth) : 0n;

      const tx = await walletClient.writeContract({
        address: DESK_CONTRACT_ADDRESS,
        abi: deskDeployConfig.abi,
        functionName: 'distributeImmediateRewards',
        args: [amountRaw],
        value: valueRaw,
      });
      let receipt = { blockNumber: 0, status: 'success' };
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        if (receipt.status === 'reverted' || receipt.status === 0 || receipt.status === '0x0') {
          throw new Error('Distribute immediate rewards transaction reverted on-chain.');
        }
      }
      await refetchGlobalStats();
      await refetchUserData();
      return { hash: tx, receipt };
    },
    [walletClient, publicClient, refetchGlobalStats, refetchUserData]
  );

  /**
   * Admin: Set Base Boost Cost in $APEBROKE tokens (scales future boost costs)
   */
  const adminSetBaseBoostCost = useCallback(
    async (tokenAmount) => {
      if (!walletClient) throw new Error('Wallet not connected.');
      const costRaw = typeof tokenAmount === 'bigint' ? tokenAmount : parseEther(String(tokenAmount));
      const tx = await walletClient.writeContract({
        address: DESK_CONTRACT_ADDRESS,
        abi: deskDeployConfig.abi,
        functionName: 'setBaseBoostCost',
        args: [costRaw],
      });
      let receipt = { blockNumber: 0, status: 'success' };
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        if (receipt.status === 'reverted' || receipt.status === 0 || receipt.status === '0x0') {
          throw new Error('Set base boost cost transaction reverted on-chain.');
        }
      }
      await refetchGlobalStats();
      return { hash: tx, receipt };
    },
    [walletClient, publicClient, refetchGlobalStats]
  );

  /**
   * Admin: Set Desk Activation Fee in $APEBROKE tokens
   */
  const adminSetActivationFee = useCallback(
    async (tokenAmount) => {
      if (!walletClient) throw new Error('Wallet not connected.');
      const feeRaw = typeof tokenAmount === 'bigint' ? tokenAmount : parseEther(String(tokenAmount));
      const tx = await walletClient.writeContract({
        address: DESK_CONTRACT_ADDRESS,
        abi: deskDeployConfig.abi,
        functionName: 'setActivationFee',
        args: [feeRaw],
      });
      let receipt = { blockNumber: 0, status: 'success' };
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        if (receipt.status === 'reverted' || receipt.status === 0 || receipt.status === '0x0') {
          throw new Error('Set activation fee transaction reverted on-chain.');
        }
      }
      await refetchGlobalStats();
      return { hash: tx, receipt };
    },
    [walletClient, publicClient, refetchGlobalStats]
  );

  const isAdmin =
    Boolean(address) &&
    (address.toLowerCase() === ADMIN_ADDRESS.toLowerCase() ||
     address.toLowerCase() === '0xb8e3dfdd19b6bf35b9fd87f8373f7f82c53bc93c' ||
     (globalStats.contractOwner && address.toLowerCase() === globalStats.contractOwner.toLowerCase()) ||
     Boolean(globalStats.isAdmin));

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
    isAdmin,
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
    distributeEpochRewards,
    adminSetEpochEmissionBps,
    adminSetBenchmarkWeightFloor,
    adminDistributeImmediateRewards,
    adminSetBaseBoostCost,
    adminSetActivationFee,
  };
}
