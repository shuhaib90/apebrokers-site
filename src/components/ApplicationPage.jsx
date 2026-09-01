import React from 'react';
import { sound } from '../utils/audio';
import { TypewriterText } from './TypewriterText';

export const ApplicationPage = ({ onBackHome }) => {
  const handleFollowX = () => {
    sound?.playClick?.();
    window.open('https://x.com/Apesyndicates', '_blank', 'noopener,noreferrer');
  };

  const handleHolders = () => {
    sound?.playClick?.();
    window.location.href = '/holders';
  };

  const handleHome = () => {
    sound?.playClick?.();
    if (onBackHome) {
      onBackHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-between font-pixel selection:bg-[#00FF66] selection:text-black relative overflow-x-hidden">
      {/* Background Animated Pixel Scanline Overlay */}
      <div className="fixed inset-0 bg-[radial-gradient(#112211_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-black/40 to-black pointer-events-none" />

      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full bg-black/90 backdrop-blur-md border-b-4 border-black px-4 sm:px-8 py-3 select-none">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <a href="/" onClick={(e) => { e.preventDefault(); handleHome(); }} className="flex items-center gap-2 sm:gap-3 shrink-0">
            <img
              src="/logo.png"
              alt="ApeSyndicate Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain pixelated shrink-0"
            />
            <span className="font-pixel text-xs sm:text-base text-[#00FF66] tracking-wider font-extrabold whitespace-nowrap">
              APESYNDICATE
            </span>
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleHome}
              className="pixel-btn pixel-btn-black px-3 py-1.5 text-[9px] sm:text-xs font-bold text-white border-2 border-[#333] hover:border-[#00FF66] flex items-center gap-1.5 rounded-lg"
            >
              <span>🏠</span>
              <span>[ HOME ]</span>
            </button>
            <button
              type="button"
              onClick={handleHolders}
              className="pixel-btn pixel-btn-gold px-3 py-1.5 text-[9px] sm:text-xs font-extrabold text-black flex items-center gap-1.5 rounded-lg"
            >
              <span>🏛️</span>
              <span>[ HOLDERS ]</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Terminal Card */}
      <main className="flex-grow flex items-center justify-center p-4 sm:p-6 relative z-10 my-8">
        <div className="w-full max-w-2xl bg-[#0d0d0d] border-4 border-black p-6 sm:p-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
          
          {/* Header Status Bar */}
          <div className="flex items-center justify-between border-b-2 border-[#222] pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#FF2247] rounded-full animate-ping" />
              <span className="font-pixel text-[10px] sm:text-xs text-[#FF2247] font-extrabold tracking-wider">
                ● APPLICATIONS CLOSED
              </span>
            </div>
            <span className="font-mono text-[10px] sm:text-xs text-gray-500 font-semibold">
              GATEWAY_TERMINAL_V2.0
            </span>
          </div>

          {/* Core Announcement */}
          <div className="space-y-6 text-center">
            <div className="inline-block bg-[#1a0505] border-2 border-[#FF2247]/50 px-4 py-2 rounded-lg shadow-[3px_3px_0px_0px_rgba(255,34,71,0.2)]">
              <h1 className="font-pixel text-lg sm:text-2xl md:text-3xl text-[#FF2247] font-extrabold tracking-tight drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                APPLICATIONS CLOSED
              </h1>
            </div>

            <div className="bg-black/80 border-2 border-[#222] p-5 sm:p-6 rounded-lg text-left space-y-4">
              <div className="text-[#00FF66] font-pixel text-xs sm:text-sm tracking-wide">
                <TypewriterText
                  text=">>> ALL APPLICATIONS UNDER REVIEW <<<"
                  speed={40}
                  delay={200}
                  cursor={true}
                  cursorChar="█"
                />
              </div>

              <div className="font-mono text-xs sm:text-sm text-gray-300 space-y-2.5 leading-relaxed pt-2">
                <p>
                  <span className="text-gray-500">[{new Date().toISOString().split('T')[0]}]</span> The whitelist application portal for <strong className="text-white">ApeSyndicate</strong> is now officially closed.
                </p>
                <p>
                  All submitted applications and on-chain records are currently undergoing automated clearance and manual verification.
                </p>
                <p className="text-[#FFD700] font-semibold">
                  Guaranteed (GTD) & FCFS mint clearance tiers will be published on our official X (@Apesyndicates) and Discord.
                </p>
              </div>
            </div>

            {/* Quick Status Stream Box */}
            <div className="bg-[#111] border border-[#222] p-3.5 rounded text-left font-mono text-[11px] text-gray-400 space-y-1">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-[#00FF66]">✓</span>
                <span>Submissions: <strong className="text-white">LOCKED</strong></span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-[#00FF66]">✓</span>
                <span>Review Status: <strong className="text-[#FFD700]">IN PROGRESS</strong></span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-[#00FF66]">✓</span>
                <span>Next Phase: <strong className="text-[#00FF66]">MINT ALLOCATION ANNOUNCEMENT</strong></span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
              <button
                type="button"
                onClick={handleFollowX}
                className="w-full pixel-btn pixel-btn-black py-3 px-4 text-xs font-bold text-white border-2 border-black flex items-center justify-center gap-2 hover:text-[#00FF66]"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>[ FOLLOW ON X ]</span>
              </button>

              <button
                type="button"
                onClick={handleHolders}
                className="w-full pixel-btn pixel-btn-gold py-3 px-4 text-xs font-extrabold text-black flex items-center justify-center gap-2"
              >
                <span>🏛️</span>
                <span>[ HOLDERS CLAIM ]</span>
              </button>

              <button
                type="button"
                onClick={handleHome}
                className="w-full sm:col-span-2 pixel-btn pixel-btn-lime py-3 px-4 text-xs font-extrabold text-black flex items-center justify-center gap-2 mt-1"
              >
                <span>🏠</span>
                <span>[ RETURN TO HOME ]</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center font-mono text-[11px] text-gray-500 border-t border-[#1a1a1a] relative z-10">
        © 2026 APESYNDICATE. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
};
