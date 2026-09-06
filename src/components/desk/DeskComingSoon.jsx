import React from 'react';
import { sound } from '../../utils/audio';

export function DeskComingSoon({
  onBackHome,
  address,
  isConnected,
  openConnectModal,
  disconnect,
}) {
  return (
    <div className="min-h-screen bg-[#070314] text-white font-pixel selection:bg-[#00FF66] selection:text-black relative flex flex-col justify-between overflow-x-hidden">
      {/* Background CRT Scanlines and Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1d0944]/40 via-[#070314]/90 to-[#04010a] opacity-80" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(rgba(18,16,38,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px]" />

      {/* Top Navbar */}
      <nav className="relative z-40 w-full bg-[#0a051d]/95 backdrop-blur-md border-b-3 border-[#00FF66] px-4 sm:px-8 py-3 select-none">
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
              <span className="text-sm sm:text-base font-extrabold text-[#00FF66] tracking-wider">
                APE BROKER DESK
              </span>
            </button>
            <span className="hidden md:inline-block px-2 py-0.5 bg-[#170a36] border border-purple-800 text-[9px] text-[#00F0FF] rounded font-mono">
              ROBINHOOD EVM
            </span>
          </div>

          {/* Right: Wallet & Return Home */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!isConnected ? (
              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  openConnectModal?.();
                }}
                className="pixel-btn pixel-btn-vibrant-lime px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold rounded-lg shadow-[2px_2px_0px_#000]"
              >
                [ CONNECT WALLET ]
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-300 bg-[#150933] border border-purple-800 px-2 py-1 rounded">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    sound?.playClick?.();
                    disconnect?.();
                  }}
                  className="pixel-btn pixel-btn-vibrant-gold px-2.5 py-1 text-[9px] sm:text-xs font-bold rounded shadow-[2px_2px_0px_#000]"
                >
                  [ DISCONNECT ]
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                sound?.playClick?.();
                onBackHome();
              }}
              className="pixel-btn pixel-btn-vibrant-cyan px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold rounded-lg shadow-[2px_2px_0px_#000]"
            >
              [ ⌂ HOME ]
            </button>
          </div>
        </div>
      </nav>

      {/* Main Coming Soon Container */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-16 text-center space-y-8 flex-grow flex flex-col justify-center items-center">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#170a36]/90 border-2 border-[#00FF66] rounded-full shadow-[0_0_20px_rgba(0,255,102,0.25)]">
          <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-ping" />
          <span className="text-[10px] sm:text-xs font-bold text-[#00FF66] tracking-wider font-mono uppercase">
            ● COMING SOON
          </span>
        </div>

        {/* Hero Title */}
        <div className="space-y-3 max-w-3xl">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[#00FF66] tracking-wider drop-shadow-[0_0_25px_rgba(0,255,102,0.45)]">
            APE BROKER DESK
          </h1>
          <div className="text-xl sm:text-3xl md:text-4xl font-extrabold text-[#FFD700] tracking-wide drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]">
            COMING SOON
          </div>
          <p className="text-xs sm:text-sm font-mono text-gray-300 max-w-xl mx-auto leading-relaxed pt-2">
            The next-generation NFT revenue terminal on Robinhood EVM. Activate your Ape Broker Desks, upgrade with multi-tier boosts (+500% WGT), and earn automated 5-hour ETH reward distributions.
          </p>
        </div>

        {/* Feature Teasers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl text-left pt-4">
          <div className="bg-[#12072e]/90 border-2 border-purple-800/80 p-5 rounded-xl space-y-2 shadow-[4px_4px_0px_#000] hover:border-[#00FF66] transition-colors">
            <div className="text-2xl text-[#00FF66]">⏱️</div>
            <div className="text-xs sm:text-sm font-bold text-white font-pixel">
              5-HOUR ETH EPOCHS
            </div>
            <p className="text-[11px] font-mono text-gray-400 leading-relaxed">
              Automated reward distributions streamed continuously to all active Desks based on their share of total protocol weight.
            </p>
          </div>

          <div className="bg-[#12072e]/90 border-2 border-purple-800/80 p-5 rounded-xl space-y-2 shadow-[4px_4px_0px_#000] hover:border-[#FFD700] transition-colors">
            <div className="text-2xl text-[#FFD700]">⚡</div>
            <div className="text-xs sm:text-sm font-bold text-white font-pixel">
              DYNAMIC BOOSTS
            </div>
            <p className="text-[11px] font-mono text-gray-400 leading-relaxed">
              Scale each Desk from 100 WGT up to 600 WGT (10x progression) via deflationary $APEBROKE burns.
            </p>
          </div>

          <div className="bg-[#12072e]/90 border-2 border-purple-800/80 p-5 rounded-xl space-y-2 shadow-[4px_4px_0px_#000] hover:border-[#00F0FF] transition-colors">
            <div className="text-2xl text-[#00F0FF]">🦍</div>
            <div className="text-xs sm:text-sm font-bold text-white font-pixel">
              1 NFT = 1 DESK
            </div>
            <p className="text-[11px] font-mono text-gray-400 leading-relaxed">
              Holders of verified Ape Broker NFTs represent operating Desks. Non-custodial, claim anytime.
            </p>
          </div>
        </div>

        {/* Action Card */}
        <div className="w-full max-w-md bg-[#140833] border-3 border-[#00FF66] p-6 rounded-xl shadow-[0_0_30px_rgba(0,255,102,0.2)] space-y-4">
          <div className="space-y-2">
            <div className="text-xs sm:text-sm font-bold text-[#00FF66]">
              [ ACCESS TERMINAL ]
            </div>
            <p className="text-[11px] font-mono text-gray-300">
              Connect your wallet to launch and interact with the Ape Broker Desk terminal.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {!isConnected ? (
              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  openConnectModal?.();
                }}
                className="w-full sm:w-auto pixel-btn pixel-btn-vibrant-lime px-6 py-3 text-xs font-extrabold rounded-lg shadow-[3px_3px_0px_#000]"
              >
                [ CONNECT WALLET ]
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  disconnect?.();
                }}
                className="w-full sm:w-auto pixel-btn pixel-btn-vibrant-gold px-5 py-2.5 text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000]"
              >
                [ DISCONNECT ]
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                sound?.playClick?.();
                onBackHome();
              }}
              className="w-full sm:w-auto pixel-btn pixel-btn-vibrant-cyan px-5 py-3 text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000]"
            >
              [ RETURN HOME ]
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-purple-900/60 bg-[#060212]/90 py-4 px-4 sm:px-8 select-none">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-mono text-gray-400">
          <div className="flex items-center gap-2">
            <span className="text-[#00FF66] font-bold">APESYNDICATE</span>
            <span>•</span>
            <span>ROBINHOOD EVM MAINNET</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://x.com/Apesyndicates"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline"
            >
              Official X
            </a>
            <a
              href="https://www.letscash.fun/token/0xe0F384ebCede975342c5431aCad515b4A1B862cc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FFD700] hover:underline"
            >
              $APEBROKE
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
