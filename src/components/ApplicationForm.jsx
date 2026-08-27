import React, { useState } from 'react';
import { sound } from '../utils/audio';

export const ApplicationForm = ({ onSubmitSuccess }) => {
  const [formData, setFormData] = useState({
    xUsername: '',
    discordUsername: '',
    walletAddress: '',
    motivation: '',
    discoverySource: 'X',
    referralCode: '',
  });

  const [taskStates, setTaskStates] = useState({
    followX: 'LOCKED', // LOCKED | READY | VERIFYING | VERIFIED
    joinDiscord: 'LOCKED',
    repostWL: 'LOCKED',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const discordTrim = formData.discordUsername.trim();
    const walletTrim = formData.walletAddress.trim();
    const motivationTrim = formData.motivation.trim();

    if (!xTrim) {
      errs.xUsername = 'X username is required';
    }
    if (!discordTrim) {
      errs.discordUsername = 'Discord username is required';
    }
    if (!walletTrim) {
      errs.walletAddress = 'Wallet address is required';
    } else if (walletTrim.length < 10) {
      errs.walletAddress = 'Please enter a valid Robinhood / EVM wallet address';
    }
    if (!motivationTrim) {
      errs.motivation = 'Please share why you want to join ApeBrokers';
    }

    const allVerified = Object.values(taskStates).every((s) => s === 'VERIFIED');
    if (!allVerified) {
      errs.tasks = 'Please complete and verify all 3 checklist tasks below';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sound?.playClick?.();

    if (!validate()) {
      sound?.playStamp?.();
      return;
    }

    setIsSubmitting(true);
    sound?.playPrinter?.();

    setTimeout(() => {
      setIsSubmitting(false);
      const brokerId = `#${Math.floor(1000 + Math.random() * 9000)}`;
      onSubmitSuccess({
        ...formData,
        brokerId,
        submittedAt: new Date().toISOString(),
      });
    }, 1100);
  };

  const verifiedCount = Object.values(taskStates).filter((s) => s === 'VERIFIED').length;

  return (
    <section id="apply" className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 select-none scroll-mt-20">
      <div className="pixel-box p-5 sm:p-8 md:p-10">
        {/* Section Header */}
        <div className="border-b-4 border-black pb-5 mb-6 text-center space-y-2">
          <div className="inline-block bg-black text-[#00FF66] font-pixel text-[9px] sm:text-[10px] px-3 py-1 border-2 border-black">
            ROBINHOOD CHAIN • 2,222 ALLOCATION
          </div>
          <h2 className="font-pixel text-xl sm:text-2xl md:text-3xl text-black font-extrabold tracking-tight">
            APEBROKERS WL APPLICATION
          </h2>
          <p className="font-mono text-xs sm:text-sm text-gray-700 font-semibold max-w-xl mx-auto">
            Complete the application below for a chance to secure a whitelist spot.
          </p>
        </div>

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          {/* Grid: X Username & Discord Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* X USERNAME */}
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

            {/* DISCORD USERNAME */}
            <div className="space-y-1.5 text-left">
              <label className="font-pixel text-[10px] sm:text-[11px] text-black block font-bold">
                DISCORD USERNAME <span className="text-[#FF2247]">*</span>
              </label>
              <input
                type="text"
                placeholder="username"
                value={formData.discordUsername}
                onChange={(e) => handleInputChange('discordUsername', e.target.value)}
                className={`w-full h-12 px-3.5 bg-white text-black font-mono text-sm font-semibold pixel-input ${
                  errors.discordUsername ? 'border-[#FF2247]' : ''
                }`}
              />
              {errors.discordUsername && (
                <div className="font-pixel text-[9px] text-[#FF2247] mt-1">
                  ! {errors.discordUsername}
                </div>
              )}
            </div>
          </div>

          {/* WALLET ADDRESS */}
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
              placeholder="Enter Robinhood Chain / EVM address (0x...)"
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

          {/* WHY DO YOU WANT TO JOIN APEBROKERS? */}
          <div className="space-y-1.5 text-left">
            <div className="flex justify-between items-center">
              <label className="font-pixel text-[10px] sm:text-[11px] text-black font-bold">
                WHY DO YOU WANT TO JOIN APEBROKERS? <span className="text-[#FF2247]">*</span>
              </label>
              <span className="font-mono text-[11px] text-gray-500 font-semibold">
                {formData.motivation.length} chars
              </span>
            </div>
            <textarea
              rows={3}
              placeholder="Tell us why you want to join..."
              value={formData.motivation}
              onChange={(e) => handleInputChange('motivation', e.target.value)}
              className={`w-full p-3.5 bg-white text-black font-mono text-sm font-semibold pixel-input resize-y ${
                errors.motivation ? 'border-[#FF2247]' : ''
              }`}
            />
            {errors.motivation && (
              <div className="font-pixel text-[9px] text-[#FF2247] mt-1">
                ! {errors.motivation}
              </div>
            )}
          </div>

          {/* Grid: HOW DID YOU FIND US? & REFERRAL CODE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 text-left">
            {/* HOW DID YOU FIND US? */}
            <div className="space-y-1.5">
              <label className="font-pixel text-[10px] sm:text-[11px] text-black font-bold">
                HOW DID YOU FIND US?
              </label>
              <select
                value={formData.discoverySource}
                onChange={(e) => handleInputChange('discoverySource', e.target.value)}
                className="w-full h-12 px-3.5 bg-white text-black font-mono text-sm font-semibold pixel-input cursor-pointer"
              >
                <option value="X">X (Twitter)</option>
                <option value="Discord">Discord</option>
                <option value="Friend">Friend</option>
                <option value="Partner">Partner</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* REFERRAL CODE */}
            <div className="space-y-1.5">
              <label className="font-pixel text-[10px] sm:text-[11px] text-black font-bold">
                REFERRAL CODE
              </label>
              <input
                type="text"
                placeholder="Optional"
                value={formData.referralCode}
                onChange={(e) => handleInputChange('referralCode', e.target.value)}
                className="w-full h-12 px-3.5 bg-white text-black font-mono text-sm font-semibold pixel-input"
              />
            </div>
          </div>

          {/* SOCIAL TASKS CHECKLIST */}
          <div className="space-y-3 pt-2">
            <div className="bg-black text-white p-3 sm:p-3.5 border-3 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="font-pixel text-[11px] sm:text-xs text-[#FFD700] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#00FF66] inline-block animate-blink" />
                  <span>COMPLETE THE CHECKLIST</span>
                </div>
                <p className="font-mono text-[11px] text-gray-300 mt-0.5 font-medium">
                  Open each link and verify to complete required tasks.
                </p>
              </div>
              <div className="bg-[#140D24] text-[#00FF66] font-pixel text-[9px] sm:text-[10px] px-2.5 py-1 border-2 border-black self-start sm:self-auto">
                VERIFIED: {verifiedCount} / 3
              </div>
            </div>

            {/* Task 1 */}
            <div className="bg-white border-3 border-black p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-pixel-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black text-[#00FF66] flex items-center justify-center font-pixel text-xs border border-black shrink-0">
                  X
                </div>
                <div>
                  <div className="font-pixel text-[10px] sm:text-[11px] text-black">
                    FOLLOW APEBROKERS ON X
                  </div>
                  <div className="font-mono text-xs text-gray-600 font-medium">@ApeBrokers official</div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleOpenTask('https://x.com', 'followX')}
                  className="pixel-btn pixel-btn-white px-3 py-2 text-[10px]"
                >
                  [ FOLLOW ]
                </button>
                <button
                  type="button"
                  disabled={taskStates.followX === 'LOCKED' || taskStates.followX === 'VERIFIED'}
                  onClick={() => handleVerifyTask('followX')}
                  className={`pixel-btn px-3 py-2 text-[10px] ${
                    taskStates.followX === 'VERIFIED'
                      ? 'pixel-btn-lime cursor-default'
                      : taskStates.followX === 'READY'
                      ? 'pixel-btn-gold animate-pulse'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-400'
                  }`}
                >
                  {taskStates.followX === 'VERIFIED'
                    ? '✓ COMPLETED'
                    : taskStates.followX === 'VERIFYING'
                    ? 'CHECKING...'
                    : taskStates.followX === 'READY'
                    ? '[ VERIFY ]'
                    : 'LOCKED'}
                </button>
              </div>
            </div>

            {/* Task 2 */}
            <div className="bg-white border-3 border-black p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-pixel-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#2A0845] text-white flex items-center justify-center font-pixel text-xs border border-black shrink-0">
                  DC
                </div>
                <div>
                  <div className="font-pixel text-[10px] sm:text-[11px] text-black">
                    JOIN APEBROKERS DISCORD
                  </div>
                  <div className="font-mono text-xs text-gray-600 font-medium">Trading Floor Community</div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleOpenTask('https://discord.com', 'joinDiscord')}
                  className="pixel-btn pixel-btn-white px-3 py-2 text-[10px]"
                >
                  [ JOIN ]
                </button>
                <button
                  type="button"
                  disabled={taskStates.joinDiscord === 'LOCKED' || taskStates.joinDiscord === 'VERIFIED'}
                  onClick={() => handleVerifyTask('joinDiscord')}
                  className={`pixel-btn px-3 py-2 text-[10px] ${
                    taskStates.joinDiscord === 'VERIFIED'
                      ? 'pixel-btn-lime cursor-default'
                      : taskStates.joinDiscord === 'READY'
                      ? 'pixel-btn-gold animate-pulse'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-400'
                  }`}
                >
                  {taskStates.joinDiscord === 'VERIFIED'
                    ? '✓ COMPLETED'
                    : taskStates.joinDiscord === 'VERIFYING'
                    ? 'CHECKING...'
                    : taskStates.joinDiscord === 'READY'
                    ? '[ VERIFY ]'
                    : 'LOCKED'}
                </button>
              </div>
            </div>

            {/* Task 3 */}
            <div className="bg-white border-3 border-black p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-pixel-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-black text-[#FFD700] flex items-center justify-center font-pixel text-xs border border-black shrink-0">
                  RT
                </div>
                <div>
                  <div className="font-pixel text-[10px] sm:text-[11px] text-black">
                    REPOST THE WL ANNOUNCEMENT
                  </div>
                  <div className="font-mono text-xs text-gray-600 font-medium">Spread the alpha on X</div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleOpenTask('https://x.com/intent/retweet', 'repostWL')}
                  className="pixel-btn pixel-btn-white px-3 py-2 text-[10px]"
                >
                  [ REPOST ]
                </button>
                <button
                  type="button"
                  disabled={taskStates.repostWL === 'LOCKED' || taskStates.repostWL === 'VERIFIED'}
                  onClick={() => handleVerifyTask('repostWL')}
                  className={`pixel-btn px-3 py-2 text-[10px] ${
                    taskStates.repostWL === 'VERIFIED'
                      ? 'pixel-btn-lime cursor-default'
                      : taskStates.repostWL === 'READY'
                      ? 'pixel-btn-gold animate-pulse'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-400'
                  }`}
                >
                  {taskStates.repostWL === 'VERIFIED'
                    ? '✓ COMPLETED'
                    : taskStates.repostWL === 'VERIFYING'
                    ? 'CHECKING...'
                    : taskStates.repostWL === 'READY'
                    ? '[ VERIFY ]'
                    : 'LOCKED'}
                </button>
              </div>
            </div>

            {errors.tasks && (
              <div className="font-pixel text-[9px] text-[#FF2247] bg-[#FF2247]/10 p-2.5 border-2 border-[#FF2247] text-center">
                ! {errors.tasks}
              </div>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-4 space-y-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full min-h-[52px] sm:min-h-[56px] py-4 px-6 pixel-btn pixel-btn-black font-pixel text-sm sm:text-base font-extrabold tracking-wider ${
                isSubmitting ? 'opacity-70 cursor-wait' : ''
              }`}
            >
              {isSubmitting ? 'TRANSMITTING APPLICATION...' : '[ SUBMIT APPLICATION ]'}
            </button>

            <p className="font-pixel text-[8px] sm:text-[9px] text-gray-600 text-center">
              * Applications are reviewed by the core team. Multiple submissions are restricted.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
};
