import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrokersGallery } from './components/BrokersGallery';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrokersGallery onBackHome={() => window.location.href = '/'} />
  </React.StrictMode>
);
