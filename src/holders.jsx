import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClaimPage } from './components/ClaimPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClaimPage onBackHome={() => (window.location.href = '/')} />
  </React.StrictMode>
);
