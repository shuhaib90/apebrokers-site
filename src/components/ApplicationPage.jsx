import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';
import { downloadBrokerCardPng, downloadBrokerGif } from '../utils/generateBrokerCard';
import { fetchActiveTasks, saveApplicationToSupabase, checkExistingApplication, determineGtdWinner } from '../utils/supabase';
import { TurnstileWidget } from './TurnstileWidget';

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
  const [taskStates, setTaskStates] = useState({});
  const [taskLinks, setTaskLinks] = useState({});
  const [captchaToken, setCaptchaToken] = useState(null);
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionData, setSubmissionData] = useState(null);

  // Fetch active tasks from Supabase or use defaults
  useEffect(() => {
    async function loadTasks() {
      const dbTasks = await fetchActiveTasks();
      if (dbTasks && dbTasks.length > 0) {
        setTasks(dbTasks);
        const initial = {};
        dbTasks.forEach((t) => {
          const key = t.task_key || t.id.toString();
          initial[key] = 'LOCKED';
        });
        setTaskStates(initial);
      } else {
        const initial = {};
        DEFAULT_TASKS.forEach((t) => {
          initial[t.task_key] = 'LOCKED';
        });
        setTaskStates(initial);
      }
    }
    loadTasks();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
    if (errors.duplicateBanner) {
      setErrors((prev) => ({ ...prev, duplicateBanner: null }));
    }
  };

  const handleOpenTask = (url, taskKey) => {
    sound?.playClick?.();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    setTaskStates((prev) => ({
      ...prev,
      [taskKey]: prev[taskKey] === 'VERIFIED' ? 'VERIFIED' : 'READY',
    }));
  };

  const handleVerifyTask = (taskKey) => {
    sound?.playClick?.();
    setTaskStates((prev) => ({ ...prev, [taskKey]: 'VERIFYING' }));
    setTimeout(() => {
      sound?.playStamp?.();
      setTaskStates((prev) => ({ ...prev, [taskKey]: 'VERIFIED' }));
    }, 900);
  };

  const validate = () => {
    if (honeypot) {
      return false; // Silent bot catch
    }

    const errs = {};
    if (!formData.xUsername.trim()) {
      errs.xUsername = 'X username is required';
    } else if (!formData.xUsername.trim().startsWith('@') && formData.xUsername.trim().length < 2) {
      errs.xUsername = 'Enter a valid X handle (e.g. @username)';
    }

    if (!formData.walletAddress.trim()) {
      errs.walletAddress = 'Wallet address is required';
    } else if (!formData.walletAddress.trim().startsWith('0x') || formData.walletAddress.trim().length < 15) {
      errs.walletAddress = 'Enter a valid Robinhood/EVM wallet address (0x...)';
    }

    // Validate mandatory tasks
    const unverifiedRequired = tasks.filter(
      (t) => t.is_required !== false && taskStates[t.task_key || t.id.toString()] !== 'VERIFIED'
    );
    if (unverifiedRequired.length > 0) {
      errs.tasks = `Please complete and verify all ${unverifiedRequired.length} mandatory tasks.`;
    }

    // Validate required proof link inputs
    tasks.forEach((t) => {
      if (t.requires_link && t.is_required !== false) {
        const key = t.task_key || t.id.toString();
        const linkVal = (taskLinks[key] || '').trim();
        if (!linkVal) {
          errs[`task_link_${key}`] = 'Comment / proof link is required';
        } else if (!linkVal.startsWith('http://') && !linkVal.startsWith('https://')) {
          errs[`task_link_${key}`] = 'Please enter a valid URL (https://...)';
        }
      }
    });

    // Validate Cloudflare Turnstile token
    if (!captchaToken) {
      errs.captcha = 'Please complete the security clearance check below.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      sound?.playClick?.();
      return;
    }

    setIsSubmitting(true);
    sound?.playPrinter?.();

    const brokerId = `#${Math.floor(1000 + Math.random() * 9000)}`;

    // Check if user wins a Golden GTD Card
    let gtdCheck = { isWinner: false };
    try {
      gtdCheck = await determineGtdWinner();
    } catch (e) {
      console.warn('GTD check error:', e);
    }

    const isGtd = gtdCheck.isWinner === true;
    const gtdArtId = isGtd ? gtdCheck.gtdArtId : null;
    const randomGifId = Math.floor(1 + Math.random() * 100);

    const commentTask = tasks.find((t) => t.requires_link);
    const commentKey = commentTask ? (commentTask.task_key || commentTask.id.toString()) : null;
    const commentLink = commentKey ? taskLinks[commentKey] : Object.values(taskLinks)[0] || null;

    const submissionPayload = {
      ...formData,
      commentLink,
      proofLinks: taskLinks,
      brokerId,
      gifId: isGtd ? gtdArtId : randomGifId,
      gifUrl: isGtd ? gtdCheck.artUrl : `/gifs/${randomGifId}.gif`,
      isGtd,
      gtdArtId,
      cardTier: isGtd ? 'GOLDEN_GTD' : 'STANDARD',
      submittedAt: new Date().toISOString(),
    };

    // Save to Supabase
    try {
      const result = await saveApplicationToSupabase(submissionPayload);
      if (result?.isDuplicate) {
        setIsSubmitting(false);
        setErrors({
          duplicateBanner: {
            message: 'APPLICATION ALREADY SUBMITTED',
            subtext: 'An application was already submitted for this X handle or wallet.',
            existingApp: result.existingApp,
          },
        });
        return;
      }
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
          particleCount: isGtd ? 100 : 50,
          spread: isGtd ? 90 : 60,
          origin: { y: 0.6 },
          colors: isGtd
            ? ['#FFD700', '#FFA500', '#FFFFFF', '#FFE57F', '#FFCC00']
            : ['#00FF66', '#FFD700', '#2A0845', '#FF2247', '#000000'],
        });
      } catch (e) {}
    }, 800);
  };

  const verifiedCount = Object.values(taskStates).filter((s) => s === 'VERIFIED').length;

  return (
    <div
      className="min-h-screen text-black font-pixel selection:bg-black selection:text-[#00FF66] flex flex-col justify-between select-none bg-cover bg-center bg-no-repeat bg-fixed relative"
      style={{
        backgroundImage: "url('/landscape_bg.gif')",
      }}
    >
      {/* Background Dimmer Layer for readability */}
      <div className="absolute inset-0 bg-black/45 pointer-events-none z-0" />

      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-[#00FF66] border-b-4 border-black px-4 sm:px-8 py-3.5 shadow-md relative">
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

          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="ApeSyndicate Logo"
              className="w-9 h-9 sm:w-11 sm:h-11 object-contain pixelated"
            />
            <span className="font-pixel text-xs sm:text-sm text-black font-extrabold">
              APESYNDICATE WL
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Form */}
      <main className="flex-grow flex items-center justify-center p-3 sm:p-6 py-6 sm:py-10 relative z-10">
        <div className="w-full max-w-2xl">
          {submissionData ? (
            /* SUCCESS CONFIRMATION & SYNDICATE IDENTIFICATION CARD */
            <div className="space-y-6">
              {/* GTD Winner Celebration Banner */}
              {submissionData.isGtd ? (
                <div className="bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] text-black border-4 border-black p-4 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-2 text-center animate-pulse">
                  <div className="flex items-center justify-center gap-2 font-pixel text-xs sm:text-sm font-extrabold tracking-wider">
                    <span className="text-base sm:text-xl">👑</span>
                    <span>[ 🏆 GUARANTEED GTD WINNER! 🏆 ]</span>
                    <span className="text-base sm:text-xl">👑</span>
                  </div>
                  <p className="font-mono text-xs sm:text-sm font-bold max-w-lg mx-auto leading-relaxed">
                    🎉 Congratulations! Your wallet was randomly chosen for a <span className="underline font-extrabold">GUARANTEED (GTD) WHITELIST ALLOCATION</span> with a Rare Golden Syndicate Pass!
                  </p>
                </div>
              ) : (
                /* Header Status for Standard */
                <div className="pixel-box p-4 sm:p-6 text-center space-y-2">
                  <div className="inline-block bg-[#00FF66] text-black font-pixel text-[10px] sm:text-xs px-3.5 py-1 border-2 border-black shadow-pixel-sm">
                    ● APPLICATION RECORDED ●
                  </div>
                  <h2 className="font-pixel text-xl sm:text-2xl text-black font-extrabold">
                    OFFICIAL SYNDICATE IDENTIFICATION
                  </h2>
                  <p className="font-mono text-xs text-gray-800 font-semibold max-w-md mx-auto">
                    Your ApeSyndicate ID Card has been issued. Download your official PNG pass below!
                  </p>
                </div>
              )}

              {/* Official Horizontal Broker ID Card (Gold Luxury if GTD) */}
              <div
                className={`relative rounded-2xl p-5 sm:p-7 shadow-[0_10px_40px_rgba(0,0,0,0.7)] overflow-hidden font-mono select-none transition-all ${
                  submissionData.isGtd
                    ? 'bg-gradient-to-br from-[#261803] via-[#140c01] to-[#050300] text-[#f7e6b5] border-4 border-[#FFD700] ring-4 ring-[#FFD700]/40 shadow-[0_0_60px_rgba(255,215,0,0.35)]'
                    : 'bg-[#140d22] text-[#f0e6d2] border-4 border-[#3d2e54]'
                }`}
              >
                {/* Inner Gold Borders & Corner Accents */}
                <div
                  className={`absolute inset-2 rounded-xl pointer-events-none ${
                    submissionData.isGtd ? 'border-2 border-[#FFD700]/70' : 'border border-[#FFD700]/40'
                  }`}
                />

                {submissionData.isGtd && (
                  <>
                    {/* Top Left Corner */}
                    <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[#FFD700] pointer-events-none" />
                    {/* Top Right Corner */}
                    <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[#FFD700] pointer-events-none" />
                    {/* Bottom Left Corner */}
                    <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[#FFD700] pointer-events-none" />
                    {/* Bottom Right Corner */}
                    <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[#FFD700] pointer-events-none" />
                  </>
                )}

                {/* Background Watermark Pattern */}
                <div
                  className="absolute inset-0 opacity-5 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#FFD700 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />

                {/* Top Header Section */}
                <div
                  className={`relative z-10 border-b-2 pb-3.5 mb-5 flex items-center justify-between gap-4 ${
                    submissionData.isGtd
                      ? 'border-[#FFD700]/60 bg-[#1c1102]/80 px-4 py-2.5 rounded-xl'
                      : 'border-[#4a3765]'
                  }`}
                >
                  {/* Left: Logo Emblem & Title */}
                  <div className="flex items-center gap-3.5 sm:gap-4">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center">
                      <img
                        src="/logo.png"
                        alt="ApeSyndicate Logo"
                        className="w-full h-full object-contain pixelated drop-shadow-md"
                      />
                    </div>

                    <div>
                      <h1 className="font-serif text-2xl sm:text-3xl text-white font-extrabold tracking-wider leading-none">
                        APESYNDICATE
                      </h1>
                      {submissionData.isGtd ? (
                        <div className="inline-block mt-1 bg-[#FFD700] text-black font-pixel text-[8px] sm:text-[9px] px-2 py-0.5 font-bold shadow-sm">
                          👑 GUARANTEED (GTD) SYNDICATE PASS
                        </div>
                      ) : (
                        <div className="text-[10px] sm:text-xs font-bold tracking-[2px] mt-1 uppercase text-[#c7b299]">
                          OFFICIAL SYNDICATE IDENTIFICATION
                        </div>
                      )}
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                        EXP: 12/2026 • ROBINHOOD CHAIN
                      </div>
                    </div>
                  </div>

                  {/* Right: ID & Class */}
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xl sm:text-3xl text-[#FFD700] font-bold tracking-widest">
                      APE-{submissionData.brokerId.replace('#', '')}
                    </div>
                    <div className="font-pixel text-[9px] sm:text-[10px] text-[#FFD700] font-bold mt-1 bg-[#2d1c02] px-2 py-1 rounded border border-[#FFD700]/50">
                      {submissionData.isGtd ? 'CLASS: 👑 GTD TIER 1' : 'CLASS: 5★ BROKER'}
                    </div>
                  </div>
                </div>

                {/* Card Body: Left Photo + Right Details */}
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center">
                  {/* Left: Framed 1:1 NFT Photo */}
                  <div className="md:col-span-4 flex justify-center">
                    <div
                      className={`w-full max-w-[220px] aspect-[4/5] p-2 relative shadow-lg ${
                        submissionData.isGtd
                          ? 'bg-[#1a0e00] border-4 border-[#FFD700]'
                          : 'bg-[#0a0612] border-3 border-[#4a3765]'
                      }`}
                    >
                      {/* Inner gold frame */}
                      <div className="w-full h-full border-2 border-[#FFD700]/70 relative overflow-hidden bg-black flex items-center justify-center">
                        <img
                          src={submissionData.gifUrl}
                          alt={submissionData.isGtd ? `Golden Ape #${submissionData.gtdArtId}` : `ApeBroker #${submissionData.gifId}`}
                          className="w-full h-full object-cover pixelated"
                        />
                        <div className="absolute top-1.5 left-1.5 bg-[#FFD700] text-black font-pixel text-[8px] px-2 py-0.5 border border-black font-bold">
                          {submissionData.isGtd ? `👑 GOLD APE #${submissionData.gtdArtId}` : `APE #${submissionData.gifId}`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Identity Details Grid */}
                  <div className="md:col-span-8 space-y-3.5 text-left">
                    {/* Name / Organization */}
                    <div className="border-b border-[#3d2e54] pb-2.5">
                      <div className="text-base sm:text-xl text-[#FFF2D6] font-serif font-bold tracking-wide">
                        “THE SYNDICATE” {submissionData.xUsername.toUpperCase()}
                      </div>
                      <div
                        className={`text-xs sm:text-sm font-serif mt-0.5 ${
                          submissionData.isGtd ? 'text-[#FFD700] font-bold' : 'text-[#c7b299]'
                        }`}
                      >
                        {submissionData.isGtd
                          ? '👑 GUARANTEED VIP FLOOR  //  ROBINHOOD NETWORK'
                          : 'APESYNDICATE FLOOR, ROBINHOOD NETWORK'}
                      </div>
                    </div>

                    {/* Spec Grid (3 Columns) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2.5 gap-x-4 text-xs">
                      <div>
                        <span className="text-[#d9b44a] font-bold text-[11px] block">CHAIN:</span>
                        <span className="text-[#00F0FF] font-bold">ROBINHOOD</span>
                      </div>

                      <div>
                        <span className="text-[#d9b44a] font-bold text-[11px] block">SUPPLY:</span>
                        <span className="text-[#00FF66] font-bold">5,555</span>
                      </div>

                      <div>
                        <span className="text-[#d9b44a] font-bold text-[11px] block">STATUS:</span>
                        <span className="text-[#FFD700] font-bold">
                          {submissionData.isGtd ? '👑 GTD APPROVED' : 'UNDER REVIEW'}
                        </span>
                      </div>

                      <div className="col-span-2">
                        <span className="text-[#d9b44a] font-bold text-[11px] block">WALLET:</span>
                        <span className="text-white font-bold truncate block">
                          {submissionData.walletAddress}
                        </span>
                      </div>

                      <div>
                        <span className="text-[#d9b44a] font-bold text-[11px] block">ALLOCATION:</span>
                        <span className={`font-bold ${submissionData.isGtd ? 'text-[#FFD700]' : 'text-[#00DDFF]'}`}>
                          {submissionData.isGtd ? '👑 GUARANTEED (GTD)' : 'APPLIED'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[#d9b44a] font-bold text-[11px] block">ROLE:</span>
                        <span className="text-[#FFE8A3] font-semibold">
                          {submissionData.isGtd ? '👑 VIP SYNDICATE' : 'APPLICANT'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[#d9b44a] font-bold text-[11px] block">ACCESS:</span>
                        <span className="text-[#00FFAA] font-bold">
                          {submissionData.isGtd ? 'UNRESTRICTED' : 'PENDING'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[#d9b44a] font-bold text-[11px] block">DOB:</span>
                        <span className="text-[#FF3366] font-bold">2026 / RH</span>
                      </div>
                    </div>

                    {/* Bottom Signature & Stamp */}
                    <div className="pt-2 flex items-center justify-between border-t border-[#805d00]/60">
                      <div className="text-[10px] text-[#aa8c52] font-mono">
                        {submissionData.isGtd
                          ? `AUTHENTICATED // RH-GTD-5555 // #${submissionData.brokerId.replace('#', '')}`
                          : `APE-RH-5555 // #${submissionData.brokerId.replace('#', '')}`}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="font-serif italic text-sm text-[#FFD700] opacity-90">
                          ApeSyndicate Executive
                        </div>
                        <div className="border-2 border-[#FFD700] text-[#FFD700] font-pixel text-[7px] px-2 py-0.5 -rotate-6 shadow-sm bg-[#1c1102]">
                          {submissionData.isGtd ? '★ GTD PASS ★' : 'RECEIVED'}
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
                  className={`w-full min-h-[48px] pixel-btn px-4 py-3 font-pixel text-xs font-extrabold flex items-center justify-center gap-2 ${
                    submissionData.isGtd ? 'pixel-btn-gold text-black' : 'pixel-btn-lime'
                  }`}
                >
                  <span>💾</span>
                  <span>
                    {submissionData.isGtd ? '👑 DOWNLOAD GOLDEN GTD PASS (PNG)' : 'DOWNLOAD CARD (PNG)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound?.playClick?.();
                    downloadBrokerGif(submissionData.gifUrl, submissionData.gifId);
                  }}
                  className="w-full min-h-[48px] pixel-btn pixel-btn-black text-white px-4 py-3 font-pixel text-xs font-extrabold flex items-center justify-center gap-2"
                >
                  <span>📥</span>
                  <span>{submissionData.isGtd ? 'SAVE GOLDEN APE NFT' : 'SAVE NFT GIF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound?.playClick?.();
                    const tweetText = encodeURIComponent(
                      submissionData.isGtd
                        ? `I just won a GOLDEN GTD Pass for @Apesyndicates on Robinhood Chain! 👑🦍\n\nSyndicate ID: ${submissionData.brokerId} - 100% Guaranteed WL!\n\nhttps://x.com/Apesyndicates/status/2093348238971846874/photo/1\n\n#ApeSyndicate #RobinhoodChain #NFT`
                        : `Applied for @Apesyndicates Whitelist! 🦍\n\nFloor Pass ${submissionData.brokerId} secured on Robinhood Chain.\n\nhttps://x.com/Apesyndicates/status/2093348238971846874/photo/1\n\n#ApeSyndicate #NFT`
                    );
                    window.open(`https://x.com/intent/tweet?text=${tweetText}`, '_blank', 'noopener,noreferrer');
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
                  APESYNDICATE APPLICATION
                </h1>
                <p className="font-mono text-xs text-gray-700 font-semibold">
                  Submit your X username, wallet address, and complete social tasks.
                </p>
              </div>

              {/* Duplicate Application Alert Banner */}
              {errors.duplicateBanner && (
                <div className="bg-[#FF2247]/10 border-3 border-[#FF2247] p-4 sm:p-5 text-center space-y-2.5 shadow-pixel-sm">
                  <div className="inline-block bg-[#FF2247] text-white font-pixel text-[9px] px-2.5 py-1 border border-black font-extrabold">
                    ! {errors.duplicateBanner.message}
                  </div>
                  <div className="font-mono text-xs text-black font-bold max-w-md mx-auto leading-relaxed">
                    {errors.duplicateBanner.subtext}
                  </div>
                  {errors.duplicateBanner.existingApp && (
                    <div className="pt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          sound?.playClick?.();
                          const existing = errors.duplicateBanner.existingApp;
                          const randomGif = Math.floor(1 + Math.random() * 100);
                          setSubmissionData({
                            brokerId: existing.broker_id || `#${Math.floor(1000 + Math.random() * 9000)}`,
                            xUsername: existing.x_username,
                            walletAddress: existing.wallet_address,
                            gifId: existing.gtd_art_id || randomGif,
                            gifUrl: existing.is_gtd ? `/nfts/gold_${existing.gtd_art_id || 1}.png` : `/gifs/${randomGif}.gif`,
                            isGtd: existing.is_gtd,
                            gtdArtId: existing.gtd_art_id,
                            cardTier: existing.card_tier || (existing.is_gtd ? 'GOLDEN_GTD' : 'STANDARD'),
                            submittedAt: existing.created_at || new Date().toISOString(),
                          });
                        }}
                        className="pixel-btn pixel-btn-black px-4 py-2.5 text-[10px] font-pixel text-[#00FF66] font-extrabold flex items-center gap-2"
                      >
                        <span>🪪</span>
                        <span>[ VIEW YOUR REGISTERED ID CARD ]</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

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

                  {/* Dynamic Social Tasks List */}
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
                        className="bg-white border-3 border-black p-3 sm:p-3.5 flex flex-col gap-2.5 shadow-pixel-sm"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
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
                              onClick={() => handleOpenTask(task.target_url || task.url, key)}
                              className="pixel-btn pixel-btn-white px-2.5 py-1.5 text-[9px]"
                            >
                              {task.action_label ? `[ ${task.action_label.toUpperCase()} ]` : task.button_label || '[ OPEN ]'}
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

                        {/* Optional Proof / Comment Link Entry Box */}
                        {task.requires_link && (
                          <div className="w-full pt-2.5 mt-1 border-t-2 border-dashed border-gray-300 space-y-1 text-left">
                            <div className="flex items-center justify-between">
                              <span className="font-pixel text-[8px] sm:text-[9px] text-[#2A0845] font-extrabold flex items-center gap-1">
                                <span>🔗</span> <span>COMMENT LINK / PROOF URL:</span>
                                {task.is_required !== false && <span className="text-[#FF2247]">*</span>}
                              </span>
                            </div>
                            <input
                              type="url"
                              placeholder={task.input_placeholder || 'Paste your X comment link (https://x.com/...)'}
                              value={taskLinks[key] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTaskLinks((prev) => ({ ...prev, [key]: val }));
                                if (errors[`task_link_${key}`]) {
                                  setErrors((prev) => ({ ...prev, [`task_link_${key}`]: null }));
                                }
                              }}
                              className={`w-full h-10 px-3 bg-[#F4F6F8] text-black font-mono text-xs border-2 ${
                                errors[`task_link_${key}`] ? 'border-[#FF2247] bg-[#FFF0F2]' : 'border-black'
                              } focus:border-[#00FF66] focus:bg-white transition-colors`}
                            />
                            {errors[`task_link_${key}`] && (
                              <div className="font-pixel text-[8px] text-[#FF2247] mt-0.5">
                                ! {errors[`task_link_${key}`]}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {errors.tasks && (
                    <div className="font-pixel text-[9px] text-[#FF2247] bg-[#FF2247]/10 p-2 border-2 border-[#FF2247] text-center">
                      ! {errors.tasks}
                    </div>
                  )}
                </div>

                {/* Cloudflare Turnstile Bot Verification */}
                <div className="space-y-2 pt-1 text-left">
                  <TurnstileWidget
                    onVerify={(token) => {
                      setCaptchaToken(token);
                      if (errors.captcha) {
                        setErrors((prev) => ({ ...prev, captcha: null }));
                      }
                    }}
                    onExpire={() => setCaptchaToken(null)}
                    onError={() => {
                      // Graceful fallback for local development
                      setCaptchaToken('cf_dev_pass');
                    }}
                  />
                  {errors.captcha && (
                    <div className="font-pixel text-[9px] text-[#FF2247] bg-[#FF2247]/10 p-2 border border-[#FF2247] text-center">
                      ! {errors.captcha}
                    </div>
                  )}
                </div>

                {/* Hidden Honeypot Field for Automated Bot Trapping */}
                <input
                  type="text"
                  name="broker_clearance_hp"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  style={{ display: 'none', position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                  tabIndex="-1"
                  autoComplete="off"
                />

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
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-black text-white border-t-4 border-black px-4 py-6 text-center select-none relative z-10">
        <div className="font-pixel text-xs text-[#00FF66]">
          APESYNDICATE // ROBINHOOD CHAIN
        </div>
      </footer>
    </div>
  );
};
