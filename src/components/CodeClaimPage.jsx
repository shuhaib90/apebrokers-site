import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';
import { validateAndRedeemPromoCode, fetchActiveTasks } from '../utils/supabase';
import { connectWallet, getConnectedAccount } from '../utils/web3Contract';
import { TurnstileWidget } from './TurnstileWidget';
import { HumanVerificationSlider } from './HumanVerificationSlider';
import { downloadCodeClaimerCardPng, generateCodeClaimerCardDataUrl } from '../utils/generateBrokerCard';

export const CodeClaimPage = ({ onBackHome }) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [xUsername, setXUsername] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [commentLink, setCommentLink] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [humanSignature, setHumanSignature] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Social Task Verification State (Only X tasks required)
  const [socialTasks, setSocialTasks] = useState([
    {
      id: 'follow',
      title: 'FOLLOW @APESYNDICATES ON X',
      url: 'https://x.com/Apesyndicates',
      verified: false,
    },
    {
      id: 'repost',
      title: 'REPOST WL ANNOUNCEMENT ON X',
      url: 'https://x.com/Apesyndicates/status/2093348238971846874',
      verified: false,
    },
  ]);

  // Success Claim Modal
  const [claimSuccessData, setClaimSuccessData] = useState(null);
  const [cardPreviewUrl, setCardPreviewUrl] = useState(null);

  useEffect(() => {
    checkInitialWallet();
  }, []);

  useEffect(() => {
    if (claimSuccessData) {
      generateCodeClaimerCardDataUrl({
        brokerId: claimSuccessData.brokerId,
        xUsername: claimSuccessData.xUsername,
        walletAddress: claimSuccessData.walletAddress,
        codeName: claimSuccessData.codeName,
        campaignTag: claimSuccessData.campaignTag,
      }).then((url) => {
        if (url) setCardPreviewUrl(url);
      });
    } else {
      setCardPreviewUrl(null);
    }
  }, [claimSuccessData]);

  const checkInitialWallet = async () => {
    const account = await getConnectedAccount();
    if (account) setWalletAddress(account);
  };

  const handleConnect = async () => {
    sound?.playClick?.();
    const res = await connectWallet();
    if (res.success && res.address) {
      setWalletAddress(res.address);
      sound?.playPowerUp?.();
    } else if (res.error) {
      sound?.playError?.();
      alert(res.error);
    }
  };

  const handleOpenTask = (url, taskId) => {
    sound?.playClick?.();
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => {
      setSocialTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, canVerify: true } : t))
      );
    }, 1200);
  };

  const handleVerifyTask = (taskId) => {
    sound?.playPowerUp?.();
    setSocialTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, verified: true } : t))
    );
  };

  const validateForm = () => {
    const errs = {};
    const cleanUser = xUsername.trim();
    if (!cleanUser) {
      errs.xUsername = 'X username is required';
    } else if (!cleanUser.startsWith('@') && cleanUser.length < 2) {
      errs.xUsername = 'Enter a valid handle (e.g. @username)';
    }

    const cleanWallet = walletAddress.trim();
    if (!cleanWallet) {
      errs.wallet = 'Wallet address is required';
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(cleanWallet)) {
      errs.wallet = 'Enter a valid 42-character EVM address (0x...)';
    }

    const cleanCode = promoCode.trim().toUpperCase();
    if (!cleanCode) {
      errs.promoCode = 'Secret promo/invite code is required';
    } else if (cleanCode.length < 3) {
      errs.promoCode = 'Enter a valid code';
    }

    // Check all social tasks verified
    const unverifiedTasks = socialTasks.filter((t) => !t.verified);
    if (unverifiedTasks.length > 0) {
      errs.tasks = `Please verify all ${socialTasks.length} required social tasks below.`;
    }

    if (!captchaToken) {
      errs.captcha = 'Please complete the security check.';
    }

    if (!humanSignature) {
      errs.humanSlider = 'Slide the Golden Key to complete human verification.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      sound?.playError?.();
      return;
    }

    setIsSubmitting(true);
    sound?.playClick?.();

    try {
      const result = await validateAndRedeemPromoCode(promoCode, {
        xUsername,
        walletAddress,
        commentLink: commentLink.trim() || null,
        proofLinks: {
          social_tasks: 'ALL_VERIFIED',
          comment_url: commentLink.trim() || null,
        },
      });

      sound?.playStamp?.();
      setTimeout(() => sound?.playFanfare?.(), 300);

      confetti({
        particleCount: 180,
        spread: 120,
        origin: { y: 0.55 },
        colors: ['#FFD700', '#00FF66', '#00DDFF', '#FFFFFF', '#FF2247'],
      });

      setClaimSuccessData({
        brokerId: result.brokerId,
        codeName: result.codeName,
        campaignTag: result.campaignTag,
        xUsername,
        walletAddress,
        gtdArtId: result.gtdArtId,
        submittedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Promo claim error:', err);
      sound?.playError?.();
      setFormErrors({
        submit: err.message || 'Failed to redeem code. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareOnX = () => {
    sound?.playClick?.();
    const text = `I just redeemed an exclusive SECRET INVITE CODE and secured a GUARANTEED (GTD) Whitelist Spot for @Apesyndicates on Robinhood Chain!\n\nRedeem your code here: https://apesyndicates.xyz/code.html\n\n#ApeSyndicate #RobinhoodChain #GTD https://x.com/Apesyndicates/status/2093348238971846874/photo/1`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDownloadCard = () => {
    sound?.playClick?.();
    downloadCodeClaimerCardPng({
      brokerId: claimSuccessData?.brokerId,
      xUsername: claimSuccessData?.xUsername,
      walletAddress: claimSuccessData?.walletAddress,
      codeName: claimSuccessData?.codeName,
      campaignTag: claimSuccessData?.campaignTag,
      submittedAt: claimSuccessData?.submittedAt,
    });
  };

  return (
    <div
      className="min-h-screen text-white flex flex-col items-center justify-between relative bg-cover bg-center bg-no-repeat bg-fixed select-none"
      style={{
        backgroundImage: 'url(/landscape_bg.gif)',
        backgroundColor: '#0a0612',
      }}
    >
      {/* Background Dimmer */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] pointer-events-none" />

      {/* Top Navigation Bar */}
      <div className="relative z-20 w-full max-w-6xl mx-auto px-4 py-4 sm:py-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            sound?.playClick?.();
            if (onBackHome) onBackHome();
            else window.location.href = '/';
          }}
          className="pixel-btn pixel-btn-black px-4 py-2 text-[10px] sm:text-xs font-pixel text-white border-2 border-white hover:border-[#00FF66]"
        >
          [ ← HOME ]
        </button>

        <div className="flex items-center gap-2 bg-black/90 px-3.5 py-1.5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="w-2.5 h-2.5 bg-[#FFD700] inline-block animate-blink" />
          <span className="font-pixel text-[10px] text-[#FFD700] font-extrabold tracking-wider">
            SECRET CODE REDEMPTION VAULT
          </span>
        </div>
      </div>

      {/* Main Form Container */}
      <main className="relative z-10 w-full max-w-2xl mx-auto px-4 py-6 text-center space-y-6">
        {/* Title Header */}
        <div className="space-y-2.5">
          <div className="inline-block bg-black text-[#FFD700] px-4 py-1.5 border-3 border-black font-pixel text-[9px] sm:text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
            [ EXCLUSIVE SECRET PROMO CODE CLAIM ]
          </div>
          <h1 className="font-pixel text-2xl sm:text-4xl text-white font-extrabold tracking-tight drop-shadow-[6px_6px_0px_rgba(0,0,0,1)]">
            SECRET CODE GTD CLAIM
          </h1>
          <div className="bg-black/90 max-w-xl mx-auto p-3.5 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-lg">
            <p className="font-mono text-xs sm:text-sm text-gray-200 font-semibold leading-relaxed">
              Enter your exclusive secret invite or promotional code below to claim an instant 100% guaranteed (GTD) whitelist allocation.
            </p>
          </div>
        </div>

        {/* Claim Form Box */}
        <div className="bg-[#FFF9EE] text-black border-4 border-black p-5 sm:p-7 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] text-left space-y-5 rounded-2xl overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-5">
            {formErrors.submit && (
              <div className="p-3 bg-[#FF2247]/15 border-3 border-[#FF2247] font-pixel text-[9px] text-[#FF2247]">
                ! {formErrors.submit}
              </div>
            )}

            {/* Step 1: X Handle */}
            <div>
              <label className="block font-pixel text-[10px] text-black font-extrabold mb-1">
                1. YOUR X (TWITTER) USERNAME <span className="text-[#FF2247]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="@username"
                value={xUsername}
                onChange={(e) => {
                  setXUsername(e.target.value);
                  if (formErrors.xUsername) setFormErrors({ ...formErrors, xUsername: null });
                }}
                className={`w-full h-11 px-3 bg-white border-3 ${
                  formErrors.xUsername ? 'border-[#FF2247]' : 'border-black'
                } font-mono text-sm text-black font-bold focus:outline-none focus:border-[#00FF66] rounded`}
              />
              {formErrors.xUsername && (
                <p className="font-pixel text-[8px] text-[#FF2247] mt-1">! {formErrors.xUsername}</p>
              )}
            </div>

            {/* Step 2: Wallet Address */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-pixel text-[10px] text-black font-extrabold">
                  2. ROBINHOOD WALLET ADDRESS <span className="text-[#FF2247]">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleConnect}
                  className="font-pixel text-[8px] text-[#007A33] hover:underline font-extrabold"
                >
                  [ AUTO-FILL FROM WALLET ]
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="0x..."
                value={walletAddress}
                onChange={(e) => {
                  setWalletAddress(e.target.value);
                  if (formErrors.wallet) setFormErrors({ ...formErrors, wallet: null });
                }}
                className={`w-full h-11 px-3 bg-white border-3 ${
                  formErrors.wallet ? 'border-[#FF2247]' : 'border-black'
                } font-mono text-xs sm:text-sm text-black font-bold focus:outline-none focus:border-[#00FF66] rounded`}
              />
              {formErrors.wallet && (
                <p className="font-pixel text-[8px] text-[#FF2247] mt-1">! {formErrors.wallet}</p>
              )}
            </div>

            {/* Step 3: Required Social Tasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-pixel text-[10px] text-black font-extrabold">
                  3. REQUIRED SOCIAL TASKS
                </label>
                <span className="font-pixel text-[8px] px-2 py-0.5 bg-black text-[#FFD700] rounded">
                  {socialTasks.filter((t) => t.verified).length} OF {socialTasks.length} VERIFIED
                </span>
              </div>

              <div className="space-y-2 bg-[#EFE8D8] p-3 border-3 border-black rounded-lg">
                {socialTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-2.5 rounded border-2 transition-all ${
                      task.verified
                        ? 'bg-[#00FF66]/20 border-[#00AA44]'
                        : 'bg-white border-black'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-pixel text-[10px] text-black">
                        {task.verified ? '✓' : '●'}
                      </span>
                      <span className="font-pixel text-[8px] sm:text-[9px] text-black font-bold">
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {task.verified ? (
                        <span className="font-pixel text-[8px] text-[#006622] font-extrabold px-3 py-1.5 bg-[#00FF66]/40 rounded border border-[#00AA44]">
                          ✓ DONE
                        </span>
                      ) : task.canVerify ? (
                        <button
                          type="button"
                          onClick={() => handleVerifyTask(task.id)}
                          className="px-3.5 py-1.5 bg-[#00AA44] hover:bg-[#008833] text-white font-pixel text-[8px] sm:text-[9px] rounded font-extrabold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-pulse"
                        >
                          [ VERIFY ]
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenTask(task.url, task.id)}
                          className="px-3.5 py-1.5 bg-black hover:bg-gray-800 text-[#FFD700] hover:text-white font-pixel text-[8px] sm:text-[9px] rounded font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                          [ OPEN ]
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {formErrors.tasks && (
                <p className="font-pixel text-[8px] text-[#FF2247] mt-1">! {formErrors.tasks}</p>
              )}
            </div>

            {/* Step 4: Secret Code Input */}
            <div className="p-3.5 bg-[#111] text-white border-3 border-black rounded-lg space-y-1.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
              <label className="block font-pixel text-[10px] text-[#FFD700] font-extrabold">
                4. ENTER YOUR SECRET PROMO CODE <span className="text-[#FF2247]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. VIPAPE2026"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  if (formErrors.promoCode) setFormErrors({ ...formErrors, promoCode: null });
                }}
                className={`w-full h-12 px-4 bg-black border-3 ${
                  formErrors.promoCode ? 'border-[#FF2247]' : 'border-[#FFD700]'
                } font-mono text-base sm:text-lg text-[#FFD700] font-extrabold uppercase tracking-widest focus:outline-none focus:border-[#00FF66] rounded text-center`}
              />
              <p className="font-mono text-[10px] text-gray-400 text-center">
                Secret codes are single-use per allocation or limited to campaign caps.
              </p>
              {formErrors.promoCode && (
                <p className="font-pixel text-[8px] text-[#FF2247] text-center mt-1">
                  ! {formErrors.promoCode}
                </p>
              )}
            </div>

            {/* Step 5: Optional Comment / Proof URL */}
            <div>
              <label className="block font-pixel text-[8px] text-gray-700 mb-1">
                OPTIONAL: X COMMENT OR PROOF LINK
              </label>
              <input
                type="url"
                placeholder="https://x.com/yourhandle/status/..."
                value={commentLink}
                onChange={(e) => setCommentLink(e.target.value)}
                className="w-full h-10 px-3 bg-white border-2 border-black font-mono text-xs text-black rounded"
              />
            </div>

            {/* Turnstile Security Widget */}
            <div>
              <TurnstileWidget onVerify={(token) => setCaptchaToken(token)} />
              {formErrors.captcha && (
                <p className="font-pixel text-[8px] text-[#FF2247] mt-1">! {formErrors.captcha}</p>
              )}
            </div>

            {/* Golden Key Slider */}
            <div>
              <HumanVerificationSlider onVerified={(sig) => setHumanSignature(sig)} />
              {formErrors.humanSlider && (
                <p className="font-pixel text-[8px] text-[#FF2247] mt-1">! {formErrors.humanSlider}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !humanSignature}
                className={`w-full py-4 font-pixel text-xs font-extrabold transition-all border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                  humanSignature && !isSubmitting
                    ? 'bg-[#FFD700] hover:bg-[#ffe033] text-black animate-pulse'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                }`}
              >
                {isSubmitting
                  ? '[ VERIFYING & REDEEMING CODE... ]'
                  : humanSignature
                  ? '[ REDEEM SECRET CODE & CLAIM GTD SPOT ]'
                  : '[ SLIDE KEY ABOVE TO UNLOCK ]'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Triumphant Success Modal with Live Card Preview */}
      {claimSuccessData && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-black text-white border-4 border-[#FFD700] max-w-lg w-full p-5 sm:p-6 text-center shadow-[0_0_40px_rgba(255,215,0,0.5)] space-y-4 my-8 rounded-2xl overflow-hidden">
            <div className="inline-block bg-[#FFD700] text-black font-pixel text-xs px-3.5 py-1.5 border-2 border-black font-extrabold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              [ SECRET CODE REDEEMED ]
            </div>

            <div className="space-y-1">
              <span className="font-pixel text-[9px] text-[#00FF66] tracking-widest font-extrabold">
                GUARANTEED ALLOCATION CONFIRMED
              </span>
              <h2 className="font-pixel text-lg sm:text-2xl text-white font-extrabold">
                GTD SPOT CLAIMED!
              </h2>
            </div>

            {/* Live Generated Card Artwork Preview */}
            <div className="relative w-full aspect-[3/2] bg-[#050505] border-3 border-[#00FF66] rounded overflow-hidden shadow-[0_0_20px_rgba(0,255,102,0.3)]">
              {cardPreviewUrl ? (
                <img
                  src={cardPreviewUrl}
                  alt="ApeSyndicate Code GTD Pass"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-2 text-gray-400 font-pixel text-[9px]">
                  <div className="w-6 h-6 border-2 border-[#00FF66] border-t-transparent rounded-full animate-spin" />
                  <span>GENERATING 24K GTD PASS...</span>
                </div>
              )}
            </div>

            {/* Details Summary Bar */}
            <div className="p-3 bg-[#111] border-2 border-[#FFD700]/40 text-left space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">PROMO CODE:</span>
                <span className="font-bold text-[#FFD700]">{claimSuccessData.codeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">SYNDICATE ID:</span>
                <span className="font-bold text-[#00FF66]">{claimSuccessData.brokerId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">X HANDLE:</span>
                <span className="text-white font-bold">{claimSuccessData.xUsername}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">STATUS:</span>
                <span className="text-[#00FF66] font-bold">100% GUARANTEED (GTD)</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleDownloadCard}
                className="w-full py-3.5 pixel-btn pixel-btn-gold text-black font-pixel text-xs font-extrabold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                [ DOWNLOAD 24K GOLDEN PASS ]
              </button>

              <button
                type="button"
                onClick={handleShareOnX}
                className="w-full py-3.5 bg-[#1DA1F2] hover:bg-[#0c85d0] text-white font-pixel text-xs font-bold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>[ SHARE ON X ]</span>
              </button>

              <button
                type="button"
                onClick={() => setClaimSuccessData(null)}
                className="w-full py-2.5 bg-[#222] hover:bg-[#333] text-gray-300 font-pixel text-[10px] border-2 border-gray-600"
              >
                [ CLOSE ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-gray-400 font-pixel text-[9px] bg-black/80 border-t-2 border-black">
        APESYNDICATE • ROBINHOOD CHAIN • SECRET CODE REDEMPTIONS
      </footer>
    </div>
  );
};
