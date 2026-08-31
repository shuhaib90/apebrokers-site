import React, { useState, useEffect } from 'react';
import { sound } from '../utils/audio';
import { TypewriterText } from './TypewriterText';

export const Hero = ({ onApplyClick }) => {
  const [collectionText, setCollectionText] = useState('[ OPENSEA ]');
  const mintPrice = '0.0016 ETH';

  const handleOpenSea = () => {
    sound?.playClick?.();
    setCollectionText('[ COMING SOON ]');
    setTimeout(() => {
      setCollectionText('[ OPENSEA ]');
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
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-8 pt-8 pb-12 sm:pt-14 sm:pb-16 select-none">
      {/* Centered Hero Content */}
      <div className="max-w-3xl mx-auto flex flex-col items-center text-center space-y-6 sm:space-y-7">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-black text-[#00FF66] px-4 py-2 border-3 border-black font-pixel text-[10px] sm:text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="w-2.5 h-2.5 bg-[#00FF66] inline-block animate-blink" />
          <span>WL APPLICATIONS OPEN</span>
        </div>

        {/* Headline */}
        <div className="space-y-2.5">
          <h1 className="font-pixel text-3xl sm:text-5xl md:text-6xl text-white tracking-tight font-extrabold leading-tight drop-shadow-[6px_6px_0px_rgba(0,0,0,1)]">
            APESYNDICATE
          </h1>
          <h2 className="font-pixel text-xl sm:text-3xl md:text-4xl text-[#00FF66] tracking-tight font-extrabold drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] min-h-[38px] sm:min-h-[50px] flex items-center justify-center">
            <TypewriterText
              text={[
                'GET ON THE LIST.',
                'CLAIM YOUR ALLOCATION.',
                'ROBINHOOD CHAIN.',
                'BECOME A BROKER.',
              ]}
              speed={60}
              delay={350}
              pauseBetween={3000}
              loop={true}
              playSound={true}
              cursorChar="█"
            />
          </h2>
        </div>

        {/* Description Box with Typewriter Animation */}
        <div className="bg-black/90 backdrop-blur-md p-4 sm:p-5 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-xl mx-auto min-h-[75px] sm:min-h-[85px] flex items-center justify-center">
          <p className="font-mono text-sm sm:text-base text-gray-100 font-semibold leading-relaxed">
            <TypewriterText
              text="5,555 unique pixel apes launching on Robinhood Chain. Complete the application below to secure your whitelist allocation."
              speed={20}
              delay={800}
              playSound={false}
              cursor={false}
            />
          </p>
        </div>

        {/* Action / Navigation Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full sm:w-auto pt-2">
          <button
            type="button"
            onClick={handleApply}
            className="w-full sm:w-auto min-h-[52px] pixel-btn pixel-btn-lime px-8 py-3.5 font-pixel text-xs sm:text-sm font-extrabold text-black"
          >
            [ APPLY FOR WL ]
          </button>

          <button
            type="button"
            onClick={handleOpenSea}
            className={`w-full sm:w-auto min-h-[52px] pixel-btn px-8 py-3.5 font-pixel text-xs sm:text-sm font-bold transition-all ${
              collectionText.includes('SOON')
                ? 'pixel-btn-black text-[#FFD700] border-[#FFD700]'
                : 'pixel-btn-black text-white'
            }`}
          >
            {collectionText}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="mt-12 sm:mt-16 w-full max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Stat 1 */}
          <div className="pixel-box-black p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-3 border-black">
            <div className="font-pixel text-xl sm:text-2xl text-[#00FF66] font-extrabold">5,555</div>
            <div className="font-pixel text-[9px] text-gray-400 mt-1">TOTAL SUPPLY</div>
          </div>

          {/* Stat 2: Official Mint Price */}
          <div className="pixel-box-black p-3.5 sm:p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-3 border-black flex flex-col justify-center items-center">
            <div className="font-pixel text-sm sm:text-base md:text-lg lg:text-xl text-[#FFD700] font-extrabold whitespace-nowrap tracking-wider">
              {mintPrice}
            </div>
            <div className="font-pixel text-[8px] sm:text-[9px] text-gray-400 mt-1 whitespace-nowrap">
              MINT PRICE
            </div>
          </div>

          {/* Stat 3 */}
          <div className="pixel-box-black p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-3 border-black">
            <div className="font-pixel text-lg sm:text-xl text-white font-extrabold">ROBINHOOD</div>
            <div className="font-pixel text-[9px] text-gray-400 mt-1">NETWORK</div>
          </div>

          {/* Stat 4 */}
          <div className="pixel-box-black p-3.5 sm:p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-3 border-black flex flex-col justify-center items-center">
            <div className="font-pixel text-sm sm:text-base md:text-lg lg:text-xl text-[#FF2247] font-extrabold whitespace-nowrap">
              SEP 3RD
            </div>
            <div className="font-pixel text-[8px] sm:text-[9px] text-gray-400 mt-1 whitespace-nowrap">
              MINT DATE
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
