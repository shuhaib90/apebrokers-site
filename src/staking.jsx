import React from 'react';
import ReactDOM from 'react-dom/client';
import { StakingPage } from './components/staking/StakingPage';
import { Web3Provider } from './providers/Web3Provider';
import { Analytics } from '@vercel/analytics/react';
import './index.css';

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
