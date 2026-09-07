import React, { useState, useEffect, useMemo } from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { useApeBrokerStaking } from '../../hooks/useApeBrokerStaking';
import { useEthPrice, formatEthOrUsdt } from '../../hooks/useEthPrice';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

export function StakingPage({ onBackHome, onGoToDesk, onGoToAdmin, onGoToLuckyDraw }) {
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  const { ethPrice } = useEthPrice();

  // Currency Toggle State (ETH vs USDT) with localStorage persistence
  const [isUsdt, setIsUsdt] = useState(() => {
    try {
      return localStorage.getItem('apebroker_currency_mode') === 'USDT';
    } catch (e) {
      return false;
    }
  });

  const toggleCurrency = (toUsdt) => {
    sound?.playClick?.();
    const nextVal = typeof toUsdt === 'boolean' ? toUsdt : !isUsdt;
    setIsUsdt(nextVal);
    try {
      localStorage.setItem('apebroker_currency_mode', nextVal ? 'USDT' : 'ETH');
    } catch (e) {}
  };

  const {
    address,
    isConnected,
    isCorrectChain,
    isContractConfigured,
    switchToRobinhoodChain,
    isLoading,
    globalStats,
    userBalances,
    userStakes,
    refetchGlobalStats,
    refetchUserData,
    approveApebroke,
    stakeTokens,
    claimReward,
    withdrawPrincipal,
    withdrawAndClaim,
  } = useApeBrokerStaking();

  // Staking Input Form State
  const [stakeAmountInput, setStakeAmountInput] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null); // stakeId for claim/withdraw
  const [actionType, setActionType] = useState(null); // 'claim' | 'withdraw' | 'withdrawAndClaim'
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Live Timer Tick (Updates every second for positions)
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestamp(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Helper
  const formatEthReward = (weiAmount) => {
    return formatEthOrUsdt(weiAmount, isUsdt, ethPrice, { includeUnit: true });
  };

  // Human user token balance
  const userTokenBalanceHuman = useMemo(() => {
    try {
      return parseFloat(formatEther(userBalances?.apeBrokeBalance || 0n));
    } catch (e) {
      return 0;
    }
  }, [userBalances?.apeBrokeBalance]);

  // Check if current input exceeds allowance
  const parsedStakeAmountWei = useMemo(() => {
    try {
      if (!stakeAmountInput || isNaN(parseFloat(stakeAmountInput)) || parseFloat(stakeAmountInput) <= 0) {
        return 0n;
      }
      return parseEther(stakeAmountInput.trim());
    } catch (e) {
      return 0n;
    }
  }, [stakeAmountInput]);

  const needsApproval = useMemo(() => {
    if (parsedStakeAmountWei === 0n) return false;
    return (userBalances?.allowance || 0n) < parsedStakeAmountWei;
  }, [userBalances?.allowance, parsedStakeAmountWei]);

  // Dynamic Reward Preview Calculation for Input Amount
  const estimated24hRewardEth = useMemo(() => {
    if (parsedStakeAmountWei === 0n) return 0;
    const currentTotalStaked = globalStats?.totalStaked || 0n;
    const currentPeriodRewardWei = globalStats?.currentPeriodReward || 0n;
    
    // If no reward in current period, estimate 10% of current pool
    let effectivePoolRewardWei = currentPeriodRewardWei;
    if (effectivePoolRewardWei === 0n && (globalStats?.rewardPoolBalance || 0n) > 0n) {
      const bps = globalStats?.rewardRateBps || 1000n;
      effectivePoolRewardWei = ((globalStats.rewardPoolBalance) * bps) / 10000n;
    }

    if (effectivePoolRewardWei === 0n) return 0;

    const projectedTotalStaked = currentTotalStaked + parsedStakeAmountWei;
    if (projectedTotalStaked === 0n) return 0;

    // Proportional user share
    const userShareScaled = (parsedStakeAmountWei * 1000000n) / projectedTotalStaked;
    const estWei = (effectivePoolRewardWei * userShareScaled) / 1000000n;
    return parseFloat(formatEther(estWei));
  }, [parsedStakeAmountWei, globalStats]);

  // Handle Quick Percent Select
  const handleQuickPercent = (percent) => {
    sound?.playClick?.();
    if (!userTokenBalanceHuman || userTokenBalanceHuman <= 0) return;
    const calculated = (userTokenBalanceHuman * percent).toFixed(4);
    setStakeAmountInput(parseFloat(calculated).toString());
  };

  // Handle Approve
  const handleApprove = async () => {
    sound?.playClick?.();
    setErrorMsg(null);
    setFeedbackMsg(null);
    setIsApproving(true);
    try {
      await approveApebroke();
      sound?.playSuccess?.();
      setFeedbackMsg('Approval confirmed! You can now stake your $APEBROKE.');
    } catch (err) {
      console.error('Approve failed:', err);
      sound?.playError?.();
      setErrorMsg(err?.shortMessage || err?.message || 'Approval failed. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Stake
  const handleStake = async () => {
    sound?.playClick?.();
    setErrorMsg(null);
    setFeedbackMsg(null);

    if (parsedStakeAmountWei <= 0n) {
      setErrorMsg('Please enter a valid amount of $APEBROKE to stake.');
      return;
    }

    if (parsedStakeAmountWei > (userBalances?.apeBrokeBalance || 0n)) {
      setErrorMsg('Insufficient $APEBROKE balance in your wallet.');
      return;
    }

    if (!userBalances.isEligible) {
      setErrorMsg('You must hold at least 2 Ape Broker NFTs to stake tokens.');
      return;
    }

    setIsStaking(true);
    try {
      await stakeTokens(parsedStakeAmountWei);
      sound?.playSuccess?.();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00FF66', '#00F0FF', '#FFD700', '#FFFFFF'],
      });
      setFeedbackMsg(`Successfully staked ${stakeAmountInput} $APEBROKE for 24 hours!`);
      setStakeAmountInput('');
    } catch (err) {
      console.error('Stake failed:', err);
      sound?.playError?.();
      setErrorMsg(err?.shortMessage || err?.message || 'Staking failed. Please try again.');
    } finally {
      setIsStaking(false);
    }
  };

  // Handle Claim Single Stake
  const handleClaim = async (stakeId) => {
    sound?.playClick?.();
    setErrorMsg(null);
    setFeedbackMsg(null);
    setActionLoadingId(stakeId);
    setActionType('claim');
    try {
      await claimReward(stakeId);
      sound?.playSuccess?.();
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      setFeedbackMsg(`ETH rewards claimed successfully for Stake #${stakeId}!`);
    } catch (err) {
      console.error('Claim failed:', err);
      sound?.playError?.();
      setErrorMsg(err?.shortMessage || err?.message || 'Claim failed.');
    } finally {
      setActionLoadingId(null);
      setActionType(null);
    }
  };

  // Handle Withdraw Principal
  const handleWithdraw = async (stakeId) => {
    sound?.playClick?.();
    setErrorMsg(null);
    setFeedbackMsg(null);
    setActionLoadingId(stakeId);
    setActionType('withdraw');
    try {
      await withdrawPrincipal(stakeId);
      sound?.playSuccess?.();
      setFeedbackMsg(`Principal $APEBROKE withdrawn successfully for Stake #${stakeId}!`);
    } catch (err) {
      console.error('Withdraw failed:', err);
      sound?.playError?.();
      setErrorMsg(err?.shortMessage || err?.message || 'Withdraw failed.');
    } finally {
      setActionLoadingId(null);
      setActionType(null);
    }
  };

  // Handle Withdraw and Claim in one atomic call
  const handleWithdrawAndClaim = async (stakeId) => {
    sound?.playClick?.();
    setErrorMsg(null);
    setFeedbackMsg(null);
    setActionLoadingId(stakeId);
    setActionType('withdrawAndClaim');
    try {
      await withdrawAndClaim(stakeId);
      sound?.playSuccess?.();
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#00FF66', '#FFD700', '#00F0FF'],
      });
      setFeedbackMsg(`Stake #${stakeId} successfully settled: Principal withdrawn & ETH rewards claimed!`);
    } catch (err) {
      console.error('Withdraw & Claim failed:', err);
      sound?.playError?.();
      setErrorMsg(err?.shortMessage || err?.message || 'Withdraw and Claim failed.');
    } finally {
      setActionLoadingId(null);
      setActionType(null);
    }
  };

  // Countdown Formatter Helper
  const formatCountdown = (secs) => {
    const s = Math.max(0, secs);
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    return `${hours.toString().padStart(2, '0')}h ${minutes
      .toString()
      .padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="min-h-screen bg-[#070314] text-white font-pixel selection:bg-[#00FF66] selection:text-black relative pb-24">
      {/* CRT Scanline Background Overlay */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1d0944]/30 via-[#070314]/90 to-[#04010a] opacity-85" />

      {/* Sticky Top Navigation Bar */}
      <nav className="sticky top-0 z-40 w-full bg-[#0a051d]/95 backdrop-blur-md border-b-3 border-[#00FF66] px-3 sm:px-8 py-3 select-none shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sound?.playClick?.();
                if (onBackHome) onBackHome();
                else window.location.href = '/';
              }}
              className="hover:opacity-85 transition-opacity flex items-center gap-2"
            >
              <img
                src="/logo.png"
                alt="ApeSyndicate"
                className="w-8 h-8 object-contain pixelated shrink-0"
              />
              <span className="text-sm sm:text-base font-extrabold text-[#00FF66] tracking-wider whitespace-nowrap">
                APE BROKER STAKING
              </span>
            </button>
            <span className="hidden sm:inline-block px-2 py-0.5 bg-[#170a36] border border-purple-700 text-[9px] text-[#00F0FF] rounded font-mono">
              24-HOUR DYNAMIC POOL
            </span>
          </div>

          {/* Navigation Links & Wallet Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
            {/* Go to Broker Desk Button */}
            <button
              type="button"
              onClick={() => {
                sound?.playClick?.();
                if (onGoToDesk) onGoToDesk();
                else window.location.href = '/brokerdesk';
              }}
              className="pixel-btn pixel-btn-black px-2.5 sm:px-3 py-1.5 text-[9px] sm:text-xs font-bold text-gray-300 hover:text-[#00FF66] border-2 border-purple-800 rounded-lg shadow-[2px_2px_0px_#000] flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66]" />
              <span>[ BROKERDESK ]</span>
            </button>

            {/* Go to Lucky Draw Button */}
            <button
              type="button"
              onClick={() => {
                sound?.playClick?.();
                if (onGoToLuckyDraw) onGoToLuckyDraw();
                else window.location.href = '/luckydraw';
              }}
              className="pixel-btn pixel-btn-black px-2.5 sm:px-3 py-1.5 text-[9px] sm:text-xs font-bold text-[#FFD700] hover:text-white border-2 border-amber-600/80 rounded-lg shadow-[2px_2px_0px_#000] flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700] animate-bounce" />
              <span>[ 🎟️ LUCKY DRAW ]</span>
            </button>

            {/* Currency Toggle (ETH / USDT) */}
            <div className="flex items-center bg-[#150a33] border border-purple-800 rounded-lg p-0.5 shadow-[1px_1px_0px_#000]">
              <button
                type="button"
                onClick={() => toggleCurrency(false)}
                className={`px-2 py-1 text-[9px] font-bold rounded transition-colors ${
                  !isUsdt
                    ? 'bg-[#00F0FF] text-black shadow-[0_0_6px_rgba(0,240,255,0.4)]'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Display amounts in native ETH"
              >
                ETH
              </button>
              <button
                type="button"
                onClick={() => toggleCurrency(true)}
                className={`px-2 py-1 text-[9px] font-bold rounded transition-colors ${
                  isUsdt
                    ? 'bg-[#00FF66] text-black shadow-[0_0_6px_rgba(0,255,102,0.4)]'
                    : 'text-gray-400 hover:text-white'
                }`}
                title={`Display amounts converted to USDT (1 ETH = $${ethPrice.toFixed(2)})`}
              >
                USDT
              </button>
            </div>

            {/* Wallet Connect / Account Button */}
            {!isConnected ? (
              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  openConnectModal?.();
                }}
                className="pixel-btn pixel-btn-vibrant-lime px-3 sm:px-4 py-1.5 text-[9px] sm:text-xs font-extrabold rounded-lg shadow-[2px_2px_0px_#000]"
              >
                [ CONNECT WALLET ]
              </button>
            ) : !isCorrectChain ? (
              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  switchToRobinhoodChain();
                }}
                className="pixel-btn bg-[#FF2247] hover:bg-red-600 text-white border-2 border-white px-3 py-1.5 text-[9px] sm:text-xs font-bold rounded-lg animate-pulse"
              >
                [ SWITCH NETWORK ]
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-[#170a38] border border-purple-700 px-2.5 py-1.5 rounded-lg shadow-[2px_2px_0px_#000]">
                <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse" />
                <span className="font-mono text-[10px] text-gray-200">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    sound?.playClick?.();
                    disconnect();
                  }}
                  className="text-gray-400 hover:text-red-400 text-[10px] ml-1 font-mono"
                  title="Disconnect Wallet"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 pt-6 space-y-6">
        
        {/* Admin Quick Jump Banner (if admin connected) */}
        {globalStats?.isAdmin && (
          <div className="bg-[#241400] border-2 border-[#FFD700] p-3 rounded-xl flex items-center justify-between shadow-[4px_4px_0px_#000]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FFD700] animate-ping" />
              <span className="text-xs text-[#FFD700] font-bold">
                [ ADMIN DETECTED ] You have protocol operator privileges.
              </span>
            </div>
            {onGoToAdmin && (
              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  onGoToAdmin();
                }}
                className="pixel-btn px-3 py-1 text-[10px] font-extrabold bg-[#FFD700] text-black border-2 border-black rounded shadow-[2px_2px_0px_#000]"
              >
                [ OPEN ADMIN CONTROLLER ]
              </button>
            )}
          </div>
        )}

        {/* 2-NFT Gating Validator & Status Banner */}
        <section className="relative">
          {!isConnected ? (
            <div className="bg-[#150a36] border-2 border-purple-700 p-4 rounded-xl shadow-[4px_4px_0px_#000] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-900/50 border border-purple-500 flex items-center justify-center text-xl">
                  🔒
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-gray-200">
                    APE BROKER SYNDICATE GATED ACCESS
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                    Connect your Web3 wallet to verify holding at least 2 Ape Broker NFTs.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  openConnectModal?.();
                }}
                className="pixel-btn pixel-btn-vibrant-lime px-4 py-2 text-[10px] sm:text-xs font-extrabold rounded-lg shadow-[2px_2px_0px_#000] shrink-0"
              >
                [ CONNECT WALLET ]
              </button>
            </div>
          ) : userBalances.isEligible ? (
            <div className="bg-[#042413] border-2 border-[#00FF66] p-4 rounded-xl shadow-[4px_4px_0px_#000] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#00FF66]/20 border border-[#00FF66] flex items-center justify-center text-xl text-[#00FF66]">
                  ✓
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-extrabold text-[#00FF66]">
                      STAKING ACCESS UNLOCKED — SYNDICATE MEMBER
                    </span>
                    <span className="px-2 py-0.5 bg-[#00FF66] text-black text-[9px] font-extrabold rounded">
                      {userBalances.nftBalance} NFTS HELD
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-300 font-mono mt-0.5">
                    Your wallet qualifies for 24-hour $APEBROKE staking with dynamic ETH rewards pool yield.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono text-gray-400">STATUS:</span>
                <span className="text-[10px] font-extrabold text-[#00FF66] bg-black/40 px-2.5 py-1 rounded border border-[#00FF66]/40">
                  ELIGIBLE TO STAKE
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[#2a0b12] border-2 border-[#FF2247] p-4 rounded-xl shadow-[4px_4px_0px_#000] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FF2247]/20 border border-[#FF2247] flex items-center justify-center text-xl text-[#FF2247]">
                  ⚠️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-extrabold text-[#FF2247]">
                      STAKING ACCESS LOCKED — INSUFFICIENT NFTS
                    </h3>
                    <span className="px-2 py-0.5 bg-red-900/60 text-red-200 border border-red-500 text-[9px] font-mono rounded">
                      HELD: {userBalances.nftBalance} / 2 REQUIRED
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-300 font-mono mt-0.5">
                    Staking $APEBROKE requires holding at least 2 Ape Broker NFTs in your connected wallet.
                  </p>
                </div>
              </div>
              <a
                href="https://opensea.io/collection/brokerdesk-583588970"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => sound?.playClick?.()}
                className="pixel-btn px-3.5 py-2 text-[10px] sm:text-xs font-bold text-white bg-black hover:bg-black/80 border-2 border-[#FF2247] rounded-lg shadow-[2px_2px_0px_#000] shrink-0 flex items-center gap-1.5"
              >
                <span>[ ACQUIRE NFTS ON OPENSEA ↗ ]</span>
              </a>
            </div>
          )}
        </section>

        {/* Global Protocol Staking Metrics HUD */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total Staked */}
          <div className="bg-[#12072e] border-2 border-purple-800 p-4 rounded-xl shadow-[4px_4px_0px_#000]">
            <div className="text-[10px] text-gray-400 font-mono uppercase">TOTAL $APEBROKE STAKED</div>
            <div className="text-lg sm:text-2xl font-extrabold text-[#00FF66] mt-1 drop-shadow-[0_0_6px_rgba(0,255,102,0.3)]">
              {Number(formatEther(globalStats?.totalStaked || 0n)).toLocaleString('en-US', {
                maximumFractionDigits: 0,
              })}
            </div>
            <div className="text-[9px] text-gray-400 mt-1 font-mono">
              Across {globalStats?.activePositionsCount || 0} active positions
            </div>
          </div>

          {/* ETH Reward Pool Balance */}
          <div className="bg-[#12072e] border-2 border-[#FFD700] p-4 rounded-xl shadow-[4px_4px_0px_#000]">
            <div className="text-[10px] text-gray-400 font-mono uppercase">
              {isUsdt ? 'ETH REWARD POOL (USDT)' : 'ETH REWARD POOL'}
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-[#FFD700] mt-1 drop-shadow-[0_0_6px_rgba(255,215,0,0.3)]">
              {formatEthReward(globalStats?.rewardPoolBalance || 0n)}
            </div>
          </div>

          {/* Current 24H Period Reward */}
          <div className="bg-[#12072e] border-2 border-[#00F0FF] p-4 rounded-xl shadow-[4px_4px_0px_#000]">
            <div className="text-[10px] text-gray-400 font-mono uppercase">
              {isUsdt ? '24H PERIOD YIELD (USDT)' : '24H PERIOD YIELD'}
            </div>
            <div className="text-lg sm:text-2xl font-extrabold text-[#00F0FF] mt-1 drop-shadow-[0_0_6px_rgba(0,240,255,0.3)]">
              {formatEthReward(globalStats?.currentPeriodReward || 0n)}
            </div>
            <div className="text-[9px] text-[#00F0FF]/80 mt-1 font-mono">
              Period #{globalStats?.currentPeriodId?.toString() || '1'} ({(Number(globalStats?.rewardRateBps || 1000n) / 100).toFixed(0)}% dynamic rate)
            </div>
          </div>

          {/* Total Rewards Distributed */}
          <div className="bg-[#12072e] border-2 border-purple-800 p-4 rounded-xl shadow-[4px_4px_0px_#000]">
            <div className="text-[10px] text-gray-400 font-mono uppercase">TOTAL DISTRIBUTED</div>
            <div className="text-lg sm:text-2xl font-extrabold text-white mt-1">
              {formatEthReward(globalStats?.totalEthRewardsDistributed || 0n)}
            </div>
            <div className="text-[9px] text-gray-400 mt-1 font-mono">
              Claimed: {formatEthReward(globalStats?.totalEthRewardsClaimed || 0n)}
            </div>
          </div>
        </section>

        {/* Feedback / Error Alerts */}
        {feedbackMsg && (
          <div className="bg-[#052b16] border-2 border-[#00FF66] p-3 rounded-lg text-xs font-mono text-[#00FF66] flex items-center justify-between shadow-[2px_2px_0px_#000]">
            <div className="flex items-center gap-2">
              <span>✓</span>
              <span>{feedbackMsg}</span>
            </div>
            <button onClick={() => setFeedbackMsg(null)} className="text-gray-400 hover:text-white text-[10px]">
              [ CLOSE ]
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="bg-[#2d0912] border-2 border-[#FF2247] p-3 rounded-lg text-xs font-mono text-[#FF2247] flex items-center justify-between shadow-[2px_2px_0px_#000]">
            <div className="flex items-center gap-2">
              <span>⚠</span>
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-gray-400 hover:text-white text-[10px]">
              [ CLOSE ]
            </button>
          </div>
        )}

        {/* Staking Action Section (Form) */}
        <section className="bg-[#100629] border-3 border-purple-700 rounded-xl p-5 shadow-[6px_6px_0px_#000] relative">
          <div className="flex flex-col lg:flex-row gap-6 justify-between">
            {/* Left: Input Form */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#00FF66] rounded-full animate-pulse" />
                  <span>STAKE $APEBROKE — 24-HOUR LOCK</span>
                </h2>
                <div className="text-[10px] font-mono text-gray-400">
                  Wallet Balance:{' '}
                  <span className="text-[#00FF66] font-bold">
                    {userTokenBalanceHuman.toLocaleString('en-US', { maximumFractionDigits: 2 })} $APEBROKE
                  </span>
                </div>
              </div>

              {/* Amount Input with Quick Percent Buttons */}
              <div className="bg-[#090317] border-2 border-purple-900 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Enter amount to stake..."
                    value={stakeAmountInput}
                    onChange={(e) => setStakeAmountInput(e.target.value)}
                    disabled={isStaking || isApproving || !userBalances.isEligible}
                    className="bg-transparent border-none text-white font-mono text-base sm:text-lg focus:outline-none w-full placeholder-gray-600"
                  />
                  <span className="text-xs font-extrabold text-[#FFD700] px-2 py-1 bg-[#190b3b] rounded border border-purple-800">
                    $APEBROKE
                  </span>
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-purple-950">
                  <span className="text-[9px] font-mono text-gray-500">QUICK:</span>
                  {[
                    { label: '25%', val: 0.25 },
                    { label: '50%', val: 0.5 },
                    { label: '75%', val: 0.75 },
                    { label: 'MAX', val: 1.0 },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      disabled={isStaking || isApproving || !userBalances.isEligible || userTokenBalanceHuman <= 0}
                      onClick={() => handleQuickPercent(btn.val)}
                      className="px-2 py-0.5 bg-[#170938] hover:bg-[#28115c] disabled:opacity-50 text-[9px] font-mono text-[#00F0FF] rounded border border-purple-800 transition-colors"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estimated 24h Yield Preview Box */}
              {estimated24hRewardEth > 0 && (
                <div className="bg-[#072418] border border-[#00FF66]/60 p-3 rounded-lg flex items-center justify-between text-xs font-mono">
                  <div className="text-gray-300">
                    Estimated 24H Reward Yield:
                  </div>
                  <div className="text-[#00FF66] font-bold">
                    ~{isUsdt ? `$${(estimated24hRewardEth * ethPrice).toFixed(2)} USDT` : `${estimated24hRewardEth.toFixed(6)} ETH`}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {!isConnected ? (
                  <button
                    type="button"
                    onClick={() => openConnectModal?.()}
                    className="pixel-btn pixel-btn-vibrant-lime w-full py-3 text-xs font-extrabold rounded-lg shadow-[3px_3px_0px_#000]"
                  >
                    [ CONNECT WALLET TO STAKE ]
                  </button>
                ) : !isCorrectChain ? (
                  <button
                    type="button"
                    onClick={() => switchToRobinhoodChain()}
                    className="pixel-btn bg-[#FF2247] text-white border-2 border-white w-full py-3 text-xs font-bold rounded-lg"
                  >
                    [ SWITCH TO ROBINHOOD EVM ]
                  </button>
                ) : !userBalances.isEligible ? (
                  <button
                    type="button"
                    disabled
                    className="pixel-btn bg-gray-800 text-gray-500 border-2 border-gray-700 w-full py-3 text-xs font-bold rounded-lg cursor-not-allowed"
                  >
                    [ 🔒 LOCKED — 2+ APES REQUIRED ]
                  </button>
                ) : needsApproval ? (
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="pixel-btn bg-[#FFD700] hover:bg-yellow-400 text-black border-2 border-black w-full py-3 text-xs font-extrabold rounded-lg shadow-[3px_3px_0px_#000]"
                  >
                    {isApproving ? '[ APPROVING $APEBROKE... ]' : '[ 1. APPROVE $APEBROKE ]'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStake}
                    disabled={isStaking || parsedStakeAmountWei <= 0n}
                    className="pixel-btn pixel-btn-vibrant-lime w-full py-3 text-xs font-extrabold rounded-lg shadow-[3px_3px_0px_#000] disabled:opacity-50"
                  >
                    {isStaking ? '[ STAKING TOKENS... ]' : '[ 2. STAKE $APEBROKE (24H LOCK) ]'}
                  </button>
                )}
              </div>
            </div>

            {/* Right: Informational Explainer Card */}
            <div className="lg:w-80 bg-[#0c0422] border-2 border-purple-900 rounded-lg p-4 flex flex-col justify-between text-xs space-y-3 font-mono">
              <div>
                <div className="text-[10px] text-[#00F0FF] uppercase tracking-wider font-extrabold mb-2">
                  STAKING MECHANICS
                </div>
                <ul className="space-y-2 text-[10px] text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-[#00FF66]">✓</span>
                    <span><strong>Strict 24H Lock:</strong> Each position unlocks exactly 24 hours after creation.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#00FF66]">✓</span>
                    <span><strong>100% Principal Custody:</strong> Your $APEBROKE principal is fully protected and withdrawn 1:1.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#00FF66]">✓</span>
                    <span><strong>Dynamic ETH Rewards:</strong> Rewards are paid strictly from the dynamic ETH reward pool.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#00FF66]">✓</span>
                    <span><strong>Multiple Positions:</strong> You can open multiple independent stakes at any time.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2 border-t border-purple-950 text-[9px] text-gray-500">
                Ape Brokers Protocol • Robinhood EVM
              </div>
            </div>
          </div>
        </section>

        {/* User Active & Matured Staking Positions */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#00F0FF] rounded-full" />
              <span>YOUR STAKING POSITIONS ({userStakes.length})</span>
            </h2>
            <div className="text-[10px] font-mono text-gray-400">
              Total Staked:{' '}
              <span className="text-[#00FF66] font-bold">
                {Number(formatEther(userBalances?.totalUserStaked || 0n)).toLocaleString('en-US')} $APEBROKE
              </span>{' '}
              | Pending Yield:{' '}
              <span className="text-[#FFD700] font-bold">
                {formatEthReward(userBalances?.totalUserPendingEth || 0n)}
              </span>
            </div>
          </div>

          {userStakes.length === 0 ? (
            <div className="bg-[#0e0524] border-2 border-dashed border-purple-800/80 rounded-xl p-8 text-center space-y-2">
              <div className="text-3xl">⏳</div>
              <div className="text-xs sm:text-sm font-extrabold text-gray-300">
                NO ACTIVE STAKING POSITIONS
              </div>
              <p className="text-[10px] text-gray-500 font-mono max-w-md mx-auto">
                Stake $APEBROKE above to begin your 24-hour lock and earn dynamic ETH rewards from the protocol pool.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userStakes.map((pos) => {
                const isTimerExpired = currentTimestamp >= pos.unlockTime;
                const remainingSeconds = Math.max(0, pos.unlockTime - currentTimestamp);
                const isFullyClosed = pos.withdrawn && pos.claimed;
                const canClaim = !pos.claimed && pos.pendingRewardsEth > 0n && isTimerExpired;
                const canWithdraw = !pos.withdrawn && isTimerExpired;
                const canWithdrawAndClaim = canClaim && canWithdraw;

                const totalLockDuration = Math.max(1, pos.unlockTime - pos.startTime);
                const elapsedSeconds = Math.min(totalLockDuration, Math.max(0, currentTimestamp - pos.startTime));
                const progressPct = Math.min(100, Math.floor((elapsedSeconds / totalLockDuration) * 100));

                return (
                  <div
                    key={pos.stakeId}
                    className={`bg-[#0d0526] border-2 rounded-xl p-4 shadow-[4px_4px_0px_#000] flex flex-col justify-between space-y-4 transition-all ${
                      isFullyClosed
                        ? 'border-gray-800 opacity-60'
                        : isTimerExpired
                        ? 'border-[#00FF66] shadow-[0_0_15px_rgba(0,255,102,0.15)]'
                        : 'border-purple-700'
                    }`}
                  >
                    {/* Position Header */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-extrabold text-[#00F0FF] font-mono">
                          #STAKE-{pos.stakeId}
                        </span>
                        {isFullyClosed ? (
                          <span className="px-2 py-0.5 bg-gray-800 text-gray-400 text-[8px] font-mono rounded">
                            COMPLETED
                          </span>
                        ) : isTimerExpired ? (
                          <span className="px-2 py-0.5 bg-[#00FF66] text-black text-[8px] font-extrabold rounded animate-pulse">
                            UNLOCKED & READY
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-yellow-950/70 text-[#FFD700] border border-yellow-700 text-[8px] font-mono rounded">
                            LOCKED (24H)
                          </span>
                        )}
                      </div>

                      {/* Staked Amount */}
                      <div className="text-base sm:text-lg font-extrabold text-white">
                        {Number(formatEther(pos.amount)).toLocaleString('en-US', {
                          maximumFractionDigits: 2,
                        })}{' '}
                        <span className="text-xs text-[#00FF66]">$APEBROKE</span>
                      </div>

                      {/* Timestamps */}
                      <div className="text-[9px] text-gray-400 font-mono mt-1 space-y-0.5">
                        <div>Staked: {new Date(pos.startTime * 1000).toLocaleString()}</div>
                        <div>Unlocks: {new Date(pos.unlockTime * 1000).toLocaleString()}</div>
                      </div>

                      {/* Countdown & Progress Bar */}
                      {!isTimerExpired ? (
                        <div className="mt-3 space-y-1.5 bg-[#070217] p-2.5 rounded-lg border border-purple-950">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-gray-400">Lock Remaining:</span>
                            <span className="text-[#FFD700] font-bold">
                              {formatCountdown(remainingSeconds)}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-yellow-500 to-[#00FF66] transition-all duration-1000"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <div className="text-right text-[8px] text-gray-500 font-mono">
                            {progressPct}% Completed
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 bg-[#042413] border border-[#00FF66]/50 p-2 rounded-lg text-center text-[10px] font-mono text-[#00FF66]">
                          ✓ 24-Hour Lock Requirement Fulfilled
                        </div>
                      )}

                      {/* Accrued Reward Box */}
                      <div className="mt-3 bg-[#150a3b] p-2.5 rounded-lg border border-purple-900 flex items-center justify-between">
                        <span className="text-[9px] font-mono text-gray-400">ACCUMULATED REWARD:</span>
                        <span className="text-xs font-extrabold text-[#FFD700]">
                          {pos.claimed ? (
                            <span className="text-gray-500 line-through">CLAIMED</span>
                          ) : (
                            formatEthReward(pos.pendingRewardsEth)
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Position Actions */}
                    <div className="pt-2 border-t border-purple-950 space-y-2">
                      {isFullyClosed ? (
                        <div className="text-center text-[9px] text-gray-500 font-mono py-1">
                          Position fully settled and closed.
                        </div>
                      ) : !isTimerExpired ? (
                        <button
                          type="button"
                          disabled
                          className="pixel-btn bg-[#180a33] text-gray-500 border border-purple-900 w-full py-2 text-[10px] font-mono rounded cursor-not-allowed"
                        >
                          [ ⏳ LOCKED — {formatCountdown(remainingSeconds)} ]
                        </button>
                      ) : canWithdrawAndClaim ? (
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => handleWithdrawAndClaim(pos.stakeId)}
                            disabled={actionLoadingId === pos.stakeId}
                            className="pixel-btn pixel-btn-vibrant-lime w-full py-2 text-[10px] font-extrabold rounded-lg shadow-[2px_2px_0px_#000]"
                          >
                            {actionLoadingId === pos.stakeId && actionType === 'withdrawAndClaim'
                              ? '[ SETTLING ALL... ]'
                              : '[ WITHDRAW & CLAIM ETH ]'}
                          </button>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleClaim(pos.stakeId)}
                              disabled={actionLoadingId === pos.stakeId}
                              className="pixel-btn pixel-btn-black flex-1 py-1.5 text-[9px] font-bold text-[#FFD700] border border-yellow-600 rounded"
                            >
                              [ CLAIM ETH ]
                            </button>
                            <button
                              type="button"
                              onClick={() => handleWithdraw(pos.stakeId)}
                              disabled={actionLoadingId === pos.stakeId}
                              className="pixel-btn pixel-btn-black flex-1 py-1.5 text-[9px] font-bold text-white border border-gray-700 rounded"
                            >
                              [ WITHDRAW $APE ]
                            </button>
                          </div>
                        </div>
                      ) : canClaim ? (
                        <button
                          type="button"
                          onClick={() => handleClaim(pos.stakeId)}
                          disabled={actionLoadingId === pos.stakeId}
                          className="pixel-btn pixel-btn-vibrant-lime w-full py-2 text-[10px] font-extrabold rounded-lg shadow-[2px_2px_0px_#000]"
                        >
                          {actionLoadingId === pos.stakeId ? '[ CLAIMING... ]' : '[ CLAIM ETH REWARD ]'}
                        </button>
                      ) : canWithdraw ? (
                        <button
                          type="button"
                          onClick={() => handleWithdraw(pos.stakeId)}
                          disabled={actionLoadingId === pos.stakeId}
                          className="pixel-btn pixel-btn-vibrant-lime w-full py-2 text-[10px] font-extrabold rounded-lg shadow-[2px_2px_0px_#000]"
                        >
                          {actionLoadingId === pos.stakeId ? '[ WITHDRAWING... ]' : '[ WITHDRAW $APEBROKE ]'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
