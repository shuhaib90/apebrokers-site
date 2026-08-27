import React, { useState } from 'react';
import { sound } from '../utils/audio';

const COLLECTION_PREVIEW = [
  { id: '1', name: 'ApeBroker #1', role: 'Founding Partner', img: '/nfts/1.png', tag: 'LEGENDARY', traits: ['Gold Fur', '3D Glasses', 'Gold Blazer'] },
  { id: '10', name: 'ApeBroker #10', role: 'Chief Floor Trader', img: '/nfts/10.png', tag: 'EXECUTIVE', traits: ['Neon Lime', 'Antenna', 'Dark Tux'] },
  { id: '42', name: 'ApeBroker #42', role: 'Derivatives Specialist', img: '/nfts/42.png', tag: 'QUANT', traits: ['Cyber Green', 'Laser Visor', 'Pinstripe'] },
  { id: '100', name: 'ApeBroker #100', role: 'Senior Arbitrageur', img: '/nfts/100.png', tag: 'VETERAN', traits: ['Emerald', 'Demon Horns', 'Black Lapel'] },
  { id: '7', name: 'ApeBroker #7', role: 'Alpha Broker', img: '/nfts/777.png', tag: 'ALPHA', traits: ['Shadow Black', 'Gold Crown', 'Crypto Shades'] },
  { id: '11', name: 'ApeBroker #11', role: 'High-Roller Ape', img: '/nfts/1111.png', tag: 'JACKPOT', traits: ['Golden', 'Lucky Bandana', 'Crimson Tie'] },
];

export const Showcase = ({ onApplyClick }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const current = COLLECTION_PREVIEW[selectedIdx] || COLLECTION_PREVIEW[0];

  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-16 select-none">
      <div className="pixel-box p-6 sm:p-10 text-center space-y-6">
        {/* Title */}
        <div className="space-y-1">
          <div className="inline-block bg-black text-[#00FF66] font-pixel text-[9px] px-3 py-1 border-2 border-black">
            COLLECTION PREVIEW
          </div>
          <h2 className="font-pixel text-xl sm:text-3xl text-black font-extrabold tracking-tight">
            FEATURED APEBROKERS
          </h2>
          <p className="font-mono text-xs sm:text-sm text-gray-700 font-semibold max-w-xl mx-auto">
            Each ApeBroker is uniquely generated with distinct pixel traits, brokerage gear, and trading floor status.
          </p>
        </div>

        {/* Interactive Showcase Box */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
          {/* Main Selected Ape */}
          <div className="md:col-span-5 bg-black border-4 border-black p-4 text-center">
            <img
              src={current.img}
              alt={current.name}
              className="w-full max-w-[240px] h-auto aspect-square object-cover pixelated mx-auto"
            />
            <div className="mt-3 font-pixel text-xs text-[#FFD700]">
              {current.name}
            </div>
            <div className="font-pixel text-[9px] text-[#00FF66] mt-0.5">
              {current.role}
            </div>
          </div>

          {/* Selector Grid & Attributes */}
          <div className="md:col-span-7 space-y-4 text-left">
            <div className="font-pixel text-[10px] text-black">
              SELECT BROKER TO INSPECT:
            </div>

            {/* Thumbnail Buttons */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {COLLECTION_PREVIEW.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    sound?.playClick?.();
                    setSelectedIdx(idx);
                  }}
                  className={`border-3 p-1 transition-all ${
                    selectedIdx === idx
                      ? 'border-black bg-[#00FF66] scale-105 shadow-pixel-sm'
                      : 'border-black bg-white hover:bg-gray-100'
                  }`}
                >
                  <img
                    src={item.img}
                    alt={item.name}
                    className="w-full aspect-square object-cover pixelated"
                  />
                  <div className="font-pixel text-[7px] text-black text-center mt-1">
                    #{item.id}
                  </div>
                </button>
              ))}
            </div>

            {/* Traits Card */}
            <div className="bg-[#140D24] text-white border-3 border-black p-4 space-y-2 font-mono text-xs">
              <div className="font-pixel text-[9px] text-[#FFD700] flex justify-between">
                <span>STATUS BADGE:</span>
                <span className="text-[#00FF66]">{current.tag}</span>
              </div>
              <div className="space-y-1 pt-1">
                <span className="text-gray-400 text-[11px] block font-bold">ATTRIBUTES:</span>
                <div className="flex flex-wrap gap-1.5">
                  {current.traits.map((t, i) => (
                    <span key={i} className="bg-black/80 px-2 py-0.5 border border-gray-700 text-white text-[11px]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onApplyClick}
              className="w-full py-3 pixel-btn pixel-btn-black font-pixel text-xs font-bold"
            >
              [ APPLY FOR APEBROKERS WL ]
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
