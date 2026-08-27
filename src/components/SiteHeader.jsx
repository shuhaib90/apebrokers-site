import React from 'react';
import { sound } from '../utils/audio';

export const SiteHeader = ({ onOpenWhitelist }) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#080a0f]/90 backdrop-blur-md border-b border-[#202b37] px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <a href="#home" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#111a24] border border-[#2e3e4f] overflow-hidden p-1 group-hover:scale-105 group-hover:border-[#00FF66] transition-all">
            <img
              src="/nfts/1.png"
              alt="ApeBrokers Logo"
              className="w-full h-full object-cover pixelated"
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[10px] font-bold tracking-[3px] text-gray-400">APE</span>
            <span className="text-xl font-black tracking-tight text-[#00FF66]">BROKERS</span>
          </div>
        </a>

        {/* Navigation & Socials */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-300">
          <a href="#about" className="hover:text-[#00FF66] transition-colors">About</a>
          <a href="#showcase" className="hover:text-[#00FF66] transition-colors">Collection</a>
          <a href="#phases" className="hover:text-[#00FF66] transition-colors">Phases</a>
          <a href="#faq" className="hover:text-[#00FF66] transition-colors">FAQ</a>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <a
            href="https://x.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-lg border border-[#2e3e4f] bg-[#111a24] text-gray-300 hover:text-white hover:border-[#00FF66] transition-all"
            aria-label="X (Twitter)"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>

          <a
            href="https://discord.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-lg border border-[#2e3e4f] bg-[#111a24] text-gray-300 hover:text-white hover:border-[#00FF66] transition-all"
            aria-label="Discord"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </a>

          <button
            type="button"
            onClick={() => {
              sound?.playClick?.();
              onOpenWhitelist();
            }}
            className="btn-header-apply px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-extrabold tracking-wider"
          >
            APPLY
          </button>
        </div>
      </div>
    </header>
  );
};
