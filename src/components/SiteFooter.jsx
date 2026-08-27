import React from 'react';
import { sound } from '../utils/audio';

export const SiteFooter = ({ onOpenWhitelist }) => {
  return (
    <footer className="w-full bg-[#05070a] border-t border-[#202b37] pt-16 pb-12 select-none">
      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#1b2430]">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#111a24] border border-[#2e3e4f] p-1">
                <img
                  src="/nfts/1.png"
                  alt="ApeBrokers Icon"
                  className="w-full h-full object-cover pixelated"
                />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[9px] font-bold tracking-[3px] text-gray-400">APE</span>
                <span className="text-lg font-black tracking-tight text-[#00FF66]">BROKERS</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
              2,222 unique pixel apes operating the most exclusive trading floor on Robinhood Chain.
            </p>
          </div>

          {/* Links Col 1 */}
          <div className="md:col-span-4 space-y-3">
            <span className="text-[11px] font-mono font-bold text-gray-500 tracking-widest uppercase block">
              ECOSYSTEM
            </span>
            <ul className="space-y-2 text-xs font-semibold text-gray-300">
              <li>
                <a href="#about" className="hover:text-[#00FF66] transition-colors">
                  About ApeBrokers
                </a>
              </li>
              <li>
                <a href="#showcase" className="hover:text-[#00FF66] transition-colors">
                  Collection Preview
                </a>
              </li>
              <li>
                <a href="#phases" className="hover:text-[#00FF66] transition-colors">
                  Roadmap & Phases
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#00FF66] transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Links Col 2 */}
          <div className="md:col-span-3 space-y-3">
            <span className="text-[11px] font-mono font-bold text-gray-500 tracking-widest uppercase block">
              WHITELIST & COMMUNITY
            </span>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  onOpenWhitelist();
                }}
                className="block text-xs font-extrabold text-[#00FF66] hover:underline"
              >
                ► Apply For Whitelist
              </button>
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-gray-300 hover:text-white transition-colors"
              >
                Official X (@ApeBrokers)
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-gray-300 hover:text-white transition-colors"
              >
                ApeBrokers Discord
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-3 text-center sm:text-left">
          <span>© {new Date().getFullYear()} ApeBrokers. All rights reserved.</span>
          <span className="text-[11px]">Submitting an application does not guarantee a whitelist spot.</span>
        </div>
      </div>
    </footer>
  );
};
