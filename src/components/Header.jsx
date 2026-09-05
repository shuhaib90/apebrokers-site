import React from 'react';
import { sound } from '../utils/audio';

export const Header = () => {
  const handleFollowX = () => {
    sound?.playClick?.();
    window.open('https://x.com/Apesyndicates', '_blank', 'noopener,noreferrer');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#00FF66] border-b-4 border-black px-3 sm:px-8 py-2.5 sm:py-3.5 select-none">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Brand */}
        <a href="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
          <img
            src="/logo.png"
            alt="ApeSyndicate Logo"
            className="w-8 h-8 sm:w-11 sm:h-11 object-contain pixelated shrink-0"
          />
          <span className="font-pixel text-xs sm:text-base text-black tracking-wider font-extrabold whitespace-nowrap">
            APESYNDICATE
          </span>
        </a>

        {/* Right: Clean Navigation Buttons with SVG Icons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleFollowX}
            aria-label="Official X"
            className="pixel-btn pixel-btn-black px-3 sm:px-4 py-1.5 sm:py-2 text-[9px] sm:text-xs whitespace-nowrap font-extrabold text-[#00FF66] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] border-2 border-black flex items-center gap-1.5 rounded-lg"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>[ OFFICIAL X ]</span>
          </button>
        </div>
      </div>
    </header>
  );
};
