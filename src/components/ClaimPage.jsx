import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';
import { fetchCommunities, claimCommunityGtdSpot, checkExistingApplication } from '../utils/supabase';
import { connectWallet, getConnectedAccount, scanAllPartnerContracts } from '../utils/web3Contract';
import { TurnstileWidget } from './TurnstileWidget';
import { HumanVerificationSlider } from './HumanVerificationSlider';
import { validateTweetUrlFormat } from '../utils/xVerification';
import { downloadBrokerCardPng } from '../utils/generateBrokerCard';

export const ClaimPage = ({ onBackHome }) => {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [eligibility, setEligibility] = useState({}); // { [commId]: { isHolder, balance } }

  // Claim Modal State
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [xUsername, setXUsername] = useState('');
  const [commentLink, setCommentLink] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [humanSignature, setHumanSignature] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Claim Modal
  const [claimSuccessData, setClaimSuccessData] = useState(null);
  const [copiedWallet, setCopiedWallet] = useState(false);

  useEffect(() => {
    loadCommunities();
    checkInitialWallet();
  }, []);

  const loadCommunities = async () => {
    setLoading(true);
    try {
      const data = await fetchCommunities();
      setCommunities(data);
    } catch (err) {
      console.error('Error fetching communities:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkInitialWallet = async () => {
    const account = await getConnectedAccount();
    if (account) {
      setWalletAddress(account);
      runScan(account, communities);
    }
  };

  const handleConnect = async () => {
    sound?.playClick?.();
    const res = await connectWallet();
    if (res.success && res.address) {
      setWalletAddress(res.address);
      sound?.playPowerUp?.();
      runScan(res.address, communities);
    } else if (res.error) {
      sound?.playError?.();
      alert(res.error);
    }
  };

  const handleDisconnect = () => {
    sound?.playClick?.();
    setWalletAddress(null);
    setEligibility({});
  };

  const runScan = async (address, commList) => {
    const targetList = commList && commList.length > 0 ? commList : communities;
    if (!address || targetList.length === 0) return;
    setScanning(true);
    try {
      const results = await scanAllPartnerContracts(address, targetList);
      setEligibility(results);
    } catch (err) {
      console.error('Error scanning contracts:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleOpenClaim = (comm) => {
    sound?.playClick?.();
    setSelectedCommunity(comm);
    setXUsername('');
    setCommentLink('');
    setCaptchaToken(null);
    setHumanSignature(null);
    setFormErrors({});
  };

  const handleCloseClaim = () => {
    sound?.playClick?.();
    setSelectedCommunity(null);
    setFormErrors({});
  };

  const validateClaimForm = () => {
    const errs = {};
    const cleanUser = xUsername.trim();
    if (!cleanUser) {
      errs.xUsername = 'X username is required';
    } else if (!cleanUser.startsWith('@') && cleanUser.length < 2) {
      errs.xUsername = 'Enter a valid handle (e.g. @username)';
    }

    if (commentLink.trim()) {
      const check = validateTweetUrlFormat(commentLink.trim(), cleanUser);
      if (!check.valid) {
        errs.commentLink = check.error;
      }
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

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!validateClaimForm()) {
      sound?.playError?.();
      return;
    }

    setIsSubmitting(true);
    sound?.playClick?.();

    try {
      // 1. Check existing application
      const existing = await checkExistingApplication(xUsername, walletAddress);
      if (existing.exists) {
        setFormErrors({
          duplicateBanner: 'This wallet or X handle has already submitted an application!',
        });
        sound?.playError?.();
        setIsSubmitting(false);
        return;
      }

      // 2. Claim community GTD spot
      const result = await claimCommunityGtdSpot(selectedCommunity.id, {
        xUsername,
        walletAddress,
        commentLink: commentLink.trim() || null,
        proofLinks: commentLink.trim() ? { community_proof: commentLink.trim() } : {},
      });

      sound?.playSuccess?.();
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#00FF66', '#FFD700', '#FFFFFF', '#00DDFF'],
      });

      setClaimSuccessData({
        brokerId: result.brokerId,
        communityName: selectedCommunity.name,
        xUsername,
        walletAddress,
        gtdArtId: result.gtdArtId,
        submittedAt: new Date().toISOString(),
      });

      setSelectedCommunity(null);
      await loadCommunities();
    } catch (err) {
      console.error('Error claiming spot:', err);
      setFormErrors({
        submit: err.message || 'Failed to claim spot. Please try again.',
      });
      sound?.playError?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareOnX = () => {
    sound?.playClick?.();
    const text = `👑 I just claimed a GUARANTEED (GTD) Whitelist Spot for @Apesyndicates as a verified ${claimSuccessData?.communityName} NFT holder on Robinhood Chain! ⚡\n\nVerify your allocation here: https://apesyndicates.xyz/holders.html\n\n#ApeSyndicate #RobinhoodChain #GTD https://x.com/Apesyndicates/status/2093348238971846874/photo/1`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDownloadCard = () => {
    sound?.playClick?.();
    downloadBrokerCardPng({
      brokerId: claimSuccessData?.brokerId,
      xUsername: claimSuccessData?.xUsername,
      walletAddress: claimSuccessData?.walletAddress,
      isGtd: true,
      cardTier: 'GOLDEN_GTD',
      gtdArtId: claimSuccessData?.gtdArtId || 1,
      submittedAt: claimSuccessData?.submittedAt,
      communityName: claimSuccessData?.communityName,
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
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] pointer-events-none" />

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

        <div className="flex items-center gap-2 bg-black/90 px-3 py-1.5 border-2 border-black">
          <span className="w-2.5 h-2.5 bg-[#00FF66] inline-block animate-blink" />
          <span className="font-pixel text-[10px] text-[#00FF66] font-bold">
            PARTNER CLAIM PORTAL
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-4 py-6 text-center space-y-6">
        {/* Title Header */}
        <div className="space-y-2">
          <div className="inline-block bg-black text-[#FFD700] px-4 py-1.5 border-2 border-black font-pixel text-[9px] sm:text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            👑 EXCLUSIVE PARTNER NFT HOLDER ALLOCATIONS
          </div>
          <h1 className="font-pixel text-2xl sm:text-4xl md:text-5xl text-white font-extrabold tracking-tight drop-shadow-[5px_5px_0px_rgba(0,0,0,1)]">
            NFT HOLDER GTD CLAIM
          </h1>
          <p className="font-mono text-xs sm:text-sm text-gray-200 max-w-xl mx-auto font-semibold bg-black/70 p-3 border-2 border-black">
            Holders of verified Robinhood Chain partner NFT collections can connect their wallet to claim guaranteed (GTD) whitelist passes.
          </p>
        </div>

        {/* Wallet Connection / Status Bar */}
        <div className="max-w-xl mx-auto bg-black/90 p-4 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          {!walletAddress ? (
            <div className="space-y-3">
              <p className="font-mono text-xs text-gray-300">
                Connect your Web3 or Robinhood wallet to verify your NFT ownership on-chain:
              </p>
              <button
                type="button"
                onClick={handleConnect}
                className="w-full py-3.5 pixel-btn pixel-btn-lime font-pixel text-xs sm:text-sm text-black font-extrabold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                [ 🦊 CONNECT ROBINHOOD / WEB3 WALLET ]
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-left">
                <div className="font-pixel text-[9px] text-[#00FF66] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00FF66] inline-block animate-blink" />
                  <span>WALLET CONNECTED</span>
                </div>
                <div className="font-mono text-xs text-white font-bold mt-0.5">
                  {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => runScan(walletAddress, communities)}
                  disabled={scanning}
                  className="flex-1 sm:flex-initial px-3 py-2 bg-[#15202c] hover:bg-[#1f2f42] text-gray-300 font-pixel text-[9px] border-2 border-[#2e4357] rounded"
                >
                  {scanning ? 'SCANNING...' : '🔄 RE-SCAN'}
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3 py-2 bg-[#FF2247]/15 hover:bg-[#FF2247]/30 text-[#FF2247] font-pixel text-[9px] border-2 border-[#FF2247]/40 rounded"
                >
                  DISCONNECT
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Partner Communities Cards Grid */}
        {loading ? (
          <div className="py-12 text-center font-pixel text-xs text-gray-400">
            LOADING PARTNER COMMUNITIES...
          </div>
        ) : communities.length === 0 ? (
          <div className="bg-black/90 p-8 border-3 border-black max-w-md mx-auto">
            <p className="font-pixel text-xs text-gray-400">NO PARTNER COMMUNITIES ACTIVE YET</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 text-left">
            {communities.map((comm) => {
              const elig = eligibility[comm.id];
              const claimed = comm.claimed_spots || 0;
              const total = comm.total_spots || 1;
              const remaining = Math.max(0, total - claimed);
              const isSoldOut = remaining === 0;
              const isHolder = elig?.isHolder;

              return (
                <div
                  key={comm.id}
                  className={`bg-black/90 p-5 border-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between transition-all ${
                    isHolder && !isSoldOut
                      ? 'border-[#00FF66] shadow-[0_0_15px_rgba(0,255,102,0.3)]'
                      : 'border-black'
                  }`}
                >
                  <div>
                    {/* Header: Logo & Title */}
                    <div className="flex items-start gap-3">
                      {comm.logo_url ? (
                        <img
                          src={comm.logo_url}
                          alt={comm.name}
                          className="w-12 h-12 rounded object-cover border-2 border-black bg-[#111] shrink-0"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-gradient-to-br from-amber-500 to-purple-600 border-2 border-black flex items-center justify-center font-pixel text-sm font-bold text-white shrink-0">
                          {comm.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="font-pixel text-xs sm:text-sm text-white font-extrabold truncate">
                          {comm.name}
                        </h3>
                        <div className="font-mono text-[10px] text-[#00FF66] font-bold mt-0.5">
                          ● {comm.network || 'Robinhood Chain'}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {comm.description && (
                      <p className="font-mono text-xs text-gray-300 mt-3 line-clamp-2 leading-relaxed">
                        {comm.description}
                      </p>
                    )}

                    {/* Spots Counter Bar */}
                    <div className="mt-4 p-2.5 bg-[#0e141c] border-2 border-[#1c2938]">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-gray-400">GTD ALLOCATION:</span>
                        <span className="font-bold text-white font-pixel text-[9px]">
                          {remaining} / {total} LEFT
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#05070a] rounded-full overflow-hidden mt-1.5 border border-[#243342]">
                        <div
                          className={`h-full ${
                            isSoldOut ? 'bg-[#FF2247]' : remaining < 10 ? 'bg-[#FFD700]' : 'bg-[#00FF66]'
                          }`}
                          style={{ width: `${Math.min(100, (claimed / total) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Eligibility Status Banner */}
                    <div className="mt-3">
                      {!walletAddress ? (
                        <div className="font-pixel text-[8px] text-gray-400 text-center p-2 bg-white/5 border border-white/10">
                          🔒 CONNECT WALLET TO CHECK
                        </div>
                      ) : scanning ? (
                        <div className="font-pixel text-[8px] text-[#FFD700] text-center p-2 bg-[#FFD700]/10 border border-[#FFD700]/30 animate-pulse">
                          ⏳ SCANNING CONTRACT...
                        </div>
                      ) : isHolder ? (
                        <div className="font-pixel text-[8px] sm:text-[9px] text-[#00FF66] text-center p-2 bg-[#00FF66]/10 border border-[#00FF66]/40 font-bold">
                          ✓ ELIGIBLE (NFT HOLDER DETECTED)
                        </div>
                      ) : (
                        <div className="font-pixel text-[8px] text-[#FF2247] text-center p-2 bg-[#FF2247]/10 border border-[#FF2247]/30">
                          ✕ NO PARTNER NFT IN WALLET
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-4 pt-3 border-t border-[#1c2938]">
                    {!walletAddress ? (
                      <button
                        type="button"
                        onClick={handleConnect}
                        className="w-full py-2.5 pixel-btn pixel-btn-black text-white font-pixel text-[9px] border-2 border-white"
                      >
                        CONNECT WALLET
                      </button>
                    ) : isSoldOut ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2.5 bg-gray-800 text-gray-500 font-pixel text-[9px] cursor-not-allowed border-2 border-gray-700"
                      >
                        ALL SPOTS CLAIMED
                      </button>
                    ) : isHolder ? (
                      <button
                        type="button"
                        onClick={() => handleOpenClaim(comm)}
                        className="w-full py-2.5 pixel-btn pixel-btn-gold text-black font-pixel text-[10px] font-extrabold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse"
                      >
                        [ 👑 CLAIM GTD SPOT ]
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2.5 bg-[#141a24] text-gray-500 font-pixel text-[9px] cursor-not-allowed border-2 border-[#1c2633]"
                      >
                        NOT ELIGIBLE
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Claim Modal */}
      {selectedCommunity && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-black border-4 border-black max-w-md w-full p-5 sm:p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] my-8">
            <div className="flex items-center justify-between pb-3 border-b-3 border-black">
              <div>
                <span className="font-pixel text-[9px] text-[#00AA44] font-extrabold">
                  👑 PARTNER GTD ALLOCATION
                </span>
                <h3 className="font-pixel text-sm sm:text-base text-black font-extrabold mt-0.5">
                  {selectedCommunity.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseClaim}
                className="w-8 h-8 flex items-center justify-center bg-black text-white font-pixel text-xs hover:bg-[#FF2247]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleClaimSubmit} className="space-y-4 pt-4 text-left">
              {formErrors.duplicateBanner && (
                <div className="p-3 bg-[#FF2247]/15 border-2 border-[#FF2247] font-pixel text-[9px] text-[#FF2247]">
                  ! {formErrors.duplicateBanner}
                </div>
              )}

              {/* Wallet Address (Readonly) */}
              <div>
                <label className="block font-pixel text-[9px] text-gray-700 mb-1">
                  VERIFIED WALLET ADDRESS
                </label>
                <input
                  type="text"
                  readOnly
                  value={walletAddress || ''}
                  className="w-full h-10 px-3 bg-gray-100 border-2 border-black font-mono text-xs text-gray-800 font-bold"
                />
              </div>

              {/* X Username */}
              <div>
                <label className="block font-pixel text-[9px] text-gray-800 mb-1">
                  YOUR X (TWITTER) USERNAME <span className="text-[#FF2247]">*</span>
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
                  } font-mono text-sm text-black font-bold focus:outline-none focus:border-[#00FF66]`}
                />
                {formErrors.xUsername && (
                  <p className="font-pixel text-[8px] text-[#FF2247] mt-1">! {formErrors.xUsername}</p>
                )}
              </div>

              {/* Optional Comment / Quote Proof Link */}
              <div>
                <label className="block font-pixel text-[8px] text-gray-700 mb-1">
                  OPTIONAL: X COMMENT / PROOF URL
                </label>
                <input
                  type="url"
                  placeholder="https://x.com/yourhandle/status/..."
                  value={commentLink}
                  onChange={(e) => {
                    setCommentLink(e.target.value);
                    if (formErrors.commentLink) setFormErrors({ ...formErrors, commentLink: null });
                  }}
                  className={`w-full h-10 px-3 bg-white border-2 ${
                    formErrors.commentLink ? 'border-[#FF2247]' : 'border-black'
                  } font-mono text-xs text-black`}
                />
                {formErrors.commentLink && (
                  <p className="font-pixel text-[8px] text-[#FF2247] mt-1">! {formErrors.commentLink}</p>
                )}
              </div>

              {/* Security Clearance (Turnstile) */}
              <div className="pt-1">
                <TurnstileWidget onVerify={(token) => setCaptchaToken(token)} />
                {formErrors.captcha && (
                  <p className="font-pixel text-[8px] text-[#FF2247] mt-1">! {formErrors.captcha}</p>
                )}
              </div>

              {/* Golden Key Slider */}
              <div className="pt-1">
                <HumanVerificationSlider onVerified={(sig) => setHumanSignature(sig)} />
                {formErrors.humanSlider && (
                  <p className="font-pixel text-[8px] text-[#FF2247] mt-1">! {formErrors.humanSlider}</p>
                )}
              </div>

              {formErrors.submit && (
                <div className="p-2.5 bg-[#FF2247]/15 border-2 border-[#FF2247] font-pixel text-[9px] text-[#FF2247]">
                  ! {formErrors.submit}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !humanSignature}
                  className={`w-full py-3.5 font-pixel text-xs font-extrabold transition-all border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                    humanSignature && !isSubmitting
                      ? 'bg-[#FFD700] hover:bg-[#ffe033] text-black animate-pulse'
                      : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? 'CLAIMING GTD SPOT...' : humanSignature ? '[ 🚀 CONFIRM & CLAIM GTD SPOT ]' : '[ 🔒 SLIDE KEY ABOVE TO UNLOCK ]'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {claimSuccessData && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-black text-white border-4 border-[#FFD700] max-w-md w-full p-6 text-center shadow-[0_0_30px_rgba(255,215,0,0.4)] space-y-4">
            <div className="text-4xl">👑</div>
            <div className="space-y-1">
              <span className="font-pixel text-[9px] text-[#FFD700] tracking-widest font-extrabold">
                GUARANTEED ALLOCATION CONFIRMED
              </span>
              <h2 className="font-pixel text-xl sm:text-2xl text-white font-extrabold">
                GTD SPOT CLAIMED!
              </h2>
            </div>

            <div className="p-4 bg-[#111] border-2 border-[#FFD700]/40 text-left space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">PARTNER:</span>
                <span className="font-bold text-[#FFD700]">{claimSuccessData.communityName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">ID:</span>
                <span className="font-bold text-[#00FF66]">{claimSuccessData.brokerId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">HANDLE:</span>
                <span className="text-white font-bold">{claimSuccessData.xUsername}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">STATUS:</span>
                <span className="text-[#00FF66] font-bold">100% GUARANTEED (GTD)</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleDownloadCard}
                className="w-full py-3 pixel-btn pixel-btn-gold text-black font-pixel text-xs font-extrabold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                [ 💾 DOWNLOAD 24K GOLDEN PASS ]
              </button>

              <button
                type="button"
                onClick={handleShareOnX}
                className="w-full py-3 bg-[#1DA1F2] hover:bg-[#0c85d0] text-white font-pixel text-xs font-bold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                [ 🐦 SHARE ON X ]
              </button>

              <button
                type="button"
                onClick={() => setClaimSuccessData(null)}
                className="w-full py-2.5 bg-[#222] hover:bg-[#333] text-gray-300 font-pixel text-[10px] border-2 border-gray-600"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-gray-400 font-pixel text-[9px] bg-black/80 border-t-2 border-black">
        APESYNDICATE • ROBINHOOD CHAIN • PARTNER ALLOCATIONS
      </footer>
    </div>
  );
};
