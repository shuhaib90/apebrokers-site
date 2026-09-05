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
    <header className="sticky top-0 z-50 w-full bg-[#00FF66] border-b-4 border-black px-4 sm:px-8 py-3 select-none shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand */}
        <a href="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 hover:opacity-90 transition-opacity">
          <img
            src="/logo.png"
            alt="ApeSyndicate Logo"
            className="w-8 h-8 sm:w-10 sm:h-10 object-contain pixelated shrink-0"
          />
          <span className="font-pixel text-xs sm:text-base text-black tracking-wider font-extrabold whitespace-nowrap">
            APESYNDICATE
          </span>
        </a>

        {/* Right: Clean Navigation Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenSea}
            aria-label="OpenSea Collection"
            className="pixel-btn pixel-btn-black px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[9px] sm:text-xs whitespace-nowrap font-bold text-white hover:text-[#00FF66] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] border-2 border-black flex items-center gap-1 rounded-lg"
          >
            <span>[ OPENSEA ]</span>
          </button>

          <button
            type="button"
            onClick={handleApebroke}
            aria-label="Buy $APEBROKE"
            className="pixel-btn pixel-btn-black px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[9px] sm:text-xs whitespace-nowrap font-bold text-[#FFD700] hover:bg-[#FFD700] hover:text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] border-2 border-black flex items-center gap-1 rounded-lg"
          >
            <span>[ $APEBROKE ]</span>
          </button>

          <button
            type="button"
            onClick={handleFollowX}
            aria-label="Official X"
            className="pixel-btn pixel-btn-black px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[9px] sm:text-xs whitespace-nowrap font-extrabold text-[#00FF66] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] border-2 border-black flex items-center gap-1.5 rounded-lg"
          >
            <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="hidden sm:inline">[ OFFICIAL X ]</span>
            <span className="sm:hidden">[ X ]</span>
          </button>
        </div>
      </div>
    </header>
  );
};
