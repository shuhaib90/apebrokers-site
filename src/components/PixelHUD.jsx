import React, { useState } from 'react';
import { PixelLogo, PixelXIcon, PixelDiscordIcon, PixelSoundOnIcon, PixelSoundOffIcon } from './PixelApeArt';
import { sound } from '../utils/audio';

export const PixelHUD = ({ currentView, onNavigateOffice, onNavigateTerminal, onOpenAbout, onOpenGallery }) => {
  const [isMuted, setIsMuted] = useState(sound.isMuted());

  const toggleSound = () => {
    const next = !isMuted;
    sound.setMuted(next);
    setIsMuted(next);
    if (!next) sound.playClick();
  };

  return (
    <header className="sticky top-0 z-40 bg-broker-black border-b-4 border-black text-broker-white select-none">
      {/* Mini Ticker */}
      <div className="bg-[#05140A] text-neon-lime py-0.5 border-b border-black text-[8px] font-pixel overflow-hidden">
        <div className="animate-ticker flex space-x-6">
          <span>● APEBROKERS OFFICE</span>
          <span>•</span>
          <span className="text-broker-gold">SUPPLY: 2,222 PIXEL APES</span>
          <span>•</span>
          <span className="text-broker-cyan">NETWORK: ROBINHOOD CHAIN</span>
          <span>•</span>
          <span className="text-neon-lime">WL TERMINAL: ONLINE</span>
          <span>•</span>
          <span className="text-broker-gold">$APE/USD ▲ +420.69%</span>
          <span>•</span>
          <span>● APEBROKERS OFFICE</span>
          <span>•</span>
          <span className="text-broker-gold">SUPPLY: 2,222 PIXEL APES</span>
          <span>•</span>
          <span className="text-broker-cyan">NETWORK: ROBINHOOD CHAIN</span>
          <span>•</span>
          <span className="text-neon-lime">WL TERMINAL: ONLINE</span>
        </div>
      </div>

      {/* Tiny Pixel HUD Bar */}
      <div className="max-w-6xl mx-auto px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
        {/* Left: Brand Logo & Office Link */}
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onNavigateOffice();
          }}
          className="flex items-center gap-2 group text-left"
        >
          <div className="p-1 bg-broker-purple border border-black shadow-pixel-sm">
            <PixelLogo className="w-6 h-6" />
          </div>
          <div>
            <div className="font-pixel text-xs sm:text-sm text-neon-lime font-extrabold flex items-center gap-1">
              <span>APEBROKERS</span>
              <span className="w-1.5 h-3 bg-broker-gold inline-block animate-blink" />
            </div>
            <div className="font-pixel text-[7px] text-broker-gold">
              ROBINHOOD CHAIN
            </div>
          </div>
        </button>

        {/* Right: Corner Action HUD Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 font-pixel text-[9px]">
          {/* Office Button */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onNavigateOffice();
            }}
            className={`pixel-btn px-2 sm:px-2.5 py-1.5 ${
              currentView === 'office' ? 'bg-neon-lime text-broker-black' : 'bg-broker-card text-gray-300'
            }`}
          >
            [ OFFICE ]
          </button>

          {/* Application Terminal Button */}
          <button
            type="button"
            onClick={() => {
              sound.playZoom();
              onNavigateTerminal();
            }}
            className={`pixel-btn px-2 sm:px-2.5 py-1.5 ${
              currentView === 'terminal' ? 'bg-broker-gold text-broker-black' : 'bg-broker-purple text-broker-gold'
            }`}
          >
            [ APPLICATION ]
          </button>

          {/* 10 Featured Brokers Button */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenGallery();
            }}
            className="pixel-btn pixel-btn-white px-2 sm:px-2.5 py-1.5 hidden md:inline-flex"
          >
            [ 10 BROKERS ]
          </button>

          {/* About Button */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenAbout();
            }}
            className="pixel-btn pixel-btn-white px-2 sm:px-2.5 py-1.5"
          >
            [ ABOUT ]
          </button>

          {/* Audio FX Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
            className="p-1.5 bg-broker-card border-2 border-black hover:bg-broker-gold text-broker-white hover:text-black"
          >
            {isMuted ? <PixelSoundOffIcon className="w-3.5 h-3.5" /> : <PixelSoundOnIcon className="w-3.5 h-3.5" />}
          </button>

          {/* X Link */}
          <a
            href="https://x.com"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sound.playClick()}
            className="pixel-btn pixel-btn-white p-1.5"
            title="Follow on X"
          >
            <PixelXIcon className="w-3.5 h-3.5" />
          </a>

          {/* Discord Link */}
          <a
            href="https://discord.com"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sound.playClick()}
            className="pixel-btn pixel-btn-purple p-1.5"
            title="Join Discord Floor"
          >
            <PixelDiscordIcon className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
};