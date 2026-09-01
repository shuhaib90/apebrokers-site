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
          <a
            href="/verify"
            className="pixel-btn pixel-btn-black px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[9px] sm:text-xs whitespace-nowrap font-extrabold text-[#00FF66] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] border-2 border-black flex items-center gap-1.5 rounded-lg"
          >
            <span>🛡️</span>
            <span>[ VERIFY ]</span>
          </a>

          <a
            href="/code"
            className="pixel-btn pixel-btn-black px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[9px] sm:text-xs whitespace-nowrap font-extrabold text-[#FFD700] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] border-2 border-black flex items-center gap-1.5 rounded-lg"
          >
            <svg className="w-3 h-3 fill-[#FFD700] shrink-0" viewBox="0 0 24 24">
              <path d="M7 14A5 5 0 0 1 7 4a5 5 0 0 1 4.58 3H21v4h-2v2h-2v-2h-2v2h-2v-2H11.58A5 5 0 0 1 7 14zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
            </svg>
            <span>[ CODE ]</span>
          </a>

          <a
            href="/holders"
            className="pixel-btn pixel-btn-gold px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[9px] sm:text-xs whitespace-nowrap font-extrabold text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 rounded-lg"
          >
            <svg className="w-3 h-3 fill-black shrink-0" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span>[ HOLDERS ]</span>
          </a>

          <button
            type="button"
            onClick={handleFollowX}
            aria-label="Official X"
            className="pixel-btn pixel-btn-white p-1.5 sm:px-3 sm:py-2 text-xs flex items-center justify-center rounded-lg"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};
