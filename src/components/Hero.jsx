import React from 'react';
import { sound } from '../utils/audio';
import { TypewriterText } from './TypewriterText';

export const Hero = ({ onApplyClick }) => {
  const mintPrice = '0.0016 ETH';

  const handleOpenSea = () => {
    sound?.playClick?.();
    window.open('https://opensea.io/collection/apesyndicate-212388086', '_blank', 'noopener,noreferrer');
  };

  const handleApebroke = () => {
    sound?.playClick?.();
    window.open('https://www.letscash.fun/token/0xe0F384ebCede975342c5431aCad515b4A1B862cc', '_blank', 'noopener,noreferrer');
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
        <div className="inline-flex items-center gap-2 bg-[#160a2c]/90 text-[#00FF66] px-4 py-2 border-2 border-[#FF007F] font-pixel text-[10px] sm:text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-md">
          <span className="w-2.5 h-2.5 bg-[#00FF66] inline-block animate-blink rounded-full shadow-[0_0_8px_#00FF66]" />
          <span className="tracking-wide">WL OPEN: EVERYONE CAN APPLY</span>
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <h1 className="font-pixel text-4xl sm:text-6xl md:text-7xl pixel-text-3d-lime tracking-tight font-extrabold leading-tight">
            APESYNDICATE
          </h1>
          <div className="inline-block bg-[#120729]/95 border-2 border-[#00F0FF] px-4 py-2 sm:py-2.5 shadow-[5px_5px_0px_0px_#FF007F] rounded-lg">
            <h2 className="font-pixel text-xs sm:text-xl md:text-2xl text-[#00F0FF] tracking-tight font-extrabold min-h-[30px] sm:min-h-[36px] flex items-center justify-center">
              <TypewriterText
                text={[
                  'OPEN FOR EVERYONE.',
                  'HOLD MORE FOR HIGHER GTD CHANCE.',
                  '9,000 WHITELIST SPOTS.',
                  'ROBINHOOD CHAIN.',
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
        </div>

        {/* Description Box with Typewriter Animation */}
        <div className="bg-[#12082b]/95 backdrop-blur-md p-4 sm:p-5 border-3 border-[#A855F7] shadow-[6px_6px_0px_0px_#000] max-w-xl mx-auto min-h-[75px] sm:min-h-[85px] flex items-center justify-center rounded-lg">
          <p className="font-mono text-sm sm:text-base text-gray-100 font-semibold leading-relaxed">
            <TypewriterText
              text="Everyone can apply for the 9,000 whitelist spots. Wallets holding $APEBROKERS tokens + ApeSyndicate NFTs receive Guaranteed (GTD) mint allocation based on holdings. All other entries receive Standard WL."
              speed={20}
              delay={800}
              playSound={false}
              cursor={false}
            />
          </p>
        </div>

        {/* Action / Navigation Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto pt-2">
          <button
            type="button"
            onClick={handleApply}
            className="w-full sm:w-auto min-h-[52px] pixel-btn pixel-btn-vibrant-lime px-8 py-3.5 font-pixel text-xs sm:text-sm font-extrabold rounded-lg"
          >
            [ APPLY FOR WHITELIST ]
          </button>

          <button
            type="button"
            onClick={handleOpenSea}
            className="w-full sm:w-auto min-h-[52px] pixel-btn pixel-btn-vibrant-cyan px-6 py-3.5 font-pixel text-xs sm:text-sm font-bold rounded-lg"
          >
            [ OPENSEA ]
          </button>

          <button
            type="button"
            onClick={handleApebroke}
            className="w-full sm:w-auto min-h-[52px] pixel-btn pixel-btn-vibrant-gold px-6 py-3.5 font-pixel text-xs sm:text-sm font-bold rounded-lg"
          >
            [ $APEBROKE ]
          </button>
        </div>
      </div>

      {/* Stats Bar (Broker Terminal Monitors) */}
      <div className="mt-12 sm:mt-16 w-full max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Stat 1: Emerald / Mint Monitor */}
          <div className="bg-[#051c12]/90 backdrop-blur-md p-3 sm:p-4 text-center shadow-[6px_6px_0px_0px_#000] border-2 border-[#00FF66] rounded-lg min-h-[85px] sm:min-h-[95px] flex flex-col justify-center items-center">
            <div className="font-pixel text-lg sm:text-2xl text-[#00FF66] font-extrabold drop-shadow-[0_0_8px_rgba(0,255,102,0.4)]">
              5,555
            </div>
            <div className="font-pixel text-[8px] sm:text-[9px] text-[#7affaa] mt-1 font-bold">
              TOTAL SUPPLY
            </div>
          </div>

          {/* Stat 2: Amber Gold Monitor */}
          <div className="bg-[#241705]/90 backdrop-blur-md p-2.5 sm:p-4 text-center shadow-[6px_6px_0px_0px_#000] border-2 border-[#FFB800] rounded-lg min-h-[85px] sm:min-h-[95px] flex flex-col justify-center items-center overflow-hidden">
            <div className="font-pixel text-[11px] sm:text-sm md:text-base text-[#FFB800] font-extrabold whitespace-nowrap tracking-tight drop-shadow-[0_0_8px_rgba(255,184,0,0.4)]">
              {mintPrice}
            </div>
            <div className="font-pixel text-[8px] sm:text-[9px] text-[#ffe280] mt-1 whitespace-nowrap font-bold">
              MINT PRICE
            </div>
          </div>

          {/* Stat 3: Electric Cyan Monitor */}
          <div className="bg-[#051a26]/90 backdrop-blur-md p-3 sm:p-4 text-center shadow-[6px_6px_0px_0px_#000] border-2 border-[#00F0FF] rounded-lg min-h-[85px] sm:min-h-[95px] flex flex-col justify-center items-center">
            <div className="font-pixel text-xs sm:text-base md:text-lg text-[#00F0FF] font-extrabold whitespace-nowrap tracking-tight drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
              ROBINHOOD
            </div>
            <div className="font-pixel text-[8px] sm:text-[9px] text-[#80f5ff] mt-1 font-bold">
              NETWORK
            </div>
          </div>

          {/* Stat 4: Neon Pink / Magenta Monitor */}
          <div className="bg-[#260517]/90 backdrop-blur-md p-3 sm:p-4 text-center shadow-[6px_6px_0px_0px_#000] border-2 border-[#FF007F] rounded-lg min-h-[85px] sm:min-h-[95px] flex flex-col justify-center items-center">
            <div className="font-pixel text-xs sm:text-base md:text-lg text-[#FF007F] font-extrabold whitespace-nowrap tracking-tight drop-shadow-[0_0_8px_rgba(255,0,127,0.4)]">
              SEP 3RD
            </div>
            <div className="font-pixel text-[8px] sm:text-[9px] text-[#ff80be] mt-1 whitespace-nowrap font-bold">
              MINT DATE
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
