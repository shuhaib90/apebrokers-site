/**
 * Resilient Web3 & ERC-721 / ERC-1155 NFT Contract Balance Scanner
 * Direct RPC Querying + Injected Wallet Provider Fallback
 */

const ERC721_BALANCE_OF = '0x70a08231';

const DEFAULT_NETWORK_RPCS = {
  'Ethereum': 'https://ethereum-rpc.publicnode.com',
  'Base': 'https://base-rpc.publicnode.com',
  'Arbitrum': 'https://arbitrum-one-rpc.publicnode.com',
  'Polygon': 'https://polygon-bor-rpc.publicnode.com',
};

function padAddress(address) {
  const clean = (address || '').replace(/^0x/, '').toLowerCase();
  return clean.padStart(64, '0');
}

/**
 * Connect to user's Web3 / Robinhood / EVM wallet
 */
export async function connectWallet() {
  if (typeof window === 'undefined' || !window.ethereum) {
    return {
      success: false,
      error: 'No Web3 wallet found. Please install MetaMask, Robinhood Wallet, or Phantom.',
    };
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      return { success: false, error: 'No accounts selected.' };
    }

    const address = accounts[0];
    return { success: true, address };
  } catch (err) {
    if (err.code === 4001) {
      return { success: false, error: 'Wallet connection rejected by user.' };
    }
    return { success: false, error: err.message || 'Failed to connect wallet.' };
  }
}

/**
 * Get current connected wallet account if already unlocked
 */
export async function getConnectedAccount() {
  if (typeof window === 'undefined' || !window.ethereum) return null;
  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts && accounts.length > 0 ? accounts[0] : null;
  } catch (e) {
    return null;
  }
}

/**
 * Scans an on-chain NFT smart contract for holder balance
 */
export async function checkNftBalance(walletAddress, contractAddress, network = 'Robinhood Chain', rpcUrl = null) {
  if (!walletAddress || !contractAddress) return { isHolder: false, balance: 0 };

  const cleanWallet = walletAddress.trim();
  const cleanContract = contractAddress.trim();
  const data = `${ERC721_BALANCE_OF}${padAddress(cleanWallet)}`;

  // 1. Direct JSON-RPC call if custom RPC URL or known network RPC exists
  const targetRpc = rpcUrl || DEFAULT_NETWORK_RPCS[network] || null;
  if (targetRpc) {
    try {
      const response = await fetch(targetRpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to: cleanContract, data }, 'latest'],
        }),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.result && json.result !== '0x' && json.result !== '0x0') {
          const balance = parseInt(json.result, 16);
          if (!isNaN(balance) && balance > 0) {
            return { isHolder: true, balance, source: 'rpc' };
          }
        }
      }
    } catch (rpcErr) {
      console.warn(`Direct RPC query note for ${cleanContract}:`, rpcErr.message);
    }
  }

  // 2. Injected wallet provider check (window.ethereum)
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      const result = await window.ethereum.request({
        method: 'eth_call',
        params: [
          {
            to: cleanContract,
            data: data,
          },
          'latest',
        ],
      });

      if (result && result !== '0x' && result !== '0x0') {
        const balance = parseInt(result, 16);
        if (!isNaN(balance) && balance > 0) {
          return { isHolder: true, balance, source: 'wallet' };
        }
      }
    } catch (walletErr) {
      console.warn(`Wallet eth_call check note:`, walletErr.message);
    }
  }

  return { isHolder: false, balance: 0 };
}

/**
 * Batch scans multiple partner NFT contracts concurrently
 */
export async function scanAllPartnerContracts(walletAddress, communities = []) {
  if (!walletAddress || communities.length === 0) return {};

  const results = {};
  await Promise.all(
    communities.map(async (comm) => {
      try {
        const res = await checkNftBalance(walletAddress, comm.contract_address, comm.network, comm.rpc_url);
        results[comm.id] = res;
      } catch (err) {
        results[comm.id] = { isHolder: false, balance: 0 };
      }
    })
  );

  return results;
}
