import React, { useState, useEffect, useMemo } from 'react';
import { formatEther, parseEther } from 'viem';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import {
  fetchAllDesksFromDb,
  fetchAllRewardDepositsFromDb,
  fetchAllRewardClaimsFromDb,
  fetchAllDeskBoostsFromDb,
  fetchAllProtocolFeeClaimsFromDb,
  syncDeskToDb,
} from '../../utils/supabaseDesk';
import {
  DESK_CONTRACT_ADDRESS,
  APEBROKE_TOKEN_ADDRESS,
  APE_BROKER_NFT_ADDRESS,
  ADMIN_ADDRESS,
  TREASURY_ADDRESS,
} from '../../hooks/useApeBrokerDesk';

export function DeskAdminDashboard({
  globalStats,
  onClaimFees,
  onDepositRewards,
  onDistributeEpochRewards,
  onSetEpochEmissionBps,
  onSetBenchmarkWeightFloor,
  onBackToTerminal,
  refetchGlobalStats,
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'desks' | 'distributions' | 'logs' | 'actions'
  const [ethDepositInput, setEthDepositInput] = useState('');
  const [feeClaimInput, setFeeClaimInput] = useState('');
  const [emissionInput, setEmissionInput] = useState('');
  const [benchmarkInput, setBenchmarkInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDistributingEpoch, setIsDistributingEpoch] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Data states from Supabase
  const [allDesks, setAllDesks] = useState([]);
  const [rewardDeposits, setRewardDeposits] = useState([]);
  const [rewardClaims, setRewardClaims] = useState([]);
  const [deskBoosts, setDeskBoosts] = useState([]);
  const [feeClaims, setFeeClaims] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Filter & Search states for Desks table
  const [deskSearch, setDeskSearch] = useState('');
  const [deskFilter, setDeskFilter] = useState('all'); // 'all' | 'active' | 'max_boost'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Logs sub-tab
  const [logsSubTab, setLogsSubTab] = useState('claims'); // 'claims' | 'boosts' | 'fees'

  // Manual desk sync
  const [syncTokenId, setSyncTokenId] = useState('');
  const [syncOwner, setSyncOwner] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Load all DB data
  const loadDashboardData = async () => {
    setIsLoadingData(true);
    try {
      const [desks, deposits, claims, boosts, fees] = await Promise.all([
        fetchAllDesksFromDb({ activeOnly: false }),
        fetchAllRewardDepositsFromDb(150),
        fetchAllRewardClaimsFromDb(150),
        fetchAllDeskBoostsFromDb(150),
        fetchAllProtocolFeeClaimsFromDb(150),
      ]);

      setAllDesks(desks);
      setRewardDeposits(deposits);
      setRewardClaims(claims);
      setDeskBoosts(boosts);
      setFeeClaims(fees);
    } catch (err) {
      console.error('Error loading admin dashboard data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handle ETH Reward Deposit (Distribution)
  const handleDepositEth = async (e) => {
    e.preventDefault();
    if (!ethDepositInput || parseFloat(ethDepositInput) <= 0) return;
    sound?.playClick?.();
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await onDepositRewards(ethDepositInput);
      setStatusMessage(`Successfully distributed ${ethDepositInput} ETH into the 5-Hour Reward Pool!`);
      setEthDepositInput('');
      sound?.playSuccess?.();
      try {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.5 } });
      } catch (e) {}
      await loadDashboardData();
      if (refetchGlobalStats) await refetchGlobalStats();
    } catch (err) {
      console.error('ETH deposit failed:', err);
      sound?.playError?.();
      setErrorMessage(err.shortMessage || err.message || 'ETH distribution failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Protocol Fee Claim ($APEBROKE to Treasury)
  const handleClaimFees = async (e) => {
    e.preventDefault();
    sound?.playClick?.();
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    const protocolFees = globalStats.protocolFeeBalance || 0n;
    try {
      const amountRaw = feeClaimInput ? parseEther(feeClaimInput) : protocolFees;
      await onClaimFees(amountRaw);
      setStatusMessage(`Successfully claimed ${feeClaimInput || formatEther(protocolFees)} $APEBROKE to Treasury!`);
      setFeeClaimInput('');
      sound?.playSuccess?.();
      await loadDashboardData();
      if (refetchGlobalStats) await refetchGlobalStats();
    } catch (err) {
      console.error('Fee claim failed:', err);
      sound?.playError?.();
      setErrorMessage(err.shortMessage || err.message || 'Fee claim failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger Epoch Distribution
  const handleTriggerEpochDistribution = async () => {
    if (!onDistributeEpochRewards) return;
    sound?.playClick?.();
    setIsDistributingEpoch(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await onDistributeEpochRewards();
      setStatusMessage('Successfully settled and distributed pending epoch rewards!');
      sound?.playSuccess?.();
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
      } catch (e) {}
      if (refetchGlobalStats) await refetchGlobalStats();
    } catch (err) {
      console.error('Trigger epoch failed:', err);
      sound?.playError?.();
      setErrorMessage(err.shortMessage || err.message || 'Epoch distribution failed.');
    } finally {
      setIsDistributingEpoch(false);
    }
  };

  // Update Emission Rate
  const handleUpdateEmission = async (e) => {
    e.preventDefault();
    if (!emissionInput || isNaN(Number(emissionInput))) return;
    const bps = Math.round(Number(emissionInput) * 100);
    if (bps <= 0 || bps > 2000) {
      setErrorMessage('Emission rate must be between 0.1% and 20.0%.');
      return;
    }
    sound?.playClick?.();
    setIsSubmitting(true);
    try {
      await onSetEpochEmissionBps(bps);
      setStatusMessage(`Updated epoch emission to ${emissionInput}% (${bps} bps).`);
      setEmissionInput('');
      sound?.playSuccess?.();
      if (refetchGlobalStats) await refetchGlobalStats();
    } catch (err) {
      setErrorMessage(err.shortMessage || err.message || 'Update failed.');
      sound?.playError?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Benchmark Weight
  const handleUpdateBenchmark = async (e) => {
    e.preventDefault();
    if (!benchmarkInput || isNaN(Number(benchmarkInput))) return;
    const weight = Math.round(Number(benchmarkInput));
    if (weight <= 0) {
      setErrorMessage('Benchmark weight must be greater than 0.');
      return;
    }
    sound?.playClick?.();
    setIsSubmitting(true);
    try {
      await onSetBenchmarkWeightFloor(weight);
      setStatusMessage(`Updated benchmark weight floor to ${weight} WGT.`);
      setBenchmarkInput('');
      sound?.playSuccess?.();
      if (refetchGlobalStats) await refetchGlobalStats();
    } catch (err) {
      setErrorMessage(err.shortMessage || err.message || 'Update failed.');
      sound?.playError?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual Desk Sync
  const handleManualSync = async (e) => {
    e.preventDefault();
    if (!syncTokenId) return;
    setIsSyncing(true);
    try {
      await syncDeskToDb({
        tokenId: Number(syncTokenId),
        owner: syncOwner || ADMIN_ADDRESS,
        active: true,
        boostCount: 0,
        baseWeight: 100,
        currentWeight: 100,
      });
      setSyncTokenId('');
      setSyncOwner('');
      await loadDashboardData();
      setStatusMessage(`Synced Desk #${syncTokenId} to active database.`);
    } catch (err) {
      setErrorMessage('Failed to sync desk.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Export Desks to CSV
  const handleExportCsv = () => {
    sound?.playClick?.();
    if (allDesks.length === 0) return;
    const headers = 'Token ID,Owner,Active,Boost Count,Base Weight,Current Weight,Created At,Updated At\n';
    const rows = allDesks
      .map(
        (d) =>
          `${d.token_id},"${d.owner}",${d.active},${d.boost_count},${d.base_weight},${d.current_weight},"${d.created_at}","${d.updated_at}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `apebroker_desks_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Desks
  const filteredDesks = useMemo(() => {
    return allDesks.filter((d) => {
      const matchesSearch =
        !deskSearch ||
        d.token_id.toString().includes(deskSearch.trim()) ||
        (d.owner || '').toLowerCase().includes(deskSearch.toLowerCase().trim());

      if (!matchesSearch) return false;

      if (deskFilter === 'active') return Boolean(d.active);
      if (deskFilter === 'max_boost') return (d.boost_count || 0) >= 5;
      return true;
    });
  }, [allDesks, deskSearch, deskFilter]);

  // Paginated Desks
  const paginatedDesks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDesks.slice(start, start + itemsPerPage);
  }, [filteredDesks, currentPage]);

  const totalPages = Math.ceil(filteredDesks.length / itemsPerPage) || 1;

  // Aggregate Calculations
  const activeDesksCount = allDesks.filter((d) => d.active).length;
  const totalDbWeight = allDesks
    .filter((d) => d.active)
    .reduce((sum, d) => sum + (d.current_weight || 100), 0);
  const totalDbBoosts = allDesks.reduce((sum, d) => sum + (d.boost_count || 0), 0);

  // Total distributed from DB records + on-chain
  const totalEthDistributedDb = rewardDeposits.reduce(
    (sum, d) => sum + parseFloat(d.amount_eth || 0),
    0
  );
  const onChainDepositedEth = parseFloat(formatEther(globalStats.totalEthDeposited || 0n));
  const effectiveTotalDistributed = Math.max(totalEthDistributedDb, onChainDepositedEth);

  return (
    <div className="space-y-6 select-none font-pixel text-white">
      {/* Executive Header Banner */}
      <section className="bg-[#12072e] border-3 border-[#FFD700] rounded-xl p-5 shadow-[6px_6px_0px_#000] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFD700] animate-pulse shadow-[0_0_8px_#FFD700]" />
              <span className="text-[10px] text-[#FFD700] font-bold tracking-widest uppercase">
                EXECUTIVE PROTOCOL CONSOLE
              </span>
              <span className="text-[9px] bg-[#271452] px-2 py-0.5 rounded text-gray-300 font-mono">
                ADMIN AUTHORIZED
              </span>
            </div>
            <h1 className="text-base sm:text-xl font-extrabold text-white tracking-tight">
              APE BROKER DESK — ADMIN CONTROLLER
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] font-mono text-gray-400">
              <div>
                Admin: <span className="text-[#00FF66] font-bold">{ADMIN_ADDRESS.slice(0, 6)}...{ADMIN_ADDRESS.slice(-4)}</span>
              </div>
              <div>•</div>
              <div>
                Treasury: <span className="text-[#FFD700] font-bold">{TREASURY_ADDRESS.slice(0, 6)}...{TREASURY_ADDRESS.slice(-4)}</span>
              </div>
              <div>•</div>
              <div>
                Robinhood EVM Contract: <span className="text-[#00F0FF]">{DESK_CONTRACT_ADDRESS.slice(0, 6)}...{DESK_CONTRACT_ADDRESS.slice(-4)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                sound?.playClick?.();
                loadDashboardData();
                if (refetchGlobalStats) refetchGlobalStats();
              }}
              disabled={isLoadingData}
              className="pixel-btn pixel-btn-black px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-bold text-gray-300 hover:text-white border-2 border-purple-800 rounded-lg shadow-[2px_2px_0px_#000]"
            >
              {isLoadingData ? '[ REFRESHING... ]' : '[ ↻ REFRESH DATA ]'}
            </button>

            <button
              type="button"
              onClick={() => {
                sound?.playClick?.();
                onBackToTerminal();
              }}
              className="pixel-btn pixel-btn-vibrant-lime px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-extrabold rounded-lg shadow-[2px_2px_0px_#000]"
            >
              [ ← USER DESKS ]
            </button>
          </div>
        </div>

        {/* Alert Notifications */}
        {statusMessage && (
          <div className="mt-4 bg-[#052b16] border-2 border-[#00FF66] p-3 rounded-lg text-xs font-mono text-[#00FF66] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>✓</span>
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-gray-400 hover:text-white text-[10px]">
              [ CLOSE ]
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 bg-red-950/80 border-2 border-[#FF2247] p-3 rounded-lg text-xs font-mono text-[#FF2247] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>⚠</span>
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-gray-400 hover:text-white text-[10px]">
              [ CLOSE ]
            </button>
          </div>
        )}
      </section>

      {/* Admin Navigation Tabs */}
      <nav className="flex flex-wrap gap-2 border-b-2 border-purple-900/60 pb-3">
        {[
          { id: 'overview', label: '📊 PROTOCOL STATISTICS' },
          { id: 'desks', label: `🏢 ALL ACTIVE DESKS (${activeDesksCount})` },
          { id: 'distributions', label: `🪙 ETH DISTRIBUTIONS (${rewardDeposits.length})` },
          { id: 'logs', label: '⚡ AUDIT LOGS' },
          { id: 'actions', label: '⚙️ PROTOCOL ACTIONS & CONFIG' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              sound?.playClick?.();
              setActiveTab(tab.id);
            }}
            className={`pixel-btn px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-bold rounded-lg border-2 shadow-[2px_2px_0px_#000] transition-colors ${
              activeTab === tab.id
                ? 'bg-[#FFD700] text-black border-[#FFD700] font-extrabold'
                : 'bg-[#12082b] text-gray-300 border-purple-800 hover:text-white hover:border-purple-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* TAB 1: PROTOCOL OVERVIEW & STATISTICS */}
      {activeTab === 'overview' && (
        <section className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-[#140833] border-2 border-[#FFD700] p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400">TOTAL ETH DISTRIBUTED</div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#FFD700] mt-1 drop-shadow-[0_0_8px_rgba(255,215,0,0.3)]">
                {effectiveTotalDistributed.toFixed(4)} ETH
              </div>
              <div className="text-[9px] text-[#00FF66] mt-1 font-mono">
                {rewardDeposits.length} Deposit Epochs Funded
              </div>
            </div>

            <div className="bg-[#140833] border-2 border-[#00F0FF] p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400">TOTAL ETH CLAIMED</div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#00F0FF] mt-1 drop-shadow-[0_0_8px_rgba(0,240,255,0.3)]">
                {Number(formatEther(globalStats.totalEthClaimed || 0n)).toFixed(4)} ETH
              </div>
              <div className="text-[9px] text-gray-400 mt-1 font-mono">
                {rewardClaims.length} User Claims Executed
              </div>
            </div>

            <div className="bg-[#140833] border-2 border-[#00FF66] p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400">CURRENT REWARD POOL</div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#00FF66] mt-1 drop-shadow-[0_0_8px_rgba(0,255,102,0.3)]">
                {Number(formatEther(globalStats.rewardPoolBalance || 0n)).toFixed(4)} ETH
              </div>
              <div className="text-[9px] text-gray-400 mt-1 font-mono">Ready for 5-Hour Claims</div>
            </div>

            <div className="bg-[#140833] border-2 border-[#A855F7] p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400">COLLECTED PROTOCOL FEES</div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#A855F7] mt-1 drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                {Number(formatEther(globalStats.protocolFeeBalance || 0n)).toLocaleString()}
              </div>
              <div className="text-[9px] text-purple-400 mt-1 font-mono">$APEBROKE to Treasury</div>
            </div>

            <div className="bg-[#140833] border border-purple-800 p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400">TOTAL ACTIVE DESKS</div>
              <div className="text-lg sm:text-2xl font-extrabold text-white mt-1">
                {activeDesksCount} <span className="text-xs text-gray-400">/ 5,555</span>
              </div>
              <div className="text-[9px] text-[#00FF66] mt-1 font-mono">1 NFT = 1 Desk System</div>
            </div>

            <div className="bg-[#140833] border border-purple-800 p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400">TOTAL ELIGIBLE WEIGHT</div>
              <div className="text-lg sm:text-2xl font-extrabold text-white mt-1">
                {(Number(globalStats.totalEligibleWeight || 0n) || totalDbWeight).toLocaleString()} WGT
              </div>
              <div className="text-[9px] text-gray-400 mt-1 font-mono">Active Proportional Share</div>
            </div>

            <div className="bg-[#140833] border border-purple-800 p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400">TOTAL BOOST FEES</div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#FF80BE] mt-1">
                {Number(formatEther(globalStats.totalBoostFeesCollected || 0n)).toLocaleString()}
              </div>
              <div className="text-[9px] text-pink-400 mt-1 font-mono">{totalDbBoosts} Boosts Applied</div>
            </div>

            <div className="bg-[#140833] border border-purple-800 p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400">CURRENT PROTOCOL EPOCH</div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#00F0FF] mt-1">
                EPOCH #{globalStats.currentEpoch.toString()}
              </div>
              <div className="text-[9px] text-cyan-400 mt-1 font-mono">5-Hour Interval Schedule</div>
            </div>
          </div>

          {/* Quick Distribution & Actions Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#10072b] border-2 border-[#FFD700] rounded-xl p-5 shadow-[4px_4px_0px_#000] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-extrabold text-[#FFD700]">
                  QUICK DISTRIBUTE NATIVE ETH
                </h3>
                <span className="text-[9px] text-gray-400 font-mono">Epoch #{globalStats.currentEpoch.toString()}</span>
              </div>
              <p className="text-[11px] font-mono text-gray-400">
                Fund the 5-hour reward pool with native ETH. Active desks automatically share this pool proportionally based on Desk Weight.
              </p>
              <form onSubmit={handleDepositEth} className="space-y-3 pt-1 font-mono">
                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="0.05"
                    value={ethDepositInput}
                    onChange={(e) => setEthDepositInput(e.target.value)}
                    className="w-full bg-black/70 border-2 border-purple-800 focus:border-[#FFD700] px-3.5 py-2.5 text-sm text-white rounded-lg outline-none"
                  />
                  <span className="absolute right-3.5 top-3 text-xs text-[#FFD700] font-bold">ETH</span>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !ethDepositInput}
                  className="w-full min-h-[44px] pixel-btn pixel-btn-vibrant-gold py-2.5 text-xs font-extrabold rounded-lg shadow-[3px_3px_0px_#000] disabled:opacity-40"
                >
                  {isSubmitting ? '[ DISTRIBUTING... ]' : '[ + DEPOSIT ETH REWARD POOL ]'}
                </button>
              </form>
            </div>

            <div className="bg-[#10072b] border-2 border-[#A855F7] rounded-xl p-5 shadow-[4px_4px_0px_#000] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-extrabold text-[#A855F7]">
                  CLAIM $APEBROKE PROTOCOL FEES
                </h3>
                <span className="text-[9px] text-[#00FF66] font-mono">To Treasury</span>
              </div>
              <p className="text-[11px] font-mono text-gray-400">
                Claim collected activation & boost protocol fees to treasury (<span className="text-white">{TREASURY_ADDRESS.slice(0, 6)}...{TREASURY_ADDRESS.slice(-4)}</span>). Then swap externally to ETH to fund subsequent reward pools.
              </p>
              <div className="flex items-center justify-between text-xs font-mono bg-black/40 p-2.5 rounded border border-purple-900/50">
                <span className="text-gray-400">Unclaimed Fee Balance:</span>
                <span className="text-[#FFD700] font-bold">{Number(formatEther(globalStats.protocolFeeBalance || 0n)).toLocaleString()} $APE</span>
              </div>
              <button
                type="button"
                onClick={handleClaimFees}
                disabled={isSubmitting || (globalStats.protocolFeeBalance || 0n) === 0n}
                className="w-full min-h-[44px] pixel-btn pixel-btn-black py-2.5 text-xs font-bold text-[#A855F7] hover:text-white border-2 border-purple-700 hover:bg-purple-950/50 rounded-lg shadow-[3px_3px_0px_#000] disabled:opacity-40"
              >
                {isSubmitting ? '[ CLAIMING TO TREASURY... ]' : '[ CLAIM ALL $APEBROKE TO TREASURY ]'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: ALL ACTIVE DESK DATA */}
      {activeTab === 'desks' && (
        <section className="bg-[#0f0729]/95 border-2 border-purple-800 rounded-xl p-5 shadow-[6px_6px_0px_#000] space-y-4 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-900/60 font-mono">
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                placeholder="Search Token ID (#) or Owner Address (0x...)"
                value={deskSearch}
                onChange={(e) => {
                  setDeskSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 bg-black/70 border-2 border-purple-800 focus:border-[#00FF66] px-3.5 py-2 text-xs text-white rounded-lg outline-none"
              />

              <div className="flex items-center gap-1.5">
                {[
                  { id: 'all', label: `ALL (${allDesks.length})` },
                  { id: 'active', label: `ACTIVE (${activeDesksCount})` },
                  { id: 'max_boost', label: '5/5 MAX BOOSTED' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      sound?.playClick?.();
                      setDeskFilter(f.id);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1.5 text-[10px] rounded font-bold border ${
                      deskFilter === f.id
                        ? 'bg-[#00FF66] text-black border-[#00FF66]'
                        : 'bg-black/50 text-gray-400 border-purple-900 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={allDesks.length === 0}
              className="pixel-btn pixel-btn-black px-3.5 py-2 text-[10px] font-bold text-[#00F0FF] hover:text-white border border-cyan-800 rounded shadow-[2px_2px_0px_#000] whitespace-nowrap"
            >
              [ ⤓ EXPORT CSV ]
            </button>
          </div>

          {filteredDesks.length === 0 ? (
            <div className="p-8 text-center space-y-3 bg-[#130832]/60 rounded-lg border border-purple-900/40">
              <div className="text-gray-400 text-xs">
                {allDesks.length === 0
                  ? 'No desks indexed in database yet. Desks will be automatically indexed as users connect and activate.'
                  : 'No desks match the current search or filter criteria.'}
              </div>

              <div className="pt-3 max-w-md mx-auto">
                <form onSubmit={handleManualSync} className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Token ID (#1-5555)"
                    value={syncTokenId}
                    onChange={(e) => setSyncTokenId(e.target.value)}
                    className="w-32 bg-black/80 border border-purple-800 px-3 py-1.5 text-xs text-white rounded outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Owner (Optional 0x...)"
                    value={syncOwner}
                    onChange={(e) => setSyncOwner(e.target.value)}
                    className="flex-1 bg-black/80 border border-purple-800 px-3 py-1.5 text-xs text-white rounded outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSyncing || !syncTokenId}
                    className="pixel-btn pixel-btn-vibrant-cyan px-3 py-1.5 text-[10px] font-bold rounded"
                  >
                    [ SYNC ]
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-purple-900/60 bg-[#160838] text-gray-400 text-[10px] uppercase">
                    <th className="py-2.5 px-3">Token</th>
                    <th className="py-2.5 px-3">Owner</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Boost Level</th>
                    <th className="py-2.5 px-3">Desk Weight</th>
                    <th className="py-2.5 px-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-900/30">
                  {paginatedDesks.map((d) => {
                    const boosts = d.boost_count || 0;
                    return (
                      <tr key={d.token_id} className="hover:bg-purple-950/30 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                          <img
                            src={`/gifs/${(d.token_id % 100) + 1}.gif`}
                            alt={`#${d.token_id}`}
                            className="w-7 h-7 rounded border border-purple-700 object-cover bg-black"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <span>Ape Broker #{d.token_id}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-300">
                          <span title={d.owner}>
                            {d.owner ? `${d.owner.slice(0, 6)}...${d.owner.slice(-4)}` : 'Unknown'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {d.active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-[#052b16] text-[#00FF66] border border-[#00FF66]/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
                              ACTIVE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-gray-900 text-gray-500 border border-gray-800">
                              INACTIVE
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              boosts >= 5
                                ? 'bg-pink-950/60 text-[#FF007F] border border-[#FF007F]'
                                : boosts > 0
                                ? 'bg-cyan-950/60 text-[#00F0FF] border border-[#00F0FF]'
                                : 'text-gray-400'
                            }`}
                          >
                            {boosts} / 5 BOOSTS
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-white">
                          <span className="text-[#00FF66]">{d.current_weight || 100}</span> WGT
                        </td>
                        <td className="py-2.5 px-3 text-[10px] text-gray-500">
                          {d.updated_at ? new Date(d.updated_at).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-purple-900/50 text-xs">
                  <span className="text-gray-400">
                    Showing {(currentPage - 1) * itemsPerPage + 1} -{' '}
                    {Math.min(currentPage * itemsPerPage, filteredDesks.length)} of {filteredDesks.length} desks
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 bg-black/60 border border-purple-800 text-gray-300 disabled:opacity-30 rounded"
                    >
                      ← PREV
                    </button>
                    <span className="text-[#00FF66] font-bold">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1 bg-black/60 border border-purple-800 text-gray-300 disabled:opacity-30 rounded"
                    >
                      NEXT →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: ETH DISTRIBUTIONS */}
      {activeTab === 'distributions' && (
        <section className="bg-[#0f0729]/95 border-2 border-purple-800 rounded-xl p-5 shadow-[6px_6px_0px_#000] space-y-5 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-900/60">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#FFD700]">
                REWARD DISTRIBUTIONS AUDIT LOG
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Record of all native ETH deposits distributed into the Ape Broker Desk 5-hour reward pool.
              </p>
            </div>
            <div className="bg-[#190938] px-4 py-2 rounded-lg border border-purple-700 text-right">
              <div className="text-[9px] text-gray-400">TOTAL ETH DISTRIBUTED</div>
              <div className="text-base sm:text-lg font-extrabold text-[#FFD700]">
                {effectiveTotalDistributed.toFixed(4)} ETH
              </div>
            </div>
          </div>

          <form onSubmit={handleDepositEth} className="bg-[#150938]/80 p-4 rounded-xl border border-purple-800 space-y-3">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00FF66]" />
              <span>EXECUTE NEW ETH DISTRIBUTION (REWARD POOL DEPOSIT)</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full relative">
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  placeholder="Amount in ETH (e.g. 0.05)"
                  value={ethDepositInput}
                  onChange={(e) => setEthDepositInput(e.target.value)}
                  className="w-full bg-black/80 border-2 border-purple-800 focus:border-[#FFD700] px-3.5 py-2.5 text-xs text-white rounded-lg outline-none"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-[#FFD700] font-bold">ETH</span>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !ethDepositInput}
                className="w-full sm:w-auto pixel-btn pixel-btn-vibrant-gold px-6 py-2.5 text-xs font-extrabold rounded-lg shadow-[3px_3px_0px_#000] disabled:opacity-40 whitespace-nowrap"
              >
                {isSubmitting ? '[ DISTRIBUTING... ]' : '[ DISTRIBUTE ETH TO POOL ]'}
              </button>
            </div>
          </form>

          {/* Dynamic Drip Status & Manual Trigger */}
          <div className="bg-[#10072b] p-4 rounded-xl border-2 border-[#00F0FF]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-[3px_3px_0px_#000]">
            <div>
              <div className="font-extrabold text-[#00F0FF] flex items-center gap-2">
                <span>⚡ SAFE & FAIR DYNAMIC 3-FACTOR DRIP ENGINE</span>
                <span className="px-2 py-0.5 bg-[#00F0FF]/20 border border-[#00F0FF] text-[9px] rounded text-[#00F0FF] font-bold">
                  {(Number(globalStats.epochEmissionBps || 500) / 100).toFixed(1)}% / 5h
                </span>
              </div>
              <div className="text-[10px] text-gray-300 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span>Benchmark Floor: <strong className="text-white">{Number(globalStats.benchmarkWeightFloor || 2000)} WGT</strong></span>
                <span>Active Weight: <strong className="text-[#00FF66]">{Number(globalStats.totalEligibleWeight || 0)} WGT</strong></span>
                <span>Available Pool: <strong className="text-[#FFD700]">{Number(formatEther(globalStats.availableRewardPool || globalStats.rewardPoolBalance || 0n)).toFixed(4)} ETH</strong></span>
              </div>
            </div>
            <button
              type="button"
              disabled={isDistributingEpoch}
              onClick={handleTriggerEpochDistribution}
              className="pixel-btn pixel-btn-vibrant-cyan px-4 py-2.5 text-xs font-extrabold rounded-lg shadow-[2px_2px_0px_#000] disabled:opacity-40 whitespace-nowrap"
            >
              {isDistributingEpoch ? '[ SETTLING EPOCH... ]' : '[ ⚡ TRIGGER EPOCH DISTRIBUTION ]'}
            </button>
          </div>

          {rewardDeposits.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs bg-[#130832]/60 rounded-lg border border-purple-900/40">
              No ETH distribution events recorded yet. When the admin deposits native ETH into the reward pool, each deposit is permanently logged here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-purple-900/60 bg-[#160838] text-gray-400 text-[10px] uppercase">
                    <th className="py-2.5 px-3">Epoch #</th>
                    <th className="py-2.5 px-3">Amount Distributed</th>
                    <th className="py-2.5 px-3">Depositor</th>
                    <th className="py-2.5 px-3">Tx Hash</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-900/30">
                  {rewardDeposits.map((dep) => (
                    <tr key={dep.id} className="hover:bg-purple-950/30 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[#00F0FF]">
                        Epoch #{dep.epoch}
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-[#FFD700] text-sm">
                        {dep.amount_eth} ETH
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-300">
                        {dep.depositor ? `${dep.depositor.slice(0, 6)}...${dep.depositor.slice(-4)}` : 'Admin'}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {dep.tx_hash ? (
                          <a
                            href={`https://explorer.robinhood.com/tx/${dep.tx_hash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#00FF66] hover:underline"
                          >
                            {dep.tx_hash.slice(0, 8)}...{dep.tx_hash.slice(-6)} ↗
                          </a>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[10px] text-gray-400">
                        {new Date(dep.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <section className="bg-[#0f0729]/95 border-2 border-purple-800 rounded-xl p-5 shadow-[6px_6px_0px_#000] space-y-4 font-mono">
          <div className="flex items-center gap-2 border-b border-purple-900/60 pb-3">
            {[
              { id: 'claims', label: `USER REWARD CLAIMS (${rewardClaims.length})` },
              { id: 'boosts', label: `DESK BOOSTS (${deskBoosts.length})` },
              { id: 'fees', label: `TREASURY FEE CLAIMS (${feeClaims.length})` },
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  setLogsSubTab(sub.id);
                }}
                className={`px-3 py-1.5 text-[10px] font-bold rounded border ${
                  logsSubTab === sub.id
                    ? 'bg-[#00FF66] text-black border-[#00FF66]'
                    : 'bg-black/60 text-gray-400 border-purple-900 hover:text-white'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {logsSubTab === 'claims' && (
            <div className="overflow-x-auto">
              {rewardClaims.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs">No reward claims logged yet.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-purple-900/60 text-gray-400 text-[10px] uppercase">
                      <th className="py-2 px-3">Token ID</th>
                      <th className="py-2 px-3">Claimer</th>
                      <th className="py-2 px-3">Amount ETH</th>
                      <th className="py-2 px-3">Claim Type</th>
                      <th className="py-2 px-3">Tx Hash</th>
                      <th className="py-2 px-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/30">
                    {rewardClaims.map((c) => (
                      <tr key={c.id} className="hover:bg-purple-950/30">
                        <td className="py-2 px-3 font-bold text-white">#{c.token_id || 'Batch'}</td>
                        <td className="py-2 px-3 text-gray-300">{c.claimer.slice(0, 6)}...{c.claimer.slice(-4)}</td>
                        <td className="py-2 px-3 font-bold text-[#00F0FF]">{c.amount_eth} ETH</td>
                        <td className="py-2 px-3 uppercase text-[9px] text-gray-400">{c.claim_type}</td>
                        <td className="py-2 px-3 text-[#00FF66]">
                          {c.tx_hash ? `${c.tx_hash.slice(0, 6)}...` : '-'}
                        </td>
                        <td className="py-2 px-3 text-[10px] text-gray-500">{new Date(c.created_at).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {logsSubTab === 'boosts' && (
            <div className="overflow-x-auto">
              {deskBoosts.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs">No desk boosts logged yet.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-purple-900/60 text-gray-400 text-[10px] uppercase">
                      <th className="py-2 px-3">Token ID</th>
                      <th className="py-2 px-3">Owner</th>
                      <th className="py-2 px-3">Boost #</th>
                      <th className="py-2 px-3">Weight (Before ➔ After)</th>
                      <th className="py-2 px-3">Cost ($APE)</th>
                      <th className="py-2 px-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/30">
                    {deskBoosts.map((b) => (
                      <tr key={b.id} className="hover:bg-purple-950/30">
                        <td className="py-2 px-3 font-bold text-white">#{b.token_id}</td>
                        <td className="py-2 px-3 text-gray-300">{b.owner.slice(0, 6)}...{b.owner.slice(-4)}</td>
                        <td className="py-2 px-3 font-bold text-[#FF80BE]">Boost #{b.boost_number}</td>
                        <td className="py-2 px-3 text-white">{b.weight_before} ➔ <span className="text-[#00FF66] font-bold">{b.weight_after} WGT</span></td>
                        <td className="py-2 px-3 text-[#FFD700] font-mono">{b.cost ? Number(formatEther(BigInt(b.cost))).toLocaleString() : '-'}</td>
                        <td className="py-2 px-3 text-[10px] text-gray-500">{new Date(b.created_at).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {logsSubTab === 'fees' && (
            <div className="overflow-x-auto">
              {feeClaims.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs">No protocol fee claims logged yet.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-purple-900/60 text-gray-400 text-[10px] uppercase">
                      <th className="py-2 px-3">Treasury Recipient</th>
                      <th className="py-2 px-3">Amount $APEBROKE</th>
                      <th className="py-2 px-3">Tx Hash</th>
                      <th className="py-2 px-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/30">
                    {feeClaims.map((f) => (
                      <tr key={f.id} className="hover:bg-purple-950/30">
                        <td className="py-2 px-3 text-white font-mono">{f.treasury}</td>
                        <td className="py-2 px-3 font-extrabold text-[#FFD700]">{f.amount_apebroke}</td>
                        <td className="py-2 px-3 text-[#00FF66]">{f.tx_hash ? `${f.tx_hash.slice(0, 8)}...` : '-'}</td>
                        <td className="py-2 px-3 text-[10px] text-gray-500">{new Date(f.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
      )}

      {/* TAB 5: PROTOCOL ACTIONS & CONFIG */}
      {activeTab === 'actions' && (
        <section className="space-y-6 font-mono">
          <div className="bg-[#0f0729]/95 border-2 border-purple-800 rounded-xl p-5 shadow-[4px_4px_0px_#000] space-y-3">
            <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
              PROTOCOL ARCHITECTURE & CONTRACT ADDRESSES
            </h3>
            <div className="divide-y divide-purple-900/40 text-xs">
              <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-gray-400">Desk System Contract:</span>
                <span className="text-[#00F0FF] break-all select-all">{DESK_CONTRACT_ADDRESS}</span>
              </div>
              <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-gray-400">$APEBROKE Token Contract:</span>
                <span className="text-[#00FF66] break-all select-all">{APEBROKE_TOKEN_ADDRESS}</span>
              </div>
              <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-gray-400">Ape Broker NFT Contract:</span>
                <span className="text-[#FF80BE] break-all select-all">{APE_BROKER_NFT_ADDRESS}</span>
              </div>
              <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-gray-400">Authorized Admin Address:</span>
                <span className="text-[#FFD700] font-bold break-all select-all">{ADMIN_ADDRESS}</span>
              </div>
              <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-gray-400">Protocol Treasury Address:</span>
                <span className="text-[#FFD700] font-bold break-all select-all">{TREASURY_ADDRESS}</span>
              </div>
              <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-gray-400">Blockchain Network:</span>
                <span className="text-white font-bold">Robinhood EVM (Chain ID 4663 / 0x1237)</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0f0729]/95 border-2 border-purple-800 rounded-xl p-5 shadow-[4px_4px_0px_#000] space-y-3">
            <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
              PROTOCOL OPERATING PARAMETERS
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="bg-black/50 p-3 rounded-lg border border-purple-900/50">
                <span className="text-gray-400 text-[10px]">Activation Fee:</span>
                <div className="text-sm font-bold text-[#00FF66] mt-0.5">349,693 $APEBROKE</div>
              </div>
              <div className="bg-black/50 p-3 rounded-lg border border-purple-900/50">
                <span className="text-gray-400 text-[10px]">Base Desk Weight:</span>
                <div className="text-sm font-bold text-white mt-0.5">100 WGT</div>
              </div>
              <div className="bg-black/50 p-3 rounded-lg border border-purple-900/50">
                <span className="text-gray-400 text-[10px]">Max Desks Per Wallet:</span>
                <div className="text-sm font-bold text-white mt-0.5">5 Desks Max</div>
              </div>
              <div className="bg-black/50 p-3 rounded-lg border border-purple-900/50">
                <span className="text-gray-400 text-[10px]">Max Boosts Per Desk:</span>
                <div className="text-sm font-bold text-white mt-0.5">5 Boosts (up to 1,000 WGT)</div>
              </div>
              <div className="bg-black/50 p-3 rounded-lg border border-purple-900/50">
                <span className="text-gray-400 text-[10px]">Boost Schedule:</span>
                <div className="text-sm font-bold text-[#00F0FF] mt-0.5">Linear 2x ➔ 10x Max</div>
              </div>
              <div className="bg-black/50 p-3 rounded-lg border border-purple-900/50">
                <span className="text-gray-400 text-[10px]">Reward Epoch Duration:</span>
                <div className="text-sm font-bold text-[#FFD700] mt-0.5">5 Hours (18,000s)</div>
              </div>
              <div className="bg-black/50 p-3 rounded-lg border border-purple-900/50">
                <span className="text-gray-400 text-[10px]">Safe Epoch Emission:</span>
                <div className="text-sm font-bold text-[#00FF66] mt-0.5">
                  {((Number(globalStats?.epochEmissionBps || 500)) / 100).toFixed(2)}% / Epoch ({Number(globalStats?.epochEmissionBps || 500)} bps)
                </div>
              </div>
              <div className="bg-black/50 p-3 rounded-lg border border-purple-900/50">
                <span className="text-gray-400 text-[10px]">Benchmark Weight Floor:</span>
                <div className="text-sm font-bold text-[#00F0FF] mt-0.5">
                  {Number(globalStats?.benchmarkWeightFloor || 2000).toLocaleString()} WGT (20 base desks)
                </div>
              </div>
              <div className="bg-black/50 p-3 rounded-lg border border-purple-900/50">
                <span className="text-gray-400 text-[10px]">Available Drip Pool:</span>
                <div className="text-sm font-bold text-[#FFD700] mt-0.5">
                  {formatEther(globalStats?.availableRewardPool !== undefined ? globalStats.availableRewardPool : (globalStats?.rewardPoolBalance || 0n))} ETH
                </div>
              </div>
            </div>
          </div>

          {/* DYNAMIC REWARD CONFIGURATION & SETTLEMENT */}
          <div className="bg-[#0f0729]/95 border-2 border-purple-800 rounded-xl p-5 shadow-[4px_4px_0px_#000] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-900/60 pb-3">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-[#00F0FF] uppercase tracking-wider">
                  3-FACTOR DYNAMIC DISTRIBUTION CONTROLS
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Controls safe emission drip and benchmark weight floor. Ensures pool is never wiped out in low-participation epochs.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTriggerEpochDistribution}
                disabled={isDistributingEpoch}
                className="pixel-btn pixel-btn-vibrant-cyan px-4 py-2 text-xs font-bold whitespace-nowrap self-start sm:self-auto disabled:opacity-40"
              >
                {isDistributingEpoch ? '[ SETTLING... ]' : '[ ⚡ MANUAL SETTLE EPOCH ]'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Update Emission Rate Form */}
              <form onSubmit={handleUpdateEmission} className="bg-black/50 border border-purple-900/60 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-300 font-bold">Epoch Emission Rate (%):</span>
                  <span className="text-[#00FF66]">Current: {((Number(globalStats?.epochEmissionBps || 500)) / 100).toFixed(2)}%</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="20.0"
                    placeholder="e.g. 5.00"
                    value={emissionInput}
                    onChange={(e) => setEmissionInput(e.target.value)}
                    className="flex-1 bg-black/80 border border-purple-700/80 rounded px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00FF66]"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !emissionInput}
                    className="pixel-btn pixel-btn-vibrant-green px-3 py-2 text-xs font-bold whitespace-nowrap disabled:opacity-40"
                  >
                    [ SET % ]
                  </button>
                </div>
                <p className="text-[10px] text-gray-400">Range: 0.10% (10 bps) to 20.00% (2000 bps) per 5h epoch.</p>
              </form>

              {/* Update Benchmark Weight Floor Form */}
              <form onSubmit={handleUpdateBenchmark} className="bg-black/50 border border-purple-900/60 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-300 font-bold">Benchmark Weight Floor:</span>
                  <span className="text-[#00F0FF]">Current: {Number(globalStats?.benchmarkWeightFloor || 2000).toLocaleString()} WGT</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="100"
                    min="100"
                    placeholder="e.g. 2000"
                    value={benchmarkInput}
                    onChange={(e) => setBenchmarkInput(e.target.value)}
                    className="flex-1 bg-black/80 border border-purple-700/80 rounded px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00F0FF]"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !benchmarkInput}
                    className="pixel-btn pixel-btn-vibrant-cyan px-3 py-2 text-xs font-bold whitespace-nowrap disabled:opacity-40"
                  >
                    [ SET FLOOR ]
                  </button>
                </div>
                <p className="text-[10px] text-gray-400">Prevents few active desks from draining the pool (e.g. 2,000 WGT = 20 base desks).</p>
              </form>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
