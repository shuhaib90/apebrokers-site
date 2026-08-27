import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { VaultLockedModal } from './components/VaultLockedModal';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import './index.css';

function BrokersLockedPage() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#00FF66] text-black flex flex-col justify-between font-pixel selection:bg-black selection:text-[#00FF66]">
      <Header onApplyClick={() => (window.location.href = '/apply.html')} />
      <main className="flex-grow flex flex-col items-center justify-center w-full">
        <Hero
          onApplyClick={() => (window.location.href = '/apply.html')}
          onBrokersClick={() => setIsOpen(true)}
        />
      </main>
      <VaultLockedModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onApplyClick={() => (window.location.href = '/apply.html')}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrokersLockedPage />
  </React.StrictMode>
);
