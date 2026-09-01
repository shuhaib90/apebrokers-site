import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyWrapper } from './providers/PrivyWrapper';
import { VerifyPage } from './components/VerifyPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PrivyWrapper>
      <VerifyPage />
    </PrivyWrapper>
  </React.StrictMode>
);
