import React from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider, http } from 'wagmi';
import { mainnet, base, arbitrum, polygon } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Define Robinhood Chain
export const robinhoodChain = {
  id: 4689,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://robinhood-mainnet.g.alchemy.com/v2/alch_008u8jC_qTSIJvqgLbdGY'],
    },
    public: {
      http: ['https://robinhood-mainnet.g.alchemy.com/v2/alch_008u8jC_qTSIJvqgLbdGY'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.robinhood.com' },
  },
};

const queryClient = new QueryClient();

export const config = getDefaultConfig({
  appName: 'ApeSyndicate',
  projectId: '3a8170812b534d0ff9d794f19a901d64', // Public demo WalletConnect ProjectId
  chains: [mainnet, base, arbitrum, polygon, robinhoodChain],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [polygon.id]: http(),
    [robinhoodChain.id]: http('https://robinhood-mainnet.g.alchemy.com/v2/alch_008u8jC_qTSIJvqgLbdGY'),
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
