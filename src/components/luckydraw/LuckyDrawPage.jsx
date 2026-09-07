import React, { useState } from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { formatEther } from 'viem';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { useApeBrokerLuckyDraw } from '../../hooks/useApeBrokerLuckyDraw';
import { useEthPrice } from '../../hooks/useEthPrice';
import { LuckyDrawAdminDashboard } from './LuckyDrawAdminDashboard';

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
  } = useApeBrokerLuckyDraw();

  const [activeView, setActiveView] = useState('terminal'); // 'terminal' | 'admin'
  const [selectedDrawForBuy, setSelectedDrawForBuy] = useState(null);
  const [ticketAmount, setTicketAmount] = useState(1);
  const [buyStep, setBuyStep] = useState('idle'); // 'idle' | 'approving' | 'buying' | 'success' | 'error'
  const [buyError, setBuyError] = useState('');

  const apePriceUsd = 0.00000411;

  const activeDraws = draws.filter((d) => d.status === 0 || d.status === 1);
  const completedDraws = draws.filter((d) => d.status === 2);

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
    <div className="min-h-screen bg-[#070314] text-white font-pixel selection:bg-[#FFD700] selection:text-black relative pb-20 select-none">
      {/* Background CRT Scanlines */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#24084a]/30 via-[#070314]/90 to-[#04010a] opacity-80" />

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
            <span className="hidden md:inline-block px-2 py-0.5 bg-[#1a0c3a] border border-[#FFD700]/60 text-[9px] text-[#FFD700] rounded">
              ROBINHOOD EVM
            </span>
          </div>

          {/* Right Navigation & Wallet */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* View Switcher for Admins */}
            {isAdmin && (
              <div className="flex items-center gap-1 bg-[#13072b] p-1 rounded-lg border border-[#FFD700]/70 shadow-[2px_2px_0px_#000]">
                <button
                  type="button"
                  onClick={() => {
                    sound?.playClick?.();
                    setActiveView('terminal');
                  }}
                  className={`px-2.5 py-1 text-[9px] sm:text-xs font-bold rounded transition-colors ${
                    activeView === 'terminal'
                      ? 'bg-[#FFD700] text-black shadow-[1px_1px_0px_#000]'
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
                  className={`px-2.5 py-1 text-[9px] sm:text-xs font-bold rounded transition-colors ${
                    activeView === 'admin'
                      ? 'bg-[#00FF66] text-black shadow-[1px_1px_0px_#000]'
                      : 'text-[#00FF66] hover:bg-[#00FF66]/20'
                  }`}
                >
                  ADMIN
                </button>
              </div>
            )}

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

            {/* Wallet Connect */}
            {!userBalances.apeBrokeBalance && !isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  openConnectModal?.();
                }}
                className="pixel-btn pixel-btn-vibrant-gold px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-extrabold rounded-md sm:rounded-lg shadow-[2px_2px_0px_#000]"
              >
                [ CONNECT WALLET ]
              </button>
            ) : (
              <div className="bg-[#150a33] border border-[#FFD700]/70 px-2.5 py-1 rounded text-[10px] font-mono text-[#FFD700]">
                {Number(userBalances.nftBalance)} NFTs
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
          />
        ) : (
          <>
            {/* Hero Executive Banner */}
            <div className="bg-gradient-to-r from-[#200a46] via-[#12072e] to-[#200a46] border-3 border-[#FFD700] rounded-xl p-5 sm:p-7 shadow-[6px_6px_0px_#000] relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#FFD700] text-black text-[9px] font-extrabold tracking-wider">
                      EXCLUSIVE HOLDER PROTOCOL
                    </span>
                    <span className="text-[10px] text-gray-300 font-mono">
                      Gated to Ape Broker NFT Holders
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-wider uppercase">
                    WIN HIGH-VALUE PRIZES WITH <span className="text-[#FFD700]">$APEBROKE</span>
                  </h1>
                  <p className="text-xs font-mono text-gray-300 max-w-2xl">
                    Enter community prize draws for gaming consoles (PS5), native ETH jackpots, token whale bundles, and NFTs. Verified on-chain winner selection.
                  </p>
                </div>

                {/* NFT Gating Status Card */}
                <div className="bg-black/60 border-2 border-purple-800 p-4 rounded-xl shrink-0 font-mono text-xs space-y-2 max-w-xs">
                  <div className="text-[10px] text-gray-400 uppercase">MEMBERSHIP VALIDATION</div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${userBalances.isEligible ? 'bg-[#00FF66] animate-pulse' : 'bg-[#FF2247]'}`} />
                    <span className="font-bold text-white text-sm">
                      {Number(userBalances.nftBalance)} Ape Broker NFTs
                    </span>
                  </div>
                  {userBalances.isEligible ? (
                    <div className="text-[10px] text-[#00FF66] font-bold">
                      ✓ ELIGIBLE TO ENTER DRAWS
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-[10px] text-amber-300">
                        Requires ≥ 1 Ape Broker NFT
                      </div>
                      <a
                        href="https://opensea.io/collection/brokerdesk-583588970"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-cyan-400 hover:underline block font-bold"
                      >
                        [ GET NFT ON OPENSEA ↗ ]
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 1: ACTIVE DRAWS */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00FF66] animate-ping" />
                  <h2 className="text-sm sm:text-base font-extrabold text-[#00FF66] tracking-wider uppercase">
                    LIVE ACTIVE DRAWS ({activeDraws.length})
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-gray-400">
                  Ticket payments burn directly into protocol sinks
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeDraws.map((draw) => {
                  const sold = draw.totalTicketsSold;
                  const max = draw.maxTickets || 100;
                  const pct = Math.min(100, Math.round((sold / max) * 100));
                  const userTkts = userTicketsByDraw[draw.drawId] || 0;
                  const priceApe = Number(formatEther(draw.ticketPriceApe));
                  const priceUsd = priceApe * apePriceUsd;

                  const categoryLabels = ['PHYSICAL REWARD', 'ETH JACKPOT', 'TOKEN BUNDLE', 'NFT PRIZE', 'CUSTOM'];
                  const categoryColors = ['bg-pink-600', 'bg-cyan-600', 'bg-amber-600', 'bg-purple-600', 'bg-emerald-600'];

                  return (
                    <div
                      key={draw.drawId}
                      className="bg-[#12072e] border-2 border-purple-800 hover:border-[#FFD700] rounded-xl overflow-hidden shadow-[4px_4px_0px_#000] flex flex-col transition-all group"
                    >
                      {/* Image Banner */}
                      <div className="relative h-44 w-full bg-black overflow-hidden">
                        <img
                          src={draw.imageUrl}
                          alt={draw.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white shadow-md ${categoryColors[draw.prizeCategory || 0]}`}>
                            {categoryLabels[draw.prizeCategory || 0]}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-950/90 text-[#FFD700] border border-[#FFD700]/60 shadow-md">
                            {draw.winnerCount || 1} WINNER{(draw.winnerCount || 1) > 1 ? 'S' : ''}
                          </span>
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
                            [ 🎟️ GET TICKETS ]
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* SECTION 2: WINNERS HALL OF FAME */}
            <section className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏆</span>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#00F0FF] tracking-wider uppercase">
                    WINNERS HALL OF FAME ({completedDraws.length})
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-gray-400">
                  Verified past draws & external prize fulfillment
                </span>
              </div>

              {completedDraws.length === 0 ? (
                <div className="bg-[#12072e] border-2 border-purple-900 p-8 rounded-xl text-center font-mono text-gray-400">
                  No completed draws recorded yet. Once winners are chosen, they will appear here.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedDraws.map((draw) => (
                    <div
                      key={draw.drawId}
                      className="bg-[#140833] border-2 border-cyan-800 rounded-xl p-4 sm:p-5 shadow-[4px_4px_0px_#000] space-y-3 font-mono"
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
                          {draw.selectionMode === 1 ? '🎲 RANDOM DRAW' : '✍️ MANUAL PICK'}
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
                            {draw.prizeStatus === 3 ? '✓ COMPLETED' : draw.prizeStatus === 2 ? 'PRIZE SENT' : 'IN PROGRESS'}
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
                  <div className="text-4xl text-[#00FF66] animate-bounce">✓</div>
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
                      ⚠️ <strong>Insufficient ETH for gas:</strong> Robinhood EVM transactions require a tiny amount of ETH (&lt; $0.05) to pay network fees.
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
