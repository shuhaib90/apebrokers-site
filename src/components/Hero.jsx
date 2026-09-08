import React from 'react';

export const Hero = ({ onDeskClick }) => {
  const handleOpenSea = () => {
    window.open('https://opensea.io/collection/brokerdesk-583588970', '_blank', 'noopener,noreferrer');
  };

  const handleApebroke = () => {
    window.open('https://www.letscash.fun/token/0xe0F384ebCede975342c5431aCad515b4A1B862cc', '_blank', 'noopener,noreferrer');
  };

  const handleLaunchDesk = () => {
    if (onDeskClick) {
      onDeskClick();
    } else {
      window.location.href = '/brokerdesk';
    }
  };

  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-8 pt-8 pb-12 sm:pt-14 sm:pb-16 select-none">
      {/* Centered Hero Content */}
      <div className="max-w-3xl mx-auto flex flex-col items-center text-center space-y-6 sm:space-y-7">
        {/* Live Protocol Status Badge */}
        <div className="inline-flex items-center gap-2 bg-[#160a2c]/90 text-[#00FF66] px-4 py-2 border-2 border-[#00FF66] font-pixel text-[10px] sm:text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-md">
          <span className="w-2.5 h-2.5 bg-[#00FF66] inline-block rounded-full shadow-[0_0_8px_#00FF66]" />
          <span className="tracking-wide">● LIVE REVENUE PROTOCOL • ROBINHOOD EVM</span>
        </div>

        {/* Headline */}
        <div className="space-y-3 w-full px-1 sm:px-2 flex flex-col items-center">
          <h1 className="font-pixel text-[clamp(1.5rem,8vw,4.5rem)] pixel-text-3d-lime tracking-tight font-extrabold leading-tight whitespace-nowrap select-none max-w-full text-center">
            BROKERDESK
          </h1>
          <div className="inline-block max-w-full bg-[#120729]/95 border-2 border-[#00F0FF] px-3 sm:px-5 py-2 sm:py-2.5 shadow-[4px_4px_0px_0px_#FF007F] rounded-lg">
            <h2 className="font-pixel text-[9px] min-[360px]:text-[10px] min-[400px]:text-xs sm:text-base md:text-lg text-[#00F0FF] tracking-tight font-extrabold flex items-center justify-center text-center">
              1 NFT = 1 OPERATING BROKERDESK • AUTOMATED 5-HOUR ETH YIELDS
            </h2>
          </div>
        </div>

        {/* Description Box */}
        <div className="bg-[#12082b]/95 backdrop-blur-md p-3.5 sm:p-5 border-3 border-[#A855F7] shadow-[5px_5px_0px_0px_#000] max-w-xl mx-auto flex items-center justify-center rounded-lg">
          <p className="font-mono text-xs sm:text-sm md:text-base text-gray-100 font-semibold leading-relaxed">
            Welcome to BrokerDesk, the premier decentralized NFT revenue protocol on Robinhood Chain. Activate your NFT as an active trading desk, amplify your yields with deflationary $APEBROKE boosts, and claim continuous 5-hour ETH distributions.
          </p>
        </div>

        {/* Action / Navigation Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 w-full sm:w-auto pt-2">
          <button
            type="button"
            onClick={handleLaunchDesk}
            className="w-full sm:w-auto min-h-[48px] sm:min-h-[52px] pixel-btn pixel-btn-vibrant-lime px-6 sm:px-8 py-3 sm:py-3.5 font-pixel text-xs sm:text-sm font-extrabold rounded-lg shadow-[4px_4px_0px_0px_#000] flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <span className="w-2 h-2 rounded-full bg-black shrink-0" />
            <span className="whitespace-nowrap">[ BROKERDESK ]</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleOpenSea}
              className="flex-1 sm:flex-none min-h-[44px] sm:min-h-[52px] pixel-btn pixel-btn-vibrant-cyan px-4 sm:px-6 py-2.5 sm:py-3.5 font-pixel text-[11px] sm:text-sm font-bold rounded-lg shadow-[3px_3px_0px_0px_#000] whitespace-nowrap"
            >
              [ OPENSEA ]
            </button>

            <button
              type="button"
              onClick={handleApebroke}
              className="flex-1 sm:flex-none min-h-[44px] sm:min-h-[52px] pixel-btn pixel-btn-vibrant-gold px-4 sm:px-6 py-2.5 sm:py-3.5 font-pixel text-[11px] sm:text-sm font-bold rounded-lg shadow-[3px_3px_0px_0px_#000] whitespace-nowrap"
            >
              [ BUY NOW $APEBROKE ]
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar (Broker Protocol Monitors) */}
      <div className="mt-12 sm:mt-16 w-full max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Stat 1: Emerald / Reward Epoch Monitor */}
          <div className="bg-[#051c12]/90 backdrop-blur-md p-3 sm:p-4 text-center shadow-[6px_6px_0px_0px_#000] border-2 border-[#00FF66] rounded-lg min-h-[85px] sm:min-h-[95px] flex flex-col justify-center items-center">
            <div className="font-pixel text-lg sm:text-2xl text-[#00FF66] font-extrabold drop-shadow-[0_0_8px_rgba(0,255,102,0.4)]">
              5-HOUR
            </div>
            <div className="font-pixel text-[8px] sm:text-[9px] text-[#7affaa] mt-1 font-bold">
              ETH REWARD EPOCHS
            </div>
          </div>

          {/* Stat 2: Amber Gold / Max Boost Monitor */}
          <div className="bg-[#241705]/90 backdrop-blur-md p-2.5 sm:p-4 text-center shadow-[6px_6px_0px_0px_#000] border-2 border-[#FFB800] rounded-lg min-h-[85px] sm:min-h-[95px] flex flex-col justify-center items-center overflow-hidden">
            <div className="font-pixel text-base sm:text-xl md:text-2xl text-[#FFB800] font-extrabold whitespace-nowrap tracking-tight drop-shadow-[0_0_8px_rgba(255,184,0,0.4)]">
              600 WGT
            </div>
            <div className="font-pixel text-[8px] sm:text-[9px] text-[#ffe280] mt-1 whitespace-nowrap font-bold">
              MAX DESK BOOST
            </div>
          </div>

          {/* Stat 3: Electric Cyan Network Monitor */}
          <div className="bg-[#051a26]/90 backdrop-blur-md p-3 sm:p-4 text-center shadow-[6px_6px_0px_0px_#000] border-2 border-[#00F0FF] rounded-lg min-h-[85px] sm:min-h-[95px] flex flex-col justify-center items-center">
            <div className="font-pixel text-xs sm:text-base md:text-lg text-[#00F0FF] font-extrabold whitespace-nowrap tracking-tight drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
              ROBINHOOD
            </div>
            <div className="font-pixel text-[8px] sm:text-[9px] text-[#80f5ff] mt-1 font-bold">
              EVM MAINNET
            </div>
          </div>

          {/* Stat 4: Neon Pink / BrokerDesk Monitor */}
          <div className="bg-[#260517]/90 backdrop-blur-md p-2.5 sm:p-4 text-center shadow-[6px_6px_0px_0px_#000] border-2 border-[#FF007F] rounded-lg min-h-[85px] sm:min-h-[95px] flex flex-col justify-center items-center overflow-hidden">
            <div className="font-pixel text-[11px] sm:text-sm md:text-base text-[#FF007F] font-extrabold whitespace-nowrap tracking-tight drop-shadow-[0_0_8px_rgba(255,0,127,0.4)]">
              BROKERDESK
            </div>
            <div className="font-pixel text-[8px] sm:text-[9px] text-[#ff80be] mt-1 whitespace-nowrap font-bold">
              1 NFT = 1 DESK
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

