import React from 'react';

export const About = () => {
  return (
    <section id="about" className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-16 select-none">
      <div className="pixel-box p-6 sm:p-10 text-center space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <div className="inline-block bg-black text-[#FFD700] font-pixel text-[9px] sm:text-[10px] px-3 py-1 border-2 border-black">
            PROJECT OVERVIEW
          </div>
          <h2 className="font-pixel text-xl sm:text-2xl md:text-3xl text-black font-extrabold tracking-tight">
            WHAT IS APESYNDICATE?
          </h2>
          <p className="font-mono text-sm sm:text-base text-gray-800 font-semibold max-w-2xl mx-auto leading-relaxed">
            A collection of 5,555 unique pixel apes built around syndicate culture, conviction, community and digital collectibles on Robinhood Chain.
          </p>
        </div>

        {/* 3 Simple Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-2">
          {/* Card 1 */}
          <div className="bg-[#140D24] text-white border-3 border-black p-5 text-center space-y-2 shadow-pixel-sm">
            <div className="w-10 h-10 mx-auto bg-[#00FF66] text-black border-2 border-black flex items-center justify-center font-pixel text-sm font-bold">
              ★
            </div>
            <div className="font-pixel text-2xl sm:text-3xl text-[#00FF66] font-extrabold">
              5,555
            </div>
            <div className="font-pixel text-[10px] text-gray-300 tracking-wider">
              SUPPLY
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#140D24] text-white border-3 border-black p-5 text-center space-y-2 shadow-pixel-sm">
            <div className="w-10 h-10 mx-auto bg-[#FFD700] text-black border-2 border-black flex items-center justify-center font-pixel text-sm font-bold">
              ◆
            </div>
            <div className="font-pixel text-xl sm:text-2xl text-[#FFD700] font-extrabold">
              ROBINHOOD
            </div>
            <div className="font-pixel text-[10px] text-gray-300 tracking-wider">
              CHAIN
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#140D24] text-white border-3 border-black p-5 text-center space-y-2 shadow-pixel-sm">
            <div className="w-10 h-10 mx-auto bg-[#FF2247] text-white border-2 border-black flex items-center justify-center font-pixel text-sm font-bold">
              ▲
            </div>
            <div className="font-pixel text-2xl sm:text-3xl text-white font-extrabold">
              PIXEL
            </div>
            <div className="font-pixel text-[10px] text-gray-300 tracking-wider">
              APES
            </div>
          </div>
        </div>

        {/* Short Mission Text */}
        <p className="font-mono text-xs sm:text-sm text-gray-700 font-semibold max-w-xl mx-auto pt-2">
          Securing a whitelist spot grants early access to the genesis mint, private syndicate alpha channels, and community governance.
        </p>
      </div>
    </section>
  );
};
