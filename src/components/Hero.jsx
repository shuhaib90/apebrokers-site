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
          <div className="inline-flex items-center gap-2 bg-black text-[#00FF66] px-3.5 py-1.5 border-3 border-black font-pixel text-[10px] sm:text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="w-2.5 h-2.5 bg-[#00FF66] inline-block animate-blink" />
            <span>WL APPLICATIONS OPEN</span>
          </div>

          {/* Headline with high contrast styling */}
          <div className="space-y-2">
            <h1 className="font-pixel text-3xl sm:text-4xl lg:text-[42px] xl:text-5xl text-white tracking-tight font-extrabold leading-tight drop-shadow-[5px_5px_0px_rgba(0,0,0,1)]">
              APESYNDICATE
            </h1>
            <h2 className="font-pixel text-xl sm:text-2xl lg:text-3xl xl:text-4xl text-[#00FF66] tracking-tight font-extrabold drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              GET ON THE LIST.
            </h2>
          </div>

          {/* Mobile-Only Artwork Preview */}
          <div className="lg:hidden w-full max-w-[280px] sm:max-w-[320px] my-2">
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black bg-black">
              <img
                src={HERO_IMAGES[currentImageIndex]}
                alt={`ApeSyndicate Collection NFT #${currentImageIndex + 1}`}
                className="w-full h-auto aspect-square object-cover pixelated"
              />
            </div>
          </div>

          {/* Description Box */}
          <div className="bg-black/90 backdrop-blur-md p-4 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-lg">
            <p className="font-mono text-sm sm:text-base text-gray-100 font-semibold leading-relaxed">
              5,555 unique pixel apes launching on Robinhood Chain. Complete the application below to secure your whitelist allocation.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto pt-2">
            <button
              type="button"
              onClick={handleApply}
              className="w-full sm:w-auto min-h-[52px] pixel-btn pixel-btn-lime px-6 sm:px-8 py-3.5 font-pixel text-xs sm:text-sm font-extrabold text-black"
            >
              [ APPLY FOR WL ]
            </button>

            <button
              type="button"
              onClick={handleBrokers}
              className={`w-full sm:w-auto min-h-[52px] pixel-btn px-6 sm:px-8 py-3.5 font-pixel text-xs sm:text-sm font-bold transition-all ${
                collectionText.includes('SOON')
                  ? 'pixel-btn-black text-[#FFD700] border-[#FFD700]'
                  : 'pixel-btn-black text-white'
              }`}
            >
              {collectionText}
            </button>
          </div>
        </div>

        {/* Desktop-Only Artwork Right Side */}
        <div className="hidden lg:flex lg:col-span-5 justify-center">
          <div className="relative w-full max-w-[380px] overflow-hidden rounded-3xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] border-4 border-black bg-black">
            <img
              src={HERO_IMAGES[currentImageIndex]}
              alt={`ApeSyndicate Collection NFT #${currentImageIndex + 1}`}
              className="w-full h-auto aspect-square object-cover pixelated"
            />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="mt-12 sm:mt-16 w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Stat 1 */}
          <div className="pixel-box-black p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-3 border-black">
            <div className="font-pixel text-xl sm:text-2xl text-[#00FF66] font-extrabold">5,555</div>
            <div className="font-pixel text-[9px] text-gray-400 mt-1">TOTAL SUPPLY</div>
          </div>

          {/* Stat 2 */}
          <div className="pixel-box-black p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-3 border-black">
            <div className="font-pixel text-xl sm:text-2xl text-[#FFD700] font-extrabold">TBA</div>
            <div className="font-pixel text-[9px] text-gray-400 mt-1">MINT PRICE</div>
          </div>

          {/* Stat 3 */}
          <div className="pixel-box-black p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-3 border-black">
            <div className="font-pixel text-lg sm:text-xl text-white font-extrabold">ROBINHOOD</div>
            <div className="font-pixel text-[9px] text-gray-400 mt-1">NETWORK</div>
          </div>

          {/* Stat 4 */}
          <div className="pixel-box-black p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-3 border-black">
            <div className="font-pixel text-xl sm:text-2xl text-[#FF2247] font-extrabold">TBA</div>
            <div className="font-pixel text-[9px] text-gray-400 mt-1">MINT DATE</div>
          </div>
        </div>
      </div>
    </section>
  );
};
