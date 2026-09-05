import React from 'react';
import { sound } from '../utils/audio';

export const Header = ({ onApplyClick, onAdminClick }) => {
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
    <header className="sticky top-0 z-50 w-full bg-[#00FF66] border-b-4 border-black px-2.5 sm:px-8 py-2.5 sm:py-3 select-none shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Left: Brand */}
        <a href="/" className="flex items-center gap-1.5 sm:gap-3 shrink-0 hover:opacity-90 transition-opacity">
          <img
            src="/logo.png"
            alt="ApeSyndicate Logo"
            className="w-7 h-7 sm:w-10 sm:h-10 object-contain pixelated shrink-0"
          />
          <span className="font-pixel text-[10px] sm:text-base text-black tracking-wider font-extrabold whitespace-nowrap">
            APESYNDICATE
          </span>
        </a>

        {/* Right: Clean Responsive Navigation Buttons */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenSea}
            aria-label="OpenSea Collection"
            className="pixel-btn pixel-btn-black px-2 sm:px-3.5 py-1.5 sm:py-2 text-[8px] sm:text-xs whitespace-nowrap font-bold text-white hover:text-[#00FF66] shadow-[2px_2px_0px_#000] sm:shadow-[3px_3px_0px_#000] border-2 border-black flex items-center gap-1 rounded-md sm:rounded-lg"
          >
            <span className="sm:hidden">[ OS ]</span>
            <span className="hidden sm:inline">[ OPENSEA ]</span>
          </button>

          <button
            type="button"
            onClick={handleApebroke}
            aria-label="Buy $APEBROKE"
            className="pixel-btn pixel-btn-black px-2 sm:px-3.5 py-1.5 sm:py-2 text-[8px] sm:text-xs whitespace-nowrap font-bold text-[#FFD700] hover:bg-[#FFD700] hover:text-black shadow-[2px_2px_0px_#000] sm:shadow-[3px_3px_0px_#000] border-2 border-black flex items-center gap-1 rounded-md sm:rounded-lg"
          >
            <span className="sm:hidden">[ $APE ]</span>
            <span className="hidden sm:inline">[ $APEBROKE ]</span>
          </button>

          <button
            type="button"
            onClick={handleFollowX}
            aria-label="Official X"
            className="pixel-btn pixel-btn-black px-2 sm:px-3.5 py-1.5 sm:py-2 text-[8px] sm:text-xs whitespace-nowrap font-extrabold text-[#00FF66] shadow-[2px_2px_0px_#000] sm:shadow-[3px_3px_0px_#000] border-2 border-black flex items-center gap-1 rounded-md sm:rounded-lg"
          >
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="hidden sm:inline">[ OFFICIAL X ]</span>
            <span className="sm:hidden">[ X ]</span>
          </button>

          {onAdminClick && (
            <button
              type="button"
              onClick={onAdminClick}
              aria-label="Admin Dashboard"
              title="Admin Dashboard"
              className="pixel-btn pixel-btn-black px-1.5 sm:px-2.5 py-1.5 sm:py-2 text-[8px] sm:text-[10px] whitespace-nowrap font-bold text-gray-400 hover:text-white border-2 border-black rounded-md sm:rounded-lg shadow-[2px_2px_0px_#000]"
            >
              <span>⚙</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
