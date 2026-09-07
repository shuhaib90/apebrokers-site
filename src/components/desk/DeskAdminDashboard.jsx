import React, { useState, useEffect, useMemo } from 'react';
import { formatEther, parseEther } from 'viem';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { usePublicClient } from 'wagmi';
import deskDeployConfig from '../../config/apeBrokerDesk.json';
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
import { useApeBrokerStaking, STAKING_CONTRACT_ADDRESS } from '../../hooks/useApeBrokerStaking';
import { formatEthOrUsdt } from '../../hooks/useEthPrice';
import { fetchLiveTokenPrice, DEFAULT_TOKEN_PRICE } from '../../utils/holderVerification';

export function DeskAdminDashboard({
  globalStats,
  onClaimFees,
  onDepositRewards,
  onDistributeEpochRewards,
  onDistributeImmediateRewards,
  onSetEpochEmissionBps,
  onSetBenchmarkWeightFloor,
  onSetBaseBoostCost,
  onSetActivationFee,
  onBackToTerminal,
  refetchGlobalStats,
  isUsdt = false,
  setIsUsdt,
  ethPrice = 2495,
}) {
  const publicClient = usePublicClient();

  const handleToggleCurrency = () => {
    sound?.playClick?.();
    if (setIsUsdt) {
      const next = !isUsdt;
      setIsUsdt(next);
      try {
        localStorage.setItem('apebroker_currency_mode', next ? 'USDT' : 'ETH');
      } catch (e) {}
    }
  };
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'desks' | 'distributions' | 'logs' | 'actions'
  const [ethDepositInput, setEthDepositInput] = useState('');
  const [feeClaimInput, setFeeClaimInput] = useState('');
  const [emissionInput, setEmissionInput] = useState('');
  const [benchmarkInput, setBenchmarkInput] = useState('');
  const [immediateEthInput, setImmediateEthInput] = useState('');
  const [boostCostInput, setBoostCostInput] = useState('');
  const [activationFeeInput, setActivationFeeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDistributingEpoch, setIsDistributingEpoch] = useState(false);
  const [isDistributingImmediate, setIsDistributingImmediate] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // $APEBROKE token price (from DexScreener or default fallback)
  const [tokenPrice, setTokenPrice] = useState(DEFAULT_TOKEN_PRICE || 0.00000355);

  useEffect(() => {
    fetchLiveTokenPrice()
      .then((p) => {
        if (p && p > 0) setTokenPrice(p);
      })
      .catch(() => {});
  }, []);

  // Staking Protocol Admin Hook & State
  const {
    globalStats: stakingStats,
    refetchGlobalStats: refetchStakingStats,
    adminDepositRewards: stakingDepositRewards,
    adminSetRewardRateBps: stakingSetRewardRateBps,
    adminTogglePause: stakingTogglePause,
  } = useApeBrokerStaking();

  const [stakingEthDepositInput, setStakingEthDepositInput] = useState('');
  const [stakingBpsInput, setStakingBpsInput] = useState('');
  const [isStakingAdminSubmitting, setIsStakingAdminSubmitting] = useState(false);

  const handleStakingDepositEth = async (e) => {
    e?.preventDefault?.();
    sound?.playClick?.();
    const amount = parseFloat(stakingEthDepositInput);
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Please enter a valid ETH deposit amount.');
      return;
    }
    setIsStakingAdminSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await stakingDepositRewards(stakingEthDepositInput.trim());
      sound?.playSuccess?.();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setStatusMessage(`Successfully deposited ${stakingEthDepositInput} ETH into Staking Reward Pool!`);
      setStakingEthDepositInput('');
      await refetchStakingStats();
    } catch (err) {
      console.error('Staking deposit error:', err);
      sound?.playError?.();
      setErrorMessage(err?.shortMessage || err?.message || 'Failed to deposit ETH into staking pool.');
    } finally {
      setIsStakingAdminSubmitting(false);
    }
  };

  const handleStakingSetBps = async (bpsVal) => {
    sound?.playClick?.();
    const bps = parseInt(bpsVal ?? stakingBpsInput, 10);
    if (isNaN(bps) || bps < 100 || bps > 5000) {
      setErrorMessage('Staking dynamic rate must be between 100 (1%) and 5,000 (50%) BPS.');
      return;
    }
    setIsStakingAdminSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await stakingSetRewardRateBps(bps);
      sound?.playSuccess?.();
      setStatusMessage(`Staking reward rate updated to ${bps} BPS (${(bps / 100).toFixed(2)}% / period)!`);
      setStakingBpsInput('');
      await refetchStakingStats();
    } catch (err) {
      console.error('Staking set BPS error:', err);
      sound?.playError?.();
      setErrorMessage(err?.shortMessage || err?.message || 'Failed to update staking reward rate.');
    } finally {
      setIsStakingAdminSubmitting(false);
    }
  };

  const handleStakingTogglePause = async () => {
    sound?.playClick?.();
    const willPause = !stakingStats.isPaused;
    setIsStakingAdminSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await stakingTogglePause(willPause);
      sound?.playSuccess?.();
      setStatusMessage(`Staking protocol successfully ${willPause ? 'PAUSED' : 'UNPAUSED / RESUMED'}!`);
      await refetchStakingStats();
    } catch (err) {
      console.error('Staking toggle pause error:', err);
      sound?.playError?.();
      setErrorMessage(err?.shortMessage || err?.message || 'Failed to change staking pause state.');
    } finally {
      setIsStakingAdminSubmitting(false);
    }
  };

  // Data states from Supabase
  const [allDesks, setAllDesks] = useState([]);
  const [rewardDeposits, setRewardDeposits] = useState([]);
  const [rewardClaims, setRewardClaims] = useState([]);
  const [deskBoosts, setDeskBoosts] = useState([]);
  const [feeClaims, setFeeClaims] = useState([]);
  const [onChainDeskData, setOnChainDeskData] = useState({});
  const [copiedOwner, setCopiedOwner] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Filter & Search states for Desks table
  const [deskSearch, setDeskSearch] = useState('');
  const [deskFilter, setDeskFilter] = useState('all'); // 'all' | 'active' | 'claimable' | 'max_boost'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Filter, Search, and Sort states for Wallets view
  const [walletSearch, setWalletSearch] = useState('');
  const [walletFilter, setWalletFilter] = useState('all'); // 'all' | 'claimed' | 'pending' | 'active'
  const [walletSort, setWalletSort] = useState('claimed'); // 'claimed' | 'pending' | 'weight' | 'desks'
  const [walletPage, setWalletPage] = useState(1);
  const [deskViewMode, setDeskViewMode] = useState('desks'); // 'desks' | 'wallets'

  // Logs sub-tab
  const [logsSubTab, setLogsSubTab] = useState('claims'); // 'claims' | 'boosts' | 'fees'

  // Manual desk sync
  const [syncTokenId, setSyncTokenId] = useState('');
  const [syncOwner, setSyncOwner] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Load all DB data and query on-chain desk pending balances
  const loadDashboardData = async () => {
    setIsLoadingData(true);
    try {
      const [desks, deposits, claims, boosts, fees] = await Promise.all([
        fetchAllDesksFromDb({ activeOnly: false }),
        fetchAllRewardDepositsFromDb(300),
        fetchAllRewardClaimsFromDb(1000),
        fetchAllDeskBoostsFromDb(300),
        fetchAllProtocolFeeClaimsFromDb(300),
      ]);

      // Query on-chain status & pending rewards for all known desks
      const tokenIdsToProbe = new Set(
        (desks || [])
          .map((d) => Number(d.token_id))
          .filter((id) => !isNaN(id) && id > 0)
      );

      const onChainMap = {};
      if (publicClient && tokenIdsToProbe.size > 0) {
        const probeList = Array.from(tokenIdsToProbe);
        // Query in chunks of 8 to respect RPC rate limits and prevent 429 errors
        const chunkSize = 8;
        for (let i = 0; i < probeList.length; i += chunkSize) {
          const chunk = probeList.slice(i, i + chunkSize);
          const chunkResults = await Promise.allSettled(
            chunk.map((tid) =>
              publicClient
                .readContract({
                  address: DESK_CONTRACT_ADDRESS,
                  abi: deskDeployConfig.abi,
                  functionName: 'getDesk',
                  args: [BigInt(tid)],
                })
                .catch(() => null)
            )
          );

          chunk.forEach((tid, idx) => {
            const res = chunkResults[idx];
            const dbDesk = (desks || []).find((d) => Number(d.token_id) === tid);
            const dbIsActive = Boolean(dbDesk?.active);

            let active = dbIsActive;
            let boostCount = BigInt(dbDesk?.boost_count || 0);
            let currentWeight = BigInt(dbDesk?.current_weight || 100);
            let owner = dbDesk?.owner || null;
            let pendingRewards = 0n;
            let hasOnChain = false;

            if (res.status === 'fulfilled' && res.value) {
              const dData = res.value;
              hasOnChain = true;
              if (Array.isArray(dData) && dData.length >= 5) {
                if (dData[0] !== undefined) active = Boolean(dData[0]) || dbIsActive;
                if (dData[1] !== undefined) boostCount = BigInt(dData[1]);
                if (dData[2] !== undefined) currentWeight = BigInt(dData[2]);
                if (dData[3] && dData[3] !== '0x0000000000000000000000000000000000000000') owner = dData[3];
                if (dData[4] !== undefined) pendingRewards = BigInt(dData[4]);
              } else if (dData && typeof dData === 'object') {
                if (dData.active !== undefined) active = Boolean(dData.active) || dbIsActive;
                if (dData.boostCount !== undefined) boostCount = BigInt(dData.boostCount);
                if (dData.currentWeight !== undefined) currentWeight = BigInt(dData.currentWeight);
                if (dData.owner) owner = dData.owner;
                if (dData.pendingRewards !== undefined) pendingRewards = BigInt(dData.pendingRewards);
              }
            }

            onChainMap[tid] = {
              hasOnChain,
              active: active || dbIsActive,
              boostCount: Number(boostCount),
              currentWeight: Number(currentWeight),
              owner: owner || dbDesk?.owner,
              pendingRewards,
            };
          });
        }
        setOnChainDeskData(onChainMap);
      }

      // Merge on-chain detected active desks that may not be in DB yet
      const existingIds = new Set((desks || []).map((d) => Number(d.token_id)));
      const mergedDesks = [...(desks || [])];

      Object.entries(onChainMap).forEach(([tidStr, onChain]) => {
        const tid = Number(tidStr);
        if (!existingIds.has(tid) && onChain.active) {
          mergedDesks.push({
            token_id: tid,
            owner: onChain.owner || ADMIN_ADDRESS,
            active: true,
            boost_count: onChain.boostCount || 0,
            base_weight: 100,
            current_weight: onChain.currentWeight || 100,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          existingIds.add(tid);
        }
      });

      setAllDesks(mergedDesks);
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

    const protocolFees = globalStats?.protocolFeeBalance || 0n;
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

  // Handle Immediate Marketing Distribution
  const handleDistributeImmediate = async (amountEth) => {
    if (!onDistributeImmediateRewards) return;
    sound?.playClick?.();
    setIsDistributingImmediate(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await onDistributeImmediateRewards({ amountEth });
      const label = amountEth && parseFloat(amountEth) > 0 ? `${amountEth} ETH` : 'all available pool';
      setStatusMessage(`Successfully executed marketing instant distribution of ${label} to active desks!`);
      setImmediateEthInput('');
      sound?.playSuccess?.();
      try {
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
      } catch (e) {}
      await loadDashboardData();
      if (refetchGlobalStats) await refetchGlobalStats();
    } catch (err) {
      console.error('Immediate distribution failed:', err);
      sound?.playError?.();
      setErrorMessage(err.shortMessage || err.message || 'Immediate distribution failed.');
    } finally {
      setIsDistributingImmediate(false);
    }
  };

  // Handle Base Boost Cost Update
  const handleUpdateBaseBoostCost = async (e) => {
    e?.preventDefault?.();
    if (!boostCostInput || isNaN(Number(boostCostInput)) || Number(boostCostInput) <= 0) return;
    sound?.playClick?.();
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await onSetBaseBoostCost(boostCostInput);
      setStatusMessage(`Successfully updated base boost fee to ${Number(boostCostInput).toLocaleString()} $APEBROKE.`);
      setBoostCostInput('');
      sound?.playSuccess?.();
      if (refetchGlobalStats) await refetchGlobalStats();
    } catch (err) {
      console.error('Update base boost cost failed:', err);
      sound?.playError?.();
      setErrorMessage(err.shortMessage || err.message || 'Update base boost cost failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Activation Fee Update
  const handleUpdateActivationFee = async (e) => {
    e?.preventDefault?.();
    if (!activationFeeInput || isNaN(Number(activationFeeInput)) || Number(activationFeeInput) <= 0) return;
    sound?.playClick?.();
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await onSetActivationFee(activationFeeInput);
      setStatusMessage(`Successfully updated desk activation fee to ${Number(activationFeeInput).toLocaleString()} $APEBROKE.`);
      setActivationFeeInput('');
      sound?.playSuccess?.();
      if (refetchGlobalStats) await refetchGlobalStats();
    } catch (err) {
      console.error('Update activation fee failed:', err);
      sound?.playError?.();
      setErrorMessage(err.shortMessage || err.message || 'Update activation fee failed.');
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

  // Group user claims by token_id and attribute batch claims proportionally by desk weight
  const deskClaimTotals = useMemo(() => {
    const directTotals = {};
    const batchTotals = {};

    (rewardClaims || []).forEach((c) => {
      if (!c) return;
      const amt = parseFloat(c.amount_eth || 0);
      if (c.token_id !== null && c.token_id !== undefined && !isNaN(Number(c.token_id))) {
        const tid = Number(c.token_id);
        directTotals[tid] = (directTotals[tid] || 0) + amt;
      } else if (c.claimer && typeof c.claimer === 'string') {
        const key = c.claimer.toLowerCase().trim();
        batchTotals[key] = (batchTotals[key] || 0) + amt;
      }
    });

    // Group active desks by owner to distribute batch claims proportionally by desk weight
    const desksByOwner = {};
    (allDesks || []).forEach((d) => {
      if (d && d.owner && typeof d.owner === 'string') {
        const key = d.owner.toLowerCase().trim();
        if (!desksByOwner[key]) desksByOwner[key] = [];
        const onChain = onChainDeskData[Number(d.token_id)];
        const isActive = Boolean(onChain?.active || d.active);
        const w = Number(onChain?.currentWeight || d.current_weight || 100);
        desksByOwner[key].push({ tid: Number(d.token_id), weight: w, active: isActive });
      }
    });

    const finalDeskTotals = { ...directTotals };

    Object.entries(batchTotals).forEach(([ownerKey, batchAmt]) => {
      const ownerDesks = desksByOwner[ownerKey] || [];
      const activeOwnerDesks = ownerDesks.filter((d) => d.active);
      const targetDesks = activeOwnerDesks.length > 0 ? activeOwnerDesks : ownerDesks;

      if (targetDesks.length > 0) {
        const totalOwnerWeight = targetDesks.reduce((sum, od) => sum + (od.weight || 100), 0) || (targetDesks.length * 100);
        targetDesks.forEach((od) => {
          const deskShare = (batchAmt * (od.weight || 100)) / totalOwnerWeight;
          finalDeskTotals[od.tid] = (finalDeskTotals[od.tid] || 0) + deskShare;
        });
      }
    });

    return finalDeskTotals;
  }, [rewardClaims, allDesks, onChainDeskData]);

  // Enriched Desks with Live Claimable, User Claimed, and User Total Earned
  const enrichedDesks = useMemo(() => {
    const pool =
      (globalStats?.availableRewardPool && globalStats.availableRewardPool > 0n
        ? globalStats.availableRewardPool
        : globalStats?.rewardPoolBalance) || 1000000000000000n;
    const emissionBps = globalStats?.epochEmissionBps || 500n;
    const floor = globalStats?.benchmarkWeightFloor || 2000n;
    const totalWgt = globalStats?.totalEligibleWeight && globalStats.totalEligibleWeight > 0n ? globalStats.totalEligibleWeight : 100n;
    const divisor = totalWgt < floor ? floor : totalWgt;
    const dist = (pool * emissionBps) / 10000n;

    return (allDesks || []).map((d) => {
      const tid = Number(d.token_id);
      const onChain = onChainDeskData[tid];

      const isActive = Boolean(onChain?.active || d.active);
      const currentWeight = onChain?.currentWeight || d.current_weight || 100;
      const boostCount = onChain?.boostCount !== undefined ? onChain.boostCount : (d.boost_count || 0);
      const owner = onChain?.owner || d.owner || '';

      // Live on-chain claimable pending balance
      const pendingWei = onChain?.pendingRewards || 0n;
      const availableToClaimEth = pendingWei > 0n ? parseFloat(formatEther(pendingWei)) : 0;

      // Cumulative user claimed ETH
      const claimedEth = deskClaimTotals[tid] || 0;

      // Cumulative user total earned = claimed + available pending
      const totalEarnedEth = claimedEth + availableToClaimEth;

      // Est Next 5H (Guarded safe BigInt conversion)
      const safeWeight = BigInt(Math.max(1, Math.round(Number(currentWeight || 100))));
      const estEthRaw = divisor > 0n ? (dist * safeWeight) / divisor : 0n;
      const estEth = parseFloat(formatEther(estEthRaw));

      // Spend calculations for this desk
      const baseActivationFee = Number(formatEther(globalStats?.activationFee || 349693n * 10n ** 18n)) || 349693;
      const baseBoostUnit = Number(formatEther(globalStats?.baseBoostCost || 349693n * 10n ** 18n)) || 349693;
      const deskActivationApe = isActive ? baseActivationFee : 0;
      const deskBoostApe = boostCount > 0 ? baseBoostUnit * boostCount * (boostCount + 1) : 0;
      const totalApebrokeSpent = deskActivationApe + deskBoostApe;
      const currentTokenPrice = tokenPrice > 0 ? tokenPrice : (DEFAULT_TOKEN_PRICE || 0.00000355);
      const currentEthPrice = ethPrice > 0 ? ethPrice : 2495;
      const spentUsd = totalApebrokeSpent * currentTokenPrice;
      const earnedUsd = totalEarnedEth * currentEthPrice;
      const netProfitUsd = earnedUsd - spentUsd;

      return {
        ...d,
        token_id: tid,
        active: isActive,
        current_weight: currentWeight,
        boost_count: boostCount,
        owner,
        availableToClaimEth,
        claimedEth,
        totalEarnedEth,
        estEth,
        totalApebrokeSpent,
        spentUsd,
        earnedUsd,
        netProfitUsd,
      };
    });
  }, [allDesks, onChainDeskData, deskClaimTotals, globalStats, tokenPrice, ethPrice]);

  // Copy Owner Address feedback
  const handleCopyOwner = (address) => {
    if (!address) return;
    navigator?.clipboard?.writeText(address);
    setCopiedOwner(address);
    sound?.playSuccess?.();
    setTimeout(() => setCopiedOwner(null), 1800);
  };

  // Export Desks to CSV with full metrics
  const handleExportCsv = () => {
    sound?.playClick?.();
    if (enrichedDesks.length === 0) return;
    const currencySuffix = isUsdt ? ` (USDT @ $${Number(ethPrice || 2495).toFixed(2)})` : ' (ETH)';
    const headers =
      `Token ID,Owner,Active,Boost Count,Current Weight,Available To Claim${currencySuffix},User Claimed${currencySuffix},User Total Earned${currencySuffix},Est Next 5H${currencySuffix},Updated At\n`;
    const rows = enrichedDesks
      .map((d) => {
        const avail = isUsdt
          ? (d.availableToClaimEth * (ethPrice || 2495)).toFixed(2)
          : d.availableToClaimEth.toFixed(6);
        const clm = isUsdt
          ? (d.claimedEth * (ethPrice || 2495)).toFixed(2)
          : d.claimedEth.toFixed(6);
        const tot = isUsdt
          ? (d.totalEarnedEth * (ethPrice || 2495)).toFixed(2)
          : d.totalEarnedEth.toFixed(6);
        const est = isUsdt
          ? (d.estEth * (ethPrice || 2495)).toFixed(2)
          : d.estEth.toFixed(6);
        return `${d.token_id},"${d.owner}",${d.active},${d.boost_count},${d.current_weight},${avail},${clm},${tot},${est},"${d.updated_at || ''}"`;
      })
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `apebroker_desks_full_audit_${isUsdt ? 'usdt_' : 'eth_'}${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group all desks and claims by wallet for Per-Wallet Rewards view
  const walletSummaries = useMemo(() => {
    const walletsMap = {};

    // 1. Gather all unique wallets from enrichedDesks
    (enrichedDesks || []).forEach((d) => {
      const rawOwner = (d.owner || '').trim();
      if (!rawOwner) return;
      const addr = rawOwner.toLowerCase();
      if (!walletsMap[addr]) {
        walletsMap[addr] = {
          address: rawOwner,
          normalizedAddress: addr,
          desks: [],
          activeDesks: [],
          tokenIds: [],
          totalWeight: 0,
          availableToClaimEth: 0,
          claimedEth: 0,
          totalEarnedEth: 0,
          claimCount: 0,
          lastClaimAt: null,
        };
      }
      walletsMap[addr].desks.push(d);
      walletsMap[addr].tokenIds.push(d.token_id);
      if (d.active) {
        walletsMap[addr].activeDesks.push(d);
        walletsMap[addr].totalWeight += Number(d.current_weight || 100);
      }
      walletsMap[addr].availableToClaimEth += Number(d.availableToClaimEth || 0);
    });

    // Map token_id to owner
    const deskToOwner = {};
    (enrichedDesks || []).forEach((d) => {
      if (d.owner) {
        deskToOwner[Number(d.token_id)] = d.owner.toLowerCase().trim();
      }
    });

    // 2. Process claims by wallet
    (rewardClaims || []).forEach((c) => {
      if (!c) return;
      const amt = parseFloat(c.amount_eth || 0);
      const claimerRaw = (c.claimer || '').trim();
      let addr = claimerRaw.toLowerCase();

      if (!addr && c.token_id !== null && c.token_id !== undefined) {
        addr = deskToOwner[Number(c.token_id)] || '';
      }

      if (!addr) return;

      if (!walletsMap[addr]) {
        walletsMap[addr] = {
          address: claimerRaw || addr,
          normalizedAddress: addr,
          desks: [],
          activeDesks: [],
          tokenIds: [],
          totalWeight: 0,
          availableToClaimEth: 0,
          claimedEth: 0,
          totalEarnedEth: 0,
          claimCount: 0,
          lastClaimAt: null,
        };
      }

      walletsMap[addr].claimedEth += amt;
      walletsMap[addr].claimCount += 1;

      const claimTime = c.created_at || c.timestamp;
      if (claimTime) {
        if (!walletsMap[addr].lastClaimAt || new Date(claimTime) > new Date(walletsMap[addr].lastClaimAt)) {
          walletsMap[addr].lastClaimAt = claimTime;
        }
      }
    });

    // 3. Compute spend, earnings, and net PnL for each wallet
    const baseActivationFee = Number(formatEther(globalStats?.activationFee || 349693n * 10n ** 18n)) || 349693;
    const baseBoostUnit = Number(formatEther(globalStats?.baseBoostCost || 349693n * 10n ** 18n)) || 349693;
    const currentTokenPrice = tokenPrice > 0 ? tokenPrice : (DEFAULT_TOKEN_PRICE || 0.00000355);
    const currentEthPrice = ethPrice > 0 ? ethPrice : 2495;

    const list = Object.values(walletsMap).map((w) => {
      const totalEarnedEth = w.claimedEth + w.availableToClaimEth;

      // Calculate $APEBROKE spend:
      // 1. Activation fees for active desks
      const activationSpendApe = w.activeDesks.length * baseActivationFee;

      // 2. Boost fees for all desks: baseBoostUnit * B * (B + 1)
      let boostSpendApe = 0;
      let totalBoostCount = 0;
      w.desks.forEach((d) => {
        const b = Number(d.boost_count || 0);
        totalBoostCount += b;
        if (b > 0) {
          boostSpendApe += baseBoostUnit * b * (b + 1);
        }
      });

      const totalApebrokeSpent = activationSpendApe + boostSpendApe;
      const spentUsd = totalApebrokeSpent * currentTokenPrice;
      const earnedUsd = totalEarnedEth * currentEthPrice;
      const claimedUsd = w.claimedEth * currentEthPrice;
      const availableUsd = w.availableToClaimEth * currentEthPrice;
      const netProfitUsd = earnedUsd - spentUsd;
      const roiPercent = spentUsd > 0 ? ((earnedUsd - spentUsd) / spentUsd) * 100 : 0;

      return {
        ...w,
        totalEarnedEth,
        activationSpendApe,
        boostSpendApe,
        totalBoostCount,
        totalApebrokeSpent,
        spentUsd,
        earnedUsd,
        claimedUsd,
        availableUsd,
        netProfitUsd,
        roiPercent,
      };
    });

    return list;
  }, [enrichedDesks, rewardClaims, globalStats, tokenPrice, ethPrice]);

  // Filtered & Sorted Wallets
  const filteredWallets = useMemo(() => {
    return walletSummaries
      .filter((w) => {
        const query = walletSearch.toLowerCase().trim();
        const matchesSearch =
          !query ||
          w.address.toLowerCase().includes(query) ||
          w.tokenIds.some((tid) => tid.toString().includes(query));

        if (!matchesSearch) return false;

        if (walletFilter === 'profit') return w.netProfitUsd > 0;
        if (walletFilter === 'claimed') return w.claimedEth > 0;
        if (walletFilter === 'pending') return w.availableToClaimEth > 0;
        if (walletFilter === 'active') return w.activeDesks.length > 0;
        return true;
      })
      .sort((a, b) => {
        if (walletSort === 'earned') return b.earnedUsd - a.earnedUsd;
        if (walletSort === 'spend') return b.spentUsd - a.spentUsd;
        if (walletSort === 'profit') return b.netProfitUsd - a.netProfitUsd;
        if (walletSort === 'claimed') return b.claimedEth - a.claimedEth || b.totalEarnedEth - a.totalEarnedEth;
        if (walletSort === 'pending') return b.availableToClaimEth - a.availableToClaimEth;
        if (walletSort === 'weight') return b.totalWeight - a.totalWeight;
        if (walletSort === 'desks') return b.desks.length - a.desks.length;
        return 0;
      });
  }, [walletSummaries, walletSearch, walletFilter, walletSort]);

  // Paginated Wallets
  const paginatedWallets = useMemo(() => {
    const start = (walletPage - 1) * itemsPerPage;
    return filteredWallets.slice(start, start + itemsPerPage);
  }, [filteredWallets, walletPage]);

  const totalWalletPages = Math.ceil(filteredWallets.length / itemsPerPage) || 1;

  // Wallet Aggregate Calculations
  const totalWalletClaimedEth = walletSummaries.reduce((sum, w) => sum + w.claimedEth, 0);
  const totalWalletAvailableEth = walletSummaries.reduce((sum, w) => sum + w.availableToClaimEth, 0);
  const totalWalletEarnedEth = walletSummaries.reduce((sum, w) => sum + w.totalEarnedEth, 0);
  const totalWalletSpentApe = walletSummaries.reduce((sum, w) => sum + (w.totalApebrokeSpent || 0), 0);
  const totalWalletSpentUsd = walletSummaries.reduce((sum, w) => sum + (w.spentUsd || 0), 0);
  const totalWalletEarnedUsd = walletSummaries.reduce((sum, w) => sum + (w.earnedUsd || 0), 0);
  const totalWalletNetProfitUsd = totalWalletEarnedUsd - totalWalletSpentUsd;
  const totalWalletRoi = totalWalletSpentUsd > 0 ? (totalWalletNetProfitUsd / totalWalletSpentUsd) * 100 : 0;
  const walletsWithClaimsCount = walletSummaries.filter((w) => w.claimedEth > 0).length;
  const walletsWithPendingCount = walletSummaries.filter((w) => w.availableToClaimEth > 0).length;
  const walletsProfitableCount = walletSummaries.filter((w) => w.netProfitUsd > 0).length;

  // Export Wallet Rewards to CSV
  const handleExportWalletCsv = () => {
    sound?.playClick?.();
    if (walletSummaries.length === 0) return;
    const currencySuffix = isUsdt ? ` (USDT @ $${Number(ethPrice || 2495).toFixed(2)})` : ' (ETH)';
    const headers =
      `Wallet Address,Active Desks,Total Desks,Token IDs,Total Weight,Protocol Share %,Total Spent ($ USD),Total $APE Spent,Activation Spend ($APE),Boost Spend ($APE),Total Earned ($ USD),Total Earned (ETH),Claimed${currencySuffix},Available To Claim${currencySuffix},Net PnL ($ USD),ROI %,Claims Executed,Last Claim Date\n`;
    const totalEligibleWgt = Number(globalStats?.totalEligibleWeight || 0n) || 3800;
    const rows = walletSummaries
      .map((w) => {
        const sharePct = ((w.totalWeight / Math.max(1, totalEligibleWgt)) * 100).toFixed(2);
        const clm = isUsdt ? (w.claimedEth * (ethPrice || 2495)).toFixed(2) : w.claimedEth.toFixed(6);
        const avail = isUsdt ? (w.availableToClaimEth * (ethPrice || 2495)).toFixed(2) : w.availableToClaimEth.toFixed(6);
        const tokensStr = `"${w.tokenIds.join(', ')}"`;
        const lastClaim = w.lastClaimAt ? new Date(w.lastClaimAt).toISOString() : 'Never';
        return `"${w.address}",${w.activeDesks.length},${w.desks.length},${tokensStr},${w.totalWeight},${sharePct}%,$${w.spentUsd.toFixed(2)},${w.totalApebrokeSpent.toFixed(0)},${w.activationSpendApe.toFixed(0)},${w.boostSpendApe.toFixed(0)},$${w.earnedUsd.toFixed(2)},${w.totalEarnedEth.toFixed(6)},${clm},${avail},$${w.netProfitUsd.toFixed(2)},${w.roiPercent.toFixed(1)}%,${w.claimCount},"${lastClaim}"`;
      })
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `apebroker_wallet_spend_and_earnings_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Desks
  const filteredDesks = useMemo(() => {
    return enrichedDesks.filter((d) => {
      const matchesSearch =
        !deskSearch ||
        d.token_id.toString().includes(deskSearch.trim()) ||
        (d.owner || '').toLowerCase().includes(deskSearch.toLowerCase().trim());

      if (!matchesSearch) return false;

      if (deskFilter === 'active') return Boolean(d.active);
      if (deskFilter === 'claimable') return d.availableToClaimEth > 0;
      if (deskFilter === 'max_boost') return (d.boost_count || 0) >= 5;
      return true;
    });
  }, [enrichedDesks, deskSearch, deskFilter]);

  // Paginated Desks
  const paginatedDesks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDesks.slice(start, start + itemsPerPage);
  }, [filteredDesks, currentPage]);

  const totalPages = Math.ceil(filteredDesks.length / itemsPerPage) || 1;

  // Aggregate Calculations
  const activeDesksCount = enrichedDesks.filter((d) => d.active).length;
  const totalDbWeight = enrichedDesks
    .filter((d) => d.active)
    .reduce((sum, d) => sum + (d.current_weight || 100), 0);
  const totalDbBoosts = enrichedDesks.reduce((sum, d) => sum + (d.boost_count || 0), 0);
  const totalAvailableToClaimAllDesks = enrichedDesks.reduce((sum, d) => sum + d.availableToClaimEth, 0);
  const totalClaimedAllDesks = enrichedDesks.reduce((sum, d) => sum + d.claimedEth, 0);
  const totalUserEarnedAllDesks = enrichedDesks.reduce((sum, d) => sum + d.totalEarnedEth, 0);
  const desksWithClaimableCount = enrichedDesks.filter((d) => d.availableToClaimEth > 0).length;
  const maxBoostedCount = enrichedDesks.filter((d) => (d.boost_count || 0) >= 5).length;

  // Total distributed from DB records + on-chain
  const totalEthDistributedDb = rewardDeposits.reduce(
    (sum, d) => sum + parseFloat(d.amount_eth || 0),
    0
  );
  const onChainDepositedEth = parseFloat(formatEther(globalStats?.totalEthDeposited || 0n));
  const effectiveTotalDistributed = onChainDepositedEth > 0 ? onChainDepositedEth : totalEthDistributedDb;

  // Broker Desk Revenue & Total $ Generated Calculations
  const currentTokenPrice = tokenPrice > 0 ? tokenPrice : (DEFAULT_TOKEN_PRICE || 0.00000355);
  const currentEthPrice = ethPrice > 0 ? ethPrice : 2495;

  const baseActivationFee = Number(formatEther(globalStats?.activationFee || 349693n * 10n ** 18n)) || 349693;
  const totalActivationFeesApe = activeDesksCount * baseActivationFee;
  const totalActivationFeesUsd = totalActivationFeesApe * currentTokenPrice;

  const onChainBoostFeesApe = Number(formatEther(globalStats?.totalBoostFeesCollected || 0n));
  const totalBoostFeesApe = onChainBoostFeesApe > 0 ? onChainBoostFeesApe : walletSummaries.reduce((sum, w) => sum + (w.boostSpendApe || 0), 0);
  const totalBoostFeesUsd = totalBoostFeesApe * currentTokenPrice;

  const totalDeskRevenueApe = totalActivationFeesApe + totalBoostFeesApe;
  const totalDeskRevenueUsd = totalDeskRevenueApe * currentTokenPrice;
  const totalEthDistributedUsd = effectiveTotalDistributed * currentEthPrice;
  const totalGrossProtocolVolumeUsd = totalDeskRevenueUsd + totalEthDistributedUsd;

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
                Admin: <span className="text-[#00FF66] font-bold">{ADMIN_ADDRESS?.slice ? `${ADMIN_ADDRESS.slice(0, 6)}...${ADMIN_ADDRESS.slice(-4)}` : '0x...'}</span>
              </div>
              <div>•</div>
              <div>
                Treasury: <span className="text-[#FFD700] font-bold">{TREASURY_ADDRESS?.slice ? `${TREASURY_ADDRESS.slice(0, 6)}...${TREASURY_ADDRESS.slice(-4)}` : '0x...'}</span>
              </div>
              <div>•</div>
              <div>
                NFT Supply: <span className="text-[#00F0FF] font-bold">{(globalStats?.nftTotalSupply || 1250).toLocaleString()} Minted</span> (Max 3,333)
              </div>
              <div>•</div>
              <div>
                Active Desks: <span className="text-[#00FF66] font-bold">{activeDesksCount} Active</span> ({(((activeDesksCount || 38) / (globalStats?.nftTotalSupply || 1250)) * 100).toFixed(1)}% of Supply)
              </div>
              <div>•</div>
              <div>
                Robinhood EVM Contract: <span className="text-[#00F0FF]">{DESK_CONTRACT_ADDRESS?.slice ? `${DESK_CONTRACT_ADDRESS.slice(0, 6)}...${DESK_CONTRACT_ADDRESS.slice(-4)}` : '0x...'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Currency Mode Toggle & ETH Price badge */}
            <div className="flex items-center gap-2">
              {/* Total $ Generated by Desk Pill */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-950/70 border border-[#FFD700] text-[10px] font-mono shadow-[2px_2px_0px_#000]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700] animate-pulse shadow-[0_0_6px_#FFD700]" />
                <span className="text-gray-300 font-bold uppercase">DESK REVENUE:</span>
                <span className="text-[#FFD700] font-extrabold text-xs">
                  ${totalDeskRevenueUsd.toFixed(2)}
                </span>
                <span className="text-[9px] text-yellow-400/80 hidden lg:inline">
                  ({(totalDeskRevenueApe / 1e6).toFixed(1)}M $APE)
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0a0418] border border-cyan-800 text-[10px] font-mono text-cyan-300 shadow-[2px_2px_0px_#000]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
                <span>1 ETH = ${Number(ethPrice || 2495).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
              </div>
              <button
                type="button"
                onClick={handleToggleCurrency}
                className={`pixel-btn px-2.5 sm:px-3 py-1.5 text-[10px] font-bold border-2 rounded-lg shadow-[2px_2px_0px_#000] flex items-center gap-1.5 transition-all ${
                  isUsdt
                    ? 'bg-[#00F0FF] text-black border-[#00F0FF]'
                    : 'bg-[#1b0a3a] text-yellow-400 border-yellow-500'
                }`}
                title="Toggle between Native ETH and Live USDT valuation"
              >
                <span className="text-[9px] text-gray-400">CURRENCY:</span>
                <span className={!isUsdt ? 'text-white font-extrabold underline' : 'text-gray-400'}>ETH</span>
                <span className="text-gray-500">|</span>
                <span className={isUsdt ? 'text-black font-extrabold underline' : 'text-gray-400'}>USDT</span>
              </button>
            </div>

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
          { id: 'overview', label: 'PROTOCOL STATISTICS' },
          { id: 'desks', label: `ALL ACTIVE DESKS (${activeDesksCount})` },
          { id: 'wallets', label: `OPERATOR WALLETS (${walletSummaries.length})` },
          { id: 'staking', label: '24H STAKING PROTOCOL' },
          { id: 'distributions', label: `ETH DISTRIBUTIONS (${rewardDeposits.length})` },
          { id: 'logs', label: 'AUDIT LOGS' },
          { id: 'actions', label: 'PROTOCOL ACTIONS & CONFIG' },
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
          {/* HERO: TOTAL $ GENERATED BY BROKER DESK */}
          <div className="bg-gradient-to-r from-[#1c0842] via-[#12072e] to-[#1c0842] border-3 border-[#FFD700] rounded-xl p-5 sm:p-6 shadow-[6px_6px_0px_#000] relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#FFD700] text-black text-[9px] font-extrabold tracking-wider">
                    PROTOCOL REVENUE
                  </span>
                  <span className="text-[10px] text-gray-300 font-mono">
                    Valuation @ ${currentTokenPrice.toFixed(8)} / $APE
                  </span>
                </div>
                <h2 className="text-xs sm:text-sm font-extrabold text-gray-300 tracking-wider uppercase">
                  TOTAL $ GENERATED BY BROKER DESK
                </h2>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl sm:text-5xl font-extrabold text-[#FFD700] drop-shadow-[0_0_12px_rgba(255,215,0,0.4)]">
                    ${totalDeskRevenueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm sm:text-base font-bold text-gray-300 font-mono">
                    USD
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#00FF66] font-mono bg-black/50 px-2.5 py-1 rounded border border-[#00FF66]/50">
                    {Number(totalDeskRevenueApe.toFixed(0)).toLocaleString()} $APEBROKE
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 font-mono max-w-2xl">
                  Total revenue generated by the Broker Desk protocol through on-chain desk activations ({activeDesksCount} active desks) and weight boost upgrades ({totalDbBoosts} boosts applied).
                </p>
              </div>

              {/* Sub-breakdown metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
                <div className="bg-black/50 border border-purple-800 p-3 rounded-lg font-mono">
                  <div className="text-[9px] text-gray-400 uppercase">ACTIVATION FEES</div>
                  <div className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                    ${totalActivationFeesUsd.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-[#00FF66]">
                    {(totalActivationFeesApe / 1e6).toFixed(2)}M $APE ({activeDesksCount} Desks)
                  </div>
                </div>

                <div className="bg-black/50 border border-purple-800 p-3 rounded-lg font-mono">
                  <div className="text-[9px] text-gray-400 uppercase">BOOST FEES</div>
                  <div className="text-base sm:text-lg font-extrabold text-[#FF80BE] mt-0.5">
                    ${totalBoostFeesUsd.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-[#FF80BE]">
                    {(totalBoostFeesApe / 1e6).toFixed(2)}M $APE ({totalDbBoosts} Boosts)
                  </div>
                </div>

                <div className="bg-black/50 border border-cyan-800 p-3 rounded-lg font-mono col-span-2 sm:col-span-1">
                  <div className="text-[9px] text-gray-400 uppercase">MINING REWARDS FUNDED</div>
                  <div className="text-base sm:text-lg font-extrabold text-[#00F0FF] mt-0.5">
                    ${totalEthDistributedUsd.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-[#00F0FF]">
                    {effectiveTotalDistributed.toFixed(4)} ETH Distributed
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="bg-[#140833] border-2 border-[#FFD700] p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400 uppercase">
                {isUsdt ? 'TOTAL DISTRIBUTED (USDT)' : 'TOTAL ETH DISTRIBUTED'}
              </div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#FFD700] mt-1 drop-shadow-[0_0_8px_rgba(255,215,0,0.3)]">
                {formatEthOrUsdt(effectiveTotalDistributed, isUsdt, ethPrice)}
              </div>
              <div className="text-[9px] text-[#00FF66] mt-1 font-mono">
                {rewardDeposits.length} Deposit Epochs Funded
              </div>
            </div>

            <div className="bg-[#140833] border-2 border-[#00F0FF] p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400 uppercase">
                {isUsdt ? 'TOTAL USER CLAIMED (USDT)' : 'TOTAL USER CLAIMED'}
              </div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#00F0FF] mt-1 drop-shadow-[0_0_8px_rgba(0,240,255,0.3)]">
                {formatEthOrUsdt(
                  Math.max(Number(formatEther(globalStats?.totalEthClaimed || 0n)), totalClaimedAllDesks),
                  isUsdt,
                  ethPrice
                )}
              </div>
              <div className="text-[9px] text-gray-400 mt-1 font-mono">
                {rewardClaims.length} User Claims Executed
              </div>
            </div>

            <div className="bg-[#140833] border-2 border-[#00FF66] p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400 uppercase">
                {isUsdt ? 'AVAILABLE TO CLAIM (USDT)' : 'AVAILABLE TO CLAIM (PENDING)'}
              </div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#00FF66] mt-1 drop-shadow-[0_0_8px_rgba(0,255,102,0.3)]">
                {formatEthOrUsdt(totalAvailableToClaimAllDesks, isUsdt, ethPrice)}
              </div>
              <div className="text-[9px] text-[#00FF66] mt-1 font-mono">
                {desksWithClaimableCount} Desks Ready To Claim
              </div>
            </div>

            <div className="bg-[#140833] border-2 border-[#FF007F] p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400 uppercase">
                {isUsdt ? 'TOTAL USER EARNED (USDT)' : 'TOTAL USER EARNED'}
              </div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#FF007F] mt-1 drop-shadow-[0_0_8px_rgba(255,0,127,0.3)]">
                {formatEthOrUsdt(totalUserEarnedAllDesks, isUsdt, ethPrice)}
              </div>
              <div className="text-[9px] text-pink-400 mt-1 font-mono">
                Claimed + Unclaimed Balance
              </div>
            </div>

            <div className="bg-[#140833] border-2 border-[#A855F7] p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400 uppercase">
                {isUsdt ? 'CURRENT REWARD POOL (USDT)' : 'CURRENT REWARD POOL'}
              </div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#A855F7] mt-1 drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                {formatEthOrUsdt(globalStats?.rewardPoolBalance || 0n, isUsdt, ethPrice)}
              </div>
              <div className="text-[9px] text-purple-400 mt-1 font-mono">Ready for 5-Hour Claims</div>
            </div>

            <div className="bg-[#140833] border border-purple-800 p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400">COLLECTED PROTOCOL FEES</div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#FFD700] mt-1">
                {Number(formatEther(globalStats?.protocolFeeBalance || 0n)).toLocaleString()}
              </div>
              <div className="text-[9px] text-[#00FF66] mt-1 font-mono font-bold">
                ≈ ${(Number(formatEther(globalStats?.protocolFeeBalance || 0n)) * currentTokenPrice).toFixed(2)} USD • Treasury
              </div>
            </div>

            <div className="bg-[#140833] border border-purple-800 p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400">TOTAL ACTIVE DESKS</div>
              <div className="text-lg sm:text-2xl font-extrabold text-white mt-1">
                {activeDesksCount} <span className="text-xs text-gray-400">/ {enrichedDesks.length || 10000}</span>
              </div>
              <div className="text-[9px] text-[#00FF66] mt-1 font-mono">1 NFT = 1 Desk System</div>
            </div>

            <div className="bg-[#140833] border border-purple-800 p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400">TOTAL ELIGIBLE WEIGHT</div>
              <div className="text-lg sm:text-2xl font-extrabold text-white mt-1">
                {(Number(globalStats?.totalEligibleWeight || 0n) || totalDbWeight).toLocaleString()} WGT
              </div>
              <div className="text-[9px] text-gray-400 mt-1 font-mono">Active Proportional Share</div>
            </div>

            <div className="bg-[#140833] border border-purple-800 p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400">TOTAL BOOST FEES</div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#FF80BE] mt-1">
                {Number(formatEther(globalStats?.totalBoostFeesCollected || 0n)).toLocaleString()}
              </div>
              <div className="text-[9px] text-[#FF80BE] mt-1 font-mono font-bold">
                ≈ ${totalBoostFeesUsd.toFixed(2)} USD • {totalDbBoosts} Boosts
              </div>
            </div>

            <div className="bg-[#140833] border border-cyan-800 p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400">TOTAL NFT SUPPLY</div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#00F0FF] mt-1">
                {(globalStats?.nftTotalSupply || 1250).toLocaleString()} <span className="text-xs text-gray-400">/ 3,333</span>
              </div>
              <div className="text-[9px] text-cyan-400 mt-1 font-mono">
                {(((globalStats?.nftTotalSupply || 1250) / 3333) * 100).toFixed(1)}% Minted Supply
              </div>
            </div>

            <div className="bg-[#140833] border border-emerald-800 p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400">ACTIVE ON DESKS</div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#00FF66] mt-1">
                {activeDesksCount} <span className="text-xs text-gray-400">/ {(globalStats?.nftTotalSupply || 1250).toLocaleString()}</span>
              </div>
              <div className="text-[9px] text-[#00FF66] mt-1 font-mono">
                {(((activeDesksCount || 38) / (globalStats?.nftTotalSupply || 1250)) * 100).toFixed(1)}% of Supply Active
              </div>
            </div>

            <div className="bg-[#140833] border border-yellow-800 p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400">OPERATOR WALLETS</div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#FFD700] mt-1">
                {walletSummaries.length} <span className="text-xs text-gray-400">WALLETS</span>
              </div>
              <div className="text-[9px] text-yellow-400 mt-1 font-mono">
                {walletsWithClaimsCount} Claimed • {walletsWithPendingCount} Pending
              </div>
            </div>

            <div className="bg-[#140833] border border-purple-800 p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400">CURRENT PROTOCOL EPOCH</div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#00F0FF] mt-1">
                EPOCH #{globalStats?.currentEpoch ? globalStats.currentEpoch.toString() : '0'}
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
                <span className="text-[9px] text-gray-400 font-mono">Epoch #{globalStats?.currentEpoch ? globalStats.currentEpoch.toString() : '0'}</span>
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
                Claim collected activation & boost protocol fees to treasury (<span className="text-white">{TREASURY_ADDRESS?.slice ? `${TREASURY_ADDRESS.slice(0, 6)}...${TREASURY_ADDRESS.slice(-4)}` : 'Treasury'}</span>). Then swap externally to ETH to fund subsequent reward pools.
              </p>
              <div className="flex items-center justify-between text-xs font-mono bg-black/40 p-2.5 rounded border border-purple-900/50">
                <span className="text-gray-400">Unclaimed Fee Balance:</span>
                <span className="text-[#FFD700] font-bold">{Number(formatEther(globalStats?.protocolFeeBalance || 0n)).toLocaleString()} $APE</span>
              </div>
              <button
                type="button"
                onClick={handleClaimFees}
                disabled={isSubmitting || (globalStats?.protocolFeeBalance || 0n) === 0n}
                className="w-full min-h-[44px] pixel-btn pixel-btn-black py-2.5 text-xs font-bold text-[#A855F7] hover:text-white border-2 border-purple-700 hover:bg-purple-950/50 rounded-lg shadow-[3px_3px_0px_#000] disabled:opacity-40"
              >
                {isSubmitting ? '[ CLAIMING TO TREASURY... ]' : '[ CLAIM ALL $APEBROKE TO TREASURY ]'}
              </button>
            </div>

            {/* CARD 3: TOKEN PRICE SCALING - BOOST & ACTIVATION FEE QUANTITY */}
            <div className="bg-[#10072b] border-2 border-[#FFD700] rounded-xl p-5 shadow-[4px_4px_0px_#000] space-y-4">
              <div className="flex items-center justify-between border-b border-purple-900/60 pb-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-[#FFD700] uppercase">
                    ADJUST BOOST & ACTIVATION FEE QUANTITY
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                    If $APEBROKE price increases, lower token fee quantities so boosts remain affordable.
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-[#FFD700]/20 border border-[#FFD700] text-[9px] text-[#FFD700] rounded font-bold">
                  TOKEN SCALING
                </span>
              </div>

              {/* Boost Cost Form */}
              <form onSubmit={handleUpdateBaseBoostCost} className="space-y-2 font-mono">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-300 font-bold">Base Boost Cost:</span>
                  <span className="text-[#FFD700] font-bold">
                    Current: {Number(formatEther(globalStats?.baseBoostCost || 349693n * 10n ** 18n)).toLocaleString()} $APE
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50000"
                    value={boostCostInput}
                    onChange={(e) => setBoostCostInput(e.target.value)}
                    className="flex-1 bg-black/80 border border-purple-700 rounded px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD700]"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !boostCostInput}
                    className="pixel-btn pixel-btn-vibrant-gold px-3 py-2 text-xs font-bold whitespace-nowrap disabled:opacity-40"
                  >
                    [ SET BOOST ]
                  </button>
                </div>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[9px] text-gray-500">Quick:</span>
                  {['35000', '70000', '150000', '349693'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBoostCostInput(preset)}
                      className="px-1.5 py-0.5 bg-purple-950/60 hover:bg-purple-900 text-[9px] text-[#FFD700] rounded border border-purple-800/80"
                    >
                      {Number(preset).toLocaleString()}
                    </button>
                  ))}
                </div>
              </form>

              {/* Activation Fee Form */}
              <form onSubmit={handleUpdateActivationFee} className="space-y-2 font-mono border-t border-purple-900/40 pt-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-300 font-bold">Activation Fee:</span>
                  <span className="text-[#00FF66] font-bold">
                    Current: {Number(formatEther(globalStats?.activationFee || 349693n * 10n ** 18n)).toLocaleString()} $APE
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 35000"
                    value={activationFeeInput}
                    onChange={(e) => setActivationFeeInput(e.target.value)}
                    className="flex-1 bg-black/80 border border-purple-700 rounded px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00FF66]"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !activationFeeInput}
                    className="pixel-btn pixel-btn-vibrant-green px-3 py-2 text-xs font-bold whitespace-nowrap disabled:opacity-40"
                  >
                    [ SET ACTIVATE ]
                  </button>
                </div>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[9px] text-gray-500">Quick:</span>
                  {['25000', '50000', '100000', '349693'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setActivationFeeInput(preset)}
                      className="px-1.5 py-0.5 bg-purple-950/60 hover:bg-purple-900 text-[9px] text-[#00FF66] rounded border border-purple-800/80"
                    >
                      {Number(preset).toLocaleString()}
                    </button>
                  ))}
                </div>
              </form>
            </div>

            {/* CARD 4: MARKETING / LAUNCH INSTANT DISTRIBUTION */}
            <div className="bg-[#10072b] border-2 border-[#FF007F] rounded-xl p-5 shadow-[4px_4px_0px_#000] space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-purple-900/60 pb-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-[#FF007F] uppercase">
                    MARKETING / LAUNCH INSTANT DISTRIBUTION
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Distribute 100% of pool or adjusted custom ETH directly to active desks right now.
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-[#FF007F]/20 border border-[#FF007F] text-[9px] text-[#FF007F] rounded font-bold">
                  INSTANT
                </span>
              </div>

              <div className="bg-black/40 p-2.5 rounded border border-purple-900/50 text-xs flex justify-between">
                <span className="text-gray-400">Available Reward Pool:</span>
                <span className="text-[#FFD700] font-bold">
                  {Number(formatEther(globalStats?.availableRewardPool || globalStats?.rewardPoolBalance || 0n)).toFixed(4)} ETH
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={isDistributingImmediate || (globalStats?.availableRewardPool || 0n) === 0n || (globalStats?.totalEligibleWeight || 0n) === 0n}
                  onClick={() => handleDistributeImmediate('0')}
                  className="flex-1 min-h-[40px] pixel-btn pixel-btn-vibrant-crimson py-2 text-[11px] font-bold rounded shadow-[2px_2px_0px_#000] disabled:opacity-40 whitespace-nowrap"
                >
                  {isDistributingImmediate ? '[ EXECUTING... ]' : '[ DISTRIBUTE 100% OF POOL ]'}
                </button>
                <button
                  type="button"
                  disabled={isDistributingImmediate || (globalStats?.availableRewardPool || 0n) === 0n || (globalStats?.totalEligibleWeight || 0n) === 0n}
                  onClick={() => {
                    const poolEth = Number(formatEther(globalStats?.availableRewardPool || globalStats?.rewardPoolBalance || 0n));
                    const half = (poolEth / 2).toFixed(4);
                    handleDistributeImmediate(half);
                  }}
                  className="px-3 min-h-[40px] pixel-btn pixel-btn-vibrant-gold py-2 text-[11px] font-bold rounded shadow-[2px_2px_0px_#000] disabled:opacity-40 whitespace-nowrap"
                >
                  [ 50% ]
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="Custom ETH amount"
                  value={immediateEthInput}
                  onChange={(e) => setImmediateEthInput(e.target.value)}
                  className="flex-1 bg-black/80 border border-purple-700 focus:border-[#FF007F] px-3 py-2 text-xs text-white rounded outline-none"
                />
                <button
                  type="button"
                  disabled={isDistributingImmediate || !immediateEthInput || parseFloat(immediateEthInput) <= 0 || (globalStats?.totalEligibleWeight || 0n) === 0n}
                  onClick={() => handleDistributeImmediate(immediateEthInput)}
                  className="pixel-btn pixel-btn-vibrant-cyan px-3 py-2 text-xs font-bold rounded shadow-[2px_2px_0px_#000] disabled:opacity-40 whitespace-nowrap"
                >
                  [ DISTRIBUTE ]
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: ALL ACTIVE DESK DATA */}
      {activeTab === 'desks' && (
        <section className="bg-[#0f0729]/95 border-2 border-purple-800 rounded-xl p-5 shadow-[6px_6px_0px_#000] space-y-5 font-mono">
          {/* View Mode Switcher: Desks vs Wallets */}
          <div className="flex items-center justify-between pb-2 border-b border-purple-900/60">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">VIEW MODE:</span>
              <button
                type="button"
                className="px-3 py-1 text-[10px] rounded font-bold bg-[#00FF66] text-black border border-[#00FF66] font-extrabold shadow-[2px_2px_0px_#000]"
              >
                [ 🗂 VIEW BY INDIVIDUAL DESKS ({filteredDesks.length}) ]
              </button>
              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  setActiveTab('wallets');
                }}
                className="px-3 py-1 text-[10px] rounded font-bold bg-black/60 text-gray-400 border border-purple-900 hover:text-[#FFD700] hover:border-[#FFD700]"
              >
                [ 👛 VIEW BY OPERATOR WALLETS ({walletSummaries.length}) ]
              </button>
            </div>
            <div className="text-[10px] text-gray-400 hidden sm:block">
              NFT Supply: <strong className="text-[#00F0FF]">{(globalStats?.nftTotalSupply || 1250).toLocaleString()}</strong>
            </div>
          </div>

          {/* Desks Aggregated Performance HUD */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[#140833] border-2 border-[#00FF66] p-3.5 rounded-xl shadow-[3px_3px_0px_#000]">
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">TOTAL ACTIVE DESKS</div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#00FF66] mt-1">
                {activeDesksCount} <span className="text-xs text-gray-400">/ {(globalStats?.nftTotalSupply || 1250).toLocaleString()} NFTs</span>
              </div>
              <div className="text-[9px] text-[#00FF66] mt-1 font-mono">
                {(((activeDesksCount || 38) / (globalStats?.nftTotalSupply || 1250)) * 100).toFixed(1)}% of NFT Supply Active
              </div>
            </div>

            <div className="bg-[#140833] border-2 border-[#00F0FF] p-3.5 rounded-xl shadow-[3px_3px_0px_#000]">
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                {isUsdt ? 'AVAILABLE TO CLAIM (USDT)' : 'AVAILABLE TO CLAIM (PENDING)'}
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#00F0FF] mt-1 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                {formatEthOrUsdt(totalAvailableToClaimAllDesks, isUsdt, ethPrice)}
              </div>
              <div className="text-[9px] text-cyan-300 mt-1 font-mono">
                {desksWithClaimableCount} Desks Ready To Claim
              </div>
            </div>

            <div className="bg-[#140833] border-2 border-[#FFD700] p-3.5 rounded-xl shadow-[3px_3px_0px_#000]">
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                {isUsdt ? 'TOTAL USER REWARDS CLAIMED (USDT)' : 'TOTAL USER REWARDS CLAIMED'}
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#FFD700] mt-1 drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]">
                {formatEthOrUsdt(totalClaimedAllDesks, isUsdt, ethPrice)}
              </div>
              <div className="text-[9px] text-yellow-300 mt-1 font-mono">
                {rewardClaims.length} Claims Executed
              </div>
            </div>

            <div className="bg-[#140833] border-2 border-[#FF007F] p-3.5 rounded-xl shadow-[3px_3px_0px_#000]">
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                {isUsdt ? 'TOTAL USER EARNED (USDT)' : 'TOTAL USER EARNED (LIFETIME)'}
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#FF007F] mt-1 drop-shadow-[0_0_8px_rgba(255,0,127,0.4)]">
                {formatEthOrUsdt(totalUserEarnedAllDesks, isUsdt, ethPrice)}
              </div>
              <div className="text-[9px] text-pink-300 mt-1 font-mono">
                Cumulative Operator Yield
              </div>
            </div>
          </div>

          {/* Search, Filters, and CSV Export Bar */}
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

              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: `ALL (${enrichedDesks.length})` },
                  { id: 'active', label: `ACTIVE (${activeDesksCount})` },
                  { id: 'claimable', label: `WITH CLAIMABLE (${desksWithClaimableCount})` },
                  { id: 'max_boost', label: `5/5 BOOSTED (${maxBoostedCount})` },
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
              disabled={enrichedDesks.length === 0}
              className="pixel-btn pixel-btn-black px-3.5 py-2 text-[10px] font-bold text-[#00F0FF] hover:text-white border border-cyan-800 rounded shadow-[2px_2px_0px_#000] whitespace-nowrap"
            >
              [ ⤓ EXPORT CSV ]
            </button>
          </div>

          {filteredDesks.length === 0 ? (
            <div className="p-8 text-center space-y-3 bg-[#130832]/60 rounded-lg border border-purple-900/40">
              <div className="text-gray-400 text-xs">
                {enrichedDesks.length === 0
                  ? 'No desks indexed in database yet. Desks will be automatically indexed as users connect and activate.'
                  : 'No desks match the current search or filter criteria.'}
              </div>

              <div className="pt-3 max-w-md mx-auto">
                <form onSubmit={handleManualSync} className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Token ID (#1-10000)"
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
                    <th className="py-2.5 px-3">Weight & Boost</th>
                    <th className="py-2.5 px-3 text-[#00F0FF]">
                      {isUsdt ? 'Available (USDT)' : 'Available To Claim'}
                    </th>
                    <th className="py-2.5 px-3 text-[#FFD700]">
                      {isUsdt ? 'Claimed (USDT)' : 'User Claimed'}
                    </th>
                    <th className="py-2.5 px-3 text-[#FF007F]">
                      {isUsdt ? 'Total Earn (USDT)' : 'User Total Earn'}
                    </th>
                    <th className="py-2.5 px-3">
                      {isUsdt ? 'Est. Next 5H (USDT)' : 'Est. Next 5H'}
                    </th>
                    <th className="py-2.5 px-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-900/30">
                  {paginatedDesks.map((d) => {
                    const boosts = d.boost_count || 0;
                    const hasClaimable = d.availableToClaimEth > 0;

                    return (
                      <tr key={d.token_id} className="hover:bg-purple-950/30 transition-colors">
                        {/* Token / Desk */}
                        <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                          <img
                            src={d.image || '/brokerdesk-art.png'}
                            alt={`#${d.token_id}`}
                            className="w-7 h-7 rounded border border-purple-700 object-cover bg-black shrink-0"
                            onError={(e) => {
                              e.currentTarget.src = '/brokerdesk-art.png';
                            }}
                          />
                          <div className="flex flex-col">
                            <span className="whitespace-nowrap">Broker Desk #{d.token_id}</span>
                            <a
                              href={`https://opensea.io/assets/robinhood/0xd3b030e9281fcd8797af6dc437636b24bdfe7902/${d.token_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[9px] text-gray-500 hover:text-cyan-400 transition-colors"
                            >
                              OpenSea ↗
                            </a>
                          </div>
                        </td>

                        {/* Owner */}
                        <td className="py-2.5 px-3 font-mono text-gray-300">
                          {d.owner ? (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={`https://explorer.robinhood.com/address/${d.owner}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-gray-300 hover:text-[#00FF66] underline decoration-dotted"
                                title={d.owner}
                              >
                                {d.owner.slice(0, 6)}...{d.owner.slice(-4)}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopyOwner(d.owner)}
                                className="text-gray-500 hover:text-white px-1 py-0.5 rounded text-[9px] bg-black/40 border border-purple-900"
                                title="Copy full address"
                              >
                                {copiedOwner === d.owner ? '✓' : '⧉'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-600">Unassigned</span>
                          )}
                        </td>

                        {/* Status */}
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

                        {/* Weight & Boost */}
                        <td className="py-2.5 px-3 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#00FF66]">{d.current_weight || 100}</span>
                            <span className="text-[10px] text-gray-400">WGT</span>
                            <span className="text-gray-600">•</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                boosts >= 5
                                  ? 'bg-pink-950/60 text-[#FF007F] border border-[#FF007F]/40'
                                  : boosts > 0
                                  ? 'bg-cyan-950/60 text-[#00F0FF] border border-[#00F0FF]/40'
                                  : 'text-gray-500'
                              }`}
                            >
                              {boosts}/5
                            </span>
                          </div>
                        </td>

                        {/* Available To Claim (Pending On-Chain) */}
                        <td className="py-2.5 px-3 font-mono font-bold">
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                              hasClaimable
                                ? 'bg-cyan-950/70 border border-[#00F0FF] text-[#00F0FF] drop-shadow-[0_0_6px_rgba(0,240,255,0.4)]'
                                : 'text-gray-400'
                            }`}
                          >
                            <span>{formatEthOrUsdt(d.availableToClaimEth, isUsdt, ethPrice)}</span>
                          </div>
                        </td>

                        {/* User Claimed (Cumulative Past Claims) */}
                        <td className="py-2.5 px-3 font-mono font-bold">
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                              d.claimedEth > 0
                                ? 'bg-yellow-950/60 border border-[#FFD700]/60 text-[#FFD700]'
                                : 'text-gray-500'
                            }`}
                          >
                            <span>{formatEthOrUsdt(d.claimedEth, isUsdt, ethPrice)}</span>
                          </div>
                        </td>

                        {/* User Total Earn (Claimed + Available) */}
                        <td className="py-2.5 px-3 font-mono font-extrabold">
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                              d.totalEarnedEth > 0
                                ? 'bg-pink-950/70 border border-[#FF007F] text-[#FF80BE] drop-shadow-[0_0_6px_rgba(255,0,127,0.3)]'
                                : 'text-gray-500'
                            }`}
                          >
                            <span>{formatEthOrUsdt(d.totalEarnedEth, isUsdt, ethPrice)}</span>
                          </div>
                        </td>

                        {/* Est Next 5H */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-gray-300">
                          ~{formatEthOrUsdt(d.estEth, isUsdt, ethPrice)}
                        </td>

                        {/* Updated */}
                        <td className="py-2.5 px-3 text-[10px] text-gray-500 whitespace-nowrap">
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

      {/* TAB: OPERATOR WALLETS & REWARDS AUDIT */}
      {activeTab === 'wallets' && (
        <section className="bg-[#0f0729]/95 border-2 border-[#FFD700] rounded-xl p-5 shadow-[6px_6px_0px_#000] space-y-5 font-mono">
          {/* View Mode Switcher: Desks vs Wallets */}
          <div className="flex items-center justify-between pb-2 border-b border-purple-900/60">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">VIEW MODE:</span>
              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  setActiveTab('desks');
                }}
                className="px-3 py-1 text-[10px] rounded font-bold bg-black/60 text-gray-400 border border-purple-900 hover:text-[#00FF66] hover:border-[#00FF66]"
              >
                [ 🗂 VIEW BY INDIVIDUAL DESKS ({filteredDesks.length}) ]
              </button>
              <button
                type="button"
                className="px-3 py-1 text-[10px] rounded font-bold bg-[#FFD700] text-black border border-[#FFD700] font-extrabold shadow-[2px_2px_0px_#000]"
              >
                [ 👛 VIEW BY OPERATOR WALLETS ({walletSummaries.length}) ]
              </button>
            </div>
            <div className="text-[10px] text-gray-400 hidden sm:block">
              NFT Supply: <strong className="text-[#00F0FF]">{(globalStats?.nftTotalSupply || 1250).toLocaleString()}</strong> • Active: <strong className="text-[#00FF66]">{activeDesksCount}</strong>
            </div>
          </div>

          {/* Wallets Aggregated Performance HUD */}
          {/* Wallets Aggregated Performance HUD */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Total User Spend */}
            <div className="bg-[#140833] border-2 border-[#FFD700] p-3.5 rounded-xl shadow-[3px_3px_0px_#000]">
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                TOTAL USER SPEND ($)
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#FFD700] mt-1 drop-shadow-[0_0_8px_rgba(255,215,0,0.3)]">
                ${totalWalletSpentUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[9px] text-yellow-300 mt-1 font-mono">
                {Number((totalWalletSpentApe / 1e6).toFixed(2))}M $APE On Desks & Boosts
              </div>
            </div>

            {/* 2. Total User Earned */}
            <div className="bg-[#140833] border-2 border-[#00F0FF] p-3.5 rounded-xl shadow-[3px_3px_0px_#000]">
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                TOTAL USER EARNED ($)
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#00F0FF] mt-1 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                ${totalWalletEarnedUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[9px] text-cyan-300 mt-1 font-mono">
                {totalWalletEarnedEth.toFixed(4)} ETH ({totalWalletClaimedEth.toFixed(4)} ETH claimed)
              </div>
            </div>

            {/* 3. Net Protocol PnL & ROI */}
            <div className={`bg-[#140833] border-2 p-3.5 rounded-xl shadow-[3px_3px_0px_#000] ${
              totalWalletNetProfitUsd >= 0 ? 'border-[#00FF66]' : 'border-pink-600'
            }`}>
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                NET USER PnL & ROI ($)
              </div>
              <div className={`text-xl sm:text-2xl font-extrabold mt-1 ${
                totalWalletNetProfitUsd >= 0 ? 'text-[#00FF66] drop-shadow-[0_0_8px_rgba(0,255,102,0.4)]' : 'text-[#FF80BE]'
              }`}>
                {totalWalletNetProfitUsd >= 0 ? '+' : ''}${totalWalletNetProfitUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[9px] text-gray-300 mt-1 font-mono">
                {totalWalletRoi >= 0 ? '+' : ''}{totalWalletRoi.toFixed(1)}% ROI • {walletsProfitableCount} of {walletSummaries.length} in profit
              </div>
            </div>

            {/* 4. Operator Wallets & Active Desks */}
            <div className="bg-[#140833] border-2 border-purple-700 p-3.5 rounded-xl shadow-[3px_3px_0px_#000]">
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                OPERATOR WALLETS
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                {walletSummaries.length} <span className="text-xs text-gray-400">WALLETS</span>
              </div>
              <div className="text-[9px] text-[#00FF66] mt-1 font-mono">
                {activeDesksCount} Active Desks ({totalDbWeight} Total Weight)
              </div>
            </div>
          </div>

          {/* Search, Filters, Sort, and CSV Export Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-900/60 font-mono">
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                placeholder="Search Operator Wallet (0x...) or Token ID (#...)"
                value={walletSearch}
                onChange={(e) => {
                  setWalletSearch(e.target.value);
                  setWalletPage(1);
                }}
                className="flex-1 bg-black/70 border-2 border-purple-800 focus:border-[#FFD700] px-3.5 py-2 text-xs text-white rounded-lg outline-none"
              />

              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: `ALL (${walletSummaries.length})` },
                  { id: 'profit', label: `PROFITABLE (${walletsProfitableCount})` },
                  { id: 'claimed', label: `CLAIMED (${walletsWithClaimsCount})` },
                  { id: 'pending', label: `HAS PENDING (${walletsWithPendingCount})` },
                  { id: 'active', label: `ACTIVE DESKS (${walletSummaries.filter((w) => w.activeDesks.length > 0).length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      sound?.playClick?.();
                      setWalletFilter(f.id);
                      setWalletPage(1);
                    }}
                    className={`px-2.5 py-1.5 text-[10px] rounded font-bold border ${
                      walletFilter === f.id
                        ? 'bg-[#FFD700] text-black border-[#FFD700]'
                        : 'bg-black/50 text-gray-400 border-purple-900 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={walletSort}
                onChange={(e) => {
                  sound?.playClick?.();
                  setWalletSort(e.target.value);
                  setWalletPage(1);
                }}
                className="bg-black/80 border border-purple-800 text-gray-300 text-[10px] font-bold px-2.5 py-2 rounded-lg outline-none cursor-pointer"
                title="Sort Wallets By"
              >
                <option value="earned">Sort: Highest $ Earned</option>
                <option value="spend">Sort: Highest $ Spent</option>
                <option value="profit">Sort: Highest Net Profit ($)</option>
                <option value="claimed">Sort: Highest Claimed</option>
                <option value="pending">Sort: Highest Pending</option>
                <option value="weight">Sort: Highest Weight</option>
                <option value="desks">Sort: Most Desks</option>
              </select>

              <button
                type="button"
                onClick={handleExportWalletCsv}
                disabled={walletSummaries.length === 0}
                className="pixel-btn pixel-btn-black px-3.5 py-2 text-[10px] font-bold text-[#FFD700] hover:text-white border border-yellow-700 rounded shadow-[2px_2px_0px_#000] whitespace-nowrap"
              >
                [ ⤓ EXPORT WALLET CSV ]
              </button>
            </div>
          </div>

          {/* Wallets Table */}
          {filteredWallets.length === 0 ? (
            <div className="p-8 text-center space-y-2 bg-[#130832]/60 rounded-lg border border-purple-900/40">
              <div className="text-gray-400 text-xs">
                No operator wallets match the current search or filter criteria.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-purple-900/60 bg-[#160838] text-gray-400 text-[10px] uppercase">
                    <th className="py-2.5 px-3">Operator Wallet</th>
                    <th className="py-2.5 px-3">Desks & Tokens</th>
                    <th className="py-2.5 px-3">Weight & Share</th>
                    <th className="py-2.5 px-3 text-[#FFD700]">Total $ Spent</th>
                    <th className="py-2.5 px-3 text-[#00F0FF]">Total $ Earned</th>
                    <th className="py-2.5 px-3 text-[#00FF66]">Net PnL ($)</th>
                    <th className="py-2.5 px-3">Last Claim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-900/30">
                  {paginatedWallets.map((w) => {
                    const isAdminWallet =
                      w.normalizedAddress === ADMIN_ADDRESS.toLowerCase() ||
                      w.normalizedAddress === '0xb8e3dfdd19b6bf35b9fd87f8373f7f82c53bc93c';
                    const isTreasuryWallet =
                      w.normalizedAddress === TREASURY_ADDRESS.toLowerCase();
                    const weightShare = (
                      (w.totalWeight / Math.max(1, totalDbWeight)) *
                      100
                    ).toFixed(1);

                    return (
                      <tr key={w.normalizedAddress} className="hover:bg-purple-950/30 transition-colors">
                        {/* Operator Wallet */}
                        <td className="py-2.5 px-3 font-mono text-white">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <a
                              href={`https://explorer.robinhood.com/address/${w.address}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-[#00FF66] hover:underline decoration-dotted"
                              title={w.address}
                            >
                              {w.address.slice(0, 6)}...{w.address.slice(-4)}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyOwner(w.address)}
                              className="text-gray-500 hover:text-white px-1 py-0.5 rounded text-[9px] bg-black/40 border border-purple-900"
                              title="Copy full wallet address"
                            >
                              {copiedOwner === w.address ? '✓' : '⧉'}
                            </button>
                            {isAdminWallet && (
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/60">
                                ADMIN
                              </span>
                            )}
                            {isTreasuryWallet && (
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-cyan-950/60 text-[#00F0FF] border border-[#00F0FF]/60">
                                TREASURY
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Desks & Tokens */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="font-bold text-white">
                                {w.activeDesks.length}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                / {w.desks.length} Desks Active
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {w.tokenIds.slice(0, 5).map((tid) => (
                                <a
                                  key={tid}
                                  href={`https://opensea.io/assets/robinhood/0xd3b030e9281fcd8797af6dc437636b24bdfe7902/${tid}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-1.5 py-0.5 rounded bg-black/60 border border-purple-800 text-[9px] font-mono text-cyan-300 hover:border-cyan-400"
                                  title={`View Token #${tid} on OpenSea`}
                                >
                                  #{tid}
                                </a>
                              ))}
                              {w.tokenIds.length > 5 && (
                                <span className="text-[9px] text-gray-500 self-center">
                                  +{w.tokenIds.length - 5} more
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Weight & Share */}
                        <td className="py-2.5 px-3 font-mono">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#00FF66]">{w.totalWeight} WGT</span>
                            <span className="text-[10px] text-gray-400">{weightShare}% Share</span>
                          </div>
                        </td>

                        {/* Total $ Spent */}
                        <td className="py-2.5 px-3 font-mono">
                          <div className="flex flex-col">
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded w-fit bg-yellow-950/70 border border-[#FFD700] text-[#FFD700] drop-shadow-[0_0_6px_rgba(255,215,0,0.3)]">
                              <span className="text-xs font-extrabold">${w.spentUsd.toFixed(2)}</span>
                            </div>
                            <span className="text-[9px] text-gray-300 mt-0.5 font-bold">
                              {Number(w.totalApebrokeSpent.toFixed(0)).toLocaleString()} $APE
                            </span>
                            <span className="text-[8px] text-gray-500">
                              Act: {(w.activationSpendApe / 1e3).toFixed(0)}k • Boost: {(w.boostSpendApe / 1e3).toFixed(0)}k
                            </span>
                          </div>
                        </td>

                        {/* Total $ Earned */}
                        <td className="py-2.5 px-3 font-mono">
                          <div className="flex flex-col">
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded w-fit bg-cyan-950/70 border border-[#00F0FF] text-[#00F0FF] drop-shadow-[0_0_6px_rgba(0,240,255,0.3)]">
                              <span className="text-xs font-extrabold">${w.earnedUsd.toFixed(2)}</span>
                            </div>
                            <span className="text-[9px] text-[#00FF66] mt-0.5 font-bold">
                              {w.totalEarnedEth.toFixed(6)} ETH
                            </span>
                            <span className="text-[8px] text-gray-400">
                              Claimed: ${w.claimedUsd.toFixed(2)} • Pending: ${w.availableUsd.toFixed(2)}
                            </span>
                          </div>
                        </td>

                        {/* Net PnL ($) */}
                        <td className="py-2.5 px-3 font-mono">
                          <div className="flex flex-col">
                            <div
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded w-fit ${
                                w.netProfitUsd >= 0
                                  ? 'bg-emerald-950/80 border border-[#00FF66] text-[#00FF66] drop-shadow-[0_0_6px_rgba(0,255,102,0.3)]'
                                  : 'bg-red-950/80 border border-[#FF2247] text-[#FF80BE]'
                              }`}
                            >
                              <span className="text-xs font-extrabold">
                                {w.netProfitUsd >= 0 ? '+' : ''}${w.netProfitUsd.toFixed(2)}
                              </span>
                              <span className="text-[9px] font-bold">
                                ({w.roiPercent >= 0 ? '+' : ''}{w.roiPercent.toFixed(1)}%)
                              </span>
                            </div>
                            <span className="text-[8px] text-gray-400 mt-0.5">
                              ROI: {w.spentUsd > 0 ? (w.earnedUsd / w.spentUsd).toFixed(2) : '∞'}x Payout
                            </span>
                          </div>
                        </td>

                        {/* Last Claim Date */}
                        <td className="py-2.5 px-3 text-[10px] text-gray-400 font-mono whitespace-nowrap">
                          {w.lastClaimAt ? (
                            <span title={new Date(w.lastClaimAt).toLocaleString()}>
                              {new Date(w.lastClaimAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          ) : (
                            <span className="text-gray-600">None</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {totalWalletPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-purple-900/50 text-xs">
                  <span className="text-gray-400">
                    Showing {(walletPage - 1) * itemsPerPage + 1} -{' '}
                    {Math.min(walletPage * itemsPerPage, filteredWallets.length)} of {filteredWallets.length} wallets
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={walletPage <= 1}
                      onClick={() => setWalletPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 bg-black/60 border border-purple-800 text-gray-300 disabled:opacity-30 rounded"
                    >
                      ← PREV
                    </button>
                    <span className="text-[#FFD700] font-bold">
                      {walletPage} / {totalWalletPages}
                    </span>
                    <button
                      type="button"
                      disabled={walletPage >= totalWalletPages}
                      onClick={() => setWalletPage((p) => Math.min(totalWalletPages, p + 1))}
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
              <div className="text-[9px] text-gray-400">
                {isUsdt ? 'TOTAL DISTRIBUTED (USDT)' : 'TOTAL ETH DISTRIBUTED'}
              </div>
              <div className="text-base sm:text-lg font-extrabold text-[#FFD700]">
                {formatEthOrUsdt(effectiveTotalDistributed, isUsdt, ethPrice)}
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
                <span>SAFE & FAIR DYNAMIC 3-FACTOR DRIP ENGINE</span>
                <span className="px-2 py-0.5 bg-[#00F0FF]/20 border border-[#00F0FF] text-[9px] rounded text-[#00F0FF] font-bold">
                  {(Number(globalStats?.epochEmissionBps || 500) / 100).toFixed(1)}% / 5h
                </span>
              </div>
              <div className="text-[10px] text-gray-300 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span>Benchmark Floor: <strong className="text-white">{Number(globalStats?.benchmarkWeightFloor || 2000)} WGT</strong></span>
                <span>Active Weight: <strong className="text-[#00FF66]">{Number(globalStats?.totalEligibleWeight || 0)} WGT</strong></span>
                <span>Available Pool: <strong className="text-[#FFD700]">{formatEthOrUsdt(globalStats?.availableRewardPool || globalStats?.rewardPoolBalance || 0n, isUsdt, ethPrice)}</strong></span>
              </div>
            </div>
            <button
              type="button"
              disabled={isDistributingEpoch}
              onClick={handleTriggerEpochDistribution}
              className="pixel-btn pixel-btn-vibrant-cyan px-4 py-2.5 text-xs font-extrabold rounded-lg shadow-[2px_2px_0px_#000] disabled:opacity-40 whitespace-nowrap"
            >
              {isDistributingEpoch ? '[ SETTLING EPOCH... ]' : '[ TRIGGER EPOCH DISTRIBUTION ]'}
            </button>
          </div>

          {/* MARKETING / STARTING STAGE: INSTANT REWARD DISTRIBUTION */}
          <div className="bg-gradient-to-r from-[#1c0b38] to-[#12072e] p-5 rounded-xl border-2 border-[#FF007F]/70 space-y-4 shadow-[4px_4px_0px_#000]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#FF007F]/30 pb-3">
              <div>
                <div className="flex items-center gap-2 font-extrabold text-[#FF007F] text-xs sm:text-sm tracking-wider uppercase">
                  <span>MARKETING & LAUNCH STAGE: INSTANT DISTRIBUTION</span>
                  <span className="px-2 py-0.5 bg-[#FF007F]/20 border border-[#FF007F] text-[9px] rounded text-white font-bold">
                    100% WEIGHT SPLIT
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 mt-1">
                  Distribute the entire pool or an adjusted custom ETH amount directly to active desks in this epoch (bypasses 5% drip / benchmark floor for launch promos).
                </p>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-gray-400 block uppercase">
                  {isUsdt ? 'Available Pool (USDT)' : 'Available Unallocated Pool'}
                </span>
                <span className="text-sm font-extrabold text-[#FFD700]">
                  {formatEthOrUsdt(globalStats?.availableRewardPool || globalStats?.rewardPoolBalance || 0n, isUsdt, ethPrice)}
                </span>
              </div>
            </div>

            {/* Live Simulation Preview */}
            <div className="bg-black/60 border border-purple-900/60 p-3 rounded-lg text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="text-gray-400">
                  Active Desks: <strong className="text-white">{allDesks.filter((d) => d.active).length} desks</strong>
                </span>
                <span className="text-gray-400">
                  Total Active Weight: <strong className="text-[#00FF66]">{Number(globalStats?.totalEligibleWeight || 0)} WGT</strong>
                </span>
                <span className="text-gray-400">
                  Base Desk (100 WGT) Share:{' '}
                  <strong className="text-[#00F0FF]">
                    {Number(globalStats?.totalEligibleWeight || 0n) > 0
                      ? `${((100 / Number(globalStats?.totalEligibleWeight || 100)) * 100).toFixed(1)}%`
                      : '0%'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Action Buttons & Custom Amount Input */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                disabled={isDistributingImmediate || (globalStats?.availableRewardPool || 0n) === 0n || (globalStats?.totalEligibleWeight || 0n) === 0n}
                onClick={() => handleDistributeImmediate('0')}
                className="w-full sm:w-auto pixel-btn pixel-btn-vibrant-crimson px-5 py-2.5 text-xs font-extrabold rounded-lg shadow-[3px_3px_0px_#000] whitespace-nowrap disabled:opacity-40"
              >
                {isDistributingImmediate ? '[ EXECUTING... ]' : '[ DISTRIBUTE 100% OF POOL NOW ]'}
              </button>
              <button
                type="button"
                disabled={isDistributingImmediate || (globalStats?.availableRewardPool || 0n) === 0n || (globalStats?.totalEligibleWeight || 0n) === 0n}
                onClick={() => {
                  const poolEth = Number(formatEther(globalStats?.availableRewardPool || globalStats?.rewardPoolBalance || 0n));
                  const half = (poolEth / 2).toFixed(4);
                  handleDistributeImmediate(half);
                }}
                className="w-full sm:w-auto pixel-btn pixel-btn-vibrant-gold px-4 py-2.5 text-xs font-bold rounded-lg shadow-[2px_2px_0px_#000] whitespace-nowrap disabled:opacity-40"
              >
                [ DISTRIBUTE 50% ]
              </button>

              <div className="flex-1 w-full flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="Adjusted ETH amount"
                    value={immediateEthInput}
                    onChange={(e) => setImmediateEthInput(e.target.value)}
                    className="w-full bg-black/80 border-2 border-purple-800 focus:border-[#FF007F] px-3 py-2 text-xs text-white rounded-lg outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs text-[#FF007F] font-bold">ETH</span>
                </div>
                <button
                  type="button"
                  disabled={isDistributingImmediate || !immediateEthInput || parseFloat(immediateEthInput) <= 0 || (globalStats?.totalEligibleWeight || 0n) === 0n}
                  onClick={() => handleDistributeImmediate(immediateEthInput)}
                  className="pixel-btn pixel-btn-vibrant-cyan px-4 py-2 text-xs font-bold rounded-lg shadow-[2px_2px_0px_#000] whitespace-nowrap disabled:opacity-40"
                >
                  [ DISTRIBUTE ]
                </button>
              </div>
            </div>
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
                    <th className="py-2.5 px-3">{isUsdt ? 'Amount (USDT)' : 'Amount Distributed'}</th>
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
                        {formatEthOrUsdt(dep.amount_eth, isUsdt, ethPrice)}
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

      {/* TAB: 24H STAKING PROTOCOL CONTROLLER */}
      {activeTab === 'staking' && (
        <section className="space-y-6">
          {/* Staking Protocol High-Level HUD */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-[#140833] border-2 border-[#00FF66] p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400 uppercase font-mono">TOTAL $APEBROKE STAKED</div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#00FF66] mt-1 drop-shadow-[0_0_8px_rgba(0,255,102,0.3)]">
                {Number(formatEther(stakingStats?.totalStaked || 0n)).toLocaleString('en-US', {
                  maximumFractionDigits: 0,
                })}
              </div>
              <div className="text-[9px] text-gray-300 mt-1 font-mono">
                Across {stakingStats?.activePositionsCount || 0} active positions
              </div>
            </div>

            <div className="bg-[#140833] border-2 border-[#FFD700] p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400 uppercase font-mono">
                {isUsdt ? 'ETH REWARD POOL (USDT)' : 'ETH REWARD POOL'}
              </div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#FFD700] mt-1 drop-shadow-[0_0_8px_rgba(255,215,0,0.3)]">
                {formatEthOrUsdt(stakingStats?.rewardPoolBalance || 0n, isUsdt, ethPrice)}
              </div>
              <div className="text-[9px] text-yellow-400 mt-1 font-mono">
                Available unallocated reward pool
              </div>
            </div>

            <div className="bg-[#140833] border-2 border-[#00F0FF] p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400 uppercase font-mono">
                {isUsdt ? 'CURRENT PERIOD YIELD (USDT)' : 'CURRENT PERIOD YIELD'}
              </div>
              <div className="text-lg sm:text-2xl font-extrabold text-[#00F0FF] mt-1 drop-shadow-[0_0_8px_rgba(0,240,255,0.3)]">
                {formatEthOrUsdt(stakingStats?.currentPeriodReward || 0n, isUsdt, ethPrice)}
              </div>
              <div className="text-[9px] text-[#00F0FF] mt-1 font-mono">
                Period #{stakingStats?.currentPeriodId?.toString() || '1'} ({(Number(stakingStats?.rewardRateBps || 1000n) / 100).toFixed(1)}% rate)
              </div>
            </div>

            <div className="bg-[#140833] border-2 border-purple-800 p-4 rounded-xl shadow-[4px_4px_0px_#000]">
              <div className="text-[10px] text-gray-400 uppercase font-mono">PROTOCOL STATUS</div>
              <div className="text-lg sm:text-2xl font-extrabold mt-1">
                {stakingStats?.isPaused ? (
                  <span className="text-[#FF2247]">PAUSED</span>
                ) : (
                  <span className="text-[#00FF66]">OPERATIONAL</span>
                )}
              </div>
              <div className="text-[9px] text-gray-400 mt-1 font-mono">
                Gated: ≥ 2 Ape Broker NFTs
              </div>
            </div>
          </div>

          {/* Staking Admin Actions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Deposit ETH into Staking Reward Pool */}
            <div className="bg-[#0f0729]/95 border-2 border-[#FFD700] rounded-xl p-5 shadow-[6px_6px_0px_#000] space-y-4 font-mono">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-extrabold text-[#FFD700] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse" />
                  <span>DEPOSIT ETH REWARD POOL</span>
                </h3>
                <span className="text-[10px] text-gray-400">
                  Pool: {formatEthOrUsdt(stakingStats?.rewardPoolBalance || 0n, isUsdt, ethPrice)}
                </span>
              </div>
              <p className="text-xs text-gray-300">
                Deposit native ETH to fund the 24-hour dynamic staking reward pool. 
                Each period dispenses a proportional fraction ({((Number(stakingStats?.rewardRateBps || 1000n)) / 100).toFixed(0)}%) of the remaining pool.
              </p>

              <form onSubmit={handleStakingDepositEth} className="space-y-3">
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="ETH Amount to Deposit (e.g. 1.0)"
                    value={stakingEthDepositInput}
                    onChange={(e) => setStakingEthDepositInput(e.target.value)}
                    disabled={isStakingAdminSubmitting}
                    className="w-full bg-black/80 border-2 border-purple-800 focus:border-[#FFD700] px-3 py-2.5 text-xs text-white rounded-lg outline-none font-mono"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-[#FFD700] font-bold">ETH</span>
                </div>

                {/* Quick amount presets */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-gray-400">QUICK:</span>
                  {['0.1', '0.25', '0.5', '1.0', '2.5'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        sound?.playClick?.();
                        setStakingEthDepositInput(amt);
                      }}
                      className="px-2 py-0.5 bg-[#1a0c3b] hover:bg-[#2b145e] text-[9px] text-yellow-300 rounded border border-yellow-700/50"
                    >
                      +{amt} ETH
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isStakingAdminSubmitting || !stakingEthDepositInput || parseFloat(stakingEthDepositInput) <= 0}
                  className="pixel-btn pixel-btn-vibrant-gold w-full py-2.5 text-xs font-extrabold rounded-lg shadow-[3px_3px_0px_#000] disabled:opacity-40"
                >
                  {isStakingAdminSubmitting ? '[ EXECUTING DEPOSIT... ]' : '[ DEPOSIT ETH TO STAKING POOL ]'}
                </button>
              </form>
            </div>

            {/* Card 2: Dynamic Reward Rate Configuration */}
            <div className="bg-[#0f0729]/95 border-2 border-[#00F0FF] rounded-xl p-5 shadow-[6px_6px_0px_#000] space-y-4 font-mono">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-extrabold text-[#00F0FF] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse" />
                  <span>DYNAMIC REWARD RATE (BPS)</span>
                </h3>
                <span className="text-[10px] text-gray-400">
                  Current: {stakingStats?.rewardRateBps?.toString() || '1000'} BPS ({((Number(stakingStats?.rewardRateBps || 1000n)) / 100).toFixed(1)}%)
                </span>
              </div>
              <p className="text-xs text-gray-300">
                Sets the dynamic percentage of the available ETH reward pool distributed per 24-hour period (100 = 1.0%, 5,000 = 50.0%).
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="50"
                      min="100"
                      max="5000"
                      placeholder="Enter BPS (e.g. 1000 for 10%)"
                      value={stakingBpsInput}
                      onChange={(e) => setStakingBpsInput(e.target.value)}
                      disabled={isStakingAdminSubmitting}
                      className="w-full bg-black/80 border-2 border-purple-800 focus:border-[#00F0FF] px-3 py-2.5 text-xs text-white rounded-lg outline-none font-mono"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[#00F0FF] font-bold">BPS</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStakingSetBps()}
                    disabled={isStakingAdminSubmitting || !stakingBpsInput}
                    className="pixel-btn pixel-btn-vibrant-cyan px-4 py-2.5 text-xs font-bold rounded-lg shadow-[2px_2px_0px_#000] whitespace-nowrap disabled:opacity-40"
                  >
                    [ SET ]
                  </button>
                </div>

                {/* Quick rate presets */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-gray-400">PRESETS:</span>
                  {[
                    { label: '5%', bps: 500 },
                    { label: '10%', bps: 1000 },
                    { label: '15%', bps: 1500 },
                    { label: '20%', bps: 2000 },
                    { label: '25%', bps: 2500 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleStakingSetBps(p.bps)}
                      disabled={isStakingAdminSubmitting}
                      className="px-2 py-0.5 bg-[#0a2333] hover:bg-[#123e59] text-[9px] text-cyan-300 rounded border border-cyan-800"
                    >
                      {p.label} ({p.bps})
                    </button>
                  ))}
                </div>

                {/* Emergency Pause Toggle */}
                <div className="pt-3 border-t border-purple-900/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Emergency Staking Pause</div>
                    <div className="text-[9px] text-gray-400">Temporarily suspends new stakes while protecting existing positions</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleStakingTogglePause}
                    disabled={isStakingAdminSubmitting}
                    className={`pixel-btn px-4 py-2 text-xs font-extrabold rounded-lg shadow-[2px_2px_0px_#000] ${
                      stakingStats?.isPaused
                        ? 'bg-[#00FF66] text-black hover:bg-[#20ff78]'
                        : 'bg-[#FF2247] text-white hover:bg-red-600'
                    }`}
                  >
                    {stakingStats?.isPaused ? '[ ▶ UNPAUSE STAKING ]' : '[ ⏸ PAUSE STAKING ]'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Staking Contract Architecture & Audit Info */}
          <div className="bg-[#0f0729]/95 border-2 border-purple-800 rounded-xl p-5 shadow-[4px_4px_0px_#000] space-y-3 font-mono">
            <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
              24-HOUR STAKING CONTRACT ARCHITECTURE & SECURITY
            </h3>
            <div className="divide-y divide-purple-900/40 text-xs">
              <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-gray-400">Staking Contract Address:</span>
                <span className="text-[#00F0FF] break-all select-all">{STAKING_CONTRACT_ADDRESS}</span>
              </div>
              <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-gray-400">Lock Duration:</span>
                <span className="text-[#00FF66] font-bold">Strict 24 Hours (86,400 Seconds)</span>
              </div>
              <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-gray-400">Access Gating:</span>
                <span className="text-[#FF80BE] font-bold">Holding ≥ 2 Ape Broker NFTs Required</span>
              </div>
              <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-gray-400">Principal Custody Guarantee:</span>
                <span className="text-[#FFD700] font-bold">100% Locked Custody — Zero Admin Access to User Principal</span>
              </div>
              <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-gray-400">Reward Accounting Engine:</span>
                <span className="text-white">Continuous Cumulative Share Index (MasterChef Non-Diluting Debt Formula)</span>
              </div>
              <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-gray-400">Lifetime Total Rewards Distributed:</span>
                <span className="text-[#00FF66] font-bold">
                  {formatEthOrUsdt(stakingStats?.totalEthRewardsDistributed || 0n, isUsdt, ethPrice)}
                </span>
              </div>
              <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-gray-400">Lifetime Total Rewards Claimed:</span>
                <span className="text-[#FFD700] font-bold">
                  {formatEthOrUsdt(stakingStats?.totalEthRewardsClaimed || 0n, isUsdt, ethPrice)}
                </span>
              </div>
            </div>
          </div>
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
                      <th className="py-2 px-3">{isUsdt ? 'Amount (USDT)' : 'Amount ETH'}</th>
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
                        <td className="py-2 px-3 font-bold text-[#00F0FF]">
                          {formatEthOrUsdt(c.amount_eth, isUsdt, ethPrice)}
                        </td>
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
                <div className="text-sm font-bold text-[#00FF66] mt-0.5">
                  {Number(formatEther(globalStats?.activationFee || 349693n * 10n ** 18n)).toLocaleString()} $APEBROKE
                </div>
              </div>
              <div className="bg-black/50 p-3 rounded-lg border border-purple-900/50">
                <span className="text-gray-400 text-[10px]">Base Boost Cost:</span>
                <div className="text-sm font-bold text-[#FFD700] mt-0.5">
                  {Number(formatEther(globalStats?.baseBoostCost || 349693n * 10n ** 18n)).toLocaleString()} $APEBROKE
                </div>
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
                <span className="text-gray-400 text-[10px]">
                  {isUsdt ? 'Available Drip Pool (USDT):' : 'Available Drip Pool:'}
                </span>
                <div className="text-sm font-bold text-[#FFD700] mt-0.5">
                  {formatEthOrUsdt(
                    globalStats?.availableRewardPool !== undefined
                      ? globalStats?.availableRewardPool
                      : (globalStats?.rewardPoolBalance || 0n),
                    isUsdt,
                    ethPrice
                  )}
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
                {isDistributingEpoch ? '[ SETTLING... ]' : '[ MANUAL SETTLE EPOCH ]'}
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

          {/* TOKEN PRICE SCALING: DYNAMIC BOOST & ACTIVATION FEE CONTROLS */}
          <div className="bg-[#0f0729]/95 border-2 border-purple-800 rounded-xl p-5 shadow-[4px_4px_0px_#000] space-y-4">
            <div className="border-b border-purple-900/60 pb-3">
              <h3 className="text-xs sm:text-sm font-extrabold text-[#FFD700] uppercase tracking-wider">
                TOKEN PRICE SCALING: BOOST & ACTIVATION FEE QUANTITY CONTROLS
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Adjust required $APEBROKE token amounts for activation and boosting. When the token price increases, lower these quantities so participating remains affordable for all brokers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Adjust Base Boost Cost Form */}
              <form onSubmit={handleUpdateBaseBoostCost} className="bg-black/50 border border-purple-900/60 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-300 font-bold">Base Boost Cost:</span>
                  <span className="text-[#FFD700]">
                    Current: {Number(formatEther(globalStats?.baseBoostCost || 349693n * 10n ** 18n)).toLocaleString()} $APE
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50000"
                    value={boostCostInput}
                    onChange={(e) => setBoostCostInput(e.target.value)}
                    className="flex-1 bg-black/80 border border-purple-700/80 rounded px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD700]"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !boostCostInput}
                    className="pixel-btn pixel-btn-vibrant-gold px-3 py-2 text-xs font-bold whitespace-nowrap disabled:opacity-40"
                  >
                    [ SET BOOST ]
                  </button>
                </div>
                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-gray-500">Quick chips:</span>
                  {['35000', '70000', '150000', '349693'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBoostCostInput(preset)}
                      className="px-2 py-0.5 bg-purple-950/60 hover:bg-purple-900 text-[9px] text-[#FFD700] rounded border border-purple-800/80"
                    >
                      {Number(preset).toLocaleString()}
                    </button>
                  ))}
                </div>
              </form>

              {/* Adjust Activation Fee Form */}
              <form onSubmit={handleUpdateActivationFee} className="bg-black/50 border border-purple-900/60 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-300 font-bold">Desk Activation Fee:</span>
                  <span className="text-[#00FF66]">
                    Current: {Number(formatEther(globalStats?.activationFee || 349693n * 10n ** 18n)).toLocaleString()} $APE
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 35000"
                    value={activationFeeInput}
                    onChange={(e) => setActivationFeeInput(e.target.value)}
                    className="flex-1 bg-black/80 border border-purple-700/80 rounded px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00FF66]"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !activationFeeInput}
                    className="pixel-btn pixel-btn-vibrant-green px-3 py-2 text-xs font-bold whitespace-nowrap disabled:opacity-40"
                  >
                    [ SET ACTIVATE ]
                  </button>
                </div>
                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-gray-500">Quick chips:</span>
                  {['25000', '50000', '100000', '349693'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setActivationFeeInput(preset)}
                      className="px-2 py-0.5 bg-purple-950/60 hover:bg-purple-900 text-[9px] text-[#00FF66] rounded border border-purple-800/80"
                    >
                      {Number(preset).toLocaleString()}
                    </button>
                  ))}
                </div>
              </form>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
