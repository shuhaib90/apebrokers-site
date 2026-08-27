import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApplicationPage } from './components/ApplicationPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ApplicationPage onBackHome={() => window.location.href = '/'} />
  </React.StrictMode>
);
