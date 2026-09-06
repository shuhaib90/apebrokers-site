import { useState, useEffect, useCallback } from 'react';
import { formatEther } from 'viem';

let cachedEthPrice = 2495.0;
let lastFetchTimestamp = 0;

/**
 * Fetch live ETH price in USD/USDT from multi-source endpoints
 */
export async function fetchLiveEthPrice() {
  const now = Date.now();
  // Return cached price if fetched within last 12 seconds
  if (now - lastFetchTimestamp < 12000 && cachedEthPrice > 0) {
    return cachedEthPrice;
  }

  // 1. Primary: Binance API (ultra-fast, zero auth, high rate limit)
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT', {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      const p = parseFloat(data?.price);
      if (!isNaN(p) && p > 0) {
        cachedEthPrice = p;
        lastFetchTimestamp = now;
        return p;
      }
    }
  } catch (e) {
    // try fallback
  }

  // 2. Secondary fallback: Coinbase API
  try {
    const res = await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot', {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      const p = parseFloat(data?.data?.amount);
      if (!isNaN(p) && p > 0) {
        cachedEthPrice = p;
        lastFetchTimestamp = now;
        return p;
      }
    }
  } catch (e) {
    // try next fallback
  }

  // 3. Tertiary fallback: CoinGecko
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { signal: AbortSignal.timeout(4000) }
    );
    if (res.ok) {
      const data = await res.json();
      const p = parseFloat(data?.ethereum?.usd);
      if (!isNaN(p) && p > 0) {
        cachedEthPrice = p;
        lastFetchTimestamp = now;
        return p;
      }
    }
  } catch (e) {
    // ignore
  }

  return cachedEthPrice;
}

/**
 * React hook to track live ETH price in USDT/USD
 */
export function useEthPrice() {
  const [ethPrice, setEthPrice] = useState(cachedEthPrice);
  const [isLoading, setIsLoading] = useState(false);

  const refreshPrice = useCallback(async () => {
    setIsLoading(true);
    try {
      const p = await fetchLiveEthPrice();
      if (p > 0) setEthPrice(p);
    } catch (err) {
      console.warn('ETH price fetch warning:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchWrapper = async () => {
      const p = await fetchLiveEthPrice();
      if (isMounted && p > 0) setEthPrice(p);
    };

    fetchWrapper();
    const interval = setInterval(fetchWrapper, 30000); // Poll every 30 seconds

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { ethPrice, isLoading, refreshPrice };
}

/**
 * Clean universal formatter that converts ETH to USDT or formats ETH
 * @param {bigint|number|string} amount - Amount in ETH or BigInt in wei
 * @param {boolean} isUsdt - Whether USDT mode is active
 * @param {number} ethPrice - Current live ETH price
 * @param {object} options - Options { includeUnit, decimals, prefix }
 */
export function formatEthOrUsdt(
  amount,
  isUsdt,
  ethPrice = cachedEthPrice,
  { includeUnit = true, decimals = 4, prefix = '' } = {}
) {
  if (amount === undefined || amount === null) {
    return isUsdt
      ? `${prefix}$0.00${includeUnit ? ' USDT' : ''}`
      : `${prefix}0.0000${includeUnit ? ' ETH' : ''}`;
  }

  let numEth = 0;
  if (typeof amount === 'bigint') {
    numEth = parseFloat(formatEther(amount));
  } else {
    numEth = parseFloat(amount || 0);
  }

  if (isNaN(numEth)) numEth = 0;

  if (isUsdt) {
    const usdVal = numEth * (ethPrice > 0 ? ethPrice : 2495);
    let formatted;
    if (usdVal === 0) {
      formatted = '0.00';
    } else if (usdVal < 0.01) {
      formatted = usdVal < 0.0001 ? '< 0.0001' : usdVal.toFixed(4);
    } else if (usdVal >= 1000) {
      formatted = usdVal.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else {
      formatted = usdVal.toFixed(2);
    }

    return `${prefix}$${formatted}${includeUnit ? ' USDT' : ''}`;
  }

  // ETH Mode
  let ethStr = '';
  if (numEth === 0) {
    ethStr = '0.0000';
  } else if (numEth < 0.00001) {
    ethStr = numEth.toFixed(7);
  } else if (numEth < 0.001) {
    ethStr = numEth.toFixed(6);
  } else {
    ethStr = numEth.toFixed(decimals);
  }

  return `${prefix}${ethStr}${includeUnit ? ' ETH' : ''}`;
}
