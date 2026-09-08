import React, { useState, useEffect } from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { formatEther } from 'viem';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { useApeBrokerLuckyDraw } from '../../hooks/useApeBrokerLuckyDraw';
import { useEthPrice } from '../../hooks/useEthPrice';
import { LuckyDrawAdminDashboard } from './LuckyDrawAdminDashboard';
import { LuckyDrawLockedScreen } from './LuckyDrawLockedScreen';
import { PixelFluidBackground } from '../PixelFluidBackground';
import { supabase } from '../../utils/supabase';

export function LuckyDrawPage({ onBackHome, onGoToDesk, onGoToStaking }) {
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  const { ethPrice } = useEthPrice();

  const {
    draws,
    totalDraws,
    userBalances,
    userTicketsByDraw,
    isLoading,
    isAdmin,
    availableTicketRevenue,
    approveApebroke,
    buyTickets,
    adminCreateDraw,
    adminSetTicketPrice,
    adminSelectWinnerRandom,
    adminSelectWinnerManual,
    adminSelectWinnersManual,
    adminUpdatePrizeStatus,
    adminClaimAllTicketRevenue,
    adminCancelDraw,
    adminDeleteDraw,
    adminEditDraw,
  } = useApeBrokerLuckyDraw();

  // Public Lock state - defaults to false (OPEN for public)
  const [isPublicLocked, setIsPublicLocked] = useState(() => {
    try {
      const stored = localStorage.getItem('APE_LUCKY_DRAW_PUBLIC_LOCKED');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const [hasPasscodeBypass, setHasPasscodeBypass] = useState(() => {
    try {
      return sessionStorage.getItem('APE_LUCKY_DRAW_ADMIN_UNLOCKED') === 'true';
    } catch {
      return false;
    }
  });

  // Sync public lock status from Supabase
  useEffect(() => {
    async function syncPublicLock() {
      try {
        const { data } = await supabase
          .from('apebrokers_settings')
          .select('value')
          .eq('key', 'lucky_draw_public_locked')
          .maybeSingle();

        if (data?.value?.locked !== undefined) {
          setIsPublicLocked(Boolean(data.value.locked));
          localStorage.setItem('APE_LUCKY_DRAW_PUBLIC_LOCKED', String(data.value.locked));
        } else {
          setIsPublicLocked(false);
          localStorage.setItem('APE_LUCKY_DRAW_PUBLIC_LOCKED', 'false');
        }
      } catch (e) {
        setIsPublicLocked(false);
      }
    }
    syncPublicLock();
  }, []);

  const handleAdminPasscodeUnlock = () => {
    try {
      sessionStorage.setItem('APE_LUCKY_DRAW_ADMIN_UNLOCKED', 'true');
    } catch {}
    setHasPasscodeBypass(true);
  };

  const handleTogglePublicLock = async (lockedState) => {
    const nextVal = typeof lockedState === 'boolean' ? lockedState : !isPublicLocked;
    setIsPublicLocked(nextVal);
    try {
      localStorage.setItem('APE_LUCKY_DRAW_PUBLIC_LOCKED', String(nextVal));
      await supabase.from('apebrokers_settings').upsert({
        key: 'lucky_draw_public_locked',
        value: { locked: nextVal },
      });
    } catch {}
  };

  const isUnlockedForUser = !isPublicLocked || isAdmin || hasPasscodeBypass;

  const [activeView, setActiveView] = useState('terminal'); // 'terminal' | 'admin'
  const [selectedDrawForBuy, setSelectedDrawForBuy] = useState(null);
  const [ticketAmount, setTicketAmount] = useState(1);
  const [buyStep, setBuyStep] = useState('idle'); // 'idle' | 'approving' | 'buying' | 'success' | 'error'
  const [buyError, setBuyError] = useState('');

  const apePriceUsd = 0.00000411;

  const activeDraws = draws.filter((d) => d.status === 0 || d.status === 1);
  const completedDraws = draws.filter((d) => d.status === 2);

  // If public access is locked and user is not verified as admin, render Locked Screen
  if (!isUnlockedForUser) {
    return (
      <LuckyDrawLockedScreen
        onBackHome={onBackHome}
        onGoToDesk={onGoToDesk}
        onGoToStaking={onGoToStaking}
        onAdminPasscodeUnlock={handleAdminPasscodeUnlock}
      />
    );
  }

  // Buy Modal handlers
  const handleOpenBuyModal = (draw) => {
    sound?.playClick?.();
    setSelectedDrawForBuy(draw);
    setTicketAmount(1);
    setBuyStep('idle');
    setBuyError('');
  };

  const handleCloseBuyModal = () => {
    sound?.playClick?.();
    setSelectedDrawForBuy(null);
    setBuyStep('idle');
    setBuyError('');
  };

  const handleApproveTokens = async () => {
    sound?.playClick?.();
    setBuyStep('approving');
    setBuyError('');
    try {
      await approveApebroke();
      sound?.playSuccess?.();
      setBuyStep('idle');
    } catch (err) {
      sound?.playError?.();
      setBuyError(err.message || 'Approval failed.');
      setBuyStep('error');
    }
  };

  const handleBuyTickets = async () => {
    if (!selectedDrawForBuy) return;
    sound?.playClick?.();
    setBuyStep('buying');
    setBuyError('');
    try {
      await buyTickets(selectedDrawForBuy.drawId, ticketAmount);
      sound?.playSuccess?.();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setBuyStep('success');
    } catch (err) {
      sound?.playError?.();
      setBuyError(err.message || 'Purchase failed.');
      setBuyStep('error');
    }
  };

  const selectedCostApe = selectedDrawForBuy
    ? BigInt(ticketAmount) * BigInt(selectedDrawForBuy.ticketPriceApe)
    : 0n;
  const hasEnoughAllowance = userBalances.allowance >= selectedCostApe && selectedCostApe > 0n;
  const hasEnoughBalance = userBalances.apeBrokeBalance >= selectedCostApe;
  const hasEnoughGas = userBalances.ethBalance >= 50000000000000n;

  return (
    <div className="min-h-screen text-white font-pixel selection:bg-[#FFD700] selection:text-black relative pb-20 select-none overflow-x-hidden">
      {/* Interactive Pixel Fluid Background */}
      <PixelFluidBackground />

      {/* Background Soft Scanline Vignette Overlay */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[#070314]/75 backdrop-blur-[1.5px]" />

      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 w-full bg-[#0a051d]/90 backdrop-blur-md border-b-3 border-[#FFD700] px-4 sm:px-8 py-3 select-none">
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
              <span className="text-sm sm:text-base font-extrabold text-[#FFD700] tracking-wider drop-shadow-[0_0_8px_rgba(255,215,0,0.3)]">
                APE BROKER LUCKY DRAW
              </span>
            </button>
            <span className="hidden md:inline-block px-2 py-0.5 bg-[#1a0c3a] border border-[#FFD700]/60 text-[9px] text-[#FFD700] rounded">
              ROBINHOOD EVM
            </span>
          </div>

          {/* Right Navigation & Wallet */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Public Lock Indicator */}
            {isPublicLocked && (
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 bg-amber-950/70 border border-amber-500/70 text-[8px] text-amber-300 rounded font-mono font-bold">
                [ LOCKED ]
              </span>
            )}

            {/* View Switcher for Admins */}
            {(isAdmin || hasPasscodeBypass) && (
              <div className="flex items-center gap-0.5 bg-[#13072b] p-0.5 rounded border border-[#FFD700]/70">
                <button
                  type="button"
                  onClick={() => {
                    sound?.playClick?.();
                    setActiveView('terminal');
                  }}
                  className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                    activeView === 'terminal'
                      ? 'bg-[#FFD700] text-black'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  DRAWS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound?.playClick?.();
                    setActiveView('admin');
                  }}
                  className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                    activeView === 'admin'
                      ? 'bg-[#00FF66] text-black'
                      : 'text-[#00FF66] hover:bg-[#00FF66]/20'
                  }`}
                >
                  ADMIN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound?.playClick?.();
                    handleTogglePublicLock();
                  }}
                  title={isPublicLocked ? 'Click to open for public' : 'Click to lock for public'}
                  className={`px-1.5 py-0.5 text-[8px] font-bold rounded border ${
                    isPublicLocked
                      ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                      : 'bg-emerald-950/80 border-[#00FF66] text-[#00FF66]'
                  }`}
                >
                  {isPublicLocked ? '🔒 LOCKED' : '🌐 PUBLIC'}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                sound?.playClick?.();
                onGoToDesk();
              }}
              className="pixel-btn pixel-btn-sm pixel-btn-black text-[#00FF66] font-bold"
            >
              [ DESK ]
            </button>

            <button
              type="button"
              onClick={() => {
                sound?.playClick?.();
                onGoToStaking();
              }}
              className="pixel-btn pixel-btn-sm pixel-btn-black text-[#00F0FF] font-bold"
            >
              [ STAKE ]
            </button>

            <button
              type="button"
              onClick={() => {
                sound?.playClick?.();
                onBackHome();
              }}
              className="pixel-btn pixel-btn-sm pixel-btn-black text-gray-300 hover:text-white font-bold"
            >
              [ ← HOME ]
            </button>

            {/* Wallet Connect / NFT Indicator */}
            {!userBalances.apeBrokeBalance && !isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  openConnectModal?.();
                }}
                className="pixel-btn pixel-btn-sm pixel-btn-gold font-extrabold"
              >
                [ CONNECT ]
              </button>
            ) : (
              <div className="bg-[#150a33] border border-[#FFD700]/70 px-2 py-0.5 rounded text-[9px] font-mono text-[#FFD700] flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${userBalances.isEligible ? 'bg-[#00FF66]' : 'bg-[#FF2247]'}`} />
                <span>{Number(userBalances.nftBalance)} NFTs</span>
                {userBalances.isEligible && (
                  <span className="hidden md:inline text-[8px] text-[#00FF66] font-bold">[ELIGIBLE]</span>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Render Admin View or User Terminal */}
        {activeView === 'admin' ? (
          <LuckyDrawAdminDashboard
            draws={draws}
            totalDraws={totalDraws}
            availableTicketRevenue={availableTicketRevenue}
            onBackToTerminal={() => setActiveView('terminal')}
            onCreateDraw={adminCreateDraw}
            onSetTicketPrice={adminSetTicketPrice}
            onSelectWinnerRandom={adminSelectWinnerRandom}
            onSelectWinnerManual={adminSelectWinnerManual}
            onSelectWinnersManual={adminSelectWinnersManual}
            onUpdatePrizeStatus={adminUpdatePrizeStatus}
            onClaimAllRevenue={adminClaimAllTicketRevenue}
            isPublicLocked={isPublicLocked}
            onTogglePublicLock={handleTogglePublicLock}
            onCancelDraw={adminCancelDraw}
            onDeleteDraw={adminDeleteDraw}
            onEditDraw={adminEditDraw}
          />
        ) : (
          <>
            {/* Hero Executive Banner */}
            <div className="bg-[#12072e]/85 backdrop-blur-md border-3 border-[#FFD700] rounded-2xl p-5 sm:p-6 shadow-[6px_6px_0px_#000] relative overflow-hidden">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-wider uppercase leading-tight">
                WIN HIGH-VALUE PRIZES WITH
                <span className="block text-[#FFD700] drop-shadow-[0_0_12px_rgba(255,215,0,0.4)] mt-1">
                  APE BROKER
                </span>
              </h1>
            </div>

            {/* SECTION 1: ACTIVE DRAWS */}
            <section className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00FF66]" />
                  <h2 className="text-sm sm:text-base font-extrabold text-[#00FF66] tracking-wider uppercase">
                    LIVE ACTIVE DRAWS ({activeDraws.length})
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-gray-400">
                  Ticket payments burn directly into protocol sinks
                </span>
              </div>

              {activeDraws.length === 0 ? (
                <div className="bg-[#12072e]/85 backdrop-blur-md border-3 border-purple-800 p-8 sm:p-12 rounded-2xl text-center font-mono space-y-5 shadow-[6px_6px_0px_#000] max-w-2xl mx-auto">
                  {/* Retro Cyber Radar Animation */}
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-purple-700/60 animate-ping opacity-30" />
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#00FF66] flex items-center justify-center animate-spin" style={{ animationDuration: '8s' }}>
                      <div className="w-8 h-8 rounded-full border border-[#FFD700] flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-[#00FF66]" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-[#00FF66] tracking-widest uppercase">
                      [ RADAR STATUS: SCANNING FOR NEW DRAWS ]
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white font-pixel">
                      NO ACTIVE DRAWS CURRENTLY RUNNING
                    </h3>
                    <p className="text-xs text-gray-300 max-w-md mx-auto leading-relaxed">
                      Upcoming lucky draws will appear here once launched by the protocol admin. You can operate your active desks or stake tokens while waiting.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={onGoToDesk}
                      className="pixel-btn pixel-btn-vibrant-lime px-4 py-2.5 text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000]"
                    >
                      [ OPERATE BROKERDESK ]
                    </button>
                    <button
                      type="button"
                      onClick={onGoToStaking}
                      className="pixel-btn pixel-btn-vibrant-cyan px-4 py-2.5 text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000]"
                    >
                      [ STAKE $APEBROKE ]
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {activeDraws.map((draw) => {
                    const sold = draw.totalTicketsSold;
                    const max = draw.maxTickets || 100;
                    const pct = Math.min(100, Math.round((sold / max) * 100));
                    const userTkts = userTicketsByDraw[draw.drawId] || 0;
                    const priceApe = Number(formatEther(draw.ticketPriceApe));
                    const priceUsd = priceApe * apePriceUsd;

                    const isNoDead = draw.noDeadline || (draw.endTime - draw.startTime >= 180 * 86400);

                    const categoryLabels = ['PHYSICAL REWARD', 'ETH JACKPOT', 'TOKEN BUNDLE', 'NFT PRIZE', 'CUSTOM'];
                    const categoryColors = ['bg-pink-600', 'bg-cyan-600', 'bg-amber-600', 'bg-purple-600', 'bg-emerald-600'];

                    return (
                      <div
                        key={draw.drawId}
                        className="bg-[#12072e]/85 backdrop-blur-md border-2 border-purple-800 hover:border-[#FFD700] rounded-xl overflow-hidden shadow-[4px_4px_0px_#000] flex flex-col transition-all group"
                      >
                        {/* Image Banner */}
                        <div className="relative h-48 w-full bg-black overflow-hidden">
                          <img
                            src={draw.imageUrl}
                            alt={draw.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white shadow-md ${categoryColors[draw.prizeCategory || 0]}`}>
                              {categoryLabels[draw.prizeCategory || 0]}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-950/90 text-[#FFD700] border border-[#FFD700]/60 shadow-md">
                              {draw.winnerCount || 1} WINNER{(draw.winnerCount || 1) > 1 ? 'S' : ''}
                            </span>
                            {isNoDead && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-950/90 text-[#00FF66] border border-[#00FF66]/60 shadow-md">
                                NO DEADLINE
                              </span>
                            )}
                          </div>
                          <div className="absolute top-2.5 right-2.5 bg-black/80 px-2 py-0.5 rounded text-[9px] font-mono font-bold text-[#FFD700] border border-[#FFD700]/50">
                            DRAW #{draw.drawId}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <h3 className="text-sm font-extrabold text-white leading-snug line-clamp-2">
                              {draw.title}
                            </h3>
                            <p className="text-[11px] font-mono text-gray-300 line-clamp-2">
                              {draw.prizeDescription}
                            </p>
                          </div>

                          <div className="space-y-3 font-mono text-xs pt-2 border-t border-purple-900/50">
                            <div className="flex justify-between items-center text-gray-400 text-[11px]">
                              <span>Ticket Price:</span>
                              <span className="font-bold text-[#FFD700] text-xs">
                                {priceApe.toLocaleString()} $APE (≈ ${priceUsd.toFixed(2)})
                              </span>
                            </div>

                            {/* Deadline / Duration Status */}
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-gray-400">Duration:</span>
                              {isNoDead ? (
                                <span className="text-[#00FF66] font-bold">
                                  Open until drawn
                                </span>
                              ) : (
                                <span className="text-cyan-300 font-mono">
                                  {draw.endTime * 1000 > Date.now()
                                    ? `Ends in ${Math.max(1, Math.ceil((draw.endTime * 1000 - Date.now()) / 86400000))}d`
                                    : 'Ended'}
                                </span>
                              )}
                            </div>

                            {/* Progress */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-gray-300">
                                <span>Tickets Sold:</span>
                                <span className="text-[#00FF66] font-bold">
                                  {sold} / {draw.maxTickets > 0 ? draw.maxTickets : '∞'} ({pct}%)
                                </span>
                              </div>
                              <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-purple-900">
                                <div
                                  className="h-full bg-gradient-to-r from-[#FFD700] to-[#00FF66]"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>

                            {/* User Ticket Status */}
                            <div className="bg-black/50 border border-purple-900/80 p-2 rounded flex justify-between items-center text-[10px]">
                              <span className="text-gray-400">Your Tickets:</span>
                              <span className="font-bold text-[#00F0FF]">
                                {userTkts} Tickets {sold > 0 && userTkts > 0 ? `(${((userTkts / sold) * 100).toFixed(1)}% chance)` : ''}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenBuyModal(draw)}
                              className="w-full py-2.5 pixel-btn pixel-btn-vibrant-gold text-xs font-extrabold rounded-lg shadow-[2px_2px_0px_#000] text-center uppercase"
                            >
                              [ ENTER LUCKY DRAW ]
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* SECTION 2: WINNERS HALL OF FAME */}
            <section className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF]" />
                  <h2 className="text-sm sm:text-base font-extrabold text-[#00F0FF] tracking-wider uppercase">
                    WINNERS HALL OF FAME ({completedDraws.length})
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-gray-400">
                  Verified past draws & external prize fulfillment
                </span>
              </div>

              {completedDraws.length === 0 ? (
                <div className="bg-[#12072e]/85 backdrop-blur-md border-2 border-purple-900 p-8 rounded-xl text-center font-mono text-gray-400">
                  [ ARCHIVE STATUS: ZERO COMPLETED DRAWS RECORDED YET ]
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedDraws.map((draw) => (
                    <div
                      key={draw.drawId}
                      className="bg-[#140833]/85 backdrop-blur-md border-2 border-cyan-800 rounded-xl p-4 sm:p-5 shadow-[4px_4px_0px_#000] space-y-3 font-mono"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="px-2 py-0.5 bg-[#00F0FF] text-black text-[9px] font-extrabold rounded">
                            DRAW #{draw.drawId} COMPLETED
                          </span>
                          <h3 className="text-xs sm:text-sm font-bold text-white font-pixel mt-1">
                            {draw.title}
                          </h3>
                        </div>
                        <span className="px-2 py-0.5 bg-black/60 border border-purple-700 text-[9px] text-gray-300 rounded shrink-0">
                          {draw.selectionMode === 1 ? '[ RANDOM DRAW ]' : '[ MANUAL PICK ]'}
                        </span>
                      </div>

                      <div className="bg-black/50 p-3 rounded-lg border border-purple-900/60 space-y-1.5 text-xs">
                        {(() => {
                          const allWinners = (draw.winners && draw.winners.length > 0)
                            ? draw.winners
                            : (draw.winner && draw.winner !== '0x0000000000000000000000000000000000000000' ? [draw.winner] : []);
                          return (
                            <div className="space-y-1">
                              <div className="flex justify-between text-gray-400 text-[11px]">
                                <span>Official Winner{allWinners.length > 1 ? 's' : ''}:</span>
                                <span className="text-[#FFD700] font-bold">{allWinners.length} Winner{allWinners.length > 1 ? 's' : ''}</span>
                              </div>
                              <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                {allWinners.map((w, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-[11px] bg-black/40 px-2 py-0.5 rounded border border-purple-900/30">
                                    <span className="text-gray-400 font-mono text-[9px]">#{idx + 1}</span>
                                    <span className="font-bold text-[#00FF66] font-mono">
                                      {w ? `${w.slice(0, 6)}...${w.slice(-4)}` : 'Unassigned'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                        <div className="flex justify-between">
                          <span className="text-gray-400">Prize Description:</span>
                          <span className="text-gray-200">{draw.prizeDescription}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Fulfillment Status:</span>
                          <span className="text-[#00F0FF] font-bold">
                            {draw.prizeStatus === 3 ? 'COMPLETED' : draw.prizeStatus === 2 ? 'PRIZE SENT' : 'IN PROGRESS'}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 pt-1 border-t border-purple-900/40 flex justify-between items-center">
                          <span>Prize Delivery:</span>
                          <span className="text-[#FFD700] font-bold">Direct Admin Delivery</span>
                        </div>
                        {draw.prizeFulfillmentProof && (
                          <div className="text-[10px] text-gray-400 pt-1 border-t border-purple-900/40">
                            Delivery Proof: <span className="text-cyan-300 break-all">{draw.prizeFulfillmentProof}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Buy Tickets Modal */}
      {selectedDrawForBuy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#12072e] border-3 border-[#FFD700] rounded-xl overflow-hidden shadow-[0_0_40px_rgba(255,215,0,0.3)] font-pixel text-white">
            {/* Header */}
            <div className="bg-[#1a0c3a] px-5 py-3 border-b-2 border-[#FFD700] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse" />
                <h3 className="text-xs sm:text-sm font-extrabold text-[#FFD700] tracking-wider">
                  ENTER DRAW #{selectedDrawForBuy.drawId}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseBuyModal}
                className="text-gray-400 hover:text-white text-xs px-2 py-1 border border-gray-700 rounded"
              >
                [ ESC ]
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 font-mono text-xs">
              {buyStep === 'success' ? (
                <div className="text-center py-6 space-y-3 font-pixel">
                  <div className="text-lg text-[#00FF66] font-bold border border-[#00FF66] inline-block px-3 py-1 rounded bg-[#00FF66]/10">[ TRANSACTION CONFIRMED ]</div>
                  <div className="text-base text-[#00FF66] font-bold">
                    TICKETS PURCHASED SUCCESSFULLY!
                  </div>
                  <p className="text-xs font-mono text-gray-300">
                    You have entered Draw #{selectedDrawForBuy.drawId}. Good luck!
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleCloseBuyModal}
                      className="pixel-btn pixel-btn-vibrant-lime px-6 py-2.5 text-xs font-bold rounded"
                    >
                      [ CLOSE ]
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <div className="font-bold text-white text-sm font-pixel">
                      {selectedDrawForBuy.title}
                    </div>
                    <div className="text-gray-300 text-[11px]">
                      {selectedDrawForBuy.prizeDescription}
                    </div>
                  </div>

                  {/* Quantity Selector */}
                  <div className="bg-black/50 p-4 rounded-lg border border-purple-800 space-y-3">
                    <div className="flex justify-between items-center text-gray-400 text-[11px]">
                      <span>Select Ticket Quantity:</span>
                      <span className="text-[#FFD700] font-bold">
                        {ticketAmount} {ticketAmount === 1 ? 'Ticket' : 'Tickets'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {[1, 5, 10, 20].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setTicketAmount(num)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded border ${
                            ticketAmount === num
                              ? 'bg-[#FFD700] text-black border-[#FFD700]'
                              : 'bg-[#1a0a36] text-gray-300 border-purple-800 hover:border-gray-500'
                          }`}
                        >
                          +{num}
                        </button>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-purple-900/50 flex justify-between items-center text-xs">
                      <span className="text-gray-300">Total Price:</span>
                      <span className="font-extrabold text-[#00FF66] text-sm font-pixel">
                        {Number(formatEther(selectedCostApe)).toLocaleString()} $APE
                        <span className="text-[10px] text-gray-400 font-mono ml-1.5 font-normal">
                          (≈ ${(Number(formatEther(selectedCostApe)) * apePriceUsd).toFixed(2)})
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* User Balances */}
                  <div className="bg-black/30 p-3 rounded border border-purple-900/40 space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Your $APE Balance:</span>
                      <span className={`font-bold ${hasEnoughBalance ? 'text-white' : 'text-[#FF2247]'}`}>
                        {Number(formatEther(userBalances.apeBrokeBalance)).toLocaleString()} $APE
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Your ETH (Gas) Balance:</span>
                      <span className={`font-bold ${hasEnoughGas ? 'text-[#00FF66]' : 'text-[#FF2247]'}`}>
                        {Number(formatEther(userBalances.ethBalance)).toFixed(6)} ETH
                      </span>
                    </div>
                  </div>

                  {/* Gas Alert */}
                  {!hasEnoughGas && (
                    <div className="bg-amber-950/80 border border-amber-500 p-2.5 rounded text-[10px] text-amber-200">
                      <strong>Notice:</strong> Insufficient ETH for gas. Robinhood EVM transactions require a tiny amount of ETH (&lt; $0.05) to pay network fees.
                    </div>
                  )}

                  {/* Error Alert */}
                  {buyStep === 'error' && buyError && (
                    <div className="bg-red-950/90 border border-red-500 p-2.5 rounded text-[10px] text-red-200 break-words">
                      Error: {buyError}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="space-y-2 pt-2">
                    {!hasEnoughBalance ? (
                      <a
                        href="https://www.letscash.fun/token/0xe0F384ebCede975342c5431aCad515b4A1B862cc"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 pixel-btn pixel-btn-vibrant-gold text-xs font-bold rounded-lg shadow-[2px_2px_0px_#000] text-center block"
                      >
                        [ BUY $APEBROKE TO ENTER ]
                      </a>
                    ) : !hasEnoughAllowance ? (
                      <button
                        type="button"
                        disabled={buyStep === 'approving'}
                        onClick={handleApproveTokens}
                        className="w-full py-2.5 pixel-btn pixel-btn-vibrant-gold text-xs font-bold rounded-lg shadow-[2px_2px_0px_#000]"
                      >
                        {buyStep === 'approving' ? '[ 1/2 APPROVING $APEBROKE... ]' : '[ 1. APPROVE $APEBROKE ]'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={buyStep === 'buying'}
                        onClick={handleBuyTickets}
                        className="w-full py-2.5 pixel-btn pixel-btn-vibrant-lime text-xs font-bold rounded-lg shadow-[2px_2px_0px_#000]"
                      >
                        {buyStep === 'buying' ? '[ 2/2 CONFIRMING PURCHASE... ]' : `[ 2. ENTER DRAW (${ticketAmount} TICKETS) ]`}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleCloseBuyModal}
                      className="w-full py-1.5 text-[10px] text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
