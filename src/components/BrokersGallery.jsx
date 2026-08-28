import React, { useState } from 'react';
import { sound } from '../utils/audio';

// Generate list of 100 animated brokers (1.gif to 10.gif unlocked, 11-100 hidden with "SOON")
const ALL_BROKERS = Array.from({ length: 100 }, (_, i) => {
  const id = i + 1;
  const isUnlocked = id <= 10;
  const roles = [
    'Founding Partner', 'Chief Floor Trader', 'Derivatives Specialist', 
    'Senior Arbitrageur', 'Floor Alpha Ape', 'High-Roller Broker', 
    'Robinhood Liaison', 'Synthetics Trader', 'Elite Floor Master', 'Dot-Com Specialist'
  ];
  const tags = ['LEGENDARY', 'EXECUTIVE', 'QUANT', 'VETERAN', 'ALPHA', 'JACKPOT', 'LIAISON', 'SYNTH', 'ELITE', 'OG'];
  
  return {
    id: id.toString(),
    numId: id,
    name: `ApeSyndicate #${id}`,
    role: roles[(id - 1) % roles.length],
    tag: tags[(id - 1) % tags.length],
    gif: `/gifs/${id}.gif`,
    unlocked: isUnlocked,
  };
});

export const BrokersGallery = ({ onBackHome, onApplyClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBroker, setSelectedBroker] = useState(ALL_BROKERS[0]);

  const filteredBrokers = ALL_BROKERS.filter((b) =>
    b.id.includes(searchQuery.trim()) ||
    b.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    b.role.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    b.tag.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleSelectBroker = (broker) => {
    if (!broker.unlocked) {
      sound?.playClick?.();
      return;
    }
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
    window.open('https://x.com/Apesyndicates', '_blank', 'noopener,noreferrer');
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
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="ApeBrokers Logo"
                className="w-9 h-9 sm:w-11 sm:h-11 object-contain pixelated"
              />
              <span className="font-pixel text-xs sm:text-sm text-black hidden sm:inline font-extrabold">
                APESYNDICATE VAULT // 10 UNLOCKED
              </span>
            </div>
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
        {/* Title Bar & Search */}
        <div className="pixel-box p-5 sm:p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="inline-block bg-black text-[#00FF66] font-pixel text-[9px] px-2.5 py-1 border-2 border-black mb-1">
              ROBINHOOD CHAIN • 10 REVEALED
            </div>
            <h1 className="font-pixel text-xl sm:text-2xl text-black font-extrabold tracking-tight">
              APESYNDICATE COLLECTION
            </h1>
            <p className="font-mono text-xs text-gray-700 font-semibold mt-0.5">
              10 Animated Apes Unlocked • 90 Revealing Soon
            </p>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="bg-black text-[#00FF66] font-pixel text-[9px] sm:text-[10px] px-3 py-2.5 border-2 border-black">
              UNLOCKED: 10 / 100
            </div>
            <input
              type="text"
              placeholder="Search #ID or Role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-48 h-10 px-3 bg-white text-black font-mono text-xs font-semibold pixel-input"
            />
          </div>
        </div>

        {/* Selected Broker Inspector (Top) */}
        {selectedBroker && (
          <div className="pixel-box p-5 sm:p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Left 1:1 Aspect Ratio Square Box */}
              <div className="md:col-span-5 lg:col-span-4 flex justify-center">
                <div className="w-full max-w-[280px] aspect-square bg-black border-4 border-black p-2 flex items-center justify-center shadow-pixel-sm relative overflow-hidden">
                  <img
                    src={selectedBroker.gif}
                    alt={selectedBroker.name}
                    className="w-full h-full object-contain pixelated"
                  />
                  <div className="absolute top-2 right-2">
                    <span className="bg-[#00FF66] text-black font-pixel text-[8px] px-2 py-0.5 border border-black font-bold">
                      16-BIT GIF
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Details */}
              <div className="md:col-span-7 lg:col-span-8 space-y-3 text-left">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="bg-[#FFD700] text-black font-pixel text-[10px] px-2.5 py-1 border-2 border-black">
                    {selectedBroker.tag}
                  </span>
                  <span className="font-mono text-xs text-gray-600 font-bold">
                    ROBINHOOD CHAIN • 5,555 SUPPLY
                  </span>
                </div>

                <h2 className="font-pixel text-2xl sm:text-3xl text-black font-extrabold">
                  {selectedBroker.name}
                </h2>
                <div className="font-pixel text-sm text-[#2A0845] font-bold">
                  {selectedBroker.role}
                </div>

                <p className="font-mono text-xs sm:text-sm text-gray-700 font-semibold leading-relaxed pt-1">
                  100% animated 16-bit pixel artwork generated for the official ApeBrokers collection. Operating the premier high-conviction trading floor on Robinhood Chain.
                </p>

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

        {/* Collection Grid: 10 Unlocked + 90 Hidden with "SOON" */}
        <div className="space-y-4">
          <div className="font-pixel text-xs text-black flex items-center justify-between">
            <span>COLLECTION PREVIEW (10 REVEALED):</span>
            <span className="text-gray-700 text-[10px]">CLICK UNLOCKED CARD TO INSPECT</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-10 gap-2.5">
            {filteredBrokers.map((broker) => {
              const isSelected = selectedBroker?.id === broker.id;

              if (broker.unlocked) {
                return (
                  <button
                    key={broker.id}
                    type="button"
                    onClick={() => handleSelectBroker(broker)}
                    className={`pixel-border-sm p-1.5 flex flex-col items-center text-center relative transition-all ${
                      isSelected
                        ? 'bg-black text-[#00FF66] scale-105 shadow-pixel-md z-10'
                        : 'bg-white text-black hover:bg-gray-100 cursor-pointer'
                    }`}
                  >
                    <div className="w-full aspect-square relative bg-black border border-black/40 overflow-hidden flex items-center justify-center">
                      <img
                        src={broker.gif}
                        alt={broker.name}
                        loading="lazy"
                        className="w-full h-full object-cover pixelated"
                      />
                    </div>

                    <div className="font-pixel text-[8px] font-bold mt-1.5">
                      #{broker.id}
                    </div>
                    <div className="font-mono text-[8px] truncate max-w-full opacity-80">
                      {broker.tag}
                    </div>
                  </button>
                );
              }

              // Hidden card with "SOON"
              return (
                <div
                  key={broker.id}
                  className="pixel-border-sm p-1.5 flex flex-col items-center text-center relative bg-[#0d0d0d] text-gray-400 select-none opacity-85"
                >
                  <div className="w-full aspect-square relative bg-[#181818] border border-black/60 overflow-hidden flex flex-col items-center justify-center p-1">
                    {/* Pixel lock icon */}
                    <div className="w-4 h-3.5 border-2 border-[#FFD700] rounded-t-sm mb-0.5 relative">
                      <div className="w-1.5 h-1.5 bg-[#FFD700] mx-auto mt-0.5" />
                    </div>
                    <span className="font-pixel text-[8px] text-[#FFD700] tracking-wider animate-pulse">
                      SOON
                    </span>
                  </div>

                  <div className="font-pixel text-[8px] font-bold mt-1.5 text-gray-500">
                    #{broker.id}
                  </div>
                  <div className="font-mono text-[8px] truncate max-w-full text-gray-600">
                    LOCKED
                  </div>
                </div>
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
          APESYNDICATE // 10 REVEALED PIXEL COLLECTION • 5,555 TOTAL SUPPLY
        </div>
        <div className="font-mono text-[10px] text-gray-400 mt-1">
          Follow <a href="https://x.com/Apesyndicates" target="_blank" rel="noopener noreferrer" className="text-[#00FF66] underline">@Apesyndicates</a> on X
        </div>
      </footer>
    </div>
  );
};
