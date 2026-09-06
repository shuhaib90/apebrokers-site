// Utility to check $APEBROKERS token and ApeSyndicate NFT holdings on Robinhood Chain
// Rule: Everyone can apply!
// GTD Spot (Directly Eligible for Mint): Holders with >= $1.00 USD in $APEBROKERS OR >= 1 ApeSyndicate NFT.
// Standard WL: Non-holders or holding < $1.00 USD and 0 NFTs.

export const TOKEN_CONTRACT = '0xe0F384ebCede975342c5431aCad515b4A1B862cc';
export const NFT_CONTRACT = '0x5b9ca37d499eace8f526320d6edea10fb73d4ec6';

export const TOTAL_SPOTS = 9000;

export const GTD_WIN_RATE_PERCENT = 5; // 5% chance to win GTD from 9,000 spots

const ROBINHOOD_RPCS = [
  'https://robinhood-mainnet.g.alchemy.com/v2/alch_008u8jC_qTSIJvqgLbdGY',
];

export const DEFAULT_TOKEN_PRICE = 0.00000355; // Default DexScreener fallback price

/**
 * Fetch live $APEBROKERS price from DexScreener
 */
export async function fetchLiveTokenPrice() {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOKEN_CONTRACT}`);
    const data = await res.json();
    if (data && data.pairs && data.pairs[0] && data.pairs[0].priceUsd) {
      const price = parseFloat(data.pairs[0].priceUsd);
      if (price > 0) return price;
    }
  } catch (err) {
    console.warn('DexScreener price fetch note:', err);
  }
  return DEFAULT_TOKEN_PRICE;
}

/**
 * Helper to call JSON-RPC eth_call
 */
async function callRpc(to, data) {
  for (const rpcUrl of ROBINHOOD_RPCS) {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to, data }, 'latest'],
        }),
      });
      const json = await response.json();
      if (json && json.result && json.result !== '0x') {
        return json.result;
      }
    } catch (e) {
      console.warn(`RPC error on ${rpcUrl}:`, e);
    }
  }
  return '0x0';
}

function padAddress(addr) {
  return addr.toLowerCase().replace(/^0x/, '').padStart(64, '0');
}

/**
 * Verify wallet holdings on Robinhood Chain
 * Rule: Everyone can apply.
 * GTD Allocation (from 9,000 spots):
 * If wallet holds >= $1.00 USD in $APEBROKERS AND >= 1 ApeSyndicate NFT:
 * 5% chance to win a Guaranteed (GTD) mint spot.
 */
export async function verifyHolderStatus(walletAddress) {
  const clean = (walletAddress || '').trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(clean)) {
    return {
      isEligible: false,
      error: 'Invalid wallet address format (must start with 0x and be 42 characters).',
    };
  }

  try {
    const data = '0x70a08231' + padAddress(clean);

    const [tokenHex, nftHex, tokenPrice] = await Promise.all([
      callRpc(TOKEN_CONTRACT, data),
      callRpc(NFT_CONTRACT, data),
      fetchLiveTokenPrice(),
    ]);

    let tokenBalance = 0;
    try {
      if (tokenHex && tokenHex !== '0x' && tokenHex !== '0x0') {
        tokenBalance = Number(BigInt(tokenHex)) / 1e18;
      }
    } catch {
      tokenBalance = 0;
    }

    let nftBalance = 0;
    try {
      if (nftHex && nftHex !== '0x' && nftHex !== '0x0') {
        nftBalance = Number(BigInt(nftHex));
      }
    } catch {
      nftBalance = 0;
    }

    const tokenUsd = tokenBalance * tokenPrice;
    const hasToken = tokenBalance > 0;
    const hasNft = nftBalance > 0;
    const hasMinToken = tokenUsd >= 1.0; // Min $1.00 USD in tokens
    const hasMinNft = nftBalance >= 1;   // Min 1 ApeSyndicate NFT
    const qualifiesForGtdDraw = hasMinToken && hasMinNft; // Must hold BOTH $1+ token + 1 NFT

    // Dynamic Scaling Win Chance:
    // $1.00 = 5% chance
    // $10.00 = 50% chance
    // $20.00+ = 100% Guaranteed GTD
    // Formula: min(100, max(5, floor(tokenUsd * 5) + extraNftBonus))
    let winChancePercent = 0;
    if (qualifiesForGtdDraw) {
      const tokenChance = Math.floor(tokenUsd * 5);
      const extraNftBonus = Math.max(0, (nftBalance - 1) * 10);
      winChancePercent = Math.min(100, Math.max(5, tokenChance + extraNftBonus));
    }

    // Deterministic 0-99 roll based on wallet address hash
    let roll = 0;
    for (let i = 0; i < clean.length; i++) {
      roll = (roll * 31 + clean.charCodeAt(i)) % 100;
    }
    const winRoll = roll;
    const isGtd = qualifiesForGtdDraw && (winChancePercent >= 100 || winRoll < winChancePercent);

    const tier = isGtd ? 'GOLDEN_GTD' : 'STANDARD_WL';
    const tierLabel = isGtd
      ? `GUARANTEED (GTD) - ${winChancePercent}% CHANCE WINNER!`
      : qualifiesForGtdDraw
        ? `STANDARD WHITELIST (WL) - ${winChancePercent}% GTD DRAW ENTERED`
        : 'STANDARD WHITELIST (WL)';

    return {
      isEligible: true, // Everyone can apply
      tokenBalance,
      tokenUsd,
      nftBalance,
      hasNft,
      hasToken,
      hasMinToken,
      hasMinNft,
      qualifiesForGtdDraw,
      winChancePercent,
      winRoll,
      isGtd,
      tier,
      tierLabel,
      tokenPrice,
    };
  } catch (err) {
    console.error('Error verifying holder status:', err);
    return {
      isEligible: true,
      tokenBalance: 0,
      tokenUsd: 0,
      nftBalance: 0,
      hasNft: false,
      hasToken: false,
      hasMinToken: false,
      hasMinNft: false,
      qualifiesForGtdDraw: false,
      winRoll: 99,
      isGtd: false,
      tier: 'STANDARD_WL',
      tierLabel: 'STANDARD WHITELIST (WL)',
      tokenPrice: DEFAULT_TOKEN_PRICE,
      warning: 'Could not fetch on-chain balances. Application will be submitted as Standard WL.',
    };
  }
}
