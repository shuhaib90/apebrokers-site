import React, { useState, useEffect } from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { formatEther } from 'viem';
import { useApeBrokerDesk } from '../../hooks/useApeBrokerDesk';
import { DeskActionModal } from './DeskActionModal';
import { DeskAdminModal } from './DeskAdminModal';
import { DeskAdminDashboard } from './DeskAdminDashboard';
import { fetchRecentProtocolActivity } from '../../utils/supabaseDesk';
import { sound } from '../../utils/audio';

export function DeskPage({ onBackHome }) {
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();

  const {
    address,
    isConnected,
    isCorrectChain,
    isScanningNfts,
    switchChain,
    switchToRobinhoodChain,
    isLoading,
    globalStats,
    userBalances,
    userDesks,
    addTokenToTrack,
    refetchGlobalStats,
    refetchUserData,
    approveApebroke,
    activateDesk,
    boostDesk,
    claimRewards,
    claimAllRewards,
    claimHistoricalRewards,
    adminClaimFees,
    adminDepositRewards,
  } = useApeBrokerDesk();

  // Modals state
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    actionType: 'activate', // 'activate' | 'boost'
    desk: null,
  });
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [activeView, setActiveView] = useState('terminal'); // 'terminal' | 'admin'

  // Search / Track Token ID input
  const [manualTokenId, setManualTokenId] = useState('');
  const [searchError, setSearchError] = useState('');

  // Live countdown timer for 5-hour epoch
  const [timeLeft, setTimeLeft] = useState(Number(globalStats.secondsUntilNextEpoch || 0));

  // Activity feed
  const [activityFeed, setActivityFeed] = useState([]);
  const [isClaimingAll, setIsClaimingAll] = useState(false);
  const [isClaimingHistorical, setIsClaimingHistorical] = useState(false);

  useEffect(() => {
    setTimeLeft(Number(globalStats.secondsUntilNextEpoch || 0));
  }, [globalStats.secondsUntilNextEpoch]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 18000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Supabase Activity Feed
  useEffect(() => {
    fetchRecentProtocolActivity(12).then(setActivityFeed);
    const interval = setInterval(() => {
      fetchRecentProtocolActivity(12).then(setActivityFeed);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Auto-detect network: if connected to wrong network (e.g. Polygon), auto-prompt switch to Robinhood Chain
  useEffect(() => {
    if (isConnected && !isCorrectChain) {
      switchToRobinhoodChain();
    }
  }, [isConnected, isCorrectChain, switchToRobinhoodChain]);

  const formatCountdown = (secs) => {
    const s = Math.max(0, secs);
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    return `${hours.toString().padStart(2, '0')}h ${minutes
      .toString()
      .padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };

  const handleTrackToken = (e) => {
    e.preventDefault();
    sound?.playClick?.();
    setSearchError('');
    const id = parseInt(manualTokenId.trim(), 10);
    if (isNaN(id) || id <= 0 || id > 5555) {
      setSearchError('Please enter a valid Ape Broker ID (1 - 5555).');
      return;
    }
    addTokenToTrack(id);
    setManualTokenId('');
  };

  const openActionModal = (desk, type) => {
    sound?.playClick?.();
    setActionModal({
      isOpen: true,
      actionType: type,
      desk,
    });
  };

  const handleClaimSingle = async (desk) => {
    sound?.playClick?.();
    try {
      await claimRewards(desk.tokenId, desk.pendingRewardsEth);
      sound?.playSuccess?.();
    } catch (err) {
      console.error('Claim failed:', err);
      sound?.playError?.();
    }
  };

  const handleClaimAll = async () => {
    const claimableDesks = userDesks.filter(
      (d) => d.active && d.isOwnerOfNft && d.pendingRewardsEth > 0n
    );
    if (claimableDesks.length === 0) return;

    sound?.playClick?.();
    setIsClaimingAll(true);
    try {
      const ids = claimableDesks.map((d) => d.tokenId);
      const totalPending = claimableDesks.reduce(
        (acc, d) => acc + d.pendingRewardsEth,
        0n
      );
      await claimAllRewards(ids, totalPending);
      sound?.playSuccess?.();
    } catch (err) {
      console.error('Claim all failed:', err);
      sound?.playError?.();
    } finally {
      setIsClaimingAll(false);
    }
  };

  const handleClaimHistorical = async () => {
    if (userBalances.historicalClaimableEth <= 0n) return;
    sound?.playClick?.();
    setIsClaimingHistorical(true);
    try {
      await claimHistoricalRewards(userBalances.historicalClaimableEth);
      sound?.playSuccess?.();
    } catch (err) {
      console.error('Claim historical failed:', err);
      sound?.playError?.();
    } finally {
      setIsClaimingHistorical(false);
    }
  };

  // User aggregated stats
  const totalUserWeight = userDesks
    .filter((d) => d.active && d.isOwnerOfNft)
    .reduce((acc, d) => acc + d.currentWeight, 0);

  const totalUserPendingEth = userDesks
    .filter((d) => d.active && d.isOwnerOfNft)
    .reduce((acc, d) => acc + d.pendingRewardsEth, 0n);

  return (
    <div className="min-h-screen bg-[#070314] text-white font-pixel selection:bg-[#00FF66] selection:text-black relative pb-20">
      {/* Background CRT Scanlines */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1d0944]/30 via-[#070314]/90 to-[#04010a] opacity-80" />

      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 w-full bg-[#0a051d]/95 backdrop-blur-md border-b-3 border-[#00FF66] px-4 sm:px-8 py-3 select-none">
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
            <span className="hidden md:inline-block px-2 py-0.5 bg-[#170a36] border border-purple-800 text-[9px] text-[#00F0FF] rounded">
              ROBINHOOD EVM
            </span>
          </div>

          {/* Right Actions & Wallet */}
          <div className="flex items-center gap-2 sm:gap-3">
            {globalStats.isAdmin && (
              <div className="flex items-center gap-1 bg-[#13072b] p-1 rounded-lg border border-purple-700 shadow-[2px_2px_0px_#000]">
                <button
                  type="button"
                  onClick={() => {
                    sound?.playClick?.();
                    setActiveView('terminal');
                  }}
                  className={`px-2.5 py-1 text-[9px] sm:text-xs font-bold rounded transition-colors ${
                    activeView === 'terminal'
                      ? 'bg-[#00FF66] text-black shadow-[1px_1px_0px_#000]'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  🦍 DESKS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound?.playClick?.();
                    setActiveView('admin');
                  }}
                  className={`px-2.5 py-1 text-[9px] sm:text-xs font-bold rounded transition-colors ${
                    activeView === 'admin'
                      ? 'bg-[#FFD700] text-black shadow-[1px_1px_0px_#000]'
                      : 'text-[#FFD700] hover:bg-[#FFD700]/20'
                  }`}
                >
                  ⚙️ ADMIN DASHBOARD
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                sound?.playClick?.();
                onBackHome();
              }}
              className="pixel-btn pixel-btn-black px-3 py-1.5 text-[9px] sm:text-xs font-bold text-gray-300 hover:text-white rounded border border-gray-700"
            >
              [ ← HOME ]
            </button>

            {/* Wallet Connect & Disconnect Only (No chain selection) */}
            {!isConnected ? (
              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  openConnectModal?.();
                }}
                className="pixel-btn pixel-btn-vibrant-lime px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-extrabold rounded-md sm:rounded-lg shadow-[2px_2px_0px_#000] flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                <span>[ CONNECT WALLET ]</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="bg-[#12082b] border-2 border-[#00FF66]/60 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-mono text-[#00FF66] flex items-center gap-1.5 shadow-[2px_2px_0px_#000]">
                  <span className="w-2 h-2 rounded-full bg-[#00FF66] shadow-[0_0_6px_#00FF66]" />
                  <span>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'CONNECTED'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sound?.playClick?.();
                    disconnect();
                  }}
                  className="pixel-btn pixel-btn-black px-2.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/40 border-2 border-red-900/60 rounded-md sm:rounded-lg shadow-[2px_2px_0px_#000] flex items-center gap-1"
                  title="Disconnect Wallet"
                >
                  <span>[ DISCONNECT ]</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6 relative z-10">
        {/* Network Warning (Auto-detect with 1-click switch, no chain picker) */}
        {isConnected && !isCorrectChain && (
          <div className="bg-red-950/90 border-2 border-[#FF2247] p-3.5 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-[4px_4px_0px_#000]">
            <div className="flex items-center gap-2 text-[#FF2247]">
              <span className="text-base animate-pulse">⚠</span>
              <span>WRONG NETWORK DETECTED: Switch to Robinhood Chain to interact with Desks.</span>
            </div>
            <button
              type="button"
              onClick={switchToRobinhoodChain}
              className="pixel-btn pixel-btn-vibrant-crimson px-4 py-1.5 text-[10px] font-bold rounded"
            >
              [ SWITCH TO ROBINHOOD ]
            </button>
          </div>
        )}

        {/* ADMIN DASHBOARD VIEW OR DESK TERMINAL VIEW */}
        {activeView === 'admin' && globalStats.isAdmin ? (
          <DeskAdminDashboard
            globalStats={globalStats}
            onClaimFees={adminClaimFees}
            onDepositRewards={adminDepositRewards}
            onBackToTerminal={() => setActiveView('terminal')}
            refetchGlobalStats={refetchGlobalStats}
          />
        ) : (
          <>
            {/* Global Protocol Ticker / Metrics */}
            <section className="bg-[#0f0729]/95 border-2 border-purple-800/80 rounded-xl p-4 sm:p-5 shadow-[6px_6px_0px_#000]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-900/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse" />
              <span className="text-xs text-gray-300 font-bold uppercase tracking-wider">
                LIVE PROTOCOL METRICS
              </span>
            </div>
            {/* 5-Hour Epoch Countdown */}
            <div className="flex items-center gap-2 bg-[#1b0a40] px-3 py-1.5 border border-[#00F0FF] rounded-lg text-xs">
              <span className="text-gray-400 text-[10px]">EPOCH #{globalStats.currentEpoch.toString()} ENDS IN:</span>
              <span className="text-[#00F0FF] font-mono font-bold tracking-wider">
                {formatCountdown(timeLeft)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pt-4 font-mono text-center">
            {/* Total Active Desks */}
            <div className="bg-[#150938]/80 p-3 rounded-lg border border-purple-900/40">
              <div className="text-[10px] text-gray-400 font-pixel">TOTAL WEIGHT</div>
              <div className="text-base sm:text-xl font-bold text-[#00FF66] mt-1">
                {globalStats.totalEligibleWeight.toString()} WGT
              </div>
              <div className="text-[9px] text-gray-500 mt-0.5">Eligible Distribution</div>
            </div>

            {/* Reward Pool Balance */}
            <div className="bg-[#150938]/80 p-3 rounded-lg border border-purple-900/40">
              <div className="text-[10px] text-gray-400 font-pixel">ETH REWARD POOL</div>
              <div className="text-base sm:text-xl font-bold text-[#00F0FF] mt-1">
                {Number(formatEther(globalStats.rewardPoolBalance)).toFixed(4)} ETH
              </div>
              <div className="text-[9px] text-gray-500 mt-0.5">Available To Claim</div>
            </div>

            {/* Total ETH Distributed */}
            <div className="bg-[#150938]/80 p-3 rounded-lg border border-purple-900/40">
              <div className="text-[10px] text-gray-400 font-pixel">TOTAL DISTRIBUTED</div>
              <div className="text-base sm:text-xl font-bold text-[#FFD700] mt-1">
                {Number(formatEther(globalStats.totalEthDeposited)).toFixed(4)} ETH
              </div>
              <div className="text-[9px] text-gray-500 mt-0.5">Admin Funded</div>
            </div>

            {/* Protocol Fees Collected */}
            <div className="bg-[#150938]/80 p-3 rounded-lg border border-purple-900/40">
              <div className="text-[10px] text-gray-400 font-pixel">PROTOCOL FEES</div>
              <div className="text-base sm:text-xl font-bold text-[#A855F7] mt-1">
                {Number(formatEther(globalStats.protocolFeeBalance)).toLocaleString()}
              </div>
              <div className="text-[9px] text-gray-500 mt-0.5">$APEBROKE Collected</div>
            </div>

            {/* Wallet Limit Note */}
            <div className="col-span-2 lg:col-span-1 bg-[#150938]/80 p-3 rounded-lg border border-purple-900/40 flex flex-col justify-center">
              <div className="text-[10px] text-gray-400 font-pixel">DESK CAPACITY</div>
              <div className="text-sm font-bold text-white mt-1">MAX 5 / WALLET</div>
              <div className="text-[9px] text-[#00FF66] mt-0.5">5 Boosts / Desk</div>
            </div>
          </div>
        </section>

        {/* User Portfolio HUD (When Connected) */}
        {isConnected && (
          <section className="bg-[#120832]/90 border-2 border-[#00FF66] rounded-xl p-4 sm:p-5 shadow-[6px_6px_0px_#000] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-[#00FF66]">
                  YOUR BROKER DESKS
                </h2>
                <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                  1 NFT = 1 Desk • Robinhood EVM Connected: {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              </div>

              {/* User Balances Summary */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="bg-black/60 px-3 py-1.5 border border-purple-800 rounded">
                  $APE: <span className="text-[#00FF66] font-bold">{Number(formatEther(userBalances.apeBrokeBalance)).toLocaleString()}</span>
                </span>
                <span className="bg-black/60 px-3 py-1.5 border border-purple-800 rounded">
                  ETH: <span className="text-[#00F0FF] font-bold">{Number(formatEther(userBalances.ethBalance)).toFixed(4)}</span>
                </span>
              </div>
            </div>

            {/* Quick Actions & Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 font-mono">
              <div className="bg-black/40 p-3 rounded-lg border border-purple-900/50 flex items-center justify-between">
                <span className="text-xs text-gray-400">Active Desks:</span>
                <span className="text-sm font-bold text-[#00FF66]">
                  {userBalances.activeDeskCount.toString()} / 5 Active
                </span>
              </div>

              <div className="bg-black/40 p-3 rounded-lg border border-purple-900/50 flex items-center justify-between">
                <span className="text-xs text-gray-400">Total Desk Weight:</span>
                <span className="text-sm font-bold text-white">
                  {totalUserWeight} WGT
                </span>
              </div>

              <div className="bg-black/40 p-3 rounded-lg border border-purple-900/50 flex items-center justify-between">
                <span className="text-xs text-gray-400">Total Pending ETH:</span>
                <span className="text-sm font-bold text-[#00F0FF]">
                  {Number(formatEther(totalUserPendingEth)).toFixed(6)} ETH
                </span>
              </div>
            </div>

            {/* Batch Claim Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                disabled={totalUserPendingEth === 0n || isClaimingAll}
                onClick={handleClaimAll}
                className="pixel-btn pixel-btn-vibrant-lime px-4 py-2.5 text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000] disabled:opacity-40"
              >
                {isClaimingAll
                  ? '[ CLAIMING ALL ETH... ]'
                  : `[ CLAIM ALL REWARDS (${Number(formatEther(totalUserPendingEth)).toFixed(4)} ETH) ]`}
              </button>

              {userBalances.historicalClaimableEth > 0n && (
                <button
                  type="button"
                  disabled={isClaimingHistorical}
                  onClick={handleClaimHistorical}
                  className="pixel-btn pixel-btn-vibrant-gold px-4 py-2.5 text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000] disabled:opacity-40"
                >
                  {isClaimingHistorical
                    ? '[ CLAIMING HISTORICAL ETH... ]'
                    : `[ CLAIM ACCRUED HISTORICAL REWARDS (${Number(formatEther(userBalances.historicalClaimableEth)).toFixed(4)} ETH) ]`}
                </button>
              )}
            </div>
          </section>
        )}

        {/* Track / Search Token ID Input */}
        <section className="bg-[#120832]/80 border border-purple-900/60 rounded-xl p-4 shadow-[4px_4px_0px_#000]">
          <form onSubmit={handleTrackToken} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full relative">
              <input
                type="number"
                min="1"
                max="5555"
                placeholder="ENTER APE BROKER NFT TOKEN ID (1 - 5555)..."
                value={manualTokenId}
                onChange={(e) => setManualTokenId(e.target.value)}
                className="w-full bg-black/60 border-2 border-purple-800 focus:border-[#00FF66] px-4 py-2.5 text-xs font-mono text-white rounded-lg outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto pixel-btn pixel-btn-vibrant-cyan px-5 py-2.5 text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000] whitespace-nowrap"
            >
              [ + TRACK / INSPECT DESK ]
            </button>
          </form>
          {searchError && (
            <div className="text-[10px] text-[#FF2247] mt-2 font-mono">{searchError}</div>
          )}
        </section>

        {/* Desks Grid */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-wider">
                YOUR BROKER DESKS ({Math.min(userDesks.length, 5)} / 5 MAX)
              </h3>
              {userDesks.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#052b16] border border-[#00FF66] text-[#00FF66] text-[9px] font-mono rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
                  AUTO-DETECTED FROM WALLET
                </span>
              )}
              {isScanningNfts && (
                <span className="text-[10px] text-cyan-400 font-mono animate-pulse">
                  (Scanning Robinhood...)
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                sound?.playClick?.();
                refetchUserData();
                refetchGlobalStats();
              }}
              className="text-[10px] text-gray-400 hover:text-[#00FF66] font-mono"
            >
              [ REFRESH DATA ]
            </button>
          </div>

          {!isConnected ? (
            <div className="bg-[#10072b] border-2 border-dashed border-purple-800/80 rounded-xl p-8 sm:p-12 text-center space-y-4 shadow-[4px_4px_0px_#000]">
              <div className="text-3xl text-purple-400">⚡</div>
              <div className="text-sm sm:text-base font-bold text-[#00FF66]">
                CONNECT WALLET TO ACCESS DESKS
              </div>
              <p className="text-xs font-mono text-gray-400 max-w-md mx-auto">
                Each Ape Broker NFT represents 1 Desk. Connect your wallet to auto-detect your NFTs, activate desks, apply boosts (2x to 10x max), and collect 5-hour ETH rewards.
              </p>
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    sound?.playClick?.();
                    openConnectModal?.();
                  }}
                  className="pixel-btn pixel-btn-vibrant-lime px-6 sm:px-8 py-3 sm:py-3.5 text-xs sm:text-sm font-extrabold rounded-lg shadow-[4px_4px_0px_#000] flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                  <span>[ CONNECT WALLET ]</span>
                </button>
              </div>
            </div>
          ) : userDesks.length === 0 ? (
            <div className="bg-[#10072b] border-2 border-dashed border-purple-800/80 rounded-xl p-8 text-center space-y-3">
              <div className="text-sm font-bold text-gray-300">
                {isScanningNfts
                  ? 'AUTO-DETECTING APE BROKER NFTS FROM CONNECTED WALLET...'
                  : 'NO APE BROKER NFTS FOUND IN THIS WALLET'}
              </div>
              <p className="text-xs font-mono text-gray-400 max-w-lg mx-auto">
                {isScanningNfts
                  ? 'Scanning Robinhood EVM blockchain records...'
                  : 'If you recently received your NFT, enter its Token ID (#1 - #5555) in the search box above to load it directly.'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userDesks.slice(0, 5).map((desk) => {
                  const isActive = desk.active;
                  const boostCount = desk.boostCount || 0;
                  const weight = desk.currentWeight || 100;
                  const nextCostFormatted = desk.nextBoostCost
                    ? Number(formatEther(desk.nextBoostCost)).toLocaleString()
                    : '0';
                  const pendingEthFormatted = Number(
                    formatEther(desk.pendingRewardsEth || 0n)
                  ).toFixed(6);

                  return (
                    <div
                      key={desk.tokenId}
                      className={`relative bg-[#100729]/95 border-3 rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-[5px_5px_0px_#000] transition-all ${
                        isActive
                          ? 'border-[#00FF66] shadow-[0_0_15px_rgba(0,255,102,0.15)]'
                          : 'border-purple-800/70 hover:border-purple-600'
                      }`}
                    >
                    {/* Card Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isActive ? 'bg-[#00FF66] shadow-[0_0_8px_#00FF66]' : 'bg-gray-500'
                          }`}
                        />
                        <span className="font-extrabold text-sm text-white">
                          DESK #{desk.tokenId}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          isActive
                            ? 'bg-[#052b16] text-[#00FF66] border border-[#00FF66]'
                            : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}
                      >
                        {isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>

                    {/* Desk Visual Avatar / Graphic */}
                    <div className="w-full h-32 bg-black/50 border border-purple-900/50 rounded-lg flex items-center justify-center relative overflow-hidden">
                      <img
                        src={`/gifs/${(desk.tokenId % 100) + 1}.gif`}
                        alt={`Ape #${desk.tokenId}`}
                        onError={(e) => {
                          e.target.src = '/logo.png';
                        }}
                        className="h-28 w-28 object-contain pixelated"
                      />
                      <div className="absolute bottom-1 right-2 text-[9px] font-mono text-gray-400 bg-black/80 px-1.5 py-0.5 rounded">
                        NFT #{desk.tokenId}
                      </div>
                    </div>

                    {/* Stats Specs */}
                    <div className="space-y-2 text-xs font-mono bg-[#160a36]/60 p-3 rounded-lg border border-purple-900/40">
                      <div className="flex justify-between items-center text-gray-400">
                        <span>Desk Weight:</span>
                        <span className="text-white font-bold">
                          {isActive ? `${weight} WGT` : '0 WGT (100 Base)'}
                        </span>
                      </div>

                      {/* 5-slot Boost Indicator */}
                      <div className="flex justify-between items-center text-gray-400">
                        <span>Boosts (Max 5):</span>
                        <div className="flex items-center gap-1 font-pixel text-[10px]">
                          {[1, 2, 3, 4, 5].map((slot) => (
                            <span
                              key={slot}
                              className={`w-3.5 h-3.5 flex items-center justify-center rounded-sm text-[8px] font-bold ${
                                slot <= boostCount
                                  ? 'bg-[#00FF66] text-black shadow-[0_0_6px_#00FF66]'
                                  : 'bg-black/60 text-gray-600 border border-gray-800'
                              }`}
                            >
                              {slot <= boostCount ? '■' : '·'}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Next Boost Cost Preview */}
                      {isActive && boostCount < 5 && (
                        <div className="flex justify-between items-center text-gray-400">
                          <span>Next Boost ({desk.nextBoostNumber * 2}x):</span>
                          <span className="text-[#FFD700] font-bold">
                            {nextCostFormatted} $APE
                          </span>
                        </div>
                      )}

                      {/* Pending Rewards */}
                      <div className="flex justify-between items-center text-gray-400 border-t border-purple-900/40 pt-1.5">
                        <span>Pending ETH:</span>
                        <span className="text-[#00F0FF] font-bold">
                          {pendingEthFormatted} ETH
                        </span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="space-y-2 pt-1">
                      {!isActive ? (
                        <button
                          type="button"
                          onClick={() => openActionModal(desk, 'activate')}
                          className="w-full min-h-[44px] pixel-btn pixel-btn-vibrant-lime py-2.5 text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000]"
                        >
                          [ ACTIVATE (349,693 $APE) ]
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          {boostCount < 5 ? (
                            <button
                              type="button"
                              onClick={() => openActionModal(desk, 'boost')}
                              className="flex-1 min-h-[42px] pixel-btn pixel-btn-vibrant-gold py-2 text-[11px] font-bold rounded-lg shadow-[2px_2px_0px_#000]"
                            >
                              [ BOOST (+100 WGT) ]
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="flex-1 min-h-[42px] bg-[#1a0f38] text-gray-500 py-2 text-[11px] font-bold rounded-lg border border-purple-900/60 cursor-not-allowed"
                            >
                              [ MAX BOOST (600 WGT) ]
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={desk.pendingRewardsEth === 0n}
                            onClick={() => handleClaimSingle(desk)}
                            className="flex-1 min-h-[42px] pixel-btn pixel-btn-vibrant-cyan py-2 text-[11px] font-bold rounded-lg shadow-[2px_2px_0px_#000] disabled:opacity-40"
                          >
                            [ CLAIM ETH ]
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </>
          )}
        </section>

        {/* Recent Protocol Activity Feed (Supabase Live Cache) */}
        <section className="bg-[#0f0729]/90 border border-purple-800/60 rounded-xl p-4 sm:p-5 shadow-[4px_4px_0px_#000] space-y-3">
          <div className="flex items-center justify-between border-b border-purple-900/60 pb-2.5">
            <h3 className="text-xs sm:text-sm font-extrabold text-[#00F0FF] tracking-wider">
              PROTOCOL ACTIVITY FEED (SUPABASE INDEXED)
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">Real-time Events</span>
          </div>

          {activityFeed.length === 0 ? (
            <div className="text-xs font-mono text-gray-500 py-4 text-center">
              No recent events logged yet.
            </div>
          ) : (
            <div className="divide-y divide-purple-900/30 font-mono text-xs max-h-56 overflow-y-auto pr-1">
              {activityFeed.map((item) => (
                <div key={item.id} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        item.type === 'boost'
                          ? 'bg-[#291705] text-[#FFD700] border border-[#FFD700]'
                          : item.type === 'deposit'
                          ? 'bg-[#052b16] text-[#00FF66] border border-[#00FF66]'
                          : 'bg-[#051f2b] text-[#00F0FF] border border-[#00F0FF]'
                      }`}
                    >
                      {item.type}
                    </span>
                    <span className="text-gray-200">{item.detail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span>{item.user ? `${item.user.slice(0, 6)}...` : ''}</span>
                    <span>•</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
          </>
        )}
      </main>

      {/* Action Modal (2-Step Approval & Execution) */}
      <DeskActionModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, actionType: 'activate', desk: null })}
        actionType={actionModal.actionType}
        desk={actionModal.desk}
        apeBrokeBalance={userBalances.apeBrokeBalance}
        allowance={userBalances.allowance}
        onApprove={approveApebroke}
        onExecute={actionModal.actionType === 'activate' ? activateDesk : boostDesk}
      />

      {/* Admin Modal */}
      <DeskAdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        globalStats={globalStats}
        onClaimFees={adminClaimFees}
        onDepositRewards={adminDepositRewards}
      />
    </div>
  );
}
