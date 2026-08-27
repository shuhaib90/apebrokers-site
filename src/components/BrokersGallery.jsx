import React, { useState, useEffect } from 'react';
import { sound } from '../utils/audio';

const UNLOCKED_COUNT = 10; // First 10 brokers are unlocked, remaining unlock 1 by 1 every 24h

// Generate list of 100 animated brokers (1.gif to 100.gif)
const ALL_BROKERS = Array.from({ length: 100 }, (_, i) => {
  const id = i + 1;
  const isUnlocked = id <= UNLOCKED_COUNT;
  const unlockDay = id > UNLOCKED_COUNT ? id - UNLOCKED_COUNT : 0;

  const roles = [
    'Founding Partner', 'Chief Floor Trader', 'Derivatives Specialist', 
    'Senior Arbitrageur', 'Floor Alpha Ape', 'High-Roller Broker', 
    'Robinhood Liaison', 'Synthetics Trader', 'Elite Floor Master', 'Dot-Com Specialist'
  ];
  const tags = ['LEGENDARY', 'EXECUTIVE', 'QUANT', 'VETERAN', 'ALPHA', 'JACKPOT', 'LIAISON', 'SYNTH', 'ELITE', 'OG'];
  
  return {
    id: id.toString(),
    numId: id,
    name: `ApeBroker #${id}`,
    role: roles[(id - 1) % roles.length],
    tag: tags[(id - 1) % tags.length],
    gif: `/gifs/${id}.gif`,
    isUnlocked,
    unlockDay,
  };
});

