import React, { useState } from 'react';
import { sound } from '../utils/audio';

const FAQ_ITEMS = [
  {
    q: 'WHAT IS BROKERDESK?',
    a: 'BrokerDesk is the flagship decentralized NFT revenue protocol deployed natively on Robinhood Chain EVM. It transforms Ape Broker NFTs into active trading workstations that earn automated 5-hour native ETH yield distributions.',
  },
  {
    q: 'HOW DO 5-HOUR ETH REWARD DISTRIBUTIONS WORK?',
    a: 'Every 5 hours (18,000 seconds), an automated epoch cycle executes on-chain. Distributable native ETH from the protocol pool is shared proportionally among all active desks according to their individual weight (100–600 WGT) and the benchmark divisor floor.',
  },
  {
    q: 'HOW DOES BOOSTING WITH $APEBROKE WORK?',
    a: 'Each desk begins at 100 WGT. Operators can upgrade their desk with multi-tier boosts (Tier 1: +50 WGT up to Tier 5: +200 WGT, reaching a maximum 600 WGT cap). 100% of the $APEBROKE used for boosts is burned on-chain, creating permanent deflationary pressure while maximizing your reward multiplier.',
  },
  {
    q: 'HOW MANY DESKS CAN I RUN CONCURRENTLY?',
    a: 'Each wallet operator can activate and operate up to 5 concurrent Broker Desks simultaneously, scaling their total active weight to a protocol maximum of 3,000 WGT.',
  },
  {
    q: 'WHAT ARE THE OFFICIAL CONTRACT ADDRESSES?',
    a: 'BrokerDesk Protocol: 0x8EB4dd47009651A4C5eA42B9622EA823253922be | Ape Broker NFT: 0xd3b030e9281fcd8797af6dc437636b24bdfe7902 | $APEBROKE Token: 0xe0F384ebCede975342c5431aCad515b4A1B862cc on Robinhood Chain Mainnet.',
  },
];

