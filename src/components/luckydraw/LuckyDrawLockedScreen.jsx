import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { sound } from '../../utils/audio';
import { PixelFluidBackground } from '../PixelFluidBackground';

export function LuckyDrawLockedScreen({
  onBackHome,
  onGoToDesk,
  onAdminPasscodeUnlock,
  adminAddress = '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C',
}) {
  const { address } = useAccount();
  const [secretClickCount, setSecretClickCount] = useState(0);
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [secretPasscode, setSecretPasscode] = useState('');

  // If connected wallet is admin, automatically unlock
  useEffect(() => {
    if (
      address &&
      address.toLowerCase() === adminAddress.toLowerCase() &&
      onAdminPasscodeUnlock
    ) {
      onAdminPasscodeUnlock();
    }
  }, [address, adminAddress, onAdminPasscodeUnlock]);

  const handleSecretLogoClick = () => {
    const next = secretClickCount + 1;
    if (next >= 5) {
      setShowSecretInput(true);
      setSecretClickCount(0);
    } else {
      setSecretClickCount(next);
    }
  };

  const handleSecretSubmit = (e) => {
    e?.preventDefault?.();
    const VALID_PINS = ['ape2026', 'admin', '8888', 'apebrokers'];
    if (VALID_PINS.includes(secretPasscode.trim().toLowerCase())) {
      sound?.playVerifyChime?.();
      onAdminPasscodeUnlock?.();
    } else {
      sound?.playBlip?.();
      setShowSecretInput(false);
      setSecretPasscode('');
    }
  };

  return (
    <div className="min-h-screen text-white font-pixel selection:bg-[#FFD700] selection:text-black flex flex-col justify-between relative overflow-hidden select-none">
      {/* Interactive Pixel Fluid Background */}
      <PixelFluidBackground />

      {/* Background Subtle Gradient & Scanlines */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[#070314]/75 backdrop-blur-[2px]" />

      {/* Minimal Top Header */}
      <header className="relative z-10 w-full px-6 py-5 flex items-center justify-between">
        <button
          onClick={handleSecretLogoClick}
          className="flex items-center gap-2.5 opacity-80 hover:opacity-100 transition-opacity"
          title="ApeSyndicate"
        >
          <img
            src="/logo.png"
            alt="Logo"
            className="w-7 h-7 object-contain pixelated"
          />
          <span className="text-xs sm:text-sm font-extrabold text-[#FFD700] tracking-wider">
            APE BROKER
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound?.playClick?.();
            if (onGoToDesk) onGoToDesk();
            else if (onBackHome) onBackHome();
          }}
          className="pixel-btn pixel-btn-black px-3 py-1.5 text-[10px] sm:text-xs font-bold text-gray-300 hover:text-white rounded border border-gray-700 shadow-[2px_2px_0px_#000]"
        >
          [ ← BACK ]
        </button>
      </header>

      {/* Center Hero: Pure Coming Soon */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 -mt-8">
        <div className="space-y-6 max-w-lg bg-[#12072e]/85 backdrop-blur-md border-3 border-[#FFD700] p-8 rounded-2xl shadow-[6px_6px_0px_#000]">
          {/* Cyber Ticket Emblem */}
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-black/60 border-2 border-[#FFD700] shadow-[0_0_25px_rgba(255,215,0,0.3)]">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-[#FFD700] fill-current" viewBox="0 0 24 24">
              <path d="M4 4h16v4a2 2 0 0 0 0 4v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4a2 2 0 0 0 0-4V4zm2 2v2.5a4 4 0 0 1 0 7V16h12v-2.5a4 4 0 0 1 0-7V6H6zm3 4h6v2H9v-2z" />
            </svg>
          </div>

          <div className="space-y-3">
            <h2 className="text-xs sm:text-sm font-mono text-[#FFD700] tracking-widest uppercase">
              [ LUCKY DRAW PROTOCOL ]
            </h2>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[#FFD700] tracking-tight drop-shadow-[4px_4px_0px_#000]">
              COMING SOON
            </h1>
          </div>

          {/* Clean Return Button */}
          <div className="pt-4">
            <button
              type="button"
              onClick={() => {
                sound?.playClick?.();
                if (onGoToDesk) onGoToDesk();
                else if (onBackHome) onBackHome();
              }}
              className="pixel-btn pixel-btn-vibrant-lime px-6 py-3 text-xs sm:text-sm font-extrabold rounded-lg shadow-[4px_4px_0px_#000]"
            >
              [ ← RETURN TO BROKERDESK ]
            </button>
          </div>

          {/* Hidden Admin Passcode (only triggered if logo clicked 5 times) */}
          {showSecretInput && (
            <form onSubmit={handleSecretSubmit} className="pt-4 flex items-center justify-center gap-2 max-w-xs mx-auto">
              <input
                type="password"
                value={secretPasscode}
                onChange={(e) => setSecretPasscode(e.target.value)}
                placeholder="Passcode..."
                className="bg-black/80 border border-[#FFD700] rounded px-3 py-1 text-xs text-[#00FF66] font-mono focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="pixel-btn pixel-btn-vibrant-gold px-2.5 py-1 text-[10px] font-bold rounded"
              >
                ENTER
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 w-full py-4 text-center">
        <p className="text-[10px] font-mono text-gray-500">
          APE BROKER PROTOCOL
        </p>
      </footer>
    </div>
  );
}
