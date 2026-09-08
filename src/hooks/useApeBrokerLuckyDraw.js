import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { formatEther, parseEther, maxUint256 } from 'viem';
import luckyDrawDeployConfig from '../config/apeBrokerLuckyDraw.json';
import { APEBROKE_TOKEN_ADDRESS, APE_BROKER_NFT_ADDRESS, ADMIN_ADDRESS } from './useApeBrokerDesk';
import { supabase } from '../utils/supabase';

export const LUCKY_DRAW_CONTRACT_ADDRESS =
  import.meta.env.VITE_LUCKY_DRAW_CONTRACT_ADDRESS ||
  luckyDrawDeployConfig.contractAddress ||
  '0xA3a3eA40cB33a6B1Bcdc791FfC4d4f4022bC7179';

const ERC20_ABI = [
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

const ERC721_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
];

// Clean error message formatter for human-readable wallet and on-chain errors
export function formatWeb3Error(err) {
  if (!err) return 'Transaction failed.';
  if (typeof err === 'string') return err;
  if (err.shortMessage) return err.shortMessage;
  if (err.cause?.shortMessage) return err.cause.shortMessage;
  if (err.message) {
    if (
      err.message.includes('User rejected') ||
      err.message.includes('user rejected') ||
      err.message.includes('rejected the request')
    ) {
      return 'Transaction was rejected in your wallet.';
    }
    if (err.message.includes('payload too large') || err.message.includes('Payload Too Large')) {
      return 'RPC error: Payload too large. Image stored off-chain.';
    }
    if (err.message.includes('insufficient funds')) {
      return 'Insufficient ETH gas funds to execute transaction.';
    }
    return err.message.split('\n')[0].replace(/^Error:\s*/, '').substring(0, 160);
  }
  return 'Transaction failed on-chain.';
}

const DRAW_IMAGES_KEY = 'apebroker_draw_images';

