import React, { useState } from 'react';
import { sound } from '../utils/audio';

const FAQ_ITEMS = [
  {
    q: 'What is ApeSyndicate?',
    a: 'ApeSyndicate is a high-conviction collection of 5,555 unique pixel apes operating an onchain syndicate on Robinhood Chain.',
  },
  {
    q: 'How do I apply for WL?',
    a: 'Complete the whitelist application form on this website with your X username, EVM/Robinhood wallet address, and complete the social tasks.',
  },
  {
    q: 'When is the mint?',
    a: 'Mint date is Sep 3rd with a mint price of 0.0016 ETH exclusively on Robinhood Chain.',
  },
  {
    q: 'Which chain is ApeSyndicate on?',
    a: 'ApeSyndicate is built natively and exclusively on Robinhood Chain.',
  },
  {
    q: 'Do I need to connect my wallet?',
    a: 'No. You do not need to connect your wallet. You only manually type or paste your public wallet address into the application form.',
  },
  {
    q: 'How will WL be selected?',
    a: 'Applications are screened directly by the ApeSyndicate team based on verified task completion, conviction, and community engagement.',
  },
];

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    sound?.playClick?.();
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section id="faq" className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 select-none">
      <div className="pixel-box p-5 sm:p-8 md:p-10 space-y-6">
        {/* Title */}
        <div className="text-center space-y-1.5 border-b-4 border-black pb-4">
          <div className="inline-block bg-black text-[#00FF66] font-pixel text-[9px] sm:text-[10px] px-3 py-1 border-2 border-black">
            KNOWLEDGE BASE
          </div>
          <h2 className="font-pixel text-xl sm:text-2xl md:text-3xl text-black font-extrabold tracking-tight">
            FREQUENTLY ASKED QUESTIONS
          </h2>
        </div>

        {/* Accordion Items */}
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="border-3 border-black bg-white shadow-pixel-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleFAQ(idx)}
                  className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 bg-white hover:bg-gray-100 transition-colors"
                >
                  <span className="font-pixel text-[10px] sm:text-xs text-black font-bold">
                    {item.q}
                  </span>
                  <span className="font-pixel text-xs text-black shrink-0 font-extrabold">
                    {isOpen ? '[-]' : '[+]'}
                  </span>
                </button>

                {isOpen && (
                  <div className="p-3.5 sm:p-4 bg-gray-100 border-t-2 border-black font-mono text-xs sm:text-sm text-gray-800 font-semibold leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
