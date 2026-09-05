import React from 'react';
import { sound } from '../utils/audio';
import { TypewriterText } from './TypewriterText';

export const Hero = ({ onApplyClick, onDeskClick }) => {
  const mintPrice = 'FREE';

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

  const handleDesk = () => {
    sound?.playZoom?.();
    if (onDeskClick) {
      onDeskClick();
    } else {
      window.location.hash = 'desk';
    }
  };

  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-8 pt-8 pb-12 sm:pt-14 sm:pb-16 select-none">
      {/* Centered Hero Content */}
      <div className="max-w-3xl mx-auto flex flex-col items-center text-center space-y-6 sm:space-y-7">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-[#160a2c]/90 text-[#00FF66] px-4 py-2 border-2 border-[#FF007F] font-pixel text-[10px] sm:text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-md">
          <span className="w-2.5 h-2.5 bg-[#00FF66] inline-block animate-blink rounded-full shadow-[0_0_8px_#00FF66]" />
          <span className="tracking-wide">DESK LIVE: ACTIVATE & COLLECT ETH REWARDS</span>
        </div>

        {/* Headline */}
        <div className="space-y-3 w-full px-2">
          <h1 className="font-pixel text-2xl min-[380px]:text-3xl min-[480px]:text-4xl sm:text-6xl md:text-7xl pixel-text-3d-lime tracking-tight font-extrabold leading-tight break-words">
            APESYNDICATE
          </h1>
          <div className="inline-block max-w-full bg-[#120729]/95 border-2 border-[#00F0FF] px-3 sm:px-4 py-2 sm:py-2.5 shadow-[4px_4px_0px_0px_#FF007F] rounded-lg">
            <h2 className="font-pixel text-[10px] min-[360px]:text-xs sm:text-lg md:text-xl text-[#00F0FF] tracking-tight font-extrabold min-h-[26px] sm:min-h-[32px] flex items-center justify-center">
              <TypewriterText
                text={[
                  'APE BROKER DESK LIVE.',
                  '1 NFT = 1 DESK.',
                  '5-HOUR NATIVE ETH REWARDS.',
                  'BOOST UP TO 10X.',
                ]}
                speed={50}
                delay={300}
                pauseBetween={2500}
                loop={true}
                playSound={true}
                cursorChar="▌"
              />
            </h2>
          </div>
        </div>

        {/* Description Box with Typewriter Animation */}
        <div className="bg-[#12082b]/95 backdrop-blur-md p-3.5 sm:p-5 border-3 border-[#A855F7] shadow-[5px_5px_0px_0px_#000] max-w-xl mx-auto min-h-[85px] sm:min-h-[80px] flex items-center justify-center rounded-lg">
          <p className="font-mono text-xs sm:text-sm md:text-base text-gray-100 font-semibold leading-relaxed">
            <TypewriterText
              text="Activate your Ape Broker NFT as a Desk for 349,693 $APEBROKE. Earn proportional native ETH rewards every 5 hours based on Desk Weight. Boost up to 5 times (2x to 10x max) to multiply your rewards."
              speed={12}
              delay={500}
              playSound={false}
              cursor={false}
            />
          </p>
        </div>

        {/* Action / Navigation Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 w-full sm:w-auto pt-2">
          <button
            type="button"
            onClick={handleDesk}
            className="w-full sm:w-auto min-h-[48px] sm:min-h-[52px] pixel-btn pixel-btn-vibrant-lime px-6 sm:px-8 py-3 sm:py-3.5 font-pixel text-xs sm:text-sm font-extrabold rounded-lg shadow-[4px_4px_0px_0px_#000] flex items-center justify-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-black animate-ping" />
            <span>[ ENTER BROKER DESK ]</span>
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="w-full sm:w-auto min-h-[48px] sm:min-h-[52px] pixel-btn pixel-btn-vibrant-cyan px-5 sm:px-7 py-3 sm:py-3.5 font-pixel text-xs sm:text-sm font-bold rounded-lg shadow-[4px_4px_0px_0px_#000]"
          >
            [ WHITELIST ]
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleOpenSea}
              className="flex-1 sm:flex-none min-h-[44px] sm:min-h-[52px] pixel-btn pixel-btn-black px-4 sm:px-6 py-2.5 sm:py-3.5 font-pixel text-[11px] sm:text-sm font-bold rounded-lg shadow-[3px_3px_0px_0px_#000] border border-gray-700 text-white"
            >
              [ OPENSEA ]
            </button>

            <button
              type="button"
              onClick={handleApebroke}
              className="flex-1 sm:flex-none min-h-[44px] sm:min-h-[52px] pixel-btn pixel-btn-vibrant-gold px-4 sm:px-6 py-2.5 sm:py-3.5 font-pixel text-[11px] sm:text-sm font-bold rounded-lg shadow-[3px_3px_0px_0px_#000]"
            >
              [ $APEBROKE ]
            </button>
          </div>
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
              SEP 6TH
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
