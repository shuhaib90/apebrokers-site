import React, { useState } from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import { sound } from '../../utils/audio';

export function LuckyDrawLockedScreen({
  onBackHome,
  onGoToDesk,
  onGoToStaking,
  onAdminPasscodeUnlock,
  adminAddress = '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C',
}) {
  const { openConnectModal } = useConnectModal();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPasscodeForm, setShowPasscodeForm] = useState(false);

  const VALID_PINS = ['ape2026', 'admin', '8888', 'apebrokers'];

  const handlePasscodeSubmit = (e) => {
    e?.preventDefault?.();
    if (VALID_PINS.includes(passcode.trim().toLowerCase())) {
      sound?.playVerifyChime?.();
      setErrorMsg('');
      if (onAdminPasscodeUnlock) {
        onAdminPasscodeUnlock();
      }
    } else {
      sound?.playBlip?.();
      setErrorMsg('Invalid admin passcode.');
    }
  };

  const isWalletAdmin =
    Boolean(address) &&
    address.toLowerCase() === adminAddress.toLowerCase();

  return (
    <div className="min-h-screen bg-[#070314] text-white font-pixel selection:bg-[#FFD700] selection:text-black relative pb-20 select-none">
      {/* Background CRT Scanlines & Glow */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#24084a]/40 via-[#070314]/95 to-[#04010a] opacity-90" />

      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 w-full bg-[#0a051d]/95 backdrop-blur-md border-b-3 border-[#FFD700] px-4 sm:px-8 py-3 select-none">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sound?.playClick?.();
                onBackHome();
              }}
              className="hover:opacity-80 transition-opacity flex items-center gap-2"
            >
              <img
                src="/logo.png"
                alt="ApeSyndicate"
                className="w-8 h-8 object-contain pixelated"
              />
              <span className="text-sm sm:text-base font-extrabold text-[#FFD700] tracking-wider">
                APE BROKER LUCKY DRAW
              </span>
            </button>
            <span className="px-2 py-0.5 bg-[#1a0c3a] border border-[#FFD700]/60 text-[9px] text-[#FFD700] rounded">
              ROBINHOOD EVM
            </span>
          </div>

          {/* Quick Nav Links */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                sound?.playClick?.();
                onGoToDesk();
              }}
              className="pixel-btn pixel-btn-black px-2.5 sm:px-3 py-1.5 text-[9px] sm:text-xs font-bold text-[#00FF66] hover:text-white rounded border border-[#00FF66]/80 shadow-[1px_1px_0px_#000]"
            >
              [ DESK ]
            </button>

            <button
              type="button"
              onClick={() => {
                sound?.playClick?.();
                onGoToStaking();
              }}
              className="pixel-btn pixel-btn-black px-2.5 sm:px-3 py-1.5 text-[9px] sm:text-xs font-bold text-[#00F0FF] hover:text-white rounded border border-[#00F0FF]/80 shadow-[1px_1px_0px_#000]"
            >
              [ STAKE ]
            </button>

            <button
              type="button"
              onClick={() => {
                sound?.playClick?.();
                onBackHome();
              }}
              className="pixel-btn pixel-btn-black px-2.5 sm:px-3 py-1.5 text-[9px] sm:text-xs font-bold text-gray-300 hover:text-white rounded border border-gray-700"
            >
              [ ← HOME ]
            </button>
          </div>
        </div>
      </nav>

      {/* Main Locked Card */}
      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16">
        <div className="bg-gradient-to-b from-[#180934] via-[#0f0524] to-[#12072b] border-3 border-[#FFD700] rounded-2xl p-6 sm:p-10 shadow-[8px_8px_0px_#000] text-center space-y-6 relative overflow-hidden">
          {/* Subtle Ambient Watermark */}
          <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none text-9xl font-black text-[#FFD700]">
            🔒
          </div>

          {/* Animated Lock Icon */}
          <div className="relative inline-block">
            <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full bg-gradient-to-tr from-[#FFD700]/20 via-[#FF6600]/10 to-transparent border-3 border-[#FFD700] flex items-center justify-center shadow-[0_0_35px_rgba(255,215,0,0.35)]">
              <span className="text-5xl sm:text-6xl animate-pulse">🔒</span>
            </div>
            <span className="absolute bottom-0 right-0 px-2 py-0.5 bg-red-600 border border-white text-[8px] sm:text-[9px] font-extrabold text-white rounded-full uppercase tracking-widest shadow-md">
              LOCKED
            </span>
          </div>

          {/* Title & Gating Badge */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-[#FFD700]/70 text-[#FFD700] text-[9px] sm:text-[10px] font-bold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-[#FFD700] animate-ping" />
              PUBLIC ACCESS CURRENTLY LOCKED
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#FFD700] tracking-tight">
              LUCKY DRAW PROTOCOL
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 font-mono max-w-xl mx-auto leading-relaxed">
              The Lucky Draw terminal is currently locked for public participation while smart contract configuration, prize pool escrow, and system verification are finalized.
            </p>
          </div>

          {/* Status Box */}
          <div className="bg-[#0a0418] border-2 border-[#FFD700]/40 rounded-xl p-4 sm:p-5 text-left space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="text-gray-400">Terminal Mode:</span>
              <span className="text-amber-400 font-bold uppercase">Pre-Launch / Admin Restricted</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="text-gray-400">Target Network:</span>
              <span className="text-[#00F0FF] font-bold">Robinhood EVM (4663)</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <span className="text-gray-400">Ticket Token:</span>
              <span className="text-[#00FF66] font-bold">$APEBROKE ERC-20</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Eligible Gating:</span>
              <span className="text-[#FFD700] font-bold">Ape Broker NFT Holders</span>
            </div>
          </div>

          {/* Admin Unlock Section */}
          <div className="bg-[#12072e] border-2 border-dashed border-[#FFD700]/60 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-[#FFD700]">
              <span>🔑</span>
              <span>ARE YOU A PROTOCOL ADMIN?</span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono max-w-md mx-auto">
              Authorized administrators can connect with the registered admin wallet or use the admin authorization passcode to enter the terminal.
            </p>

            {/* Wallet Connect Option */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {!isConnected ? (
                <button
                  type="button"
                  onClick={() => {
                    sound?.playClick?.();
                    openConnectModal?.();
                  }}
                  className="w-full sm:w-auto pixel-btn pixel-btn-vibrant-gold px-4 py-2 text-xs font-extrabold rounded-lg shadow-[3px_3px_0px_#000] flex items-center justify-center gap-2"
                >
                  <span>CONNECT ADMIN WALLET</span>
                </button>
              ) : isWalletAdmin ? (
                <div className="text-xs text-emerald-400 font-mono font-bold">
                  ✓ Admin wallet detected! Refreshing terminal...
                </div>
              ) : (
                <div className="space-y-2 text-center">
                  <div className="text-[11px] font-mono text-amber-400">
                    Connected: {address.slice(0, 6)}...{address.slice(-4)} (Not Admin)
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sound?.playClick?.();
                      disconnect?.();
                    }}
                    className="text-[10px] text-red-400 underline hover:text-red-300 font-mono"
                  >
                    Disconnect & Switch Wallet
                  </button>
                </div>
              )}

              {/* Toggle Passcode Form */}
              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  setShowPasscodeForm(!showPasscodeForm);
                  setErrorMsg('');
                }}
                className="w-full sm:w-auto pixel-btn pixel-btn-black px-3.5 py-2 text-xs font-bold text-gray-300 hover:text-white rounded-lg border border-gray-600 shadow-[2px_2px_0px_#000]"
              >
                {showPasscodeForm ? '[ HIDE PASSCODE ]' : '[ USE ADMIN PASSCODE ]'}
              </button>
            </div>

            {/* Passcode Form */}
            {showPasscodeForm && (
              <form onSubmit={handlePasscodeSubmit} className="pt-2 max-w-sm mx-auto space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => {
                      setPasscode(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="Enter admin passcode..."
                    className="flex-1 bg-black/80 border-2 border-[#FFD700] rounded-lg px-3 py-2 text-xs text-[#00FF66] font-mono focus:outline-none focus:border-[#00FF66]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="pixel-btn pixel-btn-vibrant-lime px-3 py-2 text-xs font-bold rounded-lg shadow-[2px_2px_0px_#000]"
                  >
                    UNLOCK
                  </button>
                </div>
                {errorMsg && (
                  <p className="text-[10px] text-red-400 font-mono">{errorMsg}</p>
                )}
              </form>
            )}
          </div>

          {/* Navigation Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                sound?.playClick?.();
                onGoToDesk();
              }}
              className="pixel-btn pixel-btn-vibrant-lime px-4 py-2.5 text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000] flex items-center gap-1.5"
            >
              <span>[ 🏢 GO TO BROKERDESK ]</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound?.playClick?.();
                onGoToStaking();
              }}
              className="pixel-btn pixel-btn-black px-4 py-2.5 text-xs font-bold text-[#00F0FF] hover:text-white border border-[#00F0FF]/80 rounded-lg shadow-[3px_3px_0px_#000] flex items-center gap-1.5"
            >
              <span>[ ⚡ GO TO 24-HR STAKING ]</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound?.playClick?.();
                onBackHome();
              }}
              className="pixel-btn pixel-btn-black px-4 py-2.5 text-xs font-bold text-gray-300 hover:text-white border border-gray-700 rounded-lg shadow-[3px_3px_0px_#000]"
            >
              <span>[ 🏠 BACK TO HOME ]</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
