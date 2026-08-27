import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ApplicationPage } from './components/ApplicationPage';
import { VaultLockedModal } from './components/VaultLockedModal';

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'apply'
  const [isVaultLockedOpen, setIsVaultLockedOpen] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path === '/brokers' || hash === '#brokers') {
      setIsVaultLockedOpen(true);
    } else if (path === '/apply' || hash === '#apply') {
      setCurrentPage('apply');
    }
  }, []);

  const handleApply = () => {
    setCurrentPage('apply');
    setIsVaultLockedOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleOpenBrokers = () => {
    setIsVaultLockedOpen(true);
  };

  const handleBackHome = () => {
    setCurrentPage('home');
    setIsVaultLockedOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (currentPage === 'apply') {
    return <ApplicationPage onBackHome={handleBackHome} />;
  }

  return (
    <div className="min-h-screen bg-[#00FF66] text-black flex flex-col justify-between font-pixel selection:bg-black selection:text-[#00FF66]">
      {/* Top Header */}
      <Header onApplyClick={handleApply} />

      {/* Hero Content with Stats */}
      <main className="flex-grow flex flex-col items-center justify-center w-full">
        <Hero onApplyClick={handleApply} onBrokersClick={handleOpenBrokers} />
      </main>

      {/* Vault Locked Modal Popup */}
      <VaultLockedModal
        isOpen={isVaultLockedOpen}
        onClose={() => setIsVaultLockedOpen(false)}
        onApplyClick={handleApply}
      />
    </div>
  );
}

export default App;
