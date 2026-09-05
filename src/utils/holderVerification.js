// Utility to verify $APEBROKERS token and ApeSyndicate NFT holdings on Robinhood Chain
// Rule: At least hold tokens or NFT. GTD spots allocated based on holding amount ($ USD & NFT count).

export const TOKEN_CONTRACT = '0xe0F384ebCede975342c5431aCad515b4A1B862cc';
export const NFT_CONTRACT = '0x5b9ca37d499eace8f526320d6edea10fb73d4ec6';

export const TOTAL_SPOTS = 9000;

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
 * Returns: {
 *   isEligible: boolean, // true if holding ANY tokens or NFT
 *   tokenBalance: number,
 *   tokenUsd: number,
 *   nftBalance: number,
 *   hasNft: boolean,
 *   hasToken: boolean,
 *   tokenPrice: number,
 *   isGtd: boolean, // Guaranteed GTD spot based on holding tier
 *   tier: string, // 'GOLDEN_GTD' | 'HIGH_PRIORITY' | 'STANDARD_HOLDER'
 *   chanceLabel: string,
 *   score: number,
 *   error?: string
 * }
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

    // Must at least hold some tokens or NFT to be eligible to apply
    const isEligible = hasToken || hasNft;

    // GTD Allocation Weight based on amount ($ holding & NFTs)
    // More held = higher tier and guaranteed allocation
    let isGtd = false;
    let tier = 'STANDARD_HOLDER';
    let chanceLabel = 'ENTRY CHANCE (HOLD MORE FOR GTD)';

    if (nftBalance >= 1 || tokenUsd >= 5.0) {
      isGtd = true;
      tier = 'GOLDEN_GTD';
      chanceLabel = '100% GUARANTEED (GTD SPOT)';
    } else if (tokenUsd >= 1.0) {
      isGtd = false;
      tier = 'HIGH_PRIORITY';
      chanceLabel = 'HIGH CHANCE (PRIORITY TIER)';
    } else if (isEligible) {
      isGtd = false;
      tier = 'STANDARD_HOLDER';
      chanceLabel = 'QUALIFIED (INCREASE HOLDINGS FOR GTD)';
    }

    const score = (nftBalance * 50) + (tokenUsd * 10);

    return {
      isEligible,
      tokenBalance,
      tokenUsd,
      nftBalance,
      hasNft,
      hasToken,
      tokenPrice,
      isGtd,
      tier,
      chanceLabel,
      score,
    };
  } catch (err) {
    console.error('Error verifying holder status:', err);
    return {
      isEligible: false,
      error: 'Failed to communicate with Robinhood Chain RPC. Please try again.',
    };
  }
}
