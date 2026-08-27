import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';
import { downloadBrokerCardPng, downloadBrokerGif } from '../utils/generateBrokerCard';
import { fetchActiveTasks, saveApplicationToSupabase } from '../utils/supabase';

const DEFAULT_TASKS = [
  {
    id: 'followX',
    task_key: 'followX',
    title: 'FOLLOW @APEBROKERSNFT ON X',
    platform: 'X',
    url: 'https://x.com/ApebrokersNft',
    button_label: '[ OPEN ]',
    is_required: true,
  },
  {
    id: 'joinDiscord',
    task_key: 'joinDiscord',
    title: 'JOIN APEBROKERS DISCORD',
    platform: 'DISCORD',
    url: 'https://discord.com',
    button_label: '[ OPEN ]',
    is_required: true,
  },
  {
    id: 'repostWL',
    task_key: 'repostWL',
    title: 'REPOST WL ANNOUNCEMENT',
    platform: 'X',
    url: 'https://x.com/ApebrokersNft',
    button_label: '[ OPEN ]',
    is_required: true,
  },
];

export const ApplicationPage = ({ onBackHome }) => {
  const [formData, setFormData] = useState({
    xUsername: '',
    walletAddress: '',
  });

  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [taskStates, setTaskStates] = useState({
    followX: 'LOCKED',
    joinDiscord: 'LOCKED',
    repostWL: 'LOCKED',
  });

  useEffect(() => {
    async function loadTasks() {
      const dbTasks = await fetchActiveTasks();
      if (dbTasks && dbTasks.length > 0) {
        setTasks(dbTasks);
        const initialStates = {};
        dbTasks.forEach((t) => {
          const key = t.task_key || t.id.toString();
          initialStates[key] = 'LOCKED';
        });
        setTaskStates(initialStates);
      }
    }
    loadTasks();
  }, []);

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

    const requiredTasks = tasks.filter((t) => t.is_required !== false);
    const allRequiredVerified = requiredTasks.every((t) => {
      const key = t.task_key || t.id.toString();
      return taskStates[key] === 'VERIFIED';
    });
    if (!allRequiredVerified) {
      errs.tasks = `Please complete and verify all ${requiredTasks.length} required social tasks`;
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
    const randomGifId = Math.floor(1 + Math.random() * 100);
    const submissionPayload = {
      ...formData,
      brokerId,
      gifId: randomGifId,
      gifUrl: `/gifs/${randomGifId}.gif`,
      submittedAt: new Date().toISOString(),
    };

    // Save to Supabase
    try {
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

          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="ApeBrokers Logo"
              className="w-7 h-7 object-contain pixelated border-2 border-black bg-black"
            />
            <span className="font-pixel text-xs sm:text-sm text-black font-extrabold">
              APEBROKERS WL
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 flex-grow flex flex-col justify-center">
        {submissionData ? (
          /* SUCCESS CONFIRMATION & BROKER IDENTIFICATION CARD */
          <div className="space-y-6">
            {/* Header Status */}
            <div className="pixel-box p-4 sm:p-6 text-center space-y-2">
              <div className="inline-block bg-[#00FF66] text-black font-pixel text-[10px] sm:text-xs px-3.5 py-1 border-2 border-black shadow-pixel-sm">
                ● APPLICATION RECORDED ●
              </div>
              <h2 className="font-pixel text-xl sm:text-2xl text-black font-extrabold">
                OFFICIAL BROKER IDENTIFICATION
              </h2>
              <p className="font-mono text-xs text-gray-800 font-semibold max-w-md mx-auto">
                Your ApeBrokers ID Card has been issued. Download your official PNG pass below!
              </p>
            </div>

            {/* Official Horizontal Broker ID Card (Reference Style) */}
            <div className="relative bg-[#140d22] text-[#f0e6d2] border-4 border-[#3d2e54] rounded-2xl p-5 sm:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.6)] overflow-hidden font-mono select-none">
              {/* Inner Gold Border */}
              <div className="absolute inset-2 border border-[#FFD700]/40 rounded-xl pointer-events-none" />

              {/* Background Watermark Pattern */}
              <div
                className="absolute inset-0 opacity-5 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(#FFD700 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />

              {/* Top Header Section */}
              <div className="relative z-10 border-b-2 border-[#4a3765] pb-3.5 mb-5 flex items-center justify-between gap-4">
                {/* Left: Logo Emblem & Title */}
                <div className="flex items-center gap-3.5 sm:gap-4">
                  {/* Logo Frame */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-black border-2 border-[#FFD700] rounded-lg overflow-hidden shrink-0 flex items-center justify-center shadow-md">
                    <img
                      src="/logo.png"
                      alt="ApeBrokers Logo"
                      className="w-full h-full object-contain pixelated"
                    />
                  </div>

                  <div>
                    <h1 className="font-serif text-2xl sm:text-3xl text-white font-extrabold tracking-wider leading-none">
                      APEBROKERS
                    </h1>
                    <div className="text-[10px] sm:text-xs text-[#c7b299] font-bold tracking-[2px] mt-1 uppercase">
                      OFFICIAL BROKER IDENTIFICATION
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                      EXP: 12/2026
                    </div>
                  </div>
                </div>

                {/* Right: ID & Class */}
                <div className="text-right shrink-0">
                  <div className="font-mono text-xl sm:text-3xl text-white font-bold tracking-widest">
                    APE-{submissionData.brokerId.replace('#', '')}
                  </div>
                  <div className="font-mono text-[10px] sm:text-xs text-[#FFD700] font-bold mt-1">
                    CLASS: 5★ BROKER
                  </div>
                </div>
              </div>

              {/* Card Body: Left Photo + Right Details */}
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center">
                {/* Left: Framed 1:1 Animated NFT Photo */}
                <div className="md:col-span-4 flex justify-center">
                  <div className="w-full max-w-[220px] aspect-[4/5] bg-[#0a0612] border-3 border-[#4a3765] p-2 relative shadow-lg">
                    {/* Inner gold frame */}
                    <div className="w-full h-full border border-[#FFD700]/50 relative overflow-hidden bg-black flex items-center justify-center">
                      <img
                        src={submissionData.gifUrl}
                        alt={`ApeBroker #${submissionData.gifId}`}
                        className="w-full h-full object-cover pixelated"
                      />
                      <div className="absolute top-1.5 left-1.5 bg-[#FFD700] text-black font-pixel text-[8px] px-2 py-0.5 border border-black font-bold">
                        APE #{submissionData.gifId}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Identity Details Grid */}
                <div className="md:col-span-8 space-y-3.5 text-left">
                  {/* Name / Organization */}
                  <div className="border-b border-[#3d2e54] pb-2.5">
                    <div className="text-base sm:text-xl text-[#f0e6d2] font-serif font-bold tracking-wide">
                      “THE BROKER” {submissionData.xUsername.toUpperCase()}
                    </div>
                    <div className="text-xs sm:text-sm text-[#c7b299] font-serif mt-0.5">
                      APEBROKERS TRADING FLOOR, ROBINHOOD NETWORK
                    </div>
                  </div>

                  {/* Spec Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2.5 gap-x-4 text-xs">
                    <div>
                      <span className="text-[#9e8fae] font-bold text-[11px] block">CHAIN:</span>
                      <span className="text-[#00DDFF] font-bold">ROBINHOOD</span>
                    </div>

                    <div>
                      <span className="text-[#9e8fae] font-bold text-[11px] block">SUPPLY:</span>
                      <span className="text-[#00FF66] font-bold">5,555</span>
                    </div>

                    <div>
                      <span className="text-[#9e8fae] font-bold text-[11px] block">STATUS:</span>
                      <span className="text-[#00FF66] font-bold">VERIFIED</span>
                    </div>

                    <div className="col-span-2">
                      <span className="text-[#9e8fae] font-bold text-[11px] block">WALLET:</span>
                      <span className="text-white font-bold truncate block">
                        {submissionData.walletAddress}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#9e8fae] font-bold text-[11px] block">ALLOCATION:</span>
                      <span className="text-[#FFD700] font-bold">WHITELIST</span>
                    </div>

                    <div>
                      <span className="text-[#9e8fae] font-bold text-[11px] block">ROLE:</span>
                      <span className="text-[#f0e6d2] font-semibold">FLOOR ALPHA</span>
                    </div>

                    <div>
                      <span className="text-[#9e8fae] font-bold text-[11px] block">ACCESS:</span>
                      <span className="text-[#FFD700] font-bold">LEVEL-5</span>
                    </div>

                    <div>
                      <span className="text-[#9e8fae] font-bold text-[11px] block">DOB:</span>
                      <span className="text-[#FF2247] font-bold">2026/RH</span>
                    </div>
                  </div>

                  {/* Bottom Signature & Stamp */}
                  <div className="pt-2 flex items-center justify-between border-t border-[#3d2e54]">
                    <div className="text-[10px] text-gray-500 font-mono">
                      APE-RH-5555 // {submissionData.brokerId}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="font-serif italic text-sm text-[#FFD700] opacity-80">
                        ApeBrokers Executive
                      </div>
                      <div className="border border-[#00FF66] text-[#00FF66] font-pixel text-[7px] px-1.5 py-0.5 -rotate-6">
                        APPROVED
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  downloadBrokerCardPng(submissionData);
                }}
                className="w-full min-h-[48px] pixel-btn pixel-btn-lime px-4 py-3 font-pixel text-xs font-extrabold flex items-center justify-center gap-2"
              >
                <span>💾</span>
                <span>DOWNLOAD CARD (PNG)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  downloadBrokerGif(submissionData.gifUrl, submissionData.gifId);
                }}
                className="w-full min-h-[48px] pixel-btn pixel-btn-gold px-4 py-3 font-pixel text-xs font-extrabold flex items-center justify-center gap-2"
              >
                <span>📥</span>
                <span>SAVE NFT GIF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  const tweetText = encodeURIComponent(
                    `Applied for @ApebrokersNft Whitelist! 🦍\n\nFloor Pass ${submissionData.brokerId} secured on Robinhood Chain.\n\n#ApeBrokers #NFT`
                  );
                  window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank', 'noopener,noreferrer');
                }}
                className="w-full min-h-[48px] pixel-btn pixel-btn-white px-4 py-3 font-pixel text-xs font-bold flex items-center justify-center gap-2"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>SHARE ON X</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound?.playClick?.();
                  if (onBackHome) onBackHome();
                  else window.location.href = '/';
                }}
                className="w-full min-h-[48px] pixel-btn pixel-btn-black px-4 py-3 font-pixel text-xs font-bold flex items-center justify-center gap-2"
              >
                <span>◄ RETURN HOME</span>
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
                    {verifiedCount} / {tasks.length} VERIFIED
                  </span>
                </div>

                {/* Dynamic Social Tasks List (Synced with Admin Dashboard & Supabase) */}
                {tasks.map((task) => {
                  const key = task.task_key || task.id.toString();
                  const state = taskStates[key] || 'LOCKED';
                  const platform = (task.platform || 'X').toUpperCase();
                  const isDC = platform.includes('DISCORD');
                  const isTG = platform.includes('TELEGRAM');
                  const iconBg = isDC ? 'bg-[#5865F2]' : isTG ? 'bg-[#0088CC]' : 'bg-black text-[#00FF66]';
                  const iconText = isDC ? 'DC' : isTG ? 'TG' : platform.includes('RETWEET') || platform.includes('REPOST') ? 'RT' : 'X';

                  return (
                    <div
                      key={key}
                      className="bg-white border-3 border-black p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-pixel-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-7 h-7 ${iconBg} flex items-center justify-center font-pixel text-xs shrink-0 border border-black text-white`}
                        >
                          {iconText}
                        </span>
                        <div className="font-pixel text-[9px] sm:text-[10px] text-black">
                          {task.title}
                          {task.is_required !== false && <span className="text-[#FF2247] ml-1">*</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleOpenTask(task.url, key)}
                          className="pixel-btn pixel-btn-white px-2.5 py-1.5 text-[9px]"
                        >
                          {task.button_label || '[ OPEN ]'}
                        </button>

                        <button
                          type="button"
                          disabled={state === 'LOCKED' || state === 'VERIFIED'}
                          onClick={() => handleVerifyTask(key)}
                          className={`pixel-btn px-2.5 py-1.5 text-[9px] min-w-[78px] ${
                            state === 'VERIFIED'
                              ? 'pixel-btn-lime cursor-default text-black font-bold'
                              : state === 'READY'
                              ? 'pixel-btn-gold animate-pulse text-black'
                              : state === 'VERIFYING'
                              ? 'bg-gray-300 text-black cursor-wait'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed border-gray-400'
                          }`}
                        >
                          {state === 'VERIFIED'
                            ? '✓ DONE'
                            : state === 'VERIFYING'
                            ? '...'
                            : state === 'READY'
                            ? '[ VERIFY ]'
                            : 'LOCKED'}
                        </button>
                      </div>
                    </div>
                  );
                })}

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
