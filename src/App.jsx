import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { BrokersGallery } from './components/BrokersGallery';
import { ApplicationPage } from './components/ApplicationPage';

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'brokers' | 'apply'

  useEffect(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path === '/brokers' || hash === '#brokers') {
      setCurrentPage('brokers');
    } else if (path === '/apply' || hash === '#apply') {
      setCurrentPage('apply');
    }
  }, []);

  const handleApply = () => {
    setCurrentPage('apply');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleOpenBrokers = () => {
    setCurrentPage('brokers');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBackHome = () => {
    setCurrentPage('home');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (currentPage === 'brokers') {
    return <BrokersGallery onBackHome={handleBackHome} />;
  }

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
    </div>
  );
}

export default App;
