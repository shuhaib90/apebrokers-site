import React from 'react';
import { sound } from '../utils/audio';

export const Header = ({ onApplyClick }) => {
  const handleFollowX = () => {
    sound?.playClick?.();
    window.open('https://x.com/Apesyndicates', '_blank', 'noopener,noreferrer');
  };

  const handleDiscordClick = () => {
    sound?.playClick?.();
    window.open('https://discord.com', '_blank', 'noopener,noreferrer');
  };

  const handleApply = () => {
    sound?.playZoom?.();
    if (onApplyClick) {
      onApplyClick();
    } else {
      const el = document.getElementById('apply');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#00FF66] border-b-4 border-black px-3 sm:px-8 py-2.5 sm:py-3.5 select-none">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Brand */}
        <a href="#" className="flex items-center gap-2 sm:gap-3 shrink-0">
          <img
            src="/logo.png"
            alt="ApeSyndicate Logo"
            className="w-8 h-8 sm:w-11 sm:h-11 object-contain pixelated shrink-0"
          />
          <span className="font-pixel text-xs sm:text-base text-black tracking-wider font-extrabold whitespace-nowrap">
            APESYNDICATE
          </span>
        </a>

        {/* Right: Quick Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={handleApply}
            className="pixel-btn pixel-btn-black px-2.5 sm:px-4 py-1.5 sm:py-2 text-[9px] sm:text-xs whitespace-nowrap font-extrabold"
          >
            <span className="hidden sm:inline">[ APPLY FOR WL ]</span>
            <span className="sm:hidden">[ APPLY ]</span>
          </button>

          <button
            type="button"
            onClick={handleFollowX}
            aria-label="Official X"
            className="pixel-btn pixel-btn-white p-1.5 sm:px-3 sm:py-2 text-xs flex items-center justify-center"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleDiscordClick}
            aria-label="Official Discord"
            className="pixel-btn pixel-btn-purple p-1.5 sm:px-3 sm:py-2 text-xs flex items-center justify-center"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};
