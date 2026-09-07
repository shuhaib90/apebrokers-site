import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ApplicationPage } from './components/ApplicationPage';
import { AdminDashboard } from './components/AdminDashboard';
import { DeskPage } from './components/desk/DeskPage';
import { StakingPage } from './components/staking/StakingPage';
import { PixelFluidBackground } from './components/PixelFluidBackground';
import { BrokerDeskSections } from './components/BrokerDeskSections';
import { Footer } from './components/Footer';

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'apply' | 'admin' | 'desk' | 'staking'

  useEffect(() => {
    const handleRoute = () => {
      const path = (window.location.pathname || '').toLowerCase();
      const hash = (window.location.hash || '').toLowerCase();
      if (path === '/admin' || hash === '#admin') {
        setCurrentPage('admin');
      } else if (path === '/apply' || hash === '#apply') {
        setCurrentPage('apply');
      } else if (
        path === '/staking' ||
        path.startsWith('/staking') ||
        hash === '#staking'
      ) {
        setCurrentPage('staking');
      } else if (
        path === '/brokerdesk' ||
        path.startsWith('/brokerdesk') ||
        hash === '#brokerdesk' ||
        path === '/desk' ||
        hash === '#desk'
      ) {
        setCurrentPage('desk');
      } else {
        setCurrentPage('home');
      }
    };

    handleRoute();
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('popstate', handleRoute);
    return () => {
      window.removeEventListener('hashchange', handleRoute);
      window.removeEventListener('popstate', handleRoute);
    };
  }, []);

  const handleApply = () => {
    window.location.hash = 'apply';
    setCurrentPage('apply');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleDesk = () => {
    if (window.location.pathname !== '/brokerdesk') {
      window.history.pushState({}, '', '/brokerdesk');
    }
    setCurrentPage('desk');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleStaking = () => {
    if (window.location.pathname !== '/staking') {
      window.history.pushState({}, '', '/staking');
    }
    window.location.hash = 'staking';
    setCurrentPage('staking');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleAdmin = () => {
    window.location.hash = 'admin';
    setCurrentPage('admin');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBackHome = () => {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    window.location.hash = '';
    setCurrentPage('home');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (currentPage === 'staking') {
    return (
      <>
        <StakingPage
          onBackHome={handleBackHome}
          onGoToDesk={handleDesk}
          onGoToAdmin={handleDesk}
        />
        <Analytics />
      </>
    );
  }

  if (currentPage === 'desk') {
    return (
      <>
        <DeskPage onBackHome={handleBackHome} onGoToStaking={handleStaking} />
        <Analytics />
      </>
    );
  }

  if (currentPage === 'admin') {
    return (
      <>
        <AdminDashboard onBackHome={handleBackHome} />
        <Analytics />
      </>
    );
  }

  if (currentPage === 'apply') {
    return (
      <>
        <ApplicationPage onBackHome={handleBackHome} />
        <Analytics />
      </>
    );
  }

  return (
    <div className="min-h-screen text-black flex flex-col justify-between font-pixel selection:bg-black selection:text-[#00FF66] relative overflow-x-hidden">
      {/* Vibrant Light Interactive Pixel Fluid Background */}
      <PixelFluidBackground />

      {/* Top Header */}
      <div className="relative z-50">
        <Header onDeskClick={handleDesk} onStakingClick={handleStaking} />
      </div>

      {/* Hero Content with Stats & Sections */}
      <main className="flex-grow flex flex-col items-center justify-center w-full relative z-10">
        <Hero onDeskClick={handleDesk} />
        <BrokerDeskSections onDeskClick={handleDesk} />
      </main>

      {/* Retro BrokerDesk Footer */}
      <Footer onDeskClick={handleDesk} />

      {/* Vercel Analytics */}
      <Analytics />
    </div>
  );
}

export default App;
