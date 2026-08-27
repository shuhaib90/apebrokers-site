import React from 'react';
import { HeroBrokerDeskArt, RobinhoodPixelBadge } from './PixelApeArt';

export const HeroBrokerDesk = () => {
  return (
    <section className="pt-6 pb-4 sm:py-8 max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        {/* Left Column: Headlines & Status Badge */}
        <div className="lg:col-span-6 space-y-4">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 bg-broker-black text-neon-lime px-3 py-1.5 border-3 border-black shadow-pixel-sm font-pixel text-[9px] sm:text-[10px]">
            <span className="w-2.5 h-2.5 bg-neon-lime inline-block animate-blink" />
            <span className="tracking-wide">WL APPLICATIONS — OPEN</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-pixel text-2xl sm:text-3xl lg:text-4xl text-broker-black leading-tight tracking-tight uppercase">
            GET YOUR <br />
            <span className="bg-broker-purple text-broker-gold px-2 py-0.5 border-3 border-black inline-block shadow-pixel-sm mt-1">
              BROKER PASS
            </span>
          </h1>

          {/* Subheadline */}
          <p className="font-pixel text-xs sm:text-sm text-broker-purple font-bold tracking-tight">
            ApeBrokers are coming to the hood.
          </p>

          {/* Supporting Text */}
          <p className="font-mono-code text-sm sm:text-base text-broker-black font-semibold bg-broker-white/80 p-3 border-2 border-black shadow-pixel-sm max-w-lg leading-relaxed">
            Submit your application below for a chance to secure a whitelist spot in the premier pixel broker club.
          </p>

          {/* Feature Highlights Pills */}
          <div className="flex flex-wrap gap-2 pt-1 font-pixel text-[8px] sm:text-[9px]">
            <div className="flex items-center gap-1.5 bg-broker-card text-broker-gold px-2.5 py-1.5 border-2 border-black shadow-pixel-sm">
              <span>●</span>
              <span>2,222 SUPPLY</span>
            </div>
            <div className="flex items-center gap-1.5 bg-broker-card text-neon-lime px-2.5 py-1.5 border-2 border-black shadow-pixel-sm">
              <RobinhoodPixelBadge className="w-3.5 h-3.5" />
              <span>ROBINHOOD CHAIN</span>
            </div>
            <div className="flex items-center gap-1.5 bg-broker-card text-broker-cyan px-2.5 py-1.5 border-2 border-black shadow-pixel-sm">
              <span>★</span>
              <span>EXCLUSIVE PASS</span>
            </div>
          </div>
        </div>

        {/* Right Column: High Quality Pixel Broker Desk Illustration */}
        <div className="lg:col-span-6">
          <HeroBrokerDeskArt />
        </div>
      </div>
    </section>
  );
};
