import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { StampDocumentPreview, PixelXIcon, PixelLogo } from './PixelApeArt';
import { sound } from '../utils/audio';

export const SuccessModal = ({ submissionData, onReset }) => {
  useEffect(() => {
    // Launch pixel-themed confetti burst
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#00FF66', '#FFD700', '#2A0845', '#FF2247', '#00F0FF'],
      });
    } catch (e) {}
  }, []);

  const handleShareOnX = () => {
    sound.playClick();
    const tweetText = encodeURIComponent(
      `Just submitted my Syndicate Pass application for @Apesyndicates on Robinhood Chain!\n\nTicket: ${submissionData?.ticketId || '#APE-WL'}\n\nhttps://x.com/i/status/2093348238971846874\n\n#ApeSyndicate #RobinhoodChain #NFT`
    );
    window.open(`https://x.com/intent/tweet?text=${tweetText}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyTicket = () => {
    sound.playClick();
    if (submissionData?.ticketId) {
      navigator.clipboard.writeText(submissionData.ticketId);
      alert(`Ticket ID ${submissionData.ticketId} copied to clipboard!`);
    }
  };

  return (
    <section className="py-8 sm:py-12 max-w-3xl mx-auto px-4">
      <div className="bg-broker-black border-4 border-black p-5 sm:p-8 shadow-pixel-xl text-center space-y-6">
        {/* Status Header */}
        <div className="inline-flex items-center gap-2 bg-neon-lime text-broker-black px-3.5 py-1.5 border-3 border-black font-pixel text-xs sm:text-sm shadow-pixel-sm">
          <span className="w-2.5 h-2.5 bg-broker-black inline-block animate-blink" />
          <span>WL APPLICATION RECEIVED</span>
        </div>

        <div className="space-y-2">
          <h2 className="font-pixel text-xl sm:text-2xl lg:text-3xl text-broker-white">
            APPLICATION RECEIVED
          </h2>
          <p className="font-pixel text-xs sm:text-sm text-broker-gold">
            Your Broker application has been submitted.
          </p>
          <p className="font-mono-code text-sm text-gray-300 max-w-lg mx-auto">
            Keep an eye on X and Discord for the next update.
          </p>
        </div>

        {/* Stamped Application Document Graphic */}
        <div className="py-2">
          <StampDocumentPreview applicant={submissionData} ticketId={submissionData?.ticketId} />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 font-pixel text-xs">
          {/* Share on X */}
          <button
            type="button"
            onClick={handleShareOnX}
            className="w-full sm:w-auto pixel-btn pixel-btn-primary px-5 py-3 flex items-center justify-center gap-2"
          >
            <PixelXIcon className="w-4 h-4" />
            <span>SHARE ON X</span>
          </button>

          {/* Copy Ticket ID */}
          <button
            type="button"
            onClick={handleCopyTicket}
            className="w-full sm:w-auto pixel-btn pixel-btn-white px-5 py-3 flex items-center justify-center gap-2"
          >
            <span>COPY TICKET ID</span>
          </button>

          {/* Submit Another */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onReset();
            }}
            className="w-full sm:w-auto pixel-btn pixel-btn-purple px-4 py-3"
          >
            NEW APPLICATION
          </button>
        </div>

        {/* Notice */}
        <div className="bg-broker-card p-3 border-2 border-broker-card-light text-center font-mono-code text-xs text-gray-400">
          Note: Submission confirmation does not guarantee an approved WL spot. Official whitelist winners are announced via ApeBrokers official social channels.
        </div>
      </div>
    </section>
  );
};
