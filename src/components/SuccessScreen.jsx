import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';

export const SuccessScreen = ({ submissionData, onReset }) => {
  useEffect(() => {
    sound?.playStamp?.();
    sound?.playFanfare?.();
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#00FF66', '#FFD700', '#2A0845', '#FF2247', '#000000'],
      });
    } catch (e) {}
  }, []);

  const handleFollowX = () => {
    sound?.playClick?.();
    window.open('https://x.com', '_blank', 'noopener,noreferrer');
  };

  const handleJoinDiscord = () => {
    sound?.playClick?.();
    window.open('https://discord.com', '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20 select-none">
      <div className="pixel-box p-6 sm:p-10 text-center space-y-6 relative">
        {/* Ape Avatar */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto bg-black border-4 border-black overflow-hidden shadow-pixel-md">
          <img
            src="/nfts/1.png"
            alt="ApeBroker"
            className="w-full h-full object-cover pixelated"
          />
        </div>

        {/* Status Badge */}
        <div className="inline-block bg-[#FF2247] text-white font-pixel text-[10px] sm:text-xs px-4 py-1.5 border-3 border-black shadow-pixel-sm">
          STATUS: UNDER REVIEW
        </div>

        {/* Heading & Text */}
        <div className="space-y-2">
          <h2 className="font-pixel text-2xl sm:text-3xl text-black font-extrabold tracking-tight">
            APPLICATION RECEIVED
          </h2>
          <p className="font-mono text-sm sm:text-base text-gray-800 font-semibold max-w-md mx-auto">
            Your ApeBrokers WL application has been successfully submitted.
          </p>
        </div>

        {/* Details Card */}
        <div className="bg-[#140D24] text-white border-3 border-black p-4 text-left font-mono text-xs space-y-2 max-w-md mx-auto">
          <div className="flex justify-between border-b border-gray-700 pb-1.5">
            <span className="text-gray-400">APPLICATION ID:</span>
            <span className="text-[#FFD700] font-bold">{submissionData?.brokerId || '#7721'}</span>
          </div>
          <div className="flex justify-between border-b border-gray-700 pb-1.5">
            <span className="text-gray-400">X HANDLE:</span>
            <span className="text-[#00FF66] font-bold">{submissionData?.xUsername || '@user'}</span>
          </div>
          <div className="flex justify-between border-b border-gray-700 pb-1.5">
            <span className="text-gray-400">DISCORD:</span>
            <span className="text-white font-bold">{submissionData?.discordUsername || 'user'}</span>
          </div>
          <div className="flex justify-between border-b border-gray-700 pb-1.5">
            <span className="text-gray-400">WALLET:</span>
            <span className="text-white font-bold truncate max-w-[160px]">
              {submissionData?.walletAddress || '0x...'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">NETWORK:</span>
            <span className="text-[#00FF66] font-bold">ROBINHOOD CHAIN</span>
          </div>
        </div>

        {/* Small Notice */}
        <p className="font-mono text-xs text-gray-600 font-semibold">
          Keep an eye on X and Discord for future WL updates.
        </p>

        {/* Social Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleFollowX}
            className="w-full sm:w-auto min-h-[48px] pixel-btn pixel-btn-black px-6 py-3 font-pixel text-xs font-bold flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span>[ FOLLOW X ]</span>
          </button>

          <button
            type="button"
            onClick={handleJoinDiscord}
            className="w-full sm:w-auto min-h-[48px] pixel-btn pixel-btn-purple px-6 py-3 font-pixel text-xs font-bold flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span>[ JOIN DISCORD ]</span>
          </button>
        </div>

        {onReset && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-mono text-gray-500 hover:text-black underline underline-offset-4"
            >
              Submit another application
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