// Save draw image off-chain in Supabase and local cache
export async function saveDrawImageOffchain(drawId, imageUrl) {
  if (!drawId || !imageUrl) return;
  const idStr = String(drawId);
  try {
    const local = JSON.parse(localStorage.getItem(DRAW_IMAGES_KEY) || '{}');
    local[idStr] = imageUrl;
    localStorage.setItem(DRAW_IMAGES_KEY, JSON.stringify(local));
  } catch (e) {}

  try {
    const { data } = await supabase
      .from('apebrokers_settings')
      .select('value')
      .eq('key', 'lucky_draw_metadata')
      .single();
    const current = (data && data.value && data.value.images) ? data.value.images : {};
    current[idStr] = imageUrl;
    await supabase.from('apebrokers_settings').upsert({
      key: 'lucky_draw_metadata',
      value: { images: current },
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not sync draw image to Supabase:', err);
  }
}

// Load all draw images from Supabase and local cache
export async function loadDrawImagesOffchain() {
  let map = {};
  try {
    map = JSON.parse(localStorage.getItem(DRAW_IMAGES_KEY) || '{}');
  } catch (e) {}

  try {
    const { data } = await supabase
      .from('apebrokers_settings')
      .select('value')
      .eq('key', 'lucky_draw_metadata')
      .single();
    if (data && data.value && data.value.images) {
      map = { ...map, ...data.value.images };
      try {
        localStorage.setItem(DRAW_IMAGES_KEY, JSON.stringify(map));
      } catch (e) {}
    }
  } catch (err) {}
  return map;
}

// No default demo draws - all draws are dynamically loaded from Robinhood EVM
const DEFAULT_SAMPLE_DRAWS = [];

export function useApeBrokerLuckyDraw() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [draws, setDraws] = useState([]);
  const [totalDraws, setTotalDraws] = useState(0);
  const [userBalances, setUserBalances] = useState({
    apeBrokeBalance: 0n,
    ethBalance: 0n,
    nftBalance: 0n,
    allowance: 0n,
    isEligible: false,
  });
  const [userTicketsByDraw, setUserTicketsByDraw] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [availableTicketRevenue, setAvailableTicketRevenue] = useState(0n);

  const isAdmin =
    Boolean(address) &&
    (address.toLowerCase() === ADMIN_ADDRESS.toLowerCase() ||
     address.toLowerCase() === '0xb8e3dfdd19b6bf35b9fd87f8373f7f82c53bc93c');

  // Sync cached tickets when address is available
  useEffect(() => {
    if (address) {
      try {
        const cached = localStorage.getItem(`apebroker_user_tickets_${address.toLowerCase()}`);
        if (cached) {
          setUserTicketsByDraw(JSON.parse(cached));
        }
      } catch (e) {}
    } else {
      setUserTicketsByDraw({});
    }
  }, [address]);

  // Load User Balances, NFT gating check, and on-chain tickets per draw
  const fetchUserData = useCallback(async () => {
    if (!address || !publicClient) {
      setUserBalances({
        apeBrokeBalance: 0n,
        ethBalance: 0n,
        nftBalance: 0n,
        allowance: 0n,
        isEligible: false,
      });
      setUserTicketsByDraw({});
      return;
    }

    try {
      const [tokenBal, ethBal, nftBal, allowance, totalCount] = await Promise.all([
        publicClient
          .readContract({
            address: APEBROKE_TOKEN_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address],
          })
          .catch(() => 0n),
        publicClient.getBalance({ address }).catch(() => 0n),
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
            functionName: 'allowance',
            args: [address, LUCKY_DRAW_CONTRACT_ADDRESS],
          })
          .catch(() => 0n),
        publicClient
          .readContract({
            address: LUCKY_DRAW_CONTRACT_ADDRESS,
            abi: luckyDrawDeployConfig.abi,
            functionName: 'totalDrawsCount',
          })
          .catch(() => 0n),
      ]);

      setUserBalances({
        apeBrokeBalance: tokenBal,
        ethBalance: ethBal,
        nftBalance: nftBal,
        allowance: allowance,
        isEligible: nftBal >= 1n,
      });

      // Query on-chain user ticket balance for all draws
      if (totalCount && totalCount > 0n) {
        const ticketPromises = [];
        for (let i = 1n; i <= totalCount; i++) {
          const drawIdNum = Number(i);
          ticketPromises.push(
            publicClient
              .readContract({
                address: LUCKY_DRAW_CONTRACT_ADDRESS,
                abi: luckyDrawDeployConfig.abi,
                functionName: 'getUserTickets',
                args: [i, address],
              })
              .then((t) => ({ drawId: drawIdNum, count: Number(t || 0n) }))
              .catch(() => ({ drawId: drawIdNum, count: 0 }))
          );
        }

        const ticketResults = await Promise.all(ticketPromises);
        const map = {};
        ticketResults.forEach((r) => {
          map[r.drawId] = r.count;
        });

        setUserTicketsByDraw(map);
        try {
          localStorage.setItem(`apebroker_user_tickets_${address.toLowerCase()}`, JSON.stringify(map));
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Error reading lucky draw user data:', err);
    }
  }, [address, publicClient]);

  // Load Draws from On-Chain Contract & merge with off-chain images
  const fetchDraws = useCallback(async () => {
    setIsLoading(true);
    let onChainLoaded = false;

    // Load off-chain images
    const drawImages = await loadDrawImagesOffchain();

    // Read deleted IDs and metadata overrides
    let deletedIds = [];
    try {
      deletedIds = JSON.parse(localStorage.getItem('apebroker_deleted_draw_ids') || '[]');
    } catch (e) {}

    let overrides = {};
    try {
      overrides = JSON.parse(localStorage.getItem('apebroker_draw_metadata_overrides') || '{}');
    } catch (e) {}

    if (publicClient && LUCKY_DRAW_CONTRACT_ADDRESS) {
      try {
        const count = await publicClient
          .readContract({
            address: LUCKY_DRAW_CONTRACT_ADDRESS,
            abi: luckyDrawDeployConfig.abi,
            functionName: 'totalDrawsCount',
          })
          .catch(() => 0n);

        if (count && count > 0n) {
          const drawPromises = [];
          for (let i = 1n; i <= count; i++) {
            drawPromises.push(
              publicClient
                .readContract({
                  address: LUCKY_DRAW_CONTRACT_ADDRESS,
                  abi: luckyDrawDeployConfig.abi,
                  functionName: 'getDraw',
                  args: [i],
                })
                .catch(() => null)
            );
          }

          const rawResults = await Promise.all(drawPromises);
          const validDraws = rawResults
            .filter((d) => d !== null && d.drawId > 0n)
            .map((d) => {
              const id = Number(d.drawId);
              const ov = overrides[String(id)] || {};
              const resolvedImage =
                drawImages[String(id)] ||
                ov.imageUrl ||
                d.imageUrl ||
                'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80';

              return {
                drawId: id,
                title: ov.title || d.title,
                prizeDescription: ov.prizeDescription || d.prizeDescription,
                prizeCategory: ov.prizeCategory !== undefined ? Number(ov.prizeCategory) : Number(d.prizeCategory),
                imageUrl: resolvedImage,
                ticketPriceApe: ov.ticketPriceApe ? parseEther(String(ov.ticketPriceApe)) : d.ticketPriceApe,
                maxTickets: ov.maxTickets !== undefined ? Number(ov.maxTickets) : Number(d.maxTickets),
                maxTicketsPerWallet: ov.maxTicketsPerWallet !== undefined ? Number(ov.maxTicketsPerWallet) : Number(d.maxTicketsPerWallet),
                minNftRequired: ov.minNftRequired !== undefined ? Number(ov.minNftRequired) : Number(d.minNftRequired),
                startTime: Number(d.startTime),
                endTime: Number(d.endTime),
                status: ov.status !== undefined ? Number(ov.status) : Number(d.status),
                totalTicketsSold: Number(d.totalTicketsSold),
                totalRevenueCollected: d.totalRevenueCollected,
                selectionMode: Number(d.selectionMode),
                winnerCount: Number(d.winnerCount || 1),
                winner: d.winner,
                winners: Array.isArray(d.winners) && d.winners.length > 0
                  ? d.winners
                  : (d.winner && d.winner !== '0x0000000000000000000000000000000000000000' ? [d.winner] : []),
                winningTicketId: Number(d.winningTicketId || 0),
                winningTicketIds: Array.isArray(d.winningTicketIds) ? d.winningTicketIds.map(Number) : [],
                selectedTimestamp: Number(d.selectedTimestamp),
                selectedByAdmin: d.selectedByAdmin,
                prizeStatus: Number(d.prizeStatus),
                prizeFulfillmentProof: d.prizeFulfillmentProof,
                revenueWithdrawn: d.revenueWithdrawn,
                noDeadline: Boolean(ov.noDeadline),
              };
            });

          const nonDeleted = validDraws.filter((d) => !deletedIds.includes(d.drawId));

          setDraws(nonDeleted);
          setTotalDraws(nonDeleted.length);
          onChainLoaded = true;

          try {
            localStorage.setItem(
              'apebroker_lucky_draws_cache',
              JSON.stringify(nonDeleted, (k, v) => (typeof v === 'bigint' ? v.toString() : v))
            );
          } catch (e) {}

          // Read available unwithdrawn ticket revenue
          const unwithdrawn = await publicClient
            .readContract({
              address: LUCKY_DRAW_CONTRACT_ADDRESS,
              abi: luckyDrawDeployConfig.abi,
              functionName: 'getAvailableTicketRevenueBalance',
            })
            .catch(() => 0n);
          setAvailableTicketRevenue(unwithdrawn);
        } else {
          // Zero on-chain draws created yet
          setDraws([]);
          setTotalDraws(0);
          onChainLoaded = true;
        }
      } catch (err) {
        console.warn('Could not query on-chain lucky draw contract:', err.message);
      }
    }

    // If on-chain query failed, load from cached draws if any
    if (!onChainLoaded) {
      try {
        const cached = localStorage.getItem('apebroker_lucky_draws_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const cleaned = parsed
              .filter((d) => d && !deletedIds.includes(d.drawId))
              .map((d) => ({
                ...d,
                imageUrl: drawImages[String(d.drawId)] || d.imageUrl,
                ticketPriceApe: BigInt(d.ticketPriceApe || 0),
                totalRevenueCollected: BigInt(d.totalRevenueCollected || 0),
              }));
            setDraws(cleaned);
            setTotalDraws(cleaned.length);
          }
        }
      } catch (e) {}
    }

    setIsLoading(false);
  }, [publicClient]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    fetchDraws();
  }, [fetchDraws]);

  // Action: Approve $APEBROKE
  const approveApebroke = async (amount = maxUint256) => {
    if (!walletClient || !address) throw new Error('Wallet not connected.');
    
    // Gas check
    if (userBalances.ethBalance < 50000000000000n) {
      throw new Error('Insufficient ETH for network gas fee on Robinhood EVM.');
    }

    try {
      const tx = await walletClient.writeContract({
        address: APEBROKE_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [LUCKY_DRAW_CONTRACT_ADDRESS, amount],
      });

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
        if (receipt.status !== 'success') {
          throw new Error('Approval transaction reverted on-chain.');
        }
      }
      await fetchUserData();
      return tx;
    } catch (err) {
      throw new Error(formatWeb3Error(err));
    }
  };

  // Action: Buy Tickets (Fully On-Chain Verified)
  const buyTickets = async (drawId, ticketCount) => {
    if (!walletClient || !address) throw new Error('Wallet not connected.');
    if (!userBalances.isEligible) {
      throw new Error('You must hold at least 1 Ape Broker NFT to enter lucky draws.');
    }

    const targetDraw = draws.find((d) => d.drawId === drawId);
    if (!targetDraw) throw new Error('Draw not found.');

    const totalCost = BigInt(ticketCount) * BigInt(targetDraw.ticketPriceApe);
    if (userBalances.apeBrokeBalance < totalCost) {
      throw new Error(`Insufficient $APEBROKE balance. Required: ${Number(formatEther(totalCost)).toLocaleString()} $APE`);
    }

    try {
      const txHash = await walletClient.writeContract({
        address: LUCKY_DRAW_CONTRACT_ADDRESS,
        abi: luckyDrawDeployConfig.abi,
        functionName: 'buyTickets',
        args: [BigInt(drawId), BigInt(ticketCount)],
      });

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status !== 'success') {
          throw new Error('Ticket purchase transaction reverted on-chain.');
        }
      }

      await fetchDraws();
      await fetchUserData();

      setUserTicketsByDraw((prev) => ({
        ...prev,
        [drawId]: (prev[drawId] || 0) + ticketCount,
      }));

      return { hash: txHash };
    } catch (err) {
      throw new Error(formatWeb3Error(err));
    }
  };

  // Admin Action: Create Draw (No large image in contract payload, verified on-chain)
  const adminCreateDraw = async (drawData) => {
    if (!walletClient || !address) throw new Error('Wallet not connected.');

    const ticketPriceWei = parseEther(String(drawData.ticketPriceApe || '50000'));
    const isNoDead = Boolean(drawData.noDeadline);
    const durationSec = isNoDead ? 315360000 : Number(drawData.durationDays || 2) * 86400;

    let txHash = '';
    try {
      // NOTE: "no need to depoly image on contracte"
      // Sending imageUrl as '' keeps the payload tiny (a few hundred bytes),
      // completely eliminating "payload too large" error from Rabby / Ethereum RPC!
      txHash = await walletClient.writeContract({
        address: LUCKY_DRAW_CONTRACT_ADDRESS,
        abi: luckyDrawDeployConfig.abi,
        functionName: 'createDraw',
        args: [
          {
            title: drawData.title,
            prizeDescription: drawData.prizeDescription,
            prizeCategory: Number(drawData.prizeCategory || 0),
            imageUrl: '', // EMPTY: Never deploy base64 or heavy image bytes to contract!
            ticketPriceApe: ticketPriceWei,
            maxTickets: BigInt(drawData.maxTickets || 0),
            maxTicketsPerWallet: BigInt(drawData.maxTicketsPerWallet || 0),
            minNftRequired: BigInt(drawData.minNftRequired || 1),
            durationSeconds: BigInt(durationSec),
            winnerCount: BigInt(drawData.winnerCount || 1),
          },
        ],
      });
    } catch (err) {
      throw new Error(formatWeb3Error(err));
    }

    // Wait for on-chain receipt & verify success
    if (publicClient) {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== 'success') {
        throw new Error('Create Draw transaction reverted on-chain.');
      }
    }

    // Query on-chain count to identify the new draw ID
    let newDrawId = draws.length + 1;
    if (publicClient) {
      try {
        const count = await publicClient.readContract({
          address: LUCKY_DRAW_CONTRACT_ADDRESS,
          abi: luckyDrawDeployConfig.abi,
          functionName: 'totalDrawsCount',
        });
        if (count && count > 0n) {
          newDrawId = Number(count);
        }
      } catch (e) {}
    }

    // Save image off-chain in Supabase & localStorage so all users see it
    if (drawData.imageUrl) {
      await saveDrawImageOffchain(newDrawId, drawData.imageUrl);
    }

    // If no-deadline was selected, record metadata override
    if (isNoDead) {
      try {
        const overrides = JSON.parse(localStorage.getItem('apebroker_draw_metadata_overrides') || '{}');
        overrides[String(newDrawId)] = {
          ...overrides[String(newDrawId)],
          noDeadline: true,
        };
        localStorage.setItem('apebroker_draw_metadata_overrides', JSON.stringify(overrides));
      } catch (e) {}
    }

    // Refresh draws from blockchain
    await fetchDraws();

    return { hash: txHash, drawId: newDrawId };
  };

  // Admin Action: Select Winner Randomly (Mode 1)
  const adminSelectWinnerRandom = async (drawId) => {
    if (!walletClient || !address) throw new Error('Wallet not connected.');

    let txHash = '';
    try {
      txHash = await walletClient.writeContract({
        address: LUCKY_DRAW_CONTRACT_ADDRESS,
        abi: luckyDrawDeployConfig.abi,
        functionName: 'selectWinnerRandom',
        args: [BigInt(drawId)],
      });
    } catch (err) {
      throw new Error(formatWeb3Error(err));
    }

    if (publicClient) {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== 'success') {
        throw new Error('Select winner transaction reverted on-chain.');
      }
    }

    await fetchDraws();
    return { hash: txHash };
  };

  // Admin Action: Select Multiple Winners Manually (Mode 2)
  const adminSelectWinnersManual = async (drawId, winnersArray) => {
    if (!walletClient || !address) throw new Error('Wallet not connected.');
    if (!winnersArray || !Array.isArray(winnersArray) || winnersArray.length === 0) {
      throw new Error('Please provide candidate winner address(es).');
    }

    let txHash = '';
    try {
      txHash = await walletClient.writeContract({
        address: LUCKY_DRAW_CONTRACT_ADDRESS,
        abi: luckyDrawDeployConfig.abi,
        functionName: 'selectWinnersManual',
        args: [BigInt(drawId), winnersArray],
      });
    } catch (err) {
      throw new Error(formatWeb3Error(err));
    }

    if (publicClient) {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== 'success') {
        throw new Error('Manual winner selection reverted on-chain.');
      }
    }

    await fetchDraws();
    return { hash: txHash };
  };

  // Admin Action: Select Single Winner Manually (wrapper)
  const adminSelectWinnerManual = async (drawId, winnerAddress) => {
    return adminSelectWinnersManual(drawId, [winnerAddress]);
  };

  // Admin Action: Update Prize Status & Tracking Proof
  const adminUpdatePrizeStatus = async (drawId, status, proofOrTx) => {
    if (!walletClient || !address) throw new Error('Wallet not connected.');

    let txHash = '';
    try {
      txHash = await walletClient.writeContract({
        address: LUCKY_DRAW_CONTRACT_ADDRESS,
        abi: luckyDrawDeployConfig.abi,
        functionName: 'updatePrizeStatus',
        args: [BigInt(drawId), status, proofOrTx || ''],
      });
    } catch (err) {
      throw new Error(formatWeb3Error(err));
    }

    if (publicClient) {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== 'success') {
        throw new Error('Update prize status transaction reverted on-chain.');
      }
    }

    await fetchDraws();
    return { hash: txHash };
  };

  // Admin Action: Claim All Ticket Revenue Across Draws
  const adminClaimAllTicketRevenue = async (recipient = ADMIN_ADDRESS) => {
    if (!walletClient || !address) throw new Error('Wallet not connected.');

    let txHash = '';
    try {
      txHash = await walletClient.writeContract({
        address: LUCKY_DRAW_CONTRACT_ADDRESS,
        abi: luckyDrawDeployConfig.abi,
        functionName: 'claimAllTicketRevenue',
        args: [recipient],
      });
    } catch (err) {
      throw new Error(formatWeb3Error(err));
    }

    if (publicClient) {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== 'success') {
        throw new Error('Claim revenue transaction reverted on-chain.');
      }
    }

    await fetchDraws();
    setAvailableTicketRevenue(0n);
    return { hash: txHash };
  };

  // Admin Action: Customize / Update Ticket Fee for a Draw
  const adminSetTicketPrice = async (drawId, newTicketPriceApe) => {
    if (!walletClient || !address) throw new Error('Wallet not connected.');
    const priceWei = typeof newTicketPriceApe === 'bigint' ? newTicketPriceApe : parseEther(String(newTicketPriceApe));

    let txHash = '';
    try {
      txHash = await walletClient.writeContract({
        address: LUCKY_DRAW_CONTRACT_ADDRESS,
        abi: luckyDrawDeployConfig.abi,
        functionName: 'setTicketPrice',
        args: [BigInt(drawId), priceWei],
      });
    } catch (err) {
      throw new Error(formatWeb3Error(err));
    }

    if (publicClient) {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== 'success') {
        throw new Error('Set ticket price reverted on-chain.');
      }
    }

    await fetchDraws();
    return { hash: txHash };
  };

  // Admin Action: Cancel Draw
  const adminCancelDraw = async (drawId, reason = 'Cancelled by admin') => {
    if (!walletClient || !address) throw new Error('Wallet not connected.');

    let txHash = '';
    try {
      txHash = await walletClient.writeContract({
        address: LUCKY_DRAW_CONTRACT_ADDRESS,
        abi: luckyDrawDeployConfig.abi,
        functionName: 'cancelDraw',
        args: [BigInt(drawId), reason],
      });
    } catch (err) {
      throw new Error(formatWeb3Error(err));
    }

    if (publicClient) {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== 'success') {
        throw new Error('Cancel draw reverted on-chain.');
      }
    }

    await fetchDraws();
    return { success: true, hash: txHash };
  };

  // Admin Action: Delete Draw
  const adminDeleteDraw = async (drawId) => {
    if (!walletClient || !address) throw new Error('Wallet not connected.');

    const target = draws.find((d) => d.drawId === drawId);
    let txHash = '';
    if (target && (target.status === 0 || target.status === 1)) {
      try {
        txHash = await walletClient.writeContract({
          address: LUCKY_DRAW_CONTRACT_ADDRESS,
          abi: luckyDrawDeployConfig.abi,
          functionName: 'cancelDraw',
          args: [BigInt(drawId), 'Deleted by admin'],
        });
        if (publicClient) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
          if (receipt.status !== 'success') {
            throw new Error('Cancel draw reverted on-chain.');
          }
        }
      } catch (err) {
        throw new Error(formatWeb3Error(err));
      }
    }

    // Save as deleted in local storage
    try {
      const deletedIds = JSON.parse(localStorage.getItem('apebroker_deleted_draw_ids') || '[]');
      if (!deletedIds.includes(drawId)) {
        deletedIds.push(drawId);
        localStorage.setItem('apebroker_deleted_draw_ids', JSON.stringify(deletedIds));
      }
    } catch (e) {}

    await fetchDraws();
    return { success: true, hash: txHash };
  };

  // Admin Action: Edit Draw
  const adminEditDraw = async (drawId, updatedData) => {
    if (!walletClient || !address) throw new Error('Wallet not connected.');

    // If ticket fee changed, update on-chain via setTicketPrice
    if (updatedData.ticketPriceApe) {
      const newPriceWei = parseEther(String(updatedData.ticketPriceApe));
      try {
        const tx = await walletClient.writeContract({
          address: LUCKY_DRAW_CONTRACT_ADDRESS,
          abi: luckyDrawDeployConfig.abi,
          functionName: 'setTicketPrice',
          args: [BigInt(drawId), newPriceWei],
        });
        if (publicClient) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
          if (receipt.status !== 'success') {
            throw new Error('Set ticket price reverted on-chain.');
          }
        }
      } catch (e) {
        throw new Error(formatWeb3Error(e));
      }
    }

    // Save updated image offchain
    if (updatedData.imageUrl) {
      await saveDrawImageOffchain(drawId, updatedData.imageUrl);
    }

    // Save custom metadata overrides
    try {
      const overrides = JSON.parse(localStorage.getItem('apebroker_draw_metadata_overrides') || '{}');
      overrides[String(drawId)] = {
        ...overrides[String(drawId)],
        ...updatedData,
      };
      localStorage.setItem('apebroker_draw_metadata_overrides', JSON.stringify(overrides));
    } catch (e) {}

    await fetchDraws();
    return { success: true };
  };

  return {
    draws,
    totalDraws,
    userBalances,
    userTicketsByDraw,
    isLoading,
    isAdmin,
    availableTicketRevenue,
    refetchData: () => {
      fetchUserData();
      fetchDraws();
    },
    approveApebroke,
    buyTickets,
    adminCreateDraw,
    adminSetTicketPrice,
    adminSelectWinnerRandom,
    adminSelectWinnerManual,
    adminSelectWinnersManual,
    adminUpdatePrizeStatus,
    adminClaimAllTicketRevenue,
    adminCancelDraw,
    adminDeleteDraw,
    adminEditDraw,
  };
}
