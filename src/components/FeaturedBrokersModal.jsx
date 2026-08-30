import React, { useState } from 'react';
import { FEATURED_BROKERS } from '../utils/nftData';
import { sound } from '../utils/audio';

export const FeaturedBrokersModal = ({ onClose, onOpenTerminal }) => {
  const [selectedBroker, setSelectedBroker] = useState(FEATURED_BROKERS[0]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-broker-black border-4 border-black max-w-4xl w-full p-4 sm:p-6 shadow-pixel-xl relative space-y-5 rounded-2xl overflow-hidden">
        {/* Top Header */}
        <div className="bg-broker-purple border-3 border-black p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-neon-lime inline-block animate-blink" />
            <h2 className="font-pixel text-xs sm:text-sm text-broker-gold tracking-wider">
              OFFICE VAULT // 10 FEATURED BROKERS
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

        {/* 2-Column Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Selected Large Portrait */}
          <div className="md:col-span-5 bg-[#140D24] border-3 border-black p-3 text-center space-y-3">
            <div className="relative border-3 border-neon-lime bg-black p-1">
              <img
                src={selectedBroker.image}
                alt={selectedBroker.name}
                className="w-full h-auto aspect-square object-cover pixelated"
              />
              <div className="absolute top-2 right-2 bg-broker-gold text-broker-black font-pixel text-[8px] px-2 py-0.5 border border-black">
                {selectedBroker.tag}
              </div>
            </div>

            <div>
              <div className="font-pixel text-sm sm:text-base text-neon-lime font-bold">
                {selectedBroker.name}
              </div>
              <div className="font-pixel text-[10px] text-broker-gold mt-0.5">
                {selectedBroker.role}
              </div>
            </div>

            {/* Trait Chips */}
            <div className="grid grid-cols-2 gap-1.5 font-pixel text-[8px] text-left pt-1">
              {Object.entries(selectedBroker.traits).map(([traitKey, traitVal]) => (
                <div key={traitKey} className="bg-broker-card p-1.5 border border-gray-800">
                  <div className="text-gray-400">{traitKey}</div>
                  <div className="text-broker-white truncate font-bold">{traitVal}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 10 Thumbnails Grid */}
          <div className="md:col-span-7 space-y-3">
            <div className="font-pixel text-[10px] text-gray-300 flex justify-between items-center">
              <span>SELECT A BROKER TO INSPECT</span>
              <span className="text-neon-lime">10 / 5,555 SUPPLY</span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {FEATURED_BROKERS.map((broker) => {
                const isSelected = selectedBroker.id === broker.id;
                return (
                  <button
                    key={broker.id}
                    type="button"
                    onClick={() => {
                      sound.playBlip();
                      setSelectedBroker(broker);
                    }}
                    className={`relative border-2 p-1 transition-all ${
                      isSelected
                        ? 'border-neon-lime bg-broker-purple scale-105 shadow-pixel-sm'
                        : 'border-black bg-broker-card hover:border-broker-gold'
                    }`}
                  >
                    <img
                      src={broker.image}
                      alt={broker.name}
                      className="w-full h-auto aspect-square object-cover pixelated"
                    />
                    <div className="font-pixel text-[7px] text-center mt-1 text-gray-300 truncate">
                      #{broker.id}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Information Callout */}
            <div className="bg-broker-card p-3 border-2 border-broker-card-light font-mono-code text-xs text-gray-300 space-y-1">
              <p className="text-broker-gold font-bold font-pixel text-[9px]">
                ★ ROBINHOOD CHAIN EXCLUSIVE COLLECTION
              </p>
              <p>
                Each ApeBroker possesses hand-tailored pixel traits, brokerage accessories, executive pinstripes, and trading floor status badges.
              </p>
            </div>

            {/* Action CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  sound.playZoom();
                  onClose();
                  onOpenTerminal();
                }}
                className="w-full py-3 pixel-btn pixel-btn-primary font-pixel text-xs tracking-wider"
              >
                [ APPLY FOR BROKER WL PASS ]
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};