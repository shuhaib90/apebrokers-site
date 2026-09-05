import React from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider, http } from 'wagmi';
import { mainnet, base, arbitrum, polygon, hardhat } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Define Robinhood Chain
export const robinhoodChain = {
  id: 4689,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_ROBINHOOD_RPC_URL || 'https://robinhood-mainnet.g.alchemy.com/v2/alch_008u8jC_qTSIJvqgLbdGY'],
    },
    public: {
      http: [import.meta.env.VITE_ROBINHOOD_RPC_URL || 'https://robinhood-mainnet.g.alchemy.com/v2/alch_008u8jC_qTSIJvqgLbdGY'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.robinhood.com' },
  },
};

const queryClient = new QueryClient();

export const config = getDefaultConfig({
  appName: 'Ape Broker Desk',
  projectId: '3a8170812b534d0ff9d794f19a901d64', // Demo ProjectId
  chains: [robinhoodChain, hardhat, mainnet, base, arbitrum, polygon],
  transports: {
    [robinhoodChain.id]: http(import.meta.env.VITE_ROBINHOOD_RPC_URL || 'https://robinhood-mainnet.g.alchemy.com/v2/alch_008u8jC_qTSIJvqgLbdGY'),
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [polygon.id]: http(),
  },
  ssr: false,
});

export const Web3Provider = ({ children }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#00FF66',
            accentColorForeground: '#000000',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
