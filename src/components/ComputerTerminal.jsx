import React, { useState } from 'react';
import { sound } from '../utils/audio';
import { PixelXIcon, PixelDiscordIcon } from './PixelApeArt';

export const ComputerTerminal = ({ onBackToOffice, onSubmitSuccess }) => {
  const [formData, setFormData] = useState({
    xUsername: '',
    walletAddress: '',
  });

  // Task verification states: 'LOCKED' | 'READY' | 'VERIFYING' | 'VERIFIED'
  const [taskStates, setTaskStates] = useState({
    followX: 'LOCKED',
    joinDiscord: 'LOCKED',
    repostWL: 'LOCKED',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field, value) => {
    sound.playTyping();
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleOpenTask = (url, taskKey) => {
    sound.playClick();
    window.open(url, '_blank', 'noopener,noreferrer');
    // Once opened, task becomes READY to verify
    if (taskStates[taskKey] === 'LOCKED') {
      setTaskStates((prev) => ({ ...prev, [taskKey]: 'READY' }));
    }
  };

  const handleVerifyTask = (taskKey) => {
    sound.playClick();
    setTaskStates((prev) => ({ ...prev, [taskKey]: 'VERIFYING' }));
    // Simulate backend verification check
    setTimeout(() => {
      sound.playVerifyChime();
      setTaskStates((prev) => ({ ...prev, [taskKey]: 'VERIFIED' }));
      if (errors.tasks) {
        setErrors((prev) => ({ ...prev, tasks: null }));
      }
    }, 600);
  };

  const validate = () => {
    const errs = {};
    if (!formData.xUsername.trim()) {
      errs.xUsername = 'X username is required';
    }
    if (!formData.walletAddress.trim()) {
      errs.walletAddress = 'Wallet address is required';
    } else if (formData.walletAddress.trim().length < 10) {
      errs.walletAddress = 'Please provide a valid wallet address';
    }

    const allVerified = Object.values(taskStates).every((st) => st === 'VERIFIED');
    if (!allVerified) {
      errs.tasks = 'Please complete and verify all 3 required Broker Checklist tasks';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sound.playClick();

    if (!validate()) {
      sound.playStamp();
      return;
    }

    setIsSubmitting(true);
    sound.playPrinter();

    setTimeout(() => {
      setIsSubmitting(false);
      const brokerId = `#${Math.floor(1000 + Math.random() * 9000)}`;
      onSubmitSuccess({
        ...formData,
        brokerId,
        submittedAt: new Date().toISOString(),
      });
    }, 1200);
  };

  const verifiedCount = Object.values(taskStates).filter((s) => s === 'VERIFIED').length;

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 select-none animate-fadeIn">
      {/* Top Breadcrumb & Return to Office button */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onBackToOffice();
          }}
          className="pixel-btn pixel-btn-purple px-3 py-2 text-[10px] flex items-center gap-1.5"
        >
          <span>◄ RETURN TO OFFICE</span>
        </button>

        <div className="font-pixel text-[9px] text-broker-black bg-broker-white px-2.5 py-1.5 border-2 border-black">
          TERMINAL // SECURE_NODE_01
        </div>
      </div>

      {/* Main Terminal Frame */}
      <div className="bg-broker-black border-4 border-black p-4 sm:p-8 shadow-pixel-xl relative">
        {/* Terminal Header Bar */}
        <div className="bg-broker-purple border-3 border-black p-3.5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-neon-lime inline-block animate-blink" />
              <h1 className="font-pixel text-sm sm:text-base text-broker-gold tracking-wider uppercase">
                APEBROKERS BROKER APPLICATION
              </h1>
            </div>
            <p className="font-pixel text-[9px] text-neon-lime mt-1">
              "Submit your credentials for official whitelist screening."
            </p>
          </div>
          <div className="bg-broker-black text-broker-gold font-pixel text-[9px] px-2.5 py-1 border border-broker-gold self-start sm:self-auto">
            5,555 SUPPLY
          </div>
        </div>

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* X USERNAME */}
          <div className="space-y-1.5">
            <label className="font-pixel text-[10px] sm:text-[11px] text-broker-gold flex items-center gap-1.5">
              <span>X USERNAME</span>
              <span className="text-broker-crimson">*</span>
            </label>
            <input
              type="text"
              placeholder="@username"
              value={formData.xUsername}
              onChange={(e) => handleInputChange('xUsername', e.target.value)}
              className={`w-full px-3 py-2.5 bg-broker-white text-broker-black font-mono-code text-sm pixel-input ${
                errors.xUsername ? 'border-broker-crimson ring-2 ring-broker-crimson' : ''
              }`}
            />
            {errors.xUsername && (
              <div className="font-pixel text-[9px] text-broker-crimson mt-1">
                ! {errors.xUsername}
              </div>
            )}
          </div>

          {/* WALLET ADDRESS */}
          <div className="space-y-1.5">
            <label className="font-pixel text-[10px] sm:text-[11px] text-broker-gold flex items-center gap-1.5">
              <span>WALLET ADDRESS</span>
              <span className="text-broker-crimson">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter Robinhood Chain / EVM wallet address (0x...)"
              value={formData.walletAddress}
              onChange={(e) => handleInputChange('walletAddress', e.target.value)}
              className={`w-full px-3 py-2.5 bg-broker-white text-broker-black font-mono-code text-sm pixel-input ${
                errors.walletAddress ? 'border-broker-crimson ring-2 ring-broker-crimson' : ''
              }`}
            />
            {errors.walletAddress && (
              <div className="font-pixel text-[9px] text-broker-crimson mt-1">
                ! {errors.walletAddress}
              </div>
            )}
          </div>

          {/* BROKER SOCIAL TASKS */}
          <div className="space-y-3 pt-2">
            <div className="bg-broker-card border-3 border-black p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="font-pixel text-[10px] sm:text-[11px] text-broker-gold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-neon-lime inline-block" />
                  <span>BROKER SOCIAL TASKS</span>
                </div>
                <div className="font-mono-code text-[11px] text-gray-300 mt-0.5">
                  Click [ OPEN ], then click [ VERIFY ] to confirm each required task.
                </div>
              </div>

              {/* Verified Count Badge */}
              <div className="bg-broker-black border-2 border-black px-3 py-1 font-pixel text-[9px] text-broker-gold self-start sm:self-auto">
                VERIFIED: <span className="text-neon-lime font-bold">{verifiedCount}</span> / 3
              </div>
            </div>

            {/* Task Items */}
            <div className="space-y-2.5">
              {/* TASK 01: FOLLOW ON X */}
              <div className="p-3 bg-broker-black border-2 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-broker-card border border-gray-700 text-neon-lime">
                    <PixelXIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-pixel text-[9px] sm:text-[10px] text-broker-white">
                      TASK 01: FOLLOW APEBROKERS ON X
                    </div>
                    <div className="font-mono-code text-[10px] text-gray-400">@ApeBrokers official</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto font-pixel text-[9px]">
                  <button
                    type="button"
                    onClick={() => handleOpenTask('https://x.com', 'followX')}
                    className="pixel-btn pixel-btn-white px-2.5 py-1.5"
                  >
                    [ OPEN ]
                  </button>
                  <button
                    type="button"
                    disabled={taskStates.followX === 'LOCKED' || taskStates.followX === 'VERIFIED'}
                    onClick={() => handleVerifyTask('followX')}
                    className={`pixel-btn px-2.5 py-1.5 ${
                      taskStates.followX === 'VERIFIED'
                        ? 'bg-neon-lime text-broker-black cursor-default'
                        : taskStates.followX === 'READY'
                        ? 'bg-broker-gold text-broker-black animate-pulse'
                        : 'bg-broker-card-light text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {taskStates.followX === 'VERIFIED'
                      ? '✓ VERIFIED'
                      : taskStates.followX === 'VERIFYING'
                      ? 'CHECKING...'
                      : taskStates.followX === 'READY'
                      ? '[ VERIFY ]'
                      : 'LOCKED'}
                  </button>
                </div>
              </div>

              {/* TASK 02: JOIN DISCORD */}
              <div className="p-3 bg-broker-black border-2 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-broker-card border border-gray-700 text-broker-cyan">
                    <PixelDiscordIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-pixel text-[9px] sm:text-[10px] text-broker-white">
                      TASK 02: JOIN THE APEBROKERS DISCORD
                    </div>
                    <div className="font-mono-code text-[10px] text-gray-400">Trading Floor Community</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto font-pixel text-[9px]">
                  <button
                    type="button"
                    onClick={() => handleOpenTask('https://discord.com', 'joinDiscord')}
                    className="pixel-btn pixel-btn-white px-2.5 py-1.5"
                  >
                    [ OPEN ]
                  </button>
                  <button
                    type="button"
                    disabled={taskStates.joinDiscord === 'LOCKED' || taskStates.joinDiscord === 'VERIFIED'}
                    onClick={() => handleVerifyTask('joinDiscord')}
                    className={`pixel-btn px-2.5 py-1.5 ${
                      taskStates.joinDiscord === 'VERIFIED'
                        ? 'bg-neon-lime text-broker-black cursor-default'
                        : taskStates.joinDiscord === 'READY'
                        ? 'bg-broker-gold text-broker-black animate-pulse'
                        : 'bg-broker-card-light text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {taskStates.joinDiscord === 'VERIFIED'
                      ? '✓ VERIFIED'
                      : taskStates.joinDiscord === 'VERIFYING'
                      ? 'CHECKING...'
                      : taskStates.joinDiscord === 'READY'
                      ? '[ VERIFY ]'
                      : 'LOCKED'}
                  </button>
                </div>
              </div>

              {/* TASK 03: REPOST ANNOUNCEMENT */}
              <div className="p-3 bg-broker-black border-2 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-broker-card border border-gray-700 text-broker-gold">
                    <PixelXIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-pixel text-[9px] sm:text-[10px] text-broker-white">
                      TASK 03: REPOST THE WL ANNOUNCEMENT
                    </div>
                    <div className="font-mono-code text-[10px] text-gray-400">Spread the alpha on X</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto font-pixel text-[9px]">
                  <button
                    type="button"
                    onClick={() => handleOpenTask('https://x.com/intent/retweet', 'repostWL')}
                    className="pixel-btn pixel-btn-white px-2.5 py-1.5"
                  >
                    [ OPEN ]
                  </button>
                  <button
                    type="button"
                    disabled={taskStates.repostWL === 'LOCKED' || taskStates.repostWL === 'VERIFIED'}
                    onClick={() => handleVerifyTask('repostWL')}
                    className={`pixel-btn px-2.5 py-1.5 ${
                      taskStates.repostWL === 'VERIFIED'
                        ? 'bg-neon-lime text-broker-black cursor-default'
                        : taskStates.repostWL === 'READY'
                        ? 'bg-broker-gold text-broker-black animate-pulse'
                        : 'bg-broker-card-light text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {taskStates.repostWL === 'VERIFIED'
                      ? '✓ VERIFIED'
                      : taskStates.repostWL === 'VERIFYING'
                      ? 'CHECKING...'
                      : taskStates.repostWL === 'READY'
                      ? '[ VERIFY ]'
                      : 'LOCKED'}
                  </button>
                </div>
              </div>

              {errors.tasks && (
                <div className="font-pixel text-[9px] text-broker-crimson bg-broker-crimson/10 p-2 border border-broker-crimson">
                  ! {errors.tasks}
                </div>
              )}
            </div>
          </div>

          {/* SUBMIT BUTTON & WARNING */}
          <div className="pt-4 text-center space-y-3">
            <div className="font-pixel text-[10px] text-broker-gold tracking-wide">
              "CONFIRM YOUR X HANDLE AND WALLET ADDRESS BEFORE SUBMITTING."
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 px-6 text-sm sm:text-base font-pixel tracking-wider pixel-btn pixel-btn-primary ${
                isSubmitting ? 'opacity-75 cursor-wait' : ''
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 bg-broker-black animate-spin" />
                  <span>TRANSMITTING APPLICATION...</span>
                </span>
              ) : (
                '[ SUBMIT APPLICATION ]'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};