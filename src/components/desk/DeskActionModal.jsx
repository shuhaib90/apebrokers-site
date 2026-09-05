import React, { useState } from 'react';
import { formatEther } from 'viem';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';

export function DeskActionModal({
  isOpen,
  onClose,
  actionType, // 'activate' | 'boost'
  desk,
  apeBrokeBalance,
  allowance,
  onApprove,
  onExecute,
}) {
  const [step, setStep] = useState('idle'); // 'idle' | 'approving' | 'executing' | 'success' | 'error'
  const [txHash, setTxHash] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !desk) return null;

  const tokenId = desk.tokenId;
  const isActivate = actionType === 'activate';

  // Cost calculation
  const costRaw = isActivate ? 349693n * 10n ** 18n : desk.nextBoostCost;
  const costTokens = isActivate ? '349,693' : Number(formatEther(costRaw)).toLocaleString();
  const hasEnoughAllowance = allowance >= costRaw;
  const hasEnoughBalance = apeBrokeBalance >= costRaw;

  const currentWeight = desk.active ? desk.currentWeight : 0;
  const newWeight = desk.active ? desk.currentWeight + 100 : 100;
  const currentBoosts = desk.boostCount || 0;
  const newBoosts = desk.active ? currentBoosts + 1 : 0;

  const handleApprove = async () => {
    sound?.playClick?.();
    setStep('approving');
    setErrorMessage('');
    try {
      await onApprove(costRaw);
      sound?.playSuccess?.();
      setStep('idle');
    } catch (err) {
      console.error('Approval failed:', err);
      sound?.playError?.();
      setErrorMessage(err.shortMessage || err.message || 'Approval rejected or failed.');
      setStep('error');
    }
  };

  const handleExecute = async () => {
    sound?.playClick?.();
    setStep('executing');
    setErrorMessage('');
    try {
      let res;
      if (isActivate) {
        res = await onExecute(tokenId);
      } else {
        res = await onExecute(tokenId, desk.currentWeight, newBoosts, costRaw);
      }
      setTxHash(res?.hash || '');
      setStep('success');
      sound?.playSuccess?.();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    } catch (err) {
      console.error('Execution failed:', err);
      sound?.playError?.();
      setErrorMessage(err.shortMessage || err.message || 'Transaction rejected or reverted.');
      setStep('error');
    }
  };

  const handleClose = () => {
    sound?.playClick?.();
    setStep('idle');
    setErrorMessage('');
    setTxHash('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-lg bg-[#0e0720] border-3 border-[#00FF66] shadow-[0_0_30px_rgba(0,255,102,0.25)] rounded-xl overflow-hidden font-pixel text-white">
        {/* Modal Header */}
        <div className="bg-[#180a3a] px-4 py-3 border-b-2 border-[#00FF66] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00FF66] animate-pulse" />
            <h3 className="text-xs sm:text-sm font-extrabold text-[#00FF66] tracking-wider">
              {isActivate ? `ACTIVATE DESK #${tokenId}` : `BOOST DESK #${tokenId} (BOOST ${newBoosts}/5)`}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 border border-gray-700 hover:border-gray-500 rounded"
          >
            [ ESC ]
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {step === 'success' ? (
            <div className="text-center py-6 space-y-4">
              <div className="text-3xl sm:text-4xl text-[#00FF66] animate-bounce">✓</div>
              <div className="text-base sm:text-lg text-[#00FF66] font-bold">
                {isActivate ? 'DESK ACTIVATED SUCCESSFULLY!' : `BOOST #${newBoosts} APPLIED!`}
              </div>
              <p className="text-xs font-mono text-gray-300">
                New Desk Weight: <span className="text-[#00F0FF] font-bold">{newWeight} WGT</span>
              </p>
              {txHash && (
                <a
                  href={`https://explorer.robinhood.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-[10px] font-mono text-cyan-400 hover:underline break-all"
                >
                  View on Explorer: {txHash.slice(0, 16)}...
                </a>
              )}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="pixel-btn pixel-btn-vibrant-lime px-6 py-2.5 text-xs font-bold rounded-lg"
                >
                  [ DONE ]
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Transaction Specs Card */}
              <div className="bg-[#14082c] border-2 border-purple-900/60 p-4 rounded-lg space-y-2.5 text-xs font-mono">
                <div className="flex justify-between items-center text-gray-400">
                  <span>Action:</span>
                  <span className="text-[#FFD700] font-bold uppercase">
                    {isActivate ? '1 NFT = 1 Desk Activation' : `Boost Upgrade (Level ${newBoosts})`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-400">
                  <span>Required $APEBROKE:</span>
                  <span className="text-[#00FF66] font-bold font-pixel text-[11px]">
                    {costTokens} $APE
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-400">
                  <span>Desk Weight:</span>
                  <span className="text-white font-bold">
                    {currentWeight} WGT <span className="text-[#00FF66]">➔ {newWeight} WGT (+100)</span>
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-400">
                  <span>Boost Count:</span>
                  <span className="text-white font-bold">
                    {currentBoosts} / 5 <span className="text-[#00FF66]">➔ {newBoosts} / 5</span>
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-400 border-t border-purple-900/40 pt-2">
                  <span>Your $APE Balance:</span>
                  <span
                    className={`font-bold ${hasEnoughBalance ? 'text-gray-200' : 'text-[#FF2247]'}`}
                  >
                    {Number(formatEther(apeBrokeBalance)).toLocaleString()} $APE
                  </span>
                </div>
              </div>

              {/* Insufficient Balance Alert */}
              {!hasEnoughBalance && (
                <div className="bg-red-950/80 border border-[#FF2247] p-3 rounded text-[10px] text-[#FF2247] flex items-center gap-2">
                  <span>⚠</span>
                  <span>
                    Insufficient $APEBROKE balance. You need {costTokens} $APE to proceed.
                  </span>
                </div>
              )}

              {/* Error Alert */}
              {step === 'error' && errorMessage && (
                <div className="bg-red-950/90 border border-[#FF2247] p-3 rounded text-[10px] text-[#FF2247] break-words">
                  Error: {errorMessage}
                </div>
              )}

              {/* Two-Step Execution Buttons */}
              <div className="space-y-2 pt-2">
                {!hasEnoughAllowance ? (
                  <button
                    type="button"
                    disabled={!hasEnoughBalance || step === 'approving'}
                    onClick={handleApprove}
                    className="w-full min-h-[46px] pixel-btn pixel-btn-vibrant-gold px-4 py-2.5 text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000] disabled:opacity-50"
                  >
                    {step === 'approving' ? '[ 1/2 APPROVING $APEBROKE... ]' : '[ 1. APPROVE $APEBROKE ]'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!hasEnoughBalance || step === 'executing'}
                    onClick={handleExecute}
                    className="w-full min-h-[46px] pixel-btn pixel-btn-vibrant-lime px-4 py-2.5 text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000] disabled:opacity-50"
                  >
                    {step === 'executing'
                      ? isActivate
                        ? '[ 2/2 ACTIVATING DESK... ]'
                        : '[ 2/2 APPLYING BOOST... ]'
                      : isActivate
                      ? '[ 2. CONFIRM ACTIVATION ]'
                      : `[ 2. CONFIRM BOOST (+100 WGT) ]`}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2 text-[10px] text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
