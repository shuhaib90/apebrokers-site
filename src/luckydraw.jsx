import React from 'react';
import ReactDOM from 'react-dom/client';
import { LuckyDrawPage } from './components/luckydraw/LuckyDrawPage';
import { Web3Provider } from './providers/Web3Provider';
import { Analytics } from '@vercel/analytics/react';
import './index.css';

// Clean up any #hash (e.g. #luckydraw) from URL to ensure clean /luckydraw address
if (typeof window !== 'undefined' && window.location.hash) {
  window.history.replaceState({}, '', window.location.pathname);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Web3Provider>
      <LuckyDrawPage
        onBackHome={() => (window.location.href = '/')}
        onGoToDesk={() => (window.location.href = '/brokerdesk')}
        onGoToStaking={() => (window.location.href = '/staking')}
      />
      <Analytics />
    </Web3Provider>
  </React.StrictMode>
);
