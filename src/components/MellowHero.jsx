import React from 'react';
import { sound } from '../utils/audio';

export const MellowHero = ({ onOpenWhitelist }) => {
  return (
    <section id="home" className="relative min-h-[820px] pt-32 pb-20 overflow-hidden flex flex-col items-center justify-center text-center px-4 sm:px-6">
      {/* Background Ambience */}
      <div className="hero-scene-bg" />
      <div className="hero-scene-grid" />

      {/* Floating geometric ambient accents */}
      <div className="absolute top-1/4 left-[10%] w-32 h-32 border border-[#2e3e4f]/40 rotate-45 pointer-events-none hidden md:block" />
      <div className="absolute top-1/3 right-[12%] w-44 h-44 border border-[#00FF66]/20 rotate-12 pointer-events-none hidden md:block" />
      <div className="absolute bottom-1/4 left-[18%] w-24 h-24 border border-[#e875a6]/20 -rotate-12 pointer-events-none hidden md:block" />

      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111a24] border border-[#2e3e4f] text-[#00FF66] font-mono text-xs font-bold tracking-widest uppercase">
          <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse" />
          <span>ROBINHOOD CHAIN EXCLUSIVE</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] text-white">
          Own your Broker.<br />
          <span className="text-[#00FF66]">Next generation onchain trading floor</span>
        </h1>

        {/* Hero Copy */}
        <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed font-normal">
          <strong className="text-white font-semibold">2,222 ApeBrokers are built to conquer Robinhood Chain.</strong> Each Broker carries exclusive trading floor access, priority execution, community alpha, and future ecosystem utility.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={() => {
              sound?.playZoom?.();
              onOpenWhitelist();
            }}
            className="btn-lime px-8 py-4 text-sm sm:text-base font-extrabold tracking-wide"
          >
            APPLY FOR WHITELIST
          </button>

          <a
            href="https://x.com"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sound?.playClick?.()}
            className="btn-outline px-8 py-4 text-sm sm:text-base font-bold flex items-center gap-2"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>FOLLOW US</span>
          </a>
        </div>

        {/* MellowPals Stats Bar */}
        <div className="pt-12 sm:pt-16 max-w-3xl mx-auto w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#2e3e4f]/60 rounded-2xl p-1 border border-[#2e3e4f] shadow-2xl backdrop-blur-md overflow-hidden">
            {/* Stat 1 */}
            <div className="bg-[#0b1219]/90 p-5 text-center flex flex-col justify-center">
              <b className="text-2xl sm:text-3xl font-black text-white tracking-tight">2,222</b>
              <span className="text-[11px] font-bold text-gray-400 tracking-[2px] mt-1 uppercase">APEBROKERS</span>
            </div>

            {/* Stat 2 */}
            <div className="bg-[#0b1219]/90 p-5 text-center flex flex-col justify-center">
              <b className="text-2xl sm:text-3xl font-black text-[#FFD700] tracking-tight">TBA</b>
              <span className="text-[11px] font-bold text-gray-400 tracking-[2px] mt-1 uppercase">MINT PRICE</span>
            </div>

            {/* Stat 3 */}
            <div className="bg-[#0b1219]/90 p-5 text-center flex flex-col justify-center">
              <b className="text-2xl sm:text-3xl font-black text-[#00FF66] tracking-tight">ROBINHOOD</b>
              <span className="text-[11px] font-bold text-gray-400 tracking-[2px] mt-1 uppercase">CHAIN</span>
            </div>

            {/* Stat 4 */}
            <div className="bg-[#0b1219]/90 p-5 text-center flex flex-col justify-center">
              <b className="text-2xl sm:text-3xl font-black text-[#e875a6] tracking-tight">$BROKER</b>
              <span className="text-[11px] font-bold text-gray-400 tracking-[2px] mt-1 uppercase">UTILITY</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
