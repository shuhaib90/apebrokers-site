import React from 'react';
import { sound } from '../utils/audio';

export const AboutBrokersModal = ({ onClose, onOpenTerminal }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-broker-black border-4 border-black max-w-2xl w-full p-4 sm:p-6 shadow-pixel-xl relative space-y-5">
        {/* Header Bar */}
        <div className="bg-broker-purple border-3 border-black p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-neon-lime inline-block animate-blink" />
            <h2 className="font-pixel text-xs sm:text-sm text-broker-gold tracking-wider">
              WALL BULLETIN // ABOUT APEBROKERS
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="pixel-btn pixel-btn-crimson px-2.5 py-1 text-[10px]"
          >
            [ CLOSE ✕ ]
          </button>
        </div>

        {/* Hero Preview & Story */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
          <div className="sm:col-span-4 bg-[#140D24] border-3 border-black p-2.5 text-center space-y-2">
            <div className="relative border-2 border-neon-lime bg-black p-1">
              <img
                src="/gifs/1.gif"
                alt="ApeBroker #1"
                className="w-full h-auto aspect-square object-cover pixelated"
              />
              <div className="absolute bottom-2 left-2 bg-broker-black/90 border border-broker-gold px-1.5 py-0.5 font-pixel text-[7px] text-broker-gold">
                RH_CHAIN
              </div>
            </div>
            <div className="font-pixel text-[9px] text-broker-gold">
              FOUNDING APEBROKER #1
            </div>
          </div>

          <div className="sm:col-span-8 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-pixel text-sm sm:text-base text-neon-lime">
                APEBROKERS HEADQUARTERS
              </h3>
              <span className="bg-broker-gold text-broker-black font-pixel text-[8px] px-2 py-0.5 border border-black">
                RH EXCLUSIVE
              </span>
            </div>
            
            <p className="font-mono-code text-xs sm:text-sm text-gray-200 leading-relaxed bg-broker-card p-3 border border-broker-card-light">
              "A high-conviction collection of 5,555 unique 16-bit pixel apes operating the most exclusive trading desk on Robinhood Chain."
            </p>
          </div>
        </div>

        {/* KEY MINT & PROJECT SPECIFICATIONS TABLE */}
        <div className="space-y-2">
          <div className="font-pixel text-[10px] text-broker-gold flex items-center gap-2">
            <span className="w-2 h-2 bg-broker-gold inline-block" />
            <span>COLLECTION SPECIFICATIONS & MINT DATA</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-pixel text-[9px]">
            {/* Total Supply */}
            <div className="bg-broker-card p-2.5 border-2 border-black space-y-1">
              <div className="text-gray-400 text-[8px]">TOTAL SUPPLY</div>
              <div className="text-neon-lime text-xs font-bold">5,555 APES</div>
            </div>

            {/* Mint Price */}
            <div className="bg-broker-card p-2.5 border-2 border-black space-y-1">
              <div className="text-gray-400 text-[8px]">MINT PRICE</div>
              <div className="text-broker-gold text-xs font-bold">TBA</div>
            </div>

            {/* Mint Date */}
            <div className="bg-broker-card p-2.5 border-2 border-black space-y-1">
              <div className="text-gray-400 text-[8px]">MINT DATE</div>
              <div className="text-broker-cyan text-xs font-bold">TBA</div>
            </div>

            {/* Network Chain */}
            <div className="bg-broker-card p-2.5 border-2 border-black space-y-1">
              <div className="text-gray-400 text-[8px]">NETWORK</div>
              <div className="text-broker-white text-xs font-bold">ROBINHOOD</div>
            </div>
          </div>
        </div>

        {/* WHITELIST BENEFITS & PROTOCOL RULES */}
        <div className="bg-broker-card p-3.5 border-2 border-broker-card-light space-y-2 font-mono-code text-xs">
          <div className="font-pixel text-[9px] text-broker-gold">
            ★ WHITELIST ALLOCATION PERKS:
          </div>
          <ul className="space-y-1.5 text-gray-300 text-[11px] list-disc list-inside">
            <li><strong className="text-broker-white">Guaranteed WL Mint Window</strong> before public access.</li>
            <li><strong className="text-broker-white">Discounted Gas & Priority Execution</strong> on Robinhood Chain.</li>
            <li><strong className="text-broker-white">Exclusive Broker Role</strong> in ApeBrokers Trading Floor Discord.</li>
            <li><strong className="text-broker-white">Direct Access</strong> to upcoming interactive retro modules.</li>
          </ul>
        </div>

        {/* Call to Action Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => {
              sound.playZoom();
              onClose();
              onOpenTerminal();
            }}
            className="w-full py-3.5 pixel-btn pixel-btn-primary font-pixel text-xs sm:text-sm tracking-wider"
          >
            [ LAUNCH WL APPLICATION TERMINAL ]
          </button>
        </div>
      </div>
    </div>
  );
};