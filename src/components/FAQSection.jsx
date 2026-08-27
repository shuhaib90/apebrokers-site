import React, { useState } from 'react';
import { sound } from '../utils/audio';

const FAQ_DATA = [
  {
    q: 'What is ApeBrokers?',
    a: 'ApeBrokers is a collection of 2,222 unique pixel apes on Robinhood Chain, representing token-bound memberships on the premier onchain trading floor.',
  },
  {
    q: 'How do I apply for the Whitelist?',
    a: 'Click "APPLY FOR WHITELIST" anywhere on this page, complete the 3 social verification tasks, enter your Robinhood/EVM wallet address, and submit your application.',
  },
  {
    q: 'When is the mint date and price?',
    a: 'Mint date and mint price are TBA (To Be Announced) exclusively via our official X (@ApeBrokers) and Discord announcement channels.',
  },
  {
    q: 'Which chain is ApeBrokers on?',
    a: 'ApeBrokers is deployed natively and exclusively on Robinhood Chain.',
  },
  {
    q: 'Do I need to connect my wallet to apply?',
    a: 'No. You do not connect your wallet to apply. You simply type or paste your public wallet address into the secure application form.',
  },
  {
    q: 'How will Whitelist spots be allocated?',
    a: 'Applications are screened directly by the ApeBrokers core team based on verified task completion, trading community reputation, and high-conviction participation.',
  },
];

export const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (idx) => {
    sound?.playClick?.();
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section id="faq" className="py-24 px-4 sm:px-6 max-w-4xl mx-auto select-none border-t border-[#202b37]">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <p className="eyebrow mb-2">FAQ</p>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
          Frequently Asked Questions
        </h2>
        <p className="text-gray-400 text-base">
          Everything you need to know about the ApeBrokers whitelist and mint.
        </p>
      </div>

      <div className="space-y-3">
        {FAQ_DATA.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-[#233140] bg-[#0c131a] overflow-hidden transition-colors"
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full min-h-[56px] px-6 py-4 flex items-center justify-between text-left text-sm sm:text-base font-bold text-white hover:text-[#00FF66] transition-colors"
              >
                <span>{item.q}</span>
                <span className="text-xl font-mono text-[#00FF66] ml-4 shrink-0">
                  {isOpen ? '−' : '+'}
                </span>
              </button>

              {isOpen && (
                <div className="px-6 pb-5 pt-1 text-sm text-gray-300 leading-relaxed border-t border-[#182330]">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