export const BrokerDeskSections = ({ onDeskClick }) => {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    sound?.playClick?.();
    setOpenFaq((prev) => (prev === idx ? null : idx));
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
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 space-y-16 sm:space-y-24 pb-16 select-none relative z-10">
      {/* 1. Protocol Architecture / How It Works */}
      <section className="space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-block bg-black text-[#00FF66] font-pixel text-[9px] sm:text-xs px-3 py-1.5 border-2 border-black rounded shadow-[2px_2px_0px_#000]">
            PROTOCOL ARCHITECTURE
          </div>
          <h2 className="font-pixel text-xl sm:text-3xl text-black font-extrabold tracking-tight">
            HOW BROKERDESK WORKS
          </h2>
          <p className="font-mono text-xs sm:text-sm text-gray-900 font-bold max-w-xl mx-auto leading-relaxed">
            A continuous on-chain revenue loop designed for long-term holders and active operators on Robinhood Chain.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Step 1 */}
          <div className="bg-[#100726]/95 border-3 border-[#00FF66] p-5 sm:p-6 rounded-xl shadow-[5px_5px_0px_0px_#000] flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[10px] sm:text-xs text-[#00FF66] bg-black/80 px-2.5 py-1 border border-[#00FF66] rounded">
                  STEP 01
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#00FF66] animate-ping" />
              </div>
              <h3 className="font-pixel text-sm sm:text-base text-white font-extrabold leading-snug">
                ACTIVATE DESK
              </h3>
              <p className="font-mono text-xs text-gray-300 leading-relaxed font-medium">
                Connect your EVM wallet holding an Ape Broker NFT. Each NFT initializes an independent trading workstation with 100 WGT base weight. Run up to 5 desks concurrently.
              </p>
            </div>
            <div className="pt-2 border-t border-white/10 font-mono text-[11px] text-[#00FF66] font-bold">
              ⚡ 1 NFT = 1 OPERATING DESK
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-[#100726]/95 border-3 border-[#FFD700] p-5 sm:p-6 rounded-xl shadow-[5px_5px_0px_0px_#000] flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[10px] sm:text-xs text-[#FFD700] bg-black/80 px-2.5 py-1 border border-[#FFD700] rounded">
                  STEP 02
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFD700] animate-pulse" />
              </div>
              <h3 className="font-pixel text-sm sm:text-base text-white font-extrabold leading-snug">
                BOOST WITH $APEBROKE
              </h3>
              <p className="font-mono text-xs text-gray-300 leading-relaxed font-medium">
                Burn $APEBROKE to unlock multi-tier boosts up to 600 WGT (+500% multiplier). 100% of boost tokens are permanently destroyed, driving protocol deflation.
              </p>
            </div>
            <div className="pt-2 border-t border-white/10 font-mono text-[11px] text-[#FFD700] font-bold">
              🔥 UP TO 600 WGT (+500% BOOST)
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-[#100726]/95 border-3 border-[#00F0FF] p-5 sm:p-6 rounded-xl shadow-[5px_5px_0px_0px_#000] flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[10px] sm:text-xs text-[#00F0FF] bg-black/80 px-2.5 py-1 border border-[#00F0FF] rounded">
                  STEP 03
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] animate-ping" />
              </div>
              <h3 className="font-pixel text-sm sm:text-base text-white font-extrabold leading-snug">
                5-HOUR ETH DISTRIBUTIONS
              </h3>
              <p className="font-mono text-xs text-gray-300 leading-relaxed font-medium">
                Smart contract distributes native ETH every 5 hours (18,000s). Accumulated yields stream automatically to your desk and can be claimed anytime with 0 lockups.
              </p>
            </div>
            <div className="pt-2 border-t border-white/10 font-mono text-[11px] text-[#00F0FF] font-bold">
              💎 AUTOMATED NATIVE ETH YIELD
            </div>
          </div>
        </div>
      </section>

      {/* 2. Protocol Specifications Grid */}
      <section className="bg-[#0e0622]/95 border-3 border-black p-6 sm:p-8 rounded-2xl shadow-[6px_6px_0px_0px_#000] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black/40 pb-4">
          <div>
            <div className="font-pixel text-[9px] text-[#00F0FF] font-bold uppercase tracking-wider">
              VERIFIED ON-CHAIN PARAMETERS
            </div>
            <h3 className="font-pixel text-base sm:text-xl text-white font-extrabold mt-1">
              PROTOCOL SPECIFICATIONS
            </h3>
          </div>
          <div className="inline-flex items-center gap-2 bg-black px-3 py-1.5 rounded border border-[#00FF66]">
            <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse" />
            <span className="font-pixel text-[9px] text-[#00FF66] font-bold">LIVE ON ROBINHOOD EVM</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-[#1a0c3b] p-3.5 sm:p-4 rounded-lg border border-[#A855F7]/40">
            <div className="font-pixel text-[8px] sm:text-[9px] text-gray-400">NETWORK</div>
            <div className="font-pixel text-xs sm:text-sm text-white font-extrabold mt-1">ROBINHOOD EVM</div>
            <div className="font-mono text-[10px] text-[#00FF66] mt-0.5">MAINNET</div>
          </div>

          <div className="bg-[#1a0c3b] p-3.5 sm:p-4 rounded-lg border border-[#A855F7]/40">
            <div className="font-pixel text-[8px] sm:text-[9px] text-gray-400">EPOCH DURATION</div>
            <div className="font-pixel text-xs sm:text-sm text-[#00F0FF] font-extrabold mt-1">5 HOURS</div>
            <div className="font-mono text-[10px] text-gray-300 mt-0.5">18,000 SECONDS</div>
          </div>

          <div className="bg-[#1a0c3b] p-3.5 sm:p-4 rounded-lg border border-[#A855F7]/40">
            <div className="font-pixel text-[8px] sm:text-[9px] text-gray-400">YIELD CURRENCY</div>
            <div className="font-pixel text-xs sm:text-sm text-[#00FF66] font-extrabold mt-1">NATIVE ETH</div>
            <div className="font-mono text-[10px] text-gray-300 mt-0.5">DIRECT WALLET CLAIM</div>
          </div>

          <div className="bg-[#1a0c3b] p-3.5 sm:p-4 rounded-lg border border-[#A855F7]/40">
            <div className="font-pixel text-[8px] sm:text-[9px] text-gray-400">WEIGHT CEILING</div>
            <div className="font-pixel text-xs sm:text-sm text-[#FFD700] font-extrabold mt-1">600 WGT</div>
            <div className="font-mono text-[10px] text-gray-300 mt-0.5">+500% MULTIPLIER</div>
          </div>

          <div className="bg-[#1a0c3b] p-3.5 sm:p-4 rounded-lg border border-[#A855F7]/40">
            <div className="font-pixel text-[8px] sm:text-[9px] text-gray-400">OPERATOR CAP</div>
            <div className="font-pixel text-xs sm:text-sm text-[#FF007F] font-extrabold mt-1">5 DESKS MAX</div>
            <div className="font-mono text-[10px] text-gray-300 mt-0.5">3,000 WGT MAX TOTAL</div>
          </div>

          <div className="bg-[#1a0c3b] p-3.5 sm:p-4 rounded-lg border border-[#A855F7]/40">
            <div className="font-pixel text-[8px] sm:text-[9px] text-gray-400">TOKENOMICS</div>
            <div className="font-pixel text-xs sm:text-sm text-[#FFD700] font-extrabold mt-1">100% BURN</div>
            <div className="font-mono text-[10px] text-gray-300 mt-0.5">DEFLATIONARY BOOST</div>
          </div>
        </div>
      </section>

      {/* 3. Frequently Asked Questions (FAQ) */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-block bg-black text-[#FF007F] font-pixel text-[9px] sm:text-xs px-3 py-1.5 border-2 border-black rounded shadow-[2px_2px_0px_#000]">
            QUESTIONS & ANSWERS
          </div>
          <h2 className="font-pixel text-xl sm:text-3xl text-black font-extrabold tracking-tight">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <p className="font-mono text-xs sm:text-sm text-gray-900 font-bold max-w-lg mx-auto">
            Everything you need to know about operating your BrokerDesk and claiming rewards.
          </p>
        </div>

        <div className="space-y-3 max-w-3xl mx-auto">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-[#100726]/95 border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_#000] transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 text-white hover:text-[#00FF66] transition-colors"
                >
                  <span className="font-pixel text-[10px] sm:text-xs font-bold leading-relaxed">
                    {item.q}
                  </span>
                  <span className="font-pixel text-xs sm:text-sm shrink-0 text-[#00FF66]">
                    {isOpen ? '[-]' : '[+]'}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-white/10">
                    <p className="font-mono text-xs sm:text-sm text-gray-200 leading-relaxed font-semibold">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Terminal Launch CTA */}
      <section className="bg-gradient-to-r from-[#140632] via-[#240a58] to-[#140632] border-4 border-black p-8 sm:p-12 text-center rounded-2xl shadow-[8px_8px_0px_0px_#000] space-y-6">
        <div className="inline-flex items-center gap-2 bg-[#00FF66]/10 text-[#00FF66] px-3.5 py-1.5 border border-[#00FF66] rounded-full font-pixel text-[9px] sm:text-[10px]">
          <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-ping" />
          <span>BROKERDESK WORKSTATION LIVE</span>
        </div>
        <h2 className="font-pixel text-xl sm:text-3xl md:text-4xl text-white font-black tracking-tight drop-shadow-[0_0_12px_rgba(0,255,102,0.4)]">
          READY TO OPERATE YOUR DESK?
        </h2>
        <p className="font-mono text-xs sm:text-base text-gray-200 font-semibold max-w-xl mx-auto leading-relaxed">
          Connect your wallet on Robinhood EVM, activate your operating desks, and tap into continuous 5-hour native ETH yield.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={handleLaunchDesk}
            className="pixel-btn pixel-btn-vibrant-lime px-8 sm:px-12 py-3.5 sm:py-4 font-pixel text-xs sm:text-sm font-black rounded-xl shadow-[5px_5px_0px_0px_#000] inline-flex items-center gap-2.5 whitespace-nowrap"
          >
            <span className="w-2 h-2 rounded-full bg-black animate-ping shrink-0" />
            <span>[ ⚡ ENTER BROKERDESK ]</span>
          </button>
        </div>
      </section>
    </div>
  );
};
