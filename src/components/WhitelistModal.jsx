import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';

export const WhitelistModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    xUsername: '',
    discordUsername: '',
    walletAddress: '',
    motivation: '',
  });

  const [taskStates, setTaskStates] = useState({
    follow: 'PENDING', // PENDING | LOADING | DONE
    discord: 'PENDING',
    repost: 'PENDING',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submissionId, setSubmissionId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleTaskAction = (taskKey, url) => {
    sound?.playClick?.();
    window.open(url, '_blank', 'noopener,noreferrer');
    
    setTaskStates((prev) => ({ ...prev, [taskKey]: 'LOADING' }));
    setTimeout(() => {
      sound?.playVerifyChime?.();
      setTaskStates((prev) => ({ ...prev, [taskKey]: 'DONE' }));
    }, 800);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrorMsg('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sound?.playClick?.();

    const xTrim = formData.xUsername.trim();
    const discordTrim = formData.discordUsername.trim();
    const walletTrim = formData.walletAddress.trim();

    if (!xTrim) {
      setErrorMsg('Please enter your X username');
      return;
    }
    if (!discordTrim) {
      setErrorMsg('Please enter your Discord username');
      return;
    }
    if (!walletTrim) {
      setErrorMsg('Please enter your Robinhood / EVM wallet address');
      return;
    }
    if (walletTrim.length < 10) {
      setErrorMsg('Please enter a valid wallet address (0x...)');
      return;
    }

    const allTasksDone = Object.values(taskStates).every((st) => st === 'DONE');
    if (!allTasksDone) {
      setErrorMsg('Please complete all 3 checklist tasks before submitting');
      return;
    }

    setIsSubmitting(true);
    sound?.playPrinter?.();

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      const id = `#${Math.floor(1000 + Math.random() * 9000)}`;
      setSubmissionId(id);

      sound?.playStamp?.();
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#00FF66', '#FFD700', '#e875a6', '#ffffff'],
        });
      } catch (e) {}
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0d141b] border border-[#2e3e4f] rounded-2xl p-6 sm:p-8 text-white shadow-2xl animate-modal my-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            sound?.playClick?.();
            onClose();
          }}
          aria-label="Close modal"
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
        >
          ×
        </button>

        {isSuccess ? (
          /* SUCCESS STATE */
          <div className="text-center py-4 space-y-5">
            <div className="w-14 h-14 rounded-full bg-[#00FF66]/15 border border-[#00FF66]/40 text-[#00FF66] text-2xl font-black flex items-center justify-center mx-auto">
              ✓
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono font-bold tracking-widest text-[#00FF66]">
                STATUS: UNDER REVIEW • {submissionId}
              </span>
              <h3 className="text-2xl font-extrabold text-white">
                Application Received
              </h3>
              <p className="text-sm text-gray-300 max-w-sm mx-auto leading-relaxed pt-1">
                Your ApeBrokers WL application has been submitted successfully. Keep an eye on X and Discord for the official whitelist announcement.
              </p>
            </div>

            <div className="pt-2">
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => sound?.playClick?.()}
                className="btn-lime w-full py-3.5 px-6 text-sm font-bold flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>Follow @ApeBrokers on X</span>
              </a>
            </div>
          </div>
        ) : (
          /* APPLICATION FORM STATE */
          <div className="space-y-5">
            <div>
              <p className="eyebrow mb-1">APEBROKERS WHITELIST</p>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Apply for Whitelist
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Complete the tasks below, enter your wallet, and submit.
              </p>
            </div>

            {/* Checklist Tasks (MellowPals style) */}
            <div className="space-y-2.5">
              {/* Task 1 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#121c26] border border-[#263544] gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#080d12] border border-[#2e3e4f] text-xs font-mono font-bold flex items-center justify-center text-gray-300 shrink-0">
                    1
                  </span>
                  <div>
                    <strong className="block text-xs sm:text-sm font-bold text-white">Follow us</strong>
                    <span className="text-[11px] text-gray-400">Follow @ApeBrokers on X</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTaskAction('follow', 'https://x.com')}
                  disabled={taskStates.follow === 'DONE'}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                    taskStates.follow === 'DONE'
                      ? 'bg-[#00FF66]/15 text-[#00FF66] border border-[#00FF66]/40 cursor-default'
                      : 'btn-lime'
                  }`}
                >
                  {taskStates.follow === 'DONE' ? '✓ Followed' : taskStates.follow === 'LOADING' ? 'Checking...' : 'Follow'}
                </button>
              </div>

              {/* Task 2 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#121c26] border border-[#263544] gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#080d12] border border-[#2e3e4f] text-xs font-mono font-bold flex items-center justify-center text-gray-300 shrink-0">
                    2
                  </span>
                  <div>
                    <strong className="block text-xs sm:text-sm font-bold text-white">Join Discord</strong>
                    <span className="text-[11px] text-gray-400">Join ApeBrokers trading floor</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTaskAction('discord', 'https://discord.com')}
                  disabled={taskStates.discord === 'DONE'}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                    taskStates.discord === 'DONE'
                      ? 'bg-[#00FF66]/15 text-[#00FF66] border border-[#00FF66]/40 cursor-default'
                      : 'btn-lime'
                  }`}
                >
                  {taskStates.discord === 'DONE' ? '✓ Joined' : taskStates.discord === 'LOADING' ? 'Checking...' : 'Join'}
                </button>
              </div>

              {/* Task 3 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#121c26] border border-[#263544] gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#080d12] border border-[#2e3e4f] text-xs font-mono font-bold flex items-center justify-center text-gray-300 shrink-0">
                    3
                  </span>
                  <div>
                    <strong className="block text-xs sm:text-sm font-bold text-white">Repost Announcement</strong>
                    <span className="text-[11px] text-gray-400">Repost our pinned post on X</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTaskAction('repost', 'https://x.com/intent/retweet')}
                  disabled={taskStates.repost === 'DONE'}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                    taskStates.repost === 'DONE'
                      ? 'bg-[#00FF66]/15 text-[#00FF66] border border-[#00FF66]/40 cursor-default'
                      : 'btn-lime'
                  }`}
                >
                  {taskStates.repost === 'DONE' ? '✓ Reposted' : taskStates.repost === 'LOADING' ? 'Checking...' : 'Repost'}
                </button>
              </div>
            </div>

            {/* Input Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-300">
                    X Username <span className="text-[#e875a6]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="@username"
                    value={formData.xUsername}
                    onChange={(e) => handleInputChange('xUsername', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#121c26] border border-[#263544] text-white text-sm focus:border-[#00FF66] focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-300">
                    Discord Username <span className="text-[#e875a6]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="username"
                    value={formData.discordUsername}
                    onChange={(e) => handleInputChange('discordUsername', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#121c26] border border-[#263544] text-white text-sm focus:border-[#00FF66] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-300">
                  Robinhood Chain / EVM Wallet Address <span className="text-[#e875a6]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={formData.walletAddress}
                  onChange={(e) => handleInputChange('walletAddress', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121c26] border border-[#263544] text-white text-sm font-mono focus:border-[#00FF66] focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-300">
                  Why do you want to join ApeBrokers?
                </label>
                <textarea
                  rows={2}
                  placeholder="Tell us why you want to join the trading floor..."
                  value={formData.motivation}
                  onChange={(e) => handleInputChange('motivation', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#121c26] border border-[#263544] text-white text-sm focus:border-[#00FF66] focus:outline-none transition-colors resize-none"
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-400 text-xs text-center font-medium">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 btn-lime text-sm font-extrabold tracking-wider mt-2 ${
                  isSubmitting ? 'opacity-70 cursor-wait' : ''
                }`}
              >
                {isSubmitting ? 'TRANSMITTING APPLICATION...' : 'SUBMIT APPLICATION'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
