import React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';

export const PRIVY_APP_ID =
  import.meta.env.VITE_PRIVY_APP_ID || 'cmoei2c9201zo0ck1e0pc8ff9';

export const PrivyWrapper = ({ children }) => {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['twitter', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#00FF66',
          logo: '/logo.png',
          showWalletLoginFirst: true,
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
};
