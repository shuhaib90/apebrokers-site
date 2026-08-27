import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';
import { PixelXIcon, PixelDiscordIcon } from './PixelApeArt';

export const SubmissionSuccess = ({ submissionData, onReturnToOffice }) => {
  const [step, setStep] = useState(0); // 0: Red button press, 1: Printing, 2: Stamped result

  useEffect(() => {
    // Step 0 -> Step 1: Button pressed, start printer
    const t1 = setTimeout(() => {
      sound.playPrinter();
      setStep(1);
    }, 800);

    // Step 1 -> Step 2: Slam stamp and play fanfare
    const t2 = setTimeout(() => {
      sound.playStamp();
      sound.playFanfare();
      setStep(2);
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00FF66', '#FFD700', '#2A0845', '#FF2247', '#00F0FF'],
        });
      } catch (e) {}
    }, 2400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handleFollowX = () => {
    sound.playClick();
    window.open('https://x.com', '_blank', 'noopener,noreferrer');
  };

  const handleJoinDiscord = () => {
    sound.playClick();
    window.open('https://discord.com', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 select-none animate-fadeIn">
      <div className="bg-broker-black border-4 border-black p-5 sm:p-8 shadow-pixel-xl text-center space-y-6">
        {/* Status Header */}
        <div className="inline-flex items-center gap-2 bg-neon-lime text-broker-black px-4 py-1.5 border-3 border-black font-pixel text-xs sm:text-sm shadow-pixel-sm">
          <span className="w-2.5 h-2.5 bg-broker-black inline-block animate-blink" />
          <span>BROKER APPLICATION TERMINAL // SUBMISSION</span>
        </div>

        {/* Dynamic Animation Sequence */}
        {step < 2 ? (
          <div className="py-12 space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-none bg-broker-crimson border-4 border-black animate-ping" />
            </div>
            <p className="font-pixel text-sm text-broker-gold">
              {step === 0 ? 'APE BROKER PRESSING DISPATCH BUTTON...' : 'PRINTING OFFICIAL BROKER DOSSIER...'}
            </p>
            <div className="w-48 h-3 bg-broker-card border-2 border-black mx-auto overflow-hidden">
              <div className="h-full bg-neon-lime animate-pulse w-3/4" />
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fadeIn">
            {/* Printed Physical Receipt Paper with Stamp */}
            <div className="relative bg-[#FFFDF5] border-4 border-black p-6 sm:p-8 shadow-pixel-xl max-w-md mx-auto text-left overflow-hidden">
              {/* Receipt Header */}
              <div className="border-b-4 border-black pb-3 mb-4 flex justify-between items-center font-pixel text-broker-black">
                <div>
                  <div className="text-xs text-broker-purple font-extrabold">APEBROKERS</div>
                  <div className="text-[9px] text-gray-500">BROKER APPLICATION</div>
                </div>
                <div className="bg-broker-black text-broker-gold text-[10px] px-2.5 py-1 border-2 border-black">
                  {submissionData?.brokerId || '#4982'}
                </div>
              </div>

              {/* Data Rows */}
              <div className="space-y-2 font-mono-code text-xs text-broker-black border-b-2 border-dashed border-gray-400 pb-4 mb-4">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-600">APPLICATION:</span>
                  <span className="font-bold text-green-700">RECEIVED</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-gray-600">STATUS:</span>
                  <span className="font-bold text-broker-crimson">UNDER REVIEW</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-gray-600">X HANDLE:</span>
                  <span className="font-bold text-broker-purple">{submissionData?.xUsername || '@username'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-gray-600">WALLET:</span>
                  <span className="font-bold truncate max-w-[180px]">
                    {submissionData?.walletAddress || '0x...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-gray-600">TASKS:</span>
                  <span className="font-bold text-green-600">3 / 3 VERIFIED</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-gray-600">NETWORK:</span>
                  <span className="font-bold text-broker-black">ROBINHOOD CHAIN</span>
                </div>
              </div>

              {/* Large Pixel Stamp Animation: RECEIVED */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 animate-stamp">
                <div className="border-[6px] border-broker-crimson px-5 py-2.5 bg-white/95 shadow-pixel-crimson rotate-[-12deg] text-center">
                  <div className="font-pixel text-2xl sm:text-3xl text-broker-crimson tracking-wider font-extrabold">
                    RECEIVED
                  </div>
                  <div className="font-pixel text-[8px] text-broker-crimson-dark tracking-widest mt-0.5">
                    UNDER REVIEW • 5,555
                  </div>
                </div>
              </div>

              {/* Footer text on receipt */}
              <div className="font-pixel text-[8px] text-gray-400 text-center">
                ROBINHOOD CHAIN PROTOCOL // SECURE SEED
              </div>
            </div>

            {/* Final Welcome Message */}
            <div className="space-y-1 text-center">
              <h3 className="font-pixel text-lg sm:text-xl text-neon-lime">
                WELCOME TO THE FLOOR.
              </h3>
              <p className="font-mono-code text-sm text-gray-300">
                Keep an eye on ApeBrokers X and Discord for updates.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 font-pixel text-xs">
              <button
                type="button"
                onClick={handleFollowX}
                className="pixel-btn pixel-btn-white px-4 py-3 flex items-center gap-1.5"
              >
                <PixelXIcon className="w-4 h-4" />
                <span>[ FOLLOW ON X ]</span>
              </button>

              <button
                type="button"
                onClick={handleJoinDiscord}
                className="pixel-btn pixel-btn-purple px-4 py-3 flex items-center gap-1.5"
              >
                <PixelDiscordIcon className="w-4 h-4" />
                <span>[ JOIN DISCORD ]</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onReturnToOffice();
                }}
                className="pixel-btn pixel-btn-primary px-4 py-3"
              >
                [ ◄ BACK TO OFFICE ]
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};