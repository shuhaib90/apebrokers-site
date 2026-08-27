import React, { useState } from 'react';
import { sound } from '../utils/audio';

const BROKERS_GALLERY = [
  {
    id: '1',
    name: 'ApeBroker #1',
    role: 'Founding Partner',
    image: '/nfts/1.png',
    traits: ['Gold Pixel Fur', '3D Glasses', 'Gold Trim Blazer'],
    tag: 'LEGENDARY',
  },
  {
    id: '10',
    name: 'ApeBroker #10',
    role: 'Chief Floor Trader',
    image: '/nfts/10.png',
    traits: ['Neon Lime Skin', 'Antenna Headset', 'Executive Tux'],
    tag: 'EXECUTIVE',
  },
  {
    id: '42',
    name: 'ApeBroker #42',
    role: 'Derivatives Specialist',
    image: '/nfts/42.png',
    traits: ['Cyber Green Fur', 'Laser Visor', 'Pinstripe Suit'],
    tag: 'QUANT',
  },
  {
    id: '100',
    name: 'ApeBroker #100',
    role: 'Senior Arbitrageur',
    image: '/nfts/100.png',
    traits: ['Emerald Fur', 'Demon Horns', 'Black Lapel Suit'],
    tag: 'VETERAN',
  },
];

export const BrokerShowcase = ({ onOpenWhitelist }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevSlide = () => {
    sound?.playClick?.();
    setCurrentIndex((prev) => (prev === 0 ? BROKERS_GALLERY.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    sound?.playClick?.();
    setCurrentIndex((prev) => (prev === BROKERS_GALLERY.length - 1 ? 0 : prev + 1));
  };

  const activeBroker = BROKERS_GALLERY[currentIndex];

  return (
    <section id="showcase" className="py-24 px-4 sm:px-6 max-w-5xl mx-auto text-center select-none">
      <p className="eyebrow mb-2">MEET YOUR APEBROKER</p>
      <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
        Not a picture.<br />A beginning.
      </h2>
      <p className="text-gray-400 text-base max-w-xl mx-auto mb-12">
        2,222 Brokers designed to grow into identities with assets, achievements, progression and a story on Robinhood Chain.
      </p>

      {/* Stage Card */}
      <div className="relative max-w-xl mx-auto">
        <div className="glass-panel p-6 sm:p-8 text-left transition-all">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            {/* Artwork */}
            <div className="sm:col-span-6 bg-[#080d13] rounded-xl border border-[#2e3e4f] p-3 flex items-center justify-center">
              <img
                src={activeBroker.image}
                alt={activeBroker.name}
                className="w-full max-w-[240px] h-auto aspect-square object-cover pixelated rounded-lg"
              />
            </div>

            {/* Info */}
            <div className="sm:col-span-6 space-y-4">
              <div className="inline-block px-2.5 py-1 rounded-md bg-[#00FF66]/10 border border-[#00FF66]/40 text-[#00FF66] text-xs font-mono font-bold">
                {activeBroker.tag}
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">
                  {activeBroker.name}
                </h3>
                <p className="text-sm font-semibold text-[#FFD700] mt-0.5">
                  {activeBroker.role}
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  TRAITS & ATTRIBUTES:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeBroker.traits.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-[#111a24] text-gray-200 px-2.5 py-1 rounded-md border border-[#2e3e4f]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  onOpenWhitelist();
                }}
                className="w-full py-2.5 text-xs font-bold btn-lime mt-2"
              >
                APPLY FOR WHITELIST
              </button>
            </div>
          </div>
        </div>

        {/* Slide Dots & Buttons */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous Broker"
            className="w-10 h-10 rounded-xl bg-[#111a24] border border-[#2e3e4f] text-white hover:border-[#00FF66] flex items-center justify-center transition-all"
          >
            ←
          </button>

          <div className="flex gap-2">
            {BROKERS_GALLERY.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  setCurrentIndex(idx);
                }}
                className={`h-2.5 rounded-full transition-all ${
                  currentIndex === idx ? 'w-8 bg-[#00FF66]' : 'w-2.5 bg-gray-600'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next Broker"
            className="w-10 h-10 rounded-xl bg-[#111a24] border border-[#2e3e4f] text-white hover:border-[#00FF66] flex items-center justify-center transition-all"
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
};
