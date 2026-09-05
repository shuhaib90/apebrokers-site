// Utility to check $APEBROKERS token and ApeSyndicate NFT holdings on Robinhood Chain
// Rule: Everyone can apply!
// GTD Spot (Directly Eligible for Mint): Holders with >= $1.00 USD in $APEBROKERS OR >= 1 ApeSyndicate NFT.
// Standard WL: Non-holders or holding < $1.00 USD and 0 NFTs.

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
 *   isEligible: boolean, // true for everyone with a valid address
 *   tokenBalance: number,
 *   tokenUsd: number,
 *   nftBalance: number,
 *   hasNft: boolean,
 *   hasToken: boolean,
 *   hasMinToken: boolean, // >= $1.00 USD
 *   isGtd: boolean, // true if holding >= $1 USD tokens OR >= 1 NFT
 *   tier: 'GOLDEN_GTD' | 'STANDARD_WL',
 *   tierLabel: string,
 *   tokenPrice: number,
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
    const hasMinToken = tokenUsd >= 1.0; // Min $1.00 USD for GTD

    // Qualified for GTD if holding >= $1.00 in tokens OR >= 1 NFT
    const isGtd = hasMinToken || hasNft;

    const tier = isGtd ? 'GOLDEN_GTD' : 'STANDARD_WL';
    const tierLabel = isGtd ? 'GUARANTEED (GTD) - DIRECTLY ELIGIBLE FOR MINT' : 'STANDARD WHITELIST (WL)';

    return {
      isEligible: true, // Everyone can apply
      tokenBalance,
      tokenUsd,
      nftBalance,
      hasNft,
      hasToken,
      hasMinToken,
      isGtd,
      tier,
      tierLabel,
      tokenPrice,
    };
  } catch (err) {
    console.error('Error verifying holder status:', err);
    // If RPC fails, allow standard application submission anyway!
    return {
      isEligible: true,
      tokenBalance: 0,
      tokenUsd: 0,
      nftBalance: 0,
      hasNft: false,
      hasToken: false,
      hasMinToken: false,
      isGtd: false,
      tier: 'STANDARD_WL',
      tierLabel: 'STANDARD WHITELIST (WL)',
      tokenPrice: DEFAULT_TOKEN_PRICE,
      warning: 'Could not fetch on-chain balances. Application will be submitted as Standard WL.',
    };
  }
}
