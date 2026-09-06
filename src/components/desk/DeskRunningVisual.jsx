import React from 'react';

/**
 * High-detail retro-cyber workstation display for Ape Broker Desks.
 * Renders real-time running animations, CRT scanlines, 8-bit computation equalizer bars,
 * hardware status LEDs, and dynamic boost energy auras.
 */
export function DeskRunningVisual({ desk, globalStats, timeLeft }) {
  const isActive = Boolean(desk?.active);
  const boostCount = Number(desk?.boostCount || 0);
  const weight = Number(desk?.currentWeight || (isActive ? 100 : 0));
  const tokenId = desk?.tokenId;

  // Format countdown string mm:ss / hh:mm:ss
  const formatTimer = (secs) => {
    const s = Math.max(0, Number(secs || 0));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${minutes.toString().padStart(2, '0')}m ${seconds
      .toString()
      .padStart(2, '0')}s`;
  };

  // Boost aura class based on boost level
  const getBoostAuraStyle = () => {
    if (!isActive) return 'border-purple-900/40 opacity-70';
    switch (boostCount) {
      case 5:
        return 'border-[#FFD700] animate-aura-gold animate-rainbow-shift';
      case 4:
        return 'border-[#FF007F] animate-aura-pink';
      case 3:
        return 'border-[#A855F7] animate-aura-violet';
      case 2:
      case 1:
        return 'border-[#00F0FF] animate-aura-cyan';
      default:
        return 'border-[#00FF66] animate-aura-green';
    }
  };

  const getAuraBadge = () => {
    if (!isActive) return null;
    if (boostCount === 5) {
      return (
        <span className="text-[8px] font-pixel px-1.5 py-0.5 rounded bg-amber-950/80 border border-yellow-400 text-yellow-300 shadow-[0_0_8px_#FFD700] animate-pulse">
          600 WGT MAX
        </span>
      );
    }
    if (boostCount > 0) {
      return (
        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 border border-[#00F0FF] text-[#00F0FF]">
          +{boostCount * 100} WGT BOOST
        </span>
      );
    }
    return (
      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 border border-[#00FF66]/60 text-[#00FF66]">
        100 WGT BASE
      </span>
    );
  };

  return (
    <div
      className={`w-full rounded-xl overflow-hidden border-2 transition-all relative flex flex-col ${
        isActive
          ? 'bg-[#080318] border-[#00FF66]/70 shadow-[0_0_15px_rgba(0,255,102,0.2)]'
          : 'bg-[#0a0516] border-purple-900/50 opacity-85'
      }`}
    >
      {/* ================= 1. TOP HARDWARE TERMINAL BAR ================= */}
      <div className="bg-[#050210] px-3 py-1.5 border-b border-purple-900/60 flex items-center justify-between text-[9px] font-mono">
        {/* Left: Live Running Status */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isActive
                ? 'bg-[#00FF66] shadow-[0_0_8px_#00FF66] animate-ping'
                : 'bg-amber-500/80'
            }`}
          />
          <span
            className={`font-pixel font-bold uppercase tracking-wider ${
              isActive ? 'text-[#00FF66]' : 'text-gray-400'
            }`}
          >
            {isActive ? '● RUNNING' : '○ STANDBY'}
          </span>
        </div>

        {/* Middle: 4 Hardware Diagnostic LEDs */}
        <div className="hidden sm:flex items-center gap-2 text-[8px] text-gray-400">
          <span className="flex items-center gap-0.5">
            PWR
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isActive ? 'bg-[#00FF66] shadow-[0_0_4px_#00FF66]' : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="flex items-center gap-0.5">
            NET
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isActive ? 'bg-[#00F0FF] animate-led-fast shadow-[0_0_4px_#00F0FF]' : 'bg-gray-600'
              }`}
            />
          </span>
          <span className="flex items-center gap-0.5">
            MINER
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isActive ? 'bg-[#39FF14] animate-led-slow shadow-[0_0_4px_#39FF14]' : 'bg-gray-600'
              }`}
            />
          </span>
          <span className="flex items-center gap-0.5">
            POOL
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isActive ? 'bg-[#FFD700] shadow-[0_0_4px_#FFD700]' : 'bg-gray-600'
              }`}
            />
          </span>
        </div>

        {/* Right: Epoch Counter / Cycle */}
        <div className="flex items-center gap-1 text-[9px] text-gray-400">
          <span className="text-gray-500">CYCLE:</span>
          <span className="text-cyan-400 font-bold">
            #{globalStats?.currentEpoch?.toString() || '0'}
          </span>
        </div>
      </div>

      {/* ================= 2. CRT MONITOR WORKSTATION SCREEN ================= */}
      <div className="relative w-full h-40 bg-black/80 flex items-center justify-center overflow-hidden crt-grid-bg select-none">
        {/* CRT Scanline Beam (Sweeping vertically) */}
        {isActive && (
          <div className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent pointer-events-none animate-desk-crt z-20" />
        )}

        {/* Horizontal Laser Sweep */}
        {isActive && (
          <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#00FF66] to-transparent pointer-events-none animate-desk-laser z-20 shadow-[0_0_6px_#00FF66]" />
        )}

        {/* Left Side: 8-Bit Computation Equalizer Bars */}
        {isActive && (
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 h-16 flex items-end gap-1 pointer-events-none z-10 opacity-70">
            <div className="w-1 bg-[#00FF66] rounded-sm animate-eq-1 shadow-[0_0_4px_#00FF66]" />
            <div className="w-1 bg-[#00F0FF] rounded-sm animate-eq-2 shadow-[0_0_4px_#00F0FF]" />
            <div className="w-1 bg-[#A855F7] rounded-sm animate-eq-3 shadow-[0_0_4px_#A855F7]" />
            <div className="w-1 bg-[#FFD700] rounded-sm animate-eq-4 shadow-[0_0_4px_#FFD700]" />
          </div>
        )}

        {/* Right Side: Mirrored Computation Equalizer Bars */}
        {isActive && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 h-16 flex items-end gap-1 pointer-events-none z-10 opacity-70">
            <div className="w-1 bg-[#FFD700] rounded-sm animate-eq-4 shadow-[0_0_4px_#FFD700]" />
            <div className="w-1 bg-[#A855F7] rounded-sm animate-eq-3 shadow-[0_0_4px_#A855F7]" />
            <div className="w-1 bg-[#00F0FF] rounded-sm animate-eq-2 shadow-[0_0_4px_#00F0FF]" />
            <div className="w-1 bg-[#00FF66] rounded-sm animate-eq-5 shadow-[0_0_4px_#00FF66]" />
          </div>
        )}

        {/* Main Avatar Graphic with Dynamic Boost Aura */}
        <div
          className={`relative p-1.5 rounded-lg border-2 transition-all z-10 bg-black/50 ${getBoostAuraStyle()}`}
        >
          <img
            src={desk?.image || '/brokerdesk-art.png'}
            alt={desk?.name || `Broker Desk #${tokenId}`}
            onError={(e) => {
              e.currentTarget.src = '/brokerdesk-art.png';
            }}
            className={`h-28 w-28 object-contain pixelated transition-transform duration-300 ${
              isActive ? 'hover:scale-105' : 'grayscale-[40%]'
            }`}
          />

          {/* Overclock / Boost Particle Ring if max boost */}
          {isActive && boostCount === 5 && (
            <div className="absolute -inset-1 rounded-xl border border-yellow-300/40 pointer-events-none animate-ping opacity-30" />
          )}
        </div>

        {/* Top-Right Badge: Boost Weight Tier */}
        <div className="absolute top-2 right-2 z-20">{getAuraBadge()}</div>

        {/* Bottom-Left Token Tag */}
        <div className="absolute bottom-2 left-2 z-20 text-[9px] font-mono text-gray-300 bg-black/85 px-1.5 py-0.5 rounded border border-purple-900/60">
          DESK #{tokenId}
        </div>

        {/* Bottom-Right Hashrate Tag */}
        {isActive ? (
          <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1 text-[9px] font-mono text-[#00FF66] bg-black/85 px-1.5 py-0.5 rounded border border-[#00FF66]/50">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
            <span>100% HASHRATE</span>
          </div>
        ) : (
          <div className="absolute bottom-2 right-2 z-20 text-[9px] font-mono text-gray-500 bg-black/85 px-1.5 py-0.5 rounded border border-gray-800">
            OFFLINE
          </div>
        )}
      </div>

      {/* ================= 3. BOTTOM WORKSTATION ACTIVITY TICKER ================= */}
      <div className="bg-[#050210] px-3 py-1.5 border-t border-purple-900/60 flex items-center justify-between text-[9px] font-mono">
        <div className="flex items-center gap-1 text-gray-400 truncate">
          <span className="text-[#00FF66] font-bold">&gt;</span>
          {isActive ? (
            <span className="text-gray-300 truncate">
              MINING 5H EPOCH • <span className="text-[#00F0FF] font-bold">{weight} WGT ACTIVE</span>
            </span>
          ) : (
            <span className="text-gray-500 truncate">AWAITING ON-CHAIN ACTIVATION</span>
          )}
        </div>

        {isActive && timeLeft !== undefined && (
          <div className="text-cyan-400 font-bold whitespace-nowrap pl-2">
            {formatTimer(timeLeft)}
          </div>
        )}
      </div>
    </div>
  );
}
