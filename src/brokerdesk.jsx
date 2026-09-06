import React from 'react';
import ReactDOM from 'react-dom/client';
import { DeskPage } from './components/desk/DeskPage';
import { Web3Provider } from './providers/Web3Provider';
import { Analytics } from '@vercel/analytics/react';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Web3Provider>
      <DeskPage onBackHome={() => (window.location.href = '/')} />
      <Analytics />
    </Web3Provider>
  </React.StrictMode>
);
