import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyWrapper } from './providers/PrivyWrapper';
import { CodeClaimPage } from './components/CodeClaimPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PrivyWrapper>
      <CodeClaimPage onBackHome={() => (window.location.href = '/')} />
    </PrivyWrapper>
  </React.StrictMode>
);
