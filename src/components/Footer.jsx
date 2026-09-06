import React from 'react';
import { sound } from '../utils/audio';

export const Footer = ({ onDeskClick }) => {
  const handleFollowX = () => {
    sound?.playClick?.();
    window.open('https://x.com/Apesyndicates', '_blank', 'noopener,noreferrer');
  };

  const handleOpenSea = () => {
    sound?.playClick?.();
    window.open('https://opensea.io/collection/brokerdesk-583588970', '_blank', 'noopener,noreferrer');
  };

  const handleApebroke = () => {
    sound?.playClick?.();
    window.open('https://www.letscash.fun/token/0xe0F384ebCede975342c5431aCad515b4A1B862cc', '_blank', 'noopener,noreferrer');
  };

  const handleLaunchDesk = () => {
    sound?.playZoom?.();
    if (onDeskClick) {
      onDeskClick();
    } else {
      window.location.href = '/brokerdesk';
    }
  };

  return (
    <footer className="w-full bg-[#070312]/95 border-t-3 border-black px-4 sm:px-8 py-8 select-none relative z-20">
      <div className="max-w-5xl mx-auto flex flex-col items-center text-center space-y-5">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="BrokerDesk Logo"
            className="w-7 h-7 object-contain pixelated"
          />
          <span className="font-pixel text-sm sm:text-base text-[#00FF66] font-extrabold tracking-wider">
            BROKERDESK
          </span>
          <span className="px-2 py-0.5 bg-[#170a36] border border-purple-800 text-[8px] text-[#00F0FF] rounded font-mono">
            ROBINHOOD EVM
          </span>
        </div>

        {/* Buttons Arranged Correctly in One Clean Row */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 w-full">
          <button
            type="button"
            onClick={handleLaunchDesk}
            className="pixel-btn pixel-btn-vibrant-lime px-3.5 sm:px-4 py-2 sm:py-2.5 font-pixel text-[10px] sm:text-xs font-extrabold rounded-lg shadow-[3px_3px_0px_#000] flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping shrink-0" />
            <span>[ BROKERDESK ]</span>
          </button>

          <button
            type="button"
            onClick={handleOpenSea}
            className="pixel-btn pixel-btn-vibrant-cyan px-3 sm:px-4 py-2 sm:py-2.5 font-pixel text-[10px] sm:text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000] whitespace-nowrap"
          >
            [ OPENSEA ]
          </button>

          <button
            type="button"
            onClick={handleApebroke}
            className="pixel-btn pixel-btn-vibrant-gold px-3 sm:px-4 py-2 sm:py-2.5 font-pixel text-[10px] sm:text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000] whitespace-nowrap"
          >
            [ BUY NOW $APEBROKE ]
          </button>

          <button
            type="button"
            onClick={handleFollowX}
            className="pixel-btn pixel-btn-black text-[#00FF66] border-2 border-black px-3 sm:px-4 py-2 sm:py-2.5 font-pixel text-[10px] sm:text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000] flex items-center gap-1.5 whitespace-nowrap"
          >
            <svg className="w-3 h-3 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>[ OFFICIAL X ]</span>
          </button>
        </div>

        {/* Copyright */}
        <div className="font-pixel text-[8px] sm:text-[9px] text-gray-500 pt-1">
          © {new Date().getFullYear()} BROKERDESK • APESYNDICATE. ALL RIGHTS RESERVED.
        </div>
      </div>
    </footer>
  );
};
