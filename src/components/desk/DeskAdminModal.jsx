import React, { useState } from 'react';
import { formatEther, parseEther } from 'viem';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

export function DeskAdminModal({
  isOpen,
  onClose,
  globalStats,
  onClaimFees,
  onDepositRewards,
}) {
  const [activeTab, setActiveTab] = useState('deposit'); // 'deposit' | 'fees' | 'config'
  const [ethAmount, setEthAmount] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen) return null;

  const protocolFees = globalStats.protocolFeeBalance || 0n;
  const rewardPoolEth = globalStats.rewardPoolBalance || 0n;

  const handleDepositEth = async (e) => {
    e.preventDefault();
    if (!ethAmount || parseFloat(ethAmount) <= 0) return;
    sound?.playClick?.();
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await onDepositRewards(ethAmount);
      setStatusMessage(`Successfully deposited ${ethAmount} ETH into Reward Pool!`);
      setEthAmount('');
      sound?.playSuccess?.();
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.5 } });
      } catch (e) {}
    } catch (err) {
      console.error('ETH deposit failed:', err);
      sound?.playError?.();
      setErrorMessage(err.shortMessage || err.message || 'ETH deposit failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimFees = async (e) => {
    e.preventDefault();
    sound?.playClick?.();
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const amountRaw = feeAmount ? parseEther(feeAmount) : protocolFees;
      await onClaimFees(amountRaw);
      setStatusMessage(`Successfully claimed ${feeAmount || formatEther(protocolFees)} $APEBROKE to Treasury!`);
      setFeeAmount('');
      sound?.playSuccess?.();
    } catch (err) {
      console.error('Fee claim failed:', err);
      sound?.playError?.();
      setErrorMessage(err.shortMessage || err.message || 'Fee claim failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-xl bg-[#0f0926] border-3 border-[#FFD700] shadow-[0_0_35px_rgba(255,215,0,0.3)] rounded-xl overflow-hidden font-pixel text-white">
        {/* Header */}
        <div className="bg-[#1b103e] px-4 py-3 border-b-2 border-[#FFD700] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFD700] animate-pulse" />
            <h3 className="text-xs sm:text-sm font-extrabold text-[#FFD700] tracking-wider">
              PROTOCOL ADMIN CONSOLE
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 border border-gray-700 hover:border-gray-500 rounded"
          >
            [ ESC ]
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-purple-900/60 bg-[#14082c]">
          <button
            onClick={() => {
              sound?.playClick?.();
              setActiveTab('deposit');
            }}
            className={`flex-1 py-2.5 text-[10px] sm:text-xs font-bold transition-colors ${
              activeTab === 'deposit'
                ? 'bg-[#1e0f42] text-[#00FF66] border-b-2 border-[#00FF66]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            [ 1. DEPOSIT ETH REWARDS ]
          </button>
          <button
            onClick={() => {
              sound?.playClick?.();
              setActiveTab('fees');
            }}
            className={`flex-1 py-2.5 text-[10px] sm:text-xs font-bold transition-colors ${
              activeTab === 'fees'
                ? 'bg-[#1e0f42] text-[#FFD700] border-b-2 border-[#FFD700]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            [ 2. CLAIM $APE FEES ]
          </button>
          <button
            onClick={() => {
              sound?.playClick?.();
              setActiveTab('config');
            }}
            className={`flex-1 py-2.5 text-[10px] sm:text-xs font-bold transition-colors ${
              activeTab === 'config'
                ? 'bg-[#1e0f42] text-[#00F0FF] border-b-2 border-[#00F0FF]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            [ 3. PROTOCOL CONFIG ]
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {statusMessage && (
            <div className="bg-emerald-950/80 border border-[#00FF66] p-3 rounded text-xs text-[#00FF66]">
              ✓ {statusMessage}
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-950/80 border border-[#FF2247] p-3 rounded text-xs text-[#FF2247] break-words">
              ⚠ {errorMessage}
            </div>
          )}

          {/* Tab 1: Deposit ETH Rewards */}
          {activeTab === 'deposit' && (
            <form onSubmit={handleDepositEth} className="space-y-4">
              <div className="bg-[#160833] p-3.5 border border-purple-900/60 rounded-lg text-xs font-mono space-y-2">
                <div className="flex justify-between text-gray-400">
                  <span>Current Reward Pool:</span>
                  <span className="text-[#00FF66] font-bold">
                    {Number(formatEther(rewardPoolEth)).toFixed(4)} ETH
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Current Epoch:</span>
                  <span className="text-white font-bold">
                    Epoch #{globalStats.currentEpoch.toString()}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Total Protocol Desk Weight:</span>
                  <span className="text-[#00F0FF] font-bold">
                    {globalStats.totalEligibleWeight.toString()} WGT
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-pixel text-gray-300">
                  NATIVE ETH DEPOSIT AMOUNT:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="e.g. 1.5"
                    value={ethAmount}
                    onChange={(e) => setEthAmount(e.target.value)}
                    className="w-full bg-black/60 border-2 border-purple-800 focus:border-[#00FF66] p-3 text-sm font-mono text-white rounded-lg outline-none"
                    required
                  />
                  <span className="absolute right-3 top-3.5 text-xs text-gray-400 font-mono">
                    ETH
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !ethAmount}
                className="w-full min-h-[46px] pixel-btn pixel-btn-vibrant-lime py-3 text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000] disabled:opacity-50"
              >
                {isSubmitting ? '[ DEPOSITING ETH... ]' : '[ DEPOSIT ETH TO REWARD POOL ]'}
              </button>
            </form>
          )}

          {/* Tab 2: Claim Protocol Fees */}
          {activeTab === 'fees' && (
            <form onSubmit={handleClaimFees} className="space-y-4">
              <div className="bg-[#160833] p-3.5 border border-purple-900/60 rounded-lg text-xs font-mono space-y-2">
                <div className="flex justify-between text-gray-400">
                  <span>Collected Protocol Fees:</span>
                  <span className="text-[#FFD700] font-bold">
                    {Number(formatEther(protocolFees)).toLocaleString()} $APEBROKE
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Treasury Destination:</span>
                  <span className="text-[#00FF66] text-[10px] break-all font-bold">
                    {globalStats.treasuryAddress || '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded text-[10px] text-amber-300 font-mono leading-relaxed">
                ℹ Operational Note: Protocol fees collected in $APEBROKE are claimed to the treasury. 
                The admin then swaps this $APEBROKE for ETH externally (on Robinhood EVM DEX/AMM) and deposits 
                the resulting ETH into the Reward Pool above.
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-pixel text-gray-300">
                  <span>CLAIM AMOUNT:</span>
                  <button
                    type="button"
                    onClick={() => setFeeAmount(formatEther(protocolFees))}
                    className="text-[#FFD700] hover:underline"
                  >
                    [ USE MAX ]
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    placeholder={formatEther(protocolFees)}
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value)}
                    className="w-full bg-black/60 border-2 border-purple-800 focus:border-[#FFD700] p-3 text-sm font-mono text-white rounded-lg outline-none"
                  />
                  <span className="absolute right-3 top-3.5 text-xs text-gray-400 font-mono">
                    $APE
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || protocolFees === 0n}
                className="w-full min-h-[46px] pixel-btn pixel-btn-vibrant-gold py-3 text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000] disabled:opacity-50"
              >
                {isSubmitting ? '[ CLAIMING FEES... ]' : '[ CLAIM $APEBROKE TO TREASURY ]'}
              </button>
            </form>
          )}

          {/* Tab 3: Config */}
          {activeTab === 'config' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="bg-[#160833] p-3.5 border border-purple-900/60 rounded-lg space-y-2">
                <div className="flex justify-between text-gray-400">
                  <span>Base Desk Weight:</span>
                  <span className="text-white font-bold">{globalStats.baseDeskWeight.toString()}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Base Boost Cost:</span>
                  <span className="text-white font-bold">
                    {Number(formatEther(globalStats.baseBoostCost)).toLocaleString()} $APE
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Max Desks Per Wallet:</span>
                  <span className="text-[#00FF66] font-bold">5 Desks</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Max Boosts Per Desk:</span>
                  <span className="text-[#00FF66] font-bold">5 Boosts</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Boost Scaling Schedule:</span>
                  <span className="text-[#00F0FF] font-bold">Linear 2x ➔ 10x Max</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Epoch Duration:</span>
                  <span className="text-white font-bold">5 Hours (18,000s)</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Admin Address:</span>
                  <span className="text-[#00FF66] text-[10px] break-all font-bold">
                    {globalStats.contractOwner || '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C'}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Treasury Address:</span>
                  <span className="text-[#FFD700] text-[10px] break-all font-bold">
                    {globalStats.treasuryAddress || '0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
