import React from 'react';
import ReactDOM from 'react-dom/client';
import { StakingPage } from './components/staking/StakingPage';
import { Web3Provider } from './providers/Web3Provider';
import { Analytics } from '@vercel/analytics/react';
import './index.css';

// Clean up any #hash (e.g. #staking) from URL to ensure pure /staking address
if (typeof window !== 'undefined' && window.location.hash) {
  window.history.replaceState({}, '', window.location.pathname);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Web3Provider>
      <StakingPage
        onBackHome={() => (window.location.href = '/')}
        onGoToDesk={() => (window.location.href = '/brokerdesk')}
        onGoToAdmin={() => (window.location.href = '/brokerdesk')}
      />
      <Analytics />
    </Web3Provider>
  </React.StrictMode>
);
