import React, { useState, useEffect } from 'react';
import { sound } from '../utils/audio';

const HERO_IMAGES = [
  '/nfts/hero_1.png',
  '/nfts/hero_2.png',
  '/nfts/hero_3.png',
  '/nfts/hero_4.png',
];

export const Hero = ({ onApplyClick }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [collectionText, setCollectionText] = useState('[ COLLECTION ]');

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const handleBrokers = () => {
    sound?.playClick?.();
    setCollectionText('[ COMING SOON ]');
    setTimeout(() => {
      setCollectionText('[ COLLECTION ]');
    }, 2500);
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
              APESYNDICATE
            </h1>
            <h2 className="font-pixel text-xl sm:text-3xl lg:text-4xl text-[#2A0845] tracking-tight font-extrabold">
              GET ON THE LIST.
            </h2>
          </div>

          {/* Mobile-Only Artwork Preview */}
          <div className="lg:hidden w-full max-w-[280px] sm:max-w-[320px] my-2">
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-lg">
              <img
                src={HERO_IMAGES[currentImageIndex]}
                alt={`ApeSyndicate Collection NFT #${currentImageIndex + 1}`}
                className="w-full h-auto aspect-square object-cover pixelated"
              />
            </div>
          </div>

          {/* Value Props Strip */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-3 text-[10px] sm:text-xs font-pixel">
            <span className="bg-black text-white px-2.5 py-1 border-2 border-black">
              5,555 SUPPLY
            </span>
            <span className="bg-black text-[#00FF66] px-2.5 py-1 border-2 border-black">
              ROBINHOOD CHAIN
            </span>
            <span className="bg-black text-[#FFD700] px-2.5 py-1 border-2 border-black">
              TBA MINT
            </span>
          </div>

          {/* Paragraph */}
          <p className="font-mono text-sm sm:text-base text-gray-900 font-semibold max-w-lg leading-relaxed">
            5,555 elite pixel apes taking over Robinhood Chain. Complete the broker checklist below to secure your whitelist pass.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto pt-2">
            <button
              type="button"
              onClick={handleApply}
              className="w-full sm:w-auto min-h-[52px] pixel-btn pixel-btn-black px-6 sm:px-8 py-3 font-pixel text-xs sm:text-sm font-extrabold tracking-wider"
            >
              [ APPLY FOR WHITELIST ]
            </button>

            <button
              type="button"
              onClick={handleBrokers}
              className={`w-full sm:w-auto min-h-[52px] pixel-btn px-5 sm:px-6 py-3 font-pixel text-xs transition-all ${
                collectionText === '[ COMING SOON ]'
                  ? 'pixel-btn-gold text-black animate-pulse font-bold'
                  : 'pixel-btn-white'
              }`}
            >
              {collectionText}
            </button>
          </div>
        </div>

        {/* Right Column: Desktop Large Animated Showcase */}
        <div className="hidden lg:col-span-5 lg:flex justify-center">
          <div className="w-full max-w-[380px] space-y-3">
            <div className="relative overflow-hidden rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black bg-black">
              <img
                src={HERO_IMAGES[currentImageIndex]}
                alt="ApeSyndicate Hero NFT"
                className="w-full h-auto aspect-square object-cover pixelated transition-all duration-300"
              />

              {/* Tag overlay */}
              <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm text-[#00FF66] font-pixel text-[9px] px-2.5 py-1 border border-[#00FF66]">
                ● FEATURED APE #{currentImageIndex + 1}
              </div>
            </div>

            <div className="bg-black text-white p-3 border-3 border-black text-center font-pixel text-[10px] flex items-center justify-between">
              <span className="text-[#00FF66]">APESYNDICATE // GENESIS</span>
              <span className="text-[#FFD700]">5,555 UNIQUE</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
