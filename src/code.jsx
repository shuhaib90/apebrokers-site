import React from 'react';
import ReactDOM from 'react-dom/client';
import { CodeClaimPage } from './components/CodeClaimPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CodeClaimPage onBackHome={() => (window.location.href = '/')} />
  </React.StrictMode>
);
