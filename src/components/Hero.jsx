import React, { useState, useEffect } from 'react';
import { sound } from '../utils/audio';

const HERO_GIFS = [
  '/gifs/1.gif',
  '/gifs/2.gif',
  '/gifs/3.gif',
  '/gifs/4.gif',
  '/gifs/5.gif',
];

export const Hero = ({ onApplyClick, onBrokersClick }) => {
  const [currentGifIndex, setCurrentGifIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentGifIndex((prev) => (prev + 1) % HERO_GIFS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleBrokers = () => {
    sound?.playClick?.();
    if (onBrokersClick) {
      onBrokersClick();
    } else {
      window.location.href = '/brokers.html';
    }
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
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-8 pt-8 pb-12 sm:pt-14 sm:pb-16 select-none">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column */}
        <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-5 sm:space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-black text-[#00FF66] px-3.5 py-1.5 border-3 border-black font-pixel text-[10px] sm:text-xs shadow-pixel-sm">
            <span className="w-2.5 h-2.5 bg-[#00FF66] inline-block animate-blink" />
            <span>WL APPLICATIONS OPEN</span>
          </div>

          {/* Headline */}
          <div className="space-y-1 sm:space-y-2">
            <h1 className="font-pixel text-3xl sm:text-5xl lg:text-6xl text-black tracking-tight font-extrabold leading-none">
              APEBROKERS
            </h1>
            <h2 className="font-pixel text-xl sm:text-3xl lg:text-4xl text-[#2A0845] tracking-tight font-extrabold">
              GET ON THE LIST.
            </h2>
          </div>

          {/* Mobile-Only Artwork Preview (Clean 1:1 Animated Box, No Text) */}
          <div className="lg:hidden w-full max-w-[280px] sm:max-w-[320px] my-2">
            <div className="relative pixel-box-black p-3 shadow-pixel-md">
              <img
                src={HERO_GIFS[currentGifIndex]}
                alt={`ApeBrokers Collection NFT #${currentGifIndex + 1}`}
                className="w-full h-auto aspect-square object-cover pixelated"
              />
            </div>
          </div>

          {/* Description */}
          <p className="font-mono text-sm sm:text-base text-black font-semibold max-w-lg leading-relaxed">
            5,555 unique pixel apes launching on Robinhood Chain. Complete the application below to secure your whitelist allocation.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto pt-2">
            <button
              type="button"
              onClick={handleApply}
              className="w-full sm:w-auto min-h-[50px] pixel-btn pixel-btn-black px-6 sm:px-8 py-3.5 font-pixel text-xs sm:text-sm font-extrabold"
            >
              [ APPLY FOR WL ]
            </button>

            <button
              type="button"
              onClick={handleBrokers}
              className="w-full sm:w-auto min-h-[50px] pixel-btn pixel-btn-purple px-6 sm:px-8 py-3.5 font-pixel text-xs sm:text-sm font-bold"
            >
              [ COLLECTION ]
            </button>
          </div>
        </div>

        {/* Desktop-Only Artwork Right Side (Clean 1:1 Animated Box, No Text) */}
        <div className="hidden lg:flex lg:col-span-5 justify-center">
          <div className="relative w-full max-w-[380px] pixel-box-black p-4 shadow-pixel-lg">
            <img
              src={HERO_GIFS[currentGifIndex]}
              alt={`ApeBrokers Collection NFT #${currentGifIndex + 1}`}
              className="w-full h-auto aspect-square object-cover pixelated"
            />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="mt-12 sm:mt-16 w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Stat 1 */}
          <div className="pixel-box-black p-4 text-center">
            <div className="font-pixel text-xl sm:text-2xl text-[#00FF66] font-extrabold">5,555</div>
            <div className="font-pixel text-[9px] text-gray-400 mt-1">TOTAL SUPPLY</div>
          </div>

          {/* Stat 2 */}
          <div className="pixel-box-black p-4 text-center">
            <div className="font-pixel text-xl sm:text-2xl text-[#FFD700] font-extrabold">TBA</div>
            <div className="font-pixel text-[9px] text-gray-400 mt-1">MINT PRICE</div>
          </div>

          {/* Stat 3 */}
          <div className="pixel-box-black p-4 text-center">
            <div className="font-pixel text-lg sm:text-xl text-white font-extrabold">ROBINHOOD</div>
            <div className="font-pixel text-[9px] text-gray-400 mt-1">NETWORK</div>
          </div>

          {/* Stat 4 */}
          <div className="pixel-box-black p-4 text-center">
            <div className="font-pixel text-xl sm:text-2xl text-[#FF2247] font-extrabold">TBA</div>
            <div className="font-pixel text-[9px] text-gray-400 mt-1">MINT DATE</div>
          </div>
        </div>
      </div>
    </section>
  );
};
