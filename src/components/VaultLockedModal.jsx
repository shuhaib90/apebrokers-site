import React from 'react';
import { sound } from '../utils/audio';

export const VaultLockedModal = ({ isOpen, onClose, onApplyClick }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none font-pixel animate-fadeIn">
      {/* Modal Box */}
      <div className="relative w-full max-w-lg bg-[#140D24] text-white border-4 border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6 rounded-2xl overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b-2 border-[#3d2e54] pb-3.5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-[#FF2247] inline-block animate-blink" />
            <span className="text-[10px] sm:text-xs text-[#FF2247] font-extrabold tracking-wider">
              SYSTEM SECURITY // ACCESS RESTRICTED
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              sound?.playClick?.();
              onClose();
            }}
            className="text-gray-400 hover:text-white font-pixel text-xs px-2 py-1 bg-black border border-[#3d2e54]"
          >
            [X]
          </button>
        </div>

        {/* Center Graphic & Title */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-black border-3 border-[#FFD700] rounded-xl flex items-center justify-center text-3xl sm:text-4xl shadow-pixel-sm">
            🔒
          </div>

          <div className="inline-block bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/40 font-pixel text-[9px] px-3 py-1">
            ● VAULT IN COLD STORAGE ●
          </div>

          <h2 className="text-base sm:text-lg text-white font-extrabold tracking-wide leading-snug">
            COLLECTION VAULT IS ENCRYPTED
          </h2>
        </div>

        {/* Body Description */}
        <div className="bg-black/60 border-2 border-[#3d2e54] p-4 text-left space-y-2.5 font-mono">
          <p className="text-xs sm:text-sm text-[#00FF66] font-semibold leading-relaxed">
            &gt; 5,555 unique pixel ape brokers are currently sealed in cold storage on Robinhood Chain.
          </p>
          <p className="text-xs text-gray-300 leading-relaxed">
            The collection gallery and floor preview will unlock exclusively on <strong className="text-[#FFD700]">MINT DATE</strong>.
          </p>
          <p className="text-[11px] text-[#5ec8ff] font-semibold">
            ● TIP: Submit your whitelist application now to secure your broker clearance.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              sound?.playZoom?.();
              onClose();
              if (onApplyClick) onApplyClick();
            }}
            className="w-full min-h-[48px] pixel-btn pixel-btn-lime px-4 py-3 text-[10px] sm:text-xs font-pixel font-extrabold flex items-center justify-center gap-2"
          >
            <span>🦍</span>
            <span>[ APPLY FOR WHITELIST ]</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound?.playClick?.();
              onClose();
            }}
            className="w-full sm:w-auto min-h-[48px] pixel-btn pixel-btn-white px-5 py-3 text-[10px] font-pixel text-black"
          >
            [ CLOSE ]
          </button>
        </div>
      </div>
    </div>
  );
};
