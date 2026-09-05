import React from 'react';
import { sound } from '../utils/audio';

export const Header = () => {
  const handleFollowX = () => {
    sound?.playClick?.();
    window.open('https://x.com/Apesyndicates', '_blank', 'noopener,noreferrer');
  };

  const handleOpenSea = () => {
    sound?.playClick?.();
    window.open('https://opensea.io/collection/apesyndicate-212388086', '_blank', 'noopener,noreferrer');
  };

  const handleApebroke = () => {
    sound?.playClick?.();
    window.open('https://www.letscash.fun/token/0xe0F384ebCede975342c5431aCad515b4A1B862cc', '_blank', 'noopener,noreferrer');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0c061e]/95 backdrop-blur-md border-b-4 border-black px-3 sm:px-8 py-2.5 sm:py-3.5 select-none relative shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
      {/* Neon Ceiling Light Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF007F] via-[#00F0FF] to-[#00FF66] opacity-90" />
      
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Brand */}
        <a href="/" className="flex items-center gap-2 sm:gap-3 shrink-0 group">
          <div className="p-0.5 bg-[#00FF66]/20 border border-[#00FF66] rounded-md shadow-[0_0_10px_rgba(0,255,102,0.4)]">
            <img
              src="/logo.png"
              alt="ApeSyndicate Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain pixelated shrink-0"
            />
          </div>
          <span className="font-pixel text-xs sm:text-base pixel-text-3d-lime tracking-wider font-extrabold whitespace-nowrap">
            APESYNDICATE
          </span>
        </a>

        {/* Right: Vibrant Broker Terminal Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenSea}
            aria-label="OpenSea Collection"
            className="pixel-btn pixel-btn-vibrant-cyan px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[9px] sm:text-xs whitespace-nowrap font-bold flex items-center gap-1 rounded-lg"
          >
            <span>[ OPENSEA ]</span>
          </button>

          <button
            type="button"
            onClick={handleApebroke}
            aria-label="Buy $APEBROKE"
            className="pixel-btn pixel-btn-vibrant-gold px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[9px] sm:text-xs whitespace-nowrap font-bold flex items-center gap-1 rounded-lg"
          >
            <span>[ $APEBROKE ]</span>
          </button>

          <button
            type="button"
            onClick={handleFollowX}
            aria-label="Official X"
            className="pixel-btn pixel-btn-vibrant-magenta px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[9px] sm:text-xs whitespace-nowrap font-extrabold flex items-center gap-1.5 rounded-lg"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="hidden sm:inline">[ OFFICIAL X ]</span>
            <span className="sm:hidden">[ X ]</span>
          </button>
        </div>
      </div>
      
      {/* Bottom Neon Accent Bar */}
      <div className="absolute bottom-[-4px] left-0 right-0 h-[2px] bg-gradient-to-r from-[#00FF66] via-[#FF007F] to-[#00F0FF] opacity-80" />
    </header>
  );
};
