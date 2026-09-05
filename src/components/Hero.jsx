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
        <div className="inline-flex items-center gap-2 bg-black text-[#00FF66] px-4 py-2 border-3 border-black font-pixel text-[10px] sm:text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="w-2.5 h-2.5 bg-[#00FF66] inline-block animate-blink" />
          <span>WL OPEN: EVERYONE CAN APPLY</span>
        </div>

        {/* Headline */}
        <div className="space-y-2.5">
          <h1 className="font-pixel text-3xl sm:text-5xl md:text-6xl text-white tracking-tight font-extrabold leading-tight drop-shadow-[6px_6px_0px_rgba(0,0,0,1)]">
            APESYNDICATE
          </h1>
          <h2 className="font-pixel text-xl sm:text-3xl md:text-4xl text-[#00FF66] tracking-tight font-extrabold drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] min-h-[38px] sm:min-h-[50px] flex items-center justify-center">
            <TypewriterText
              text={[
                'OPEN FOR EVERYONE.',
                'DYNAMIC GTD: $1=5%, $10=50%.',
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

        {/* Description Box with Typewriter Animation */}
        <div className="bg-black/90 backdrop-blur-md p-4 sm:p-5 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-xl mx-auto min-h-[75px] sm:min-h-[85px] flex items-center justify-center">
          <p className="font-mono text-sm sm:text-base text-gray-100 font-semibold leading-relaxed">
            <TypewriterText
              text="Everyone can apply for the 9,000 whitelist spots. Wallets holding min. $1.00 in $APEBROKERS tokens + 1 ApeSyndicate NFT get a dynamic chance for Guaranteed (GTD) mint: $1 = 5%, $10 = 50%, $20+ = 100% GTD! All other entries receive Standard WL."
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
            className="w-full sm:w-auto min-h-[52px] pixel-btn pixel-btn-lime px-8 py-3.5 font-pixel text-xs sm:text-sm font-extrabold text-black hover:opacity-95 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            [ APPLY FOR WHITELIST ]
          </button>

          <button
            type="button"
            onClick={handleOpenSea}
            className="w-full sm:w-auto min-h-[52px] pixel-btn pixel-btn-black px-6 py-3.5 font-pixel text-xs sm:text-sm font-bold text-white hover:text-[#00FF66] transition-all border-2 border-black hover:border-[#00FF66] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            [ OPENSEA ]
          </button>

          <button
            type="button"
            onClick={handleApebroke}
            className="w-full sm:w-auto min-h-[52px] pixel-btn pixel-btn-black px-6 py-3.5 font-pixel text-xs sm:text-sm font-bold text-[#FFD700] hover:bg-[#FFD700] hover:text-black transition-all border-2 border-[#FFD700] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            [ $APEBROKE ]
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="mt-12 sm:mt-16 w-full max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Stat 1 */}
          <div className="pixel-box-black p-3 sm:p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-3 border-black min-h-[85px] sm:min-h-[95px] flex flex-col justify-center items-center">
            <div className="font-pixel text-lg sm:text-2xl text-[#00FF66] font-extrabold">5,555</div>
            <div className="font-pixel text-[8px] sm:text-[9px] text-gray-400 mt-1">TOTAL SUPPLY</div>
          </div>

          {/* Stat 2: Official Mint Price (Perfect Fit) */}
          <div className="pixel-box-black p-2.5 sm:p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-3 border-black min-h-[85px] sm:min-h-[95px] flex flex-col justify-center items-center overflow-hidden">
            <div className="font-pixel text-[11px] sm:text-sm md:text-base text-[#FFD700] font-extrabold whitespace-nowrap tracking-tight">
              {mintPrice}
            </div>
            <div className="font-pixel text-[8px] sm:text-[9px] text-gray-400 mt-1 whitespace-nowrap">
              MINT PRICE
            </div>
          </div>

          {/* Stat 3 */}
          <div className="pixel-box-black p-3 sm:p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-3 border-black min-h-[85px] sm:min-h-[95px] flex flex-col justify-center items-center">
            <div className="font-pixel text-xs sm:text-base md:text-lg text-white font-extrabold whitespace-nowrap tracking-tight">
              ROBINHOOD
            </div>
            <div className="font-pixel text-[8px] sm:text-[9px] text-gray-400 mt-1">NETWORK</div>
          </div>

          {/* Stat 4 */}
          <div className="pixel-box-black p-3 sm:p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] border-3 border-black min-h-[85px] sm:min-h-[95px] flex flex-col justify-center items-center">
            <div className="font-pixel text-xs sm:text-base md:text-lg text-[#FF2247] font-extrabold whitespace-nowrap tracking-tight">
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
