import React from 'react';
import { sound } from '../utils/audio';

export const Footer = ({ onDeskClick }) => {
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

  const handleLaunchDesk = () => {
    sound?.playZoom?.();
    if (onDeskClick) {
      onDeskClick();
    } else {
      window.location.href = '/brokerdesk';
    }
  };

  return (
    <footer className="w-full bg-[#070312] text-white border-t-4 border-black px-4 sm:px-8 py-10 sm:py-14 select-none relative z-20">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Row: Brand & Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-white/10 text-center md:text-left">
          {/* Brand Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <img
                src="/logo.png"
                alt="BrokerDesk Logo"
                className="w-8 h-8 object-contain pixelated"
              />
              <span className="font-pixel text-lg sm:text-xl text-[#00FF66] font-extrabold tracking-wider">
                BROKERDESK
              </span>
            </div>
            <p className="font-mono text-xs text-gray-400 max-w-md leading-relaxed">
              Decentralized NFT Revenue Protocol on Robinhood EVM. Activate trading desks, upgrade with $APEBROKE boosts, and earn continuous 5-hour ETH distributions.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleLaunchDesk}
              className="pixel-btn pixel-btn-vibrant-lime px-3.5 sm:px-4 py-2 sm:py-2.5 font-pixel text-[10px] sm:text-xs font-extrabold rounded-lg shadow-[3px_3px_0px_#000] flex items-center gap-1.5 whitespace-nowrap"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping shrink-0" />
              <span>[ ⚡ BROKERDESK ]</span>
            </button>

            <button
              type="button"
              onClick={handleOpenSea}
              className="pixel-btn pixel-btn-vibrant-cyan px-3 sm:px-3.5 py-2 sm:py-2.5 font-pixel text-[10px] sm:text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000] whitespace-nowrap"
            >
              [ OPENSEA ]
            </button>

            <button
              type="button"
              onClick={handleApebroke}
              className="pixel-btn pixel-btn-vibrant-gold px-3 sm:px-3.5 py-2 sm:py-2.5 font-pixel text-[10px] sm:text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000] whitespace-nowrap"
            >
              [ $APEBROKE ]
            </button>

            <button
              type="button"
              onClick={handleFollowX}
              className="pixel-btn pixel-btn-black text-[#00FF66] border-2 border-black px-3 sm:px-3.5 py-2 sm:py-2.5 font-pixel text-[10px] sm:text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000] flex items-center gap-1.5 whitespace-nowrap"
            >
              <svg className="w-3 h-3 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>[ OFFICIAL X ]</span>
            </button>
          </div>
        </div>

        {/* Middle Row: Verified Contract Addresses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
          <div className="bg-[#120726] border border-[#A855F7]/30 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="font-pixel text-[9px] text-[#00F0FF] uppercase">
              DESK PROTOCOL CONTRACT
            </span>
            <span className="text-gray-300 select-all font-mono text-[11px] truncate">
              0x8EB4dd47009651A4C5eA42B9622EA823253922be
            </span>
          </div>

          <div className="bg-[#120726] border border-[#A855F7]/30 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="font-pixel text-[9px] text-[#00FF66] uppercase">
              APE BROKER NFT CONTRACT
            </span>
            <span className="text-gray-300 select-all font-mono text-[11px] truncate">
              0xd3b030e9281fcd8797af6dc437636b24bdfe7902
            </span>
          </div>
        </div>

        {/* Bottom Row: Copyright & Chain Info */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-gray-500 font-pixel text-[8px] sm:text-[9px]">
          <div>
            © {new Date().getFullYear()} BROKERDESK • APESYNDICATE. ALL RIGHTS RESERVED.
          </div>
          <div className="flex items-center gap-2 text-gray-400 font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66]" />
            <span>ROBINHOOD EVM MAINNET</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