// Crisp 16-bit animated pixel padlock component
const PixelLockGraphic = ({ size = 'large', unlockDay = 1 }) => {
  if (size === 'small') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-[#0e0717]">
        {/* Animated Scan Line */}
        <div className="absolute inset-x-0 top-0 h-1 bg-[#00FF66]/40 animate-pixel-scan pointer-events-none" />
        
        {/* Pixel Padlock Icon */}
        <svg className="w-6 h-6 animate-pixel-glitch" viewBox="0 0 24 24" fill="none">
          {/* Shackle */}
          <rect x="7" y="3" width="10" height="9" stroke="#FFD700" strokeWidth="2.5" fill="none" />
          {/* Body */}
          <rect x="4" y="9" width="16" height="12" fill="#2A0845" stroke="#FFD700" strokeWidth="2" />
          {/* Keyhole */}
          <rect x="11" y="12" width="2" height="3" fill="#00FF66" />
          <rect x="10" y="15" width="4" height="2" fill="#00FF66" />
        </svg>

        <span className="font-pixel text-[7px] text-[#FFD700] mt-1 font-bold">
          24H #{unlockDay}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-[#0c0615] border-2 border-dashed border-[#FFD700]/50 p-4">
      {/* Matrix Radar Grid Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#00FF66_1px,transparent_1px)] [background-size:12px_12px]" />
      
      {/* Sweeping Radar Line */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
        <div className="w-36 h-36 rounded-full border border-[#00FF66] animate-pixel-radar" />
      </div>
      <div className="absolute inset-x-0 top-0 h-1.5 bg-[#00FF66] opacity-60 animate-pixel-scan pointer-events-none shadow-[0_0_8px_#00FF66]" />

      {/* Large 16-Bit Animated Pixel Padlock */}
      <div className="relative z-10 animate-pixel-glitch flex flex-col items-center">
        <svg className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-[0_0_10px_rgba(255,215,0,0.4)]" viewBox="0 0 32 32" fill="none">
          {/* Shackle */}
          <path d="M10 13V8C10 4.68629 12.6863 2 16 2C19.3137 2 22 4.68629 22 8V13" stroke="#FFD700" strokeWidth="3.5" strokeLinecap="square" />
          {/* Body */}
          <rect x="6" y="13" width="20" height="17" fill="#2A0845" stroke="#FFD700" strokeWidth="2.5" />
          {/* Glowing Center Core */}
          <rect x="14" y="18" width="4" height="4" fill="#00FF66" className="animate-pulse" />
          <rect x="15" y="22" width="2" height="4" fill="#00FF66" />
          {/* Corner Bolts */}
          <rect x="8" y="15" width="2" height="2" fill="#FFD700" />
          <rect x="22" y="15" width="2" height="2" fill="#FFD700" />
          <rect x="8" y="26" width="2" height="2" fill="#FFD700" />
          <rect x="22" y="26" width="2" height="2" fill="#FFD700" />
        </svg>

        <div className="mt-3 text-center space-y-1">
          <div className="font-pixel text-[10px] sm:text-xs text-[#FF2247] font-extrabold tracking-wider animate-blink">
            [ CLASSIFIED BROKER ]
          </div>
          <div className="font-mono text-[11px] text-[#00FF66] font-bold">
            UNLOCKS IN DAY {unlockDay}
          </div>
        </div>
      </div>
    </div>
  );
};

export const BrokersGallery = ({ onBackHome, onApplyClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBroker, setSelectedBroker] = useState(ALL_BROKERS[0]);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'UNLOCKED' | 'LOCKED'

  // Live 24-hour countdown ticker for next unlock
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 48, seconds: 15 });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatPad = (n) => String(n).padStart(2, '0');

  const filteredBrokers = ALL_BROKERS.filter((b) => {
    const matchesSearch =
      b.id.includes(searchQuery.trim()) ||
      b.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      b.role.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      b.tag.toLowerCase().includes(searchQuery.toLowerCase().trim());

    if (filterMode === 'UNLOCKED') return matchesSearch && b.isUnlocked;
    if (filterMode === 'LOCKED') return matchesSearch && !b.isUnlocked;
    return matchesSearch;
  });

  const handleSelectBroker = (broker) => {
    sound?.playClick?.();
    setSelectedBroker(broker);
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  const handleApply = () => {
    sound?.playZoom?.();
    if (onApplyClick) onApplyClick();
    else if (onBackHome) onBackHome();
    else window.location.href = '/apply.html';
  };

  const handleFollowX = () => {
    sound?.playClick?.();
    window.open('https://x.com/ApebrokersNft', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-[#00FF66] text-black font-pixel selection:bg-black selection:text-[#00FF66] flex flex-col justify-between select-none">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full bg-[#00FF66] border-b-4 border-black px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                sound?.playClick?.();
                if (onBackHome) onBackHome();
                else window.location.href = '/';
              }}
              className="pixel-btn pixel-btn-black px-3 sm:px-4 py-2 text-[10px] sm:text-xs"
            >
              ◄ BACK TO HOME
            </button>
            <span className="font-pixel text-xs sm:text-sm text-black hidden sm:inline font-extrabold">
              APEBROKERS VAULT // 100 COLLECTION
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFollowX}
              className="pixel-btn pixel-btn-white px-2.5 sm:px-3 py-2 text-xs"
              aria-label="Official X"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="pixel-btn pixel-btn-black px-3 py-2 text-[10px] sm:text-xs"
            >
              [ APPLY FOR WL ]
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 flex-grow">
        {/* Next Unlock Banner */}
        <div className="pixel-box-black p-4 sm:p-5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-[#00FF66] inline-block animate-blink shrink-0" />
            <div>
              <div className="font-pixel text-xs sm:text-sm text-[#00FF66] font-bold">
                DAILY DROP SCHEDULE: 10 / 100 UNLOCKED
              </div>
              <div className="font-mono text-[11px] text-gray-300 font-semibold mt-0.5">
                New ApeBroker reveals 1-by-1 every 24 hours on @ApebrokersNft.
              </div>
            </div>
          </div>

          <div className="bg-[#140D24] text-[#FFD700] border-2 border-[#00FF66] px-3.5 py-1.5 font-pixel text-xs shrink-0">
            NEXT UNLOCK: {formatPad(timeLeft.hours)}:{formatPad(timeLeft.minutes)}:{formatPad(timeLeft.seconds)}
          </div>
        </div>

        {/* Title Bar & Search & Filters */}
        <div className="pixel-box p-5 sm:p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="inline-block bg-black text-[#FFD700] font-pixel text-[9px] px-2.5 py-1 border-2 border-black mb-1">
              ROBINHOOD CHAIN • ANIMATED VAULT
            </div>
            <h1 className="font-pixel text-xl sm:text-2xl text-black font-extrabold tracking-tight">
              APEBROKERS COLLECTION
            </h1>
            <p className="font-mono text-xs text-gray-700 font-semibold mt-0.5">
              10 Brokers Unlocked • 90 Classified Daily Unlocks
            </p>
          </div>

          {/* Search & Filter Toggles */}
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => { sound?.playClick?.(); setFilterMode('ALL'); }}
                className={`pixel-btn px-2.5 py-2 text-[9px] ${
                  filterMode === 'ALL' ? 'pixel-btn-black' : 'pixel-btn-white'
                }`}
              >
                ALL (100)
              </button>
              <button
                type="button"
                onClick={() => { sound?.playClick?.(); setFilterMode('UNLOCKED'); }}
                className={`pixel-btn px-2.5 py-2 text-[9px] ${
                  filterMode === 'UNLOCKED' ? 'pixel-btn-lime' : 'pixel-btn-white'
                }`}
              >
                UNLOCKED (10)
              </button>
              <button
                type="button"
                onClick={() => { sound?.playClick?.(); setFilterMode('LOCKED'); }}
                className={`pixel-btn px-2.5 py-2 text-[9px] ${
                  filterMode === 'LOCKED' ? 'pixel-btn-purple' : 'pixel-btn-white'
                }`}
              >
                LOCKED (90)
              </button>
            </div>

            <input
              type="text"
              placeholder="Search #ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-40 h-10 px-3 bg-white text-black font-mono text-xs font-semibold pixel-input"
            />
          </div>
        </div>

        {/* Selected Broker Inspector (Top) */}
        {selectedBroker && (
          <div className="pixel-box p-5 sm:p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Left 1:1 Aspect Ratio Box with Pixel Animation */}
              <div className="md:col-span-5 lg:col-span-4 flex justify-center">
                <div className="w-full max-w-[280px] aspect-square bg-black border-4 border-black p-2 flex flex-col items-center justify-center shadow-pixel-sm relative overflow-hidden">
                  {selectedBroker.isUnlocked ? (
                    <img
                      src={selectedBroker.gif}
                      alt={selectedBroker.name}
                      className="w-full h-full object-contain pixelated"
                    />
                  ) : (
                    /* Animated 16-Bit Pixel Lock Animation (No emoji) */
                    <PixelLockGraphic size="large" unlockDay={selectedBroker.unlockDay} />
                  )}

                  {/* Top-Right Badge */}
                  <div className="absolute top-2 right-2">
                    {selectedBroker.isUnlocked ? (
                      <span className="bg-[#00FF66] text-black font-pixel text-[8px] px-2 py-0.5 border border-black font-bold">
                        UNLOCKED
                      </span>
                    ) : (
                      <span className="bg-[#FF2247] text-white font-pixel text-[8px] px-2 py-0.5 border border-black font-bold">
                        CLASSIFIED
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Details */}
              <div className="md:col-span-7 lg:col-span-8 space-y-3 text-left">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="bg-[#FFD700] text-black font-pixel text-[10px] px-2.5 py-1 border-2 border-black">
                    {selectedBroker.isUnlocked ? selectedBroker.tag : 'CLASSIFIED'}
                  </span>
                  <span className="font-mono text-xs text-gray-600 font-bold">
                    ROBINHOOD CHAIN • 5,555 SUPPLY
                  </span>
                </div>

                <h2 className="font-pixel text-2xl sm:text-3xl text-black font-extrabold">
                  {selectedBroker.name}
                </h2>
                <div className="font-pixel text-sm text-[#2A0845] font-bold">
                  {selectedBroker.isUnlocked ? selectedBroker.role : 'Classified Floor Broker'}
                </div>

                {selectedBroker.isUnlocked ? (
                  <p className="font-mono text-xs sm:text-sm text-gray-700 font-semibold leading-relaxed pt-1">
                    100% animated 16-bit pixel artwork generated for the official ApeBrokers collection.
                  </p>
                ) : (
                  <div className="bg-[#140D24] text-white border-2 border-black p-3.5 space-y-1 font-mono text-xs">
                    <div className="font-pixel text-[9px] text-[#FFD700]">
                      ★ CLASSIFIED BROKER FILE
                    </div>
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      This broker is locked and scheduled for Day {selectedBroker.unlockDay} reveal (1 new broker reveals every 24 hours).
                    </p>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleApply}
                    className="pixel-btn pixel-btn-black px-5 py-3 font-pixel text-xs font-bold"
                  >
                    [ APPLY FOR WHITELIST ]
                  </button>

                  <button
                    type="button"
                    onClick={handleFollowX}
                    className="pixel-btn pixel-btn-white px-5 py-3 font-pixel text-xs font-bold flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span>@ApebrokersNft</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 100 Brokers Grid */}
        <div className="space-y-4">
          <div className="font-pixel text-xs text-black flex items-center justify-between">
            <span>COLLECTION VAULT (10 UNLOCKED • 90 LOCKED):</span>
            <span className="text-gray-700 text-[10px]">CLICK CARD TO INSPECT</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-10 gap-2.5">
            {filteredBrokers.map((broker) => {
              const isSelected = selectedBroker?.id === broker.id;
              return (
                <button
                  key={broker.id}
                  type="button"
                  onClick={() => handleSelectBroker(broker)}
                  className={`pixel-border-sm p-1.5 flex flex-col items-center text-center relative transition-all ${
                    isSelected
                      ? 'bg-black text-[#00FF66] scale-105 shadow-pixel-md z-10'
                      : broker.isUnlocked
                      ? 'bg-white text-black hover:bg-gray-100'
                      : 'bg-[#180f26] text-gray-400 hover:bg-[#25183a]'
                  }`}
                >
                  {/* Image or Animated Pixel Lock */}
                  <div className="w-full aspect-square relative bg-black border border-black/40 overflow-hidden flex items-center justify-center">
                    {broker.isUnlocked ? (
                      <img
                        src={broker.gif}
                        alt={broker.name}
                        loading="lazy"
                        className="w-full h-full object-cover pixelated"
                      />
                    ) : (
                      /* Mini Animated Pixel Padlock (No emoji) */
                      <PixelLockGraphic size="small" unlockDay={broker.unlockDay} />
                    )}

                    {/* Mini Badge */}
                    <div className="absolute top-1 right-1">
                      {broker.isUnlocked ? (
                        <span className="w-2 h-2 rounded-full bg-[#00FF66] block" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-[#FF2247] block" />
                      )}
                    </div>
                  </div>

                  <div className="font-pixel text-[8px] font-bold mt-1.5">
                    #{broker.id}
                  </div>
                  <div className="font-mono text-[8px] truncate max-w-full opacity-80">
                    {broker.isUnlocked ? broker.tag : 'LOCKED'}
                  </div>
                </button>
              );
            })}
          </div>

          {filteredBrokers.length === 0 && (
            <div className="pixel-box p-8 text-center font-pixel text-xs text-gray-700">
              NO BROKERS FOUND
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-black text-white border-t-4 border-black px-4 py-6 text-center select-none mt-12">
        <div className="font-pixel text-xs text-[#00FF66]">
          APEBROKERS // 100 ANIMATED PIXEL COLLECTION • 24H UNLOCK SCHEDULE
        </div>
        <div className="font-mono text-[10px] text-gray-400 mt-1">
          Follow <a href="https://x.com/ApebrokersNft" target="_blank" rel="noopener noreferrer" className="text-[#00FF66] underline">@ApebrokersNft</a> on X
        </div>
      </footer>
    </div>
  );
};
