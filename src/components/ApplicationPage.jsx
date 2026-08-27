import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';

export const ApplicationPage = ({ onBackHome }) => {
  const [formData, setFormData] = useState({
    xUsername: '',
    walletAddress: '',
  });

  const [taskStates, setTaskStates] = useState({
    followX: 'LOCKED', // LOCKED | READY | VERIFYING | VERIFIED
    joinDiscord: 'LOCKED',
    repostWL: 'LOCKED',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionData, setSubmissionData] = useState(null);

  const handleInputChange = (field, value) => {
    sound?.playTyping?.();
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleOpenTask = (url, taskKey) => {
    sound?.playClick?.();
    window.open(url, '_blank', 'noopener,noreferrer');
    if (taskStates[taskKey] === 'LOCKED') {
      setTaskStates((prev) => ({ ...prev, [taskKey]: 'READY' }));
    }
  };

  const handleVerifyTask = (taskKey) => {
    sound?.playClick?.();
    setTaskStates((prev) => ({ ...prev, [taskKey]: 'VERIFYING' }));
    setTimeout(() => {
      sound?.playVerifyChime?.();
      setTaskStates((prev) => ({ ...prev, [taskKey]: 'VERIFIED' }));
      if (errors.tasks) {
        setErrors((prev) => ({ ...prev, tasks: null }));
      }
    }, 650);
  };

  const validate = () => {
    const errs = {};
    const xTrim = formData.xUsername.trim();
    const walletTrim = formData.walletAddress.trim();

    if (!xTrim) {
      errs.xUsername = 'X username is required';
    }
    if (!walletTrim) {
      errs.walletAddress = 'Wallet address is required';
    } else if (walletTrim.length < 10) {
      errs.walletAddress = 'Enter valid Robinhood Chain / EVM address (0x...)';
    }

    const allVerified = Object.values(taskStates).every((s) => s === 'VERIFIED');
    if (!allVerified) {
      errs.tasks = 'Please complete and verify all 3 social tasks';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    sound?.playClick?.();

    if (!validate()) {
      sound?.playStamp?.();
      return;
    }

    setIsSubmitting(true);
    sound?.playPrinter?.();

    const brokerId = `#${Math.floor(1000 + Math.random() * 9000)}`;
    const submissionPayload = {
      ...formData,
      brokerId,
      submittedAt: new Date().toISOString(),
    };

    // Save to Supabase
    try {
      const { saveApplicationToSupabase } = await import('../utils/supabase');
      await saveApplicationToSupabase(submissionPayload);
    } catch (err) {
      console.warn('Supabase save error:', err);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmissionData(submissionPayload);
      sound?.playStamp?.();
      sound?.playFanfare?.();
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#00FF66', '#FFD700', '#2A0845', '#FF2247', '#000000'],
        });
      } catch (e) {}
    }, 800);
  };

  const verifiedCount = Object.values(taskStates).filter((s) => s === 'VERIFIED').length;

  return (
    <div className="min-h-screen bg-[#00FF66] text-black font-pixel selection:bg-black selection:text-[#00FF66] flex flex-col justify-between select-none">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-[#00FF66] border-b-4 border-black px-4 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              sound?.playClick?.();
              if (onBackHome) onBackHome();
              else window.location.href = '/';
            }}
            className="pixel-btn pixel-btn-black px-3 sm:px-4 py-2 text-[10px] sm:text-xs"
          >
            ◄ BACK TO HOME
          </button>

          <span className="font-pixel text-xs sm:text-sm text-black font-extrabold">
            APEBROKERS WL
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex-grow flex flex-col justify-center">
        {submissionData ? (
          /* SUCCESS CONFIRMATION SCREEN */
          <div className="pixel-box p-6 sm:p-10 text-center space-y-6">
            <div className="w-24 h-24 mx-auto bg-black border-4 border-black overflow-hidden shadow-pixel-md">
              <img
                src="/nfts/1.png"
                alt="ApeBroker"
                className="w-full h-full object-cover pixelated"
              />
            </div>

            <div className="inline-block bg-[#FF2247] text-white font-pixel text-[10px] sm:text-xs px-4 py-1.5 border-3 border-black shadow-pixel-sm">
              STATUS: UNDER REVIEW
            </div>

            <div className="space-y-1.5">
              <h2 className="font-pixel text-2xl sm:text-3xl text-black font-extrabold">
                APPLICATION RECEIVED
              </h2>
              <p className="font-mono text-xs sm:text-sm text-gray-800 font-semibold max-w-sm mx-auto">
                Your ApeBrokers Whitelist application has been recorded.
              </p>
            </div>

            {/* Receipt Box */}
            <div className="bg-[#140D24] text-white border-3 border-black p-4 text-left font-mono text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between border-b border-gray-700 pb-1.5">
                <span className="text-gray-400">APPLICATION ID:</span>
                <span className="text-[#FFD700] font-bold">{submissionData.brokerId}</span>
              </div>
              <div className="flex justify-between border-b border-gray-700 pb-1.5">
                <span className="text-gray-400">X USERNAME:</span>
                <span className="text-[#00FF66] font-bold">{submissionData.xUsername}</span>
              </div>
              <div className="flex justify-between border-b border-gray-700 pb-1.5">
                <span className="text-gray-400">WALLET:</span>
                <span className="text-white font-bold truncate max-w-[160px]">
                  {submissionData.walletAddress}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">NETWORK:</span>
                <span className="text-[#00FF66] font-bold">ROBINHOOD CHAIN</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  if (onBackHome) onBackHome();
                  else window.location.href = '/';
                }}
                className="pixel-btn pixel-btn-black px-6 py-3 font-pixel text-xs font-bold"
              >
                ◄ RETURN HOME
              </button>

              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  window.open('https://x.com/ApebrokersNft', '_blank', 'noopener,noreferrer');
                }}
                className="pixel-btn pixel-btn-white px-6 py-3 font-pixel text-xs font-bold"
              >
                FOLLOW ON X
              </button>
            </div>
          </div>
        ) : (
          /* APPLICATION FORM */
          <div className="pixel-box p-6 sm:p-10 space-y-6">
            {/* Header */}
            <div className="border-b-4 border-black pb-4 text-center space-y-1.5">
              <div className="inline-block bg-black text-[#00FF66] font-pixel text-[9px] px-3 py-1 border-2 border-black">
                ROBINHOOD CHAIN • 5,555 ALLOCATION
              </div>
              <h1 className="font-pixel text-xl sm:text-2xl text-black font-extrabold">
                APEBROKERS APPLICATION
              </h1>
              <p className="font-mono text-xs text-gray-700 font-semibold">
                Submit your X username, wallet address, and complete social tasks.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 1. X Username */}
              <div className="space-y-1.5 text-left">
                <label className="font-pixel text-[10px] sm:text-[11px] text-black block font-bold">
                  X USERNAME <span className="text-[#FF2247]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="@username"
                  value={formData.xUsername}
                  onChange={(e) => handleInputChange('xUsername', e.target.value)}
                  className={`w-full h-12 px-3.5 bg-white text-black font-mono text-sm font-semibold pixel-input ${
                    errors.xUsername ? 'border-[#FF2247]' : ''
                  }`}
                />
                {errors.xUsername && (
                  <div className="font-pixel text-[9px] text-[#FF2247] mt-1">
                    ! {errors.xUsername}
                  </div>
                )}
              </div>

              {/* 2. Wallet Address */}
              <div className="space-y-1.5 text-left">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <label className="font-pixel text-[10px] sm:text-[11px] text-black font-bold">
                    WALLET ADDRESS <span className="text-[#FF2247]">*</span>
                  </label>
                  <span className="font-mono text-[11px] text-gray-500 font-semibold">
                    (Manual entry • No wallet connection)
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Enter Robinhood / EVM wallet address (0x...)"
                  value={formData.walletAddress}
                  onChange={(e) => handleInputChange('walletAddress', e.target.value)}
                  className={`w-full h-12 px-3.5 bg-white text-black font-mono text-sm font-semibold pixel-input ${
                    errors.walletAddress ? 'border-[#FF2247]' : ''
                  }`}
                />
                {errors.walletAddress && (
                  <div className="font-pixel text-[9px] text-[#FF2247] mt-1">
                    ! {errors.walletAddress}
                  </div>
                )}
              </div>

              {/* 3. Social Tasks */}
              <div className="space-y-2.5 pt-2">
                <div className="bg-black text-white p-3 border-3 border-black flex items-center justify-between">
                  <span className="font-pixel text-[10px] sm:text-[11px] text-[#FFD700]">
                    SOCIAL TASKS
                  </span>
                  <span className="bg-[#140D24] text-[#00FF66] font-pixel text-[9px] px-2 py-0.5 border border-black">
                    {verifiedCount} / 3 VERIFIED
                  </span>
                </div>

                {/* Task 1: Follow X */}
                <div className="bg-white border-3 border-black p-3 sm:p-3.5 flex items-center justify-between gap-2 shadow-pixel-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 bg-black text-[#00FF66] flex items-center justify-center font-pixel text-xs shrink-0">
                      X
                    </span>
                    <div className="font-pixel text-[9px] sm:text-[10px] text-black">
                      FOLLOW @APEBROKERSNFT ON X
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenTask('https://x.com/ApebrokersNft', 'followX')}
                      className="pixel-btn pixel-btn-white px-2.5 py-1.5 text-[9px]"
                    >
                      [ OPEN ]
                    </button>
                    <button
                      type="button"
                      disabled={taskStates.followX === 'LOCKED' || taskStates.followX === 'VERIFIED'}
                      onClick={() => handleVerifyTask('followX')}
                      className={`pixel-btn px-2.5 py-1.5 text-[9px] ${
                        taskStates.followX === 'VERIFIED'
                          ? 'pixel-btn-lime cursor-default'
                          : taskStates.followX === 'READY'
                          ? 'pixel-btn-gold animate-pulse'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-400'
                      }`}
                    >
                      {taskStates.followX === 'VERIFIED'
                        ? '✓ DONE'
                        : taskStates.followX === 'VERIFYING'
                        ? '...'
                        : taskStates.followX === 'READY'
                        ? '[ VERIFY ]'
                        : 'LOCKED'}
                    </button>
                  </div>
                </div>

                {/* Task 2: Join Discord */}
                <div className="bg-white border-3 border-black p-3 sm:p-3.5 flex items-center justify-between gap-2 shadow-pixel-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 bg-[#2A0845] text-white flex items-center justify-center font-pixel text-xs shrink-0">
                      DC
                    </span>
                    <div className="font-pixel text-[9px] sm:text-[10px] text-black">
                      JOIN APEBROKERS DISCORD
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenTask('https://discord.com', 'joinDiscord')}
                      className="pixel-btn pixel-btn-white px-2.5 py-1.5 text-[9px]"
                    >
                      [ OPEN ]
                    </button>
                    <button
                      type="button"
                      disabled={taskStates.joinDiscord === 'LOCKED' || taskStates.joinDiscord === 'VERIFIED'}
                      onClick={() => handleVerifyTask('joinDiscord')}
                      className={`pixel-btn px-2.5 py-1.5 text-[9px] ${
                        taskStates.joinDiscord === 'VERIFIED'
                          ? 'pixel-btn-lime cursor-default'
                          : taskStates.joinDiscord === 'READY'
                          ? 'pixel-btn-gold animate-pulse'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-400'
                      }`}
                    >
                      {taskStates.joinDiscord === 'VERIFIED'
                        ? '✓ DONE'
                        : taskStates.joinDiscord === 'VERIFYING'
                        ? '...'
                        : taskStates.joinDiscord === 'READY'
                        ? '[ VERIFY ]'
                        : 'LOCKED'}
                    </button>
                  </div>
                </div>

                {/* Task 3: Repost */}
                <div className="bg-white border-3 border-black p-3 sm:p-3.5 flex items-center justify-between gap-2 shadow-pixel-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 bg-black text-[#FFD700] flex items-center justify-center font-pixel text-xs shrink-0">
                      RT
                    </span>
                    <div className="font-pixel text-[9px] sm:text-[10px] text-black">
                      REPOST WL ANNOUNCEMENT
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenTask('https://x.com/intent/retweet', 'repostWL')}
                      className="pixel-btn pixel-btn-white px-2.5 py-1.5 text-[9px]"
                    >
                      [ OPEN ]
                    </button>
                    <button
                      type="button"
                      disabled={taskStates.repostWL === 'LOCKED' || taskStates.repostWL === 'VERIFIED'}
                      onClick={() => handleVerifyTask('repostWL')}
                      className={`pixel-btn px-2.5 py-1.5 text-[9px] ${
                        taskStates.repostWL === 'VERIFIED'
                          ? 'pixel-btn-lime cursor-default'
                          : taskStates.repostWL === 'READY'
                          ? 'pixel-btn-gold animate-pulse'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-400'
                      }`}
                    >
                      {taskStates.repostWL === 'VERIFIED'
                        ? '✓ DONE'
                        : taskStates.repostWL === 'VERIFYING'
                        ? '...'
                        : taskStates.repostWL === 'READY'
                        ? '[ VERIFY ]'
                        : 'LOCKED'}
                    </button>
                  </div>
                </div>

                {errors.tasks && (
                  <div className="font-pixel text-[9px] text-[#FF2247] bg-[#FF2247]/10 p-2 border-2 border-[#FF2247] text-center">
                    ! {errors.tasks}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full min-h-[52px] py-3.5 px-6 pixel-btn pixel-btn-black font-pixel text-xs sm:text-sm font-extrabold tracking-wider ${
                    isSubmitting ? 'opacity-70 cursor-wait' : ''
                  }`}
                >
                  {isSubmitting ? 'SUBMITTING APPLICATION...' : '[ SUBMIT APPLICATION ]'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-black text-white border-t-4 border-black px-4 py-6 text-center select-none">
        <div className="font-pixel text-xs text-[#00FF66]">
          APEBROKERS // ROBINHOOD CHAIN
        </div>
      </footer>
    </div>
  );
};
