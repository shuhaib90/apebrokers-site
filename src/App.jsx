import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ApplicationPage } from './components/ApplicationPage';
import { PixelFluidBackground } from './components/PixelFluidBackground';

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'apply'

  useEffect(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path === '/apply' || hash === '#apply') {
      setCurrentPage('apply');
    }
  }, []);

  const handleApply = () => {
    setCurrentPage('apply');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBackHome = () => {
    setCurrentPage('home');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (currentPage === 'apply') {
    return (
      <>
        <ApplicationPage onBackHome={handleBackHome} />
        <Analytics />
      </>
    );
  }

  return (
    <div className="min-h-screen text-black flex flex-col justify-between font-pixel selection:bg-black selection:text-[#00FF66] relative overflow-hidden">
      {/* Vibrant Light Interactive Pixel Fluid Background */}
      <PixelFluidBackground />

      {/* Top Header */}
      <div className="relative z-50">
        <Header onApplyClick={handleApply} />
      </div>

      {/* Hero Content with Stats */}
      <main className="flex-grow flex flex-col items-center justify-center w-full relative z-10">
        <Hero onApplyClick={handleApply} />
      </main>

      {/* Vercel Analytics */}
      <Analytics />
    </div>
  );
}

export default App;
