import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';
import { verifyHolderStatus, fetchLiveTokenPrice, TOKEN_CONTRACT, NFT_CONTRACT, DEFAULT_TOKEN_PRICE, TOTAL_SPOTS } from '../utils/holderVerification';
import { supabase, saveApplicationToSupabase } from '../utils/supabase';
import { generateBrokerCardDataUrl } from '../utils/generateBrokerCard';

export const ApplicationPage = ({ onBackHome }) => {
  const [tokenPrice, setTokenPrice] = useState(DEFAULT_TOKEN_PRICE);
  const [totalSpots] = useState(TOTAL_SPOTS);
  const [claimedCount, setClaimedCount] = useState(0);

  const [formData, setFormData] = useState({
    xUsername: '',
    walletAddress: '',
  });

  const [verificationStatus, setVerificationStatus] = useState('IDLE'); // 'IDLE' | 'VERIFYING' | 'QUALIFIED' | 'INELIGIBLE' | 'ERROR'
  const [verificationResult, setVerificationResult] = useState(null);

  const [tasks, setTasks] = useState({
    followX: 'READY', // 'READY' | 'VERIFYING' | 'VERIFIED'
    repostWL: 'READY',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [cardDataUrl, setCardDataUrl] = useState(null);

  // Fetch token price and claimed count on mount
  useEffect(() => {
    fetchLiveTokenPrice().then((p) => {
      if (p > 0) setTokenPrice(p);
    });

    // Fetch active applications count from Supabase
    supabase
      .from('apebrokers_applications')
      .select('*', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (!error && typeof count === 'number') {
          setClaimedCount(count);
        }
      });
  }, []);

  const handleFollowX = () => {
    sound?.playClick?.();
    window.open('https://x.com/Apesyndicates', '_blank', 'noopener,noreferrer');
  };

  const handleHome = () => {
    sound?.playClick?.();
    if (onBackHome) onBackHome();
    else window.location.href = '/';
  };

  // Run On-Chain Verification
  const handleVerifyWallet = async () => {
    const rawWallet = formData.walletAddress.trim();
    if (!rawWallet) {
      sound?.playBlip?.();
      setVerificationStatus('ERROR');
      setVerificationResult({ error: 'Please enter your Robinhood Chain wallet address.' });
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(rawWallet)) {
      sound?.playBlip?.();
      setVerificationStatus('ERROR');
      setVerificationResult({ error: 'Invalid wallet address. Must be a 42-character 0x EVM address.' });
      return;
    }

    sound?.playClick?.();
    setVerificationStatus('VERIFYING');
    setVerificationResult(null);

    try {
      const result = await verifyHolderStatus(rawWallet);

      if (result.error) {
        setVerificationStatus('ERROR');
        setVerificationResult(result);
        return;
      }

      setVerificationResult(result);

      if (result.isEligible) {
        sound?.playVerifyChime?.();
        setVerificationStatus('QUALIFIED');
      } else {
        sound?.playStamp?.();
        setVerificationStatus('INELIGIBLE');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setVerificationStatus('ERROR');
      setVerificationResult({ error: 'Communication error with Robinhood Chain RPC. Please retry.' });
    }
  };

  // Social task action
  const handleOpenTask = (url, taskKey) => {
    sound?.playClick?.();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleVerifyTask = (taskKey) => {
    sound?.playClick?.();
    setTasks((prev) => ({ ...prev, [taskKey]: 'VERIFYING' }));
    setTimeout(() => {
      sound?.playVerifyChime?.();
      setTasks((prev) => ({ ...prev, [taskKey]: 'VERIFIED' }));
    }, 700);
  };

  // Submit Application
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const cleanX = formData.xUsername.trim();
    if (!cleanX || cleanX.length < 2) {
      setSubmitError('Please enter a valid X (Twitter) username.');
      return;
    }

    if (verificationStatus !== 'QUALIFIED' || !verificationResult?.isEligible) {
      setSubmitError('You must hold at least some $APEBROKERS tokens or 1 ApeSyndicate NFT to apply.');
      return;
    }

    if (tasks.followX !== 'VERIFIED' || tasks.repostWL !== 'VERIFIED') {
      setSubmitError('Please complete both community checklist tasks.');
      return;
    }

    setIsSubmitting(true);
    sound?.playClick?.();

    const brokerId = `#APE-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const isGtd = !!verificationResult.isGtd;
      const cardTier = isGtd ? 'GOLDEN_GTD' : (verificationResult.tier || 'STANDARD');

      const saveRes = await saveApplicationToSupabase({
        brokerId,
        xUsername: cleanX.startsWith('@') ? cleanX : `@${cleanX}`,
        walletAddress: formData.walletAddress.trim(),
        proofLinks: {
          holder_verification: {
            tokenContract: TOKEN_CONTRACT,
            tokenBalance: verificationResult.tokenBalance,
            tokenUsd: verificationResult.tokenUsd,
            nftContract: NFT_CONTRACT,
            nftBalance: verificationResult.nftBalance,
            tokenPrice: verificationResult.tokenPrice,
            isGtd,
            tier: cardTier,
            score: verificationResult.score,
            verifiedAt: new Date().toISOString(),
          },
        },
      });

      const submissionPayload = {
        brokerId,
        xUsername: cleanX.startsWith('@') ? cleanX : `@${cleanX}`,
        walletAddress: formData.walletAddress.trim(),
        timestamp: new Date().toLocaleTimeString(),
        isGtd,
        cardTier,
        verificationResult,
      };

      setSubmittedData(submissionPayload);
      setClaimedCount((prev) => prev + 1);

      // Generate card image
      try {
        const cardUrl = await generateBrokerCardDataUrl({
          brokerId,
          xUsername: submissionPayload.xUsername,
          walletAddress: submissionPayload.walletAddress,
          isGtd,
        });
        setCardDataUrl(cardUrl);
      } catch (cardErr) {
        console.warn('Card render note:', cardErr);
      }

      setSubmissionSuccess(true);
      sound?.playFanfare?.();

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00FF66', '#FFD700', '#ffffff', '#111111'],
      });
    } catch (err) {
      console.error('Submission failed:', err);
      setSubmitError('Failed to save application. Please check your connection and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-between font-pixel selection:bg-[#00FF66] selection:text-black relative overflow-x-hidden">
      {/* Scanline background */}
      <div className="fixed inset-0 bg-[radial-gradient(#112211_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-black/40 to-black pointer-events-none" />

      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full bg-black/95 backdrop-blur-md border-b-4 border-black px-4 sm:px-8 py-3 select-none">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <a href="/" onClick={(e) => { e.preventDefault(); handleHome(); }} className="flex items-center gap-2 sm:gap-3 shrink-0">
            <img
              src="/logo.png"
              alt="ApeSyndicate Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain pixelated shrink-0"
            />
            <span className="font-pixel text-xs sm:text-base text-[#00FF66] tracking-wider font-extrabold whitespace-nowrap">
              APESYNDICATE
            </span>
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFollowX}
              className="pixel-btn pixel-btn-black px-3 py-1.5 text-[9px] sm:text-xs font-bold text-white border-2 border-[#333] hover:border-[#00FF66] flex items-center gap-1.5 rounded-lg"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>[ OFFICIAL X ]</span>
            </button>

            <button
              type="button"
              onClick={handleHome}
              className="pixel-btn pixel-btn-lime px-3 py-1.5 text-[9px] sm:text-xs font-extrabold text-black flex items-center gap-1.5 rounded-lg"
            >
              <span>🏠</span>
              <span>[ HOME ]</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center p-4 sm:p-6 relative z-10 my-6">
        <div className="w-full max-w-2xl bg-[#0d0d0d] border-4 border-black p-5 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
          
          {/* Header Status Bar with 9,000 SPOTS COUNTER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-[#222] pb-4 mb-6 gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#00FF66] rounded-full animate-blink" />
              <span className="font-pixel text-[10px] sm:text-xs text-[#00FF66] font-extrabold tracking-wider">
                ● 9,000 SPOTS ALLOCATION
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] sm:text-xs text-black bg-[#00FF66] px-2.5 py-0.5 font-extrabold rounded">
                SPOTS: {claimedCount} / {totalSpots.toLocaleString()} CLAIMED
              </span>
              <span className="font-mono text-[10px] sm:text-xs text-[#FFD700] bg-[#1a1500] px-2 py-0.5 border border-[#443800] rounded">
                ~$${Number(tokenPrice).toFixed(8)}
              </span>
            </div>
          </div>

          {!submissionSuccess ? (
            <div>
              {/* Headline & Dynamic GTD Allocation System */}
              <div className="space-y-4 mb-6">
                <h1 className="font-pixel text-lg sm:text-2xl text-white font-extrabold tracking-tight">
                  APPLY FOR WHITELIST
                </h1>

                {/* 9,000 Spots & GTD Explanation Card */}
                <div className="bg-[#121a14] border-2 border-[#00FF66]/50 p-4 rounded-lg space-y-2.5">
                  <div className="flex items-center gap-2 text-[#FFD700] text-xs font-extrabold">
                    <span>⚡</span>
                    <span>9,000 SPOTS: WEIGHTED GTD ALLOCATION</span>
                  </div>
                  <p className="font-mono text-xs text-gray-300 leading-relaxed">
                    Open to all wallets holding <strong>$APEBROKERS tokens</strong> or <strong>ApeSyndicate NFTs</strong> on Robinhood Chain (no minimum token amount required to apply, just at least hold).
                  </p>
                  <div className="bg-black/80 border border-[#00FF66]/30 p-3 rounded space-y-1.5 font-mono text-[11px]">
                    <div className="text-[#00FF66] font-bold">🔥 HOW GTD SPOTS ARE AWARDED:</div>
                    <div className="text-gray-300">
                      Guaranteed (GTD) spots are allocated based on <strong>how much dollar value ($) in tokens</strong> and <strong>how many NFTs</strong> you hold.
                    </div>
                    <div className="text-[#FFD700] font-semibold pt-1">
                      👉 <em>The more tokens ($) and NFTs you hold, the higher your GTD priority and allocation tier!</em>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Field 1: X (Twitter) Handle */}
                <div className="space-y-1.5">
                  <label className="block font-pixel text-[10px] sm:text-xs text-gray-300">
                    1. X (TWITTER) USERNAME <span className="text-[#00FF66]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="@YourHandle"
                    value={formData.xUsername}
                    onChange={(e) => {
                      sound?.playTyping?.();
                      setFormData({ ...formData, xUsername: e.target.value });
                    }}
                    className="w-full bg-black border-2 border-[#333] focus:border-[#00FF66] text-[#00FF66] font-mono text-sm px-3.5 py-2.5 rounded outline-none transition-colors"
                  />
                </div>

                {/* Field 2: Wallet Address + Live GTD On-Chain Verification */}
                <div className="space-y-2">
                  <label className="block font-pixel text-[10px] sm:text-xs text-gray-300">
                    2. ROBINHOOD CHAIN WALLET ADDRESS <span className="text-[#00FF66]">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      required
                      placeholder="0x..."
                      value={formData.walletAddress}
                      onChange={(e) => {
                        sound?.playTyping?.();
                        setFormData({ ...formData, walletAddress: e.target.value });
                        if (verificationStatus !== 'IDLE') {
                          setVerificationStatus('IDLE');
                          setVerificationResult(null);
                        }
                      }}
                      className="flex-grow bg-black border-2 border-[#333] focus:border-[#00FF66] text-[#00FF66] font-mono text-xs sm:text-sm px-3.5 py-2.5 rounded outline-none transition-colors"
                    />
                    <button
                      type="button"
                      disabled={verificationStatus === 'VERIFYING'}
                      onClick={handleVerifyWallet}
                      className="pixel-btn pixel-btn-lime px-4 py-2.5 text-[10px] sm:text-xs font-extrabold text-black shrink-0 disabled:opacity-50"
                    >
                      {verificationStatus === 'VERIFYING' ? '[ SCANNING... ]' : '[ VERIFY HOLDINGS ]'}
                    </button>
                  </div>

                  {/* Verification Status Result Boxes */}
                  {verificationStatus === 'VERIFYING' && (
                    <div className="bg-[#111] border border-[#333] p-3 rounded text-left font-mono text-xs text-[#00FF66] flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#00FF66] rounded-full animate-ping" />
                      <span>Scanning Robinhood Chain RPC & calculating GTD weight...</span>
                    </div>
                  )}

                  {/* QUALIFIED / HOLDER DISPLAY */}
                  {verificationStatus === 'QUALIFIED' && verificationResult && (
                    <div className="bg-[#051c0d] border-2 border-[#00FF66] p-4 rounded text-left font-mono text-xs space-y-3">
                      {/* GTD Tier Badge */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#143b20] pb-2.5 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{verificationResult.isGtd ? '🌟' : '⚡'}</span>
                          <span className="font-pixel text-[11px] font-extrabold text-[#00FF66]">
                            {verificationResult.isGtd ? 'GTD ALLOCATION: GUARANTEED SPOT' : 'HOLDER ENTRY: QUALIFIED'}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-pixel ${
                          verificationResult.isGtd
                            ? 'bg-[#FFD700] text-black'
                            : 'bg-[#113318] text-[#00FF66] border border-[#00FF66]/40'
                        }`}>
                          {verificationResult.chanceLabel}
                        </span>
                      </div>

                      {/* Holdings Breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-300 text-[11px]">
                        <div className="bg-black/60 p-2.5 rounded border border-[#143b20]">
                          <div className="text-gray-400 font-semibold">$APEBROKERS Token:</div>
                          <div className="text-white font-bold text-xs mt-0.5">
                            {Number(verificationResult.tokenBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens
                          </div>
                          <div className="text-[#00FF66] font-mono text-[11px] mt-0.5">
                            ≈ ${Number(verificationResult.tokenUsd).toFixed(2)} USD
                          </div>
                        </div>

                        <div className="bg-black/60 p-2.5 rounded border border-[#143b20]">
                          <div className="text-gray-400 font-semibold">ApeSyndicate NFTs:</div>
                          <div className="text-white font-bold text-xs mt-0.5">
                            {verificationResult.nftBalance} NFT{verificationResult.nftBalance !== 1 ? 's' : ''} owned
                          </div>
                          <div className={verificationResult.nftBalance > 0 ? 'text-[#FFD700] text-[11px] mt-0.5' : 'text-gray-500 text-[11px] mt-0.5'}>
                            {verificationResult.nftBalance > 0 ? '✓ NFT Holder Priority' : '0 NFTs'}
                          </div>
                        </div>
                      </div>

                      {/* Advice for upgrading tier */}
                      {!verificationResult.isGtd && (
                        <div className="bg-black/70 border border-[#234d28] p-2 rounded text-[11px] text-gray-300 flex items-center justify-between">
                          <span>💡 <em>Want 100% Guaranteed GTD? Hold more tokens ($) or an ApeSyndicate NFT!</em></span>
                          <a
                            href="https://dexscreener.com/robinhood/0x67c0c7602a27ad284792d19d159750f260c78c776ce0e5666856533e493c55ae"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#FFD700] hover:underline shrink-0 ml-2 font-bold"
                          >
                            [ BUY MORE ]
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* INELIGIBLE DISPLAY (Holds 0 tokens AND 0 NFTs) */}
                  {verificationStatus === 'INELIGIBLE' && verificationResult && (
                    <div className="bg-[#24060b] border-2 border-[#FF2247] p-4 rounded text-left font-mono text-xs space-y-2.5">
                      <div className="flex items-center gap-2 text-[#FF2247] font-pixel text-[11px] font-extrabold">
                        <span>✕</span>
                        <span>WALLET NOT DETECTED AS HOLDER</span>
                      </div>
                      <p className="text-gray-300 text-[11px] leading-relaxed">
                        To qualify for the 9,000 spots, this wallet must hold at least some <strong>$APEBROKERS tokens</strong> or an <strong>ApeSyndicate NFT</strong> on Robinhood Chain.
                      </p>
                      <div className="bg-black/60 p-2 rounded border border-[#52131d] text-[11px] text-gray-300 space-y-1">
                        <div>Detected $APEBROKERS: <span className="text-[#FF2247] font-bold">0 tokens ($0.00)</span></div>
                        <div>Detected NFTs: <span className="text-[#FF2247] font-bold">0 NFTs</span></div>
                      </div>
                      <div className="pt-1">
                        <a
                          href="https://dexscreener.com/robinhood/0x67c0c7602a27ad284792d19d159750f260c78c776ce0e5666856533e493c55ae"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[10px] font-pixel text-[#FFD700] hover:underline"
                        >
                          <span>🛒 [ BUY $APEBROKERS ON DEXSCREENER & RETRY ]</span>
                          <span>→</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {verificationStatus === 'ERROR' && verificationResult?.error && (
                    <div className="bg-[#24060b] border border-[#FF2247] p-3 rounded font-mono text-xs text-[#FF2247]">
                      {verificationResult.error}
                    </div>
                  )}
                </div>

                {/* Step 3: Community Verification Checklist */}
                <div className="space-y-2 pt-2">
                  <label className="block font-pixel text-[10px] sm:text-xs text-gray-300">
                    3. COMMUNITY CHECKLIST <span className="text-[#00FF66]">*</span>
                  </label>
                  
                  {/* Task 1 */}
                  <div className="bg-black/80 border-2 border-[#222] p-3 rounded flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-[#00FF66] font-pixel text-[10px]">01</span>
                      <span>Follow @Apesyndicates on X</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenTask('https://x.com/Apesyndicates', 'followX')}
                        className="pixel-btn pixel-btn-black px-2.5 py-1 text-[9px] font-bold text-gray-300 border border-[#444]"
                      >
                        [ OPEN ]
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerifyTask('followX')}
                        disabled={tasks.followX === 'VERIFIED'}
                        className={`pixel-btn px-2.5 py-1 text-[9px] font-extrabold ${
                          tasks.followX === 'VERIFIED'
                            ? 'pixel-btn-lime text-black'
                            : 'pixel-btn-black text-[#00FF66] border border-[#00FF66]'
                        }`}
                      >
                        {tasks.followX === 'VERIFIED' ? '✓ DONE' : tasks.followX === 'VERIFYING' ? '...' : '[ VERIFY ]'}
                      </button>
                    </div>
                  </div>

                  {/* Task 2 */}
                  <div className="bg-black/80 border-2 border-[#222] p-3 rounded flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-[#00FF66] font-pixel text-[10px]">02</span>
                      <span>Repost Whitelist Post on X</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenTask('https://x.com/Apesyndicates', 'repostWL')}
                        className="pixel-btn pixel-btn-black px-2.5 py-1 text-[9px] font-bold text-gray-300 border border-[#444]"
                      >
                        [ OPEN ]
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerifyTask('repostWL')}
                        disabled={tasks.repostWL === 'VERIFIED'}
                        className={`pixel-btn px-2.5 py-1 text-[9px] font-extrabold ${
                          tasks.repostWL === 'VERIFIED'
                            ? 'pixel-btn-lime text-black'
                            : 'pixel-btn-black text-[#00FF66] border border-[#00FF66]'
                        }`}
                      >
                        {tasks.repostWL === 'VERIFIED' ? '✓ DONE' : tasks.repostWL === 'VERIFYING' ? '...' : '[ VERIFY ]'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Error Banner if any */}
                {submitError && (
                  <div className="bg-[#24060b] border-2 border-[#FF2247] p-3 rounded font-mono text-xs text-[#FF2247]">
                    {submitError}
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || verificationStatus !== 'QUALIFIED'}
                    className="w-full pixel-btn pixel-btn-lime py-3.5 text-xs sm:text-sm font-extrabold text-black disabled:opacity-40 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    {isSubmitting ? '[ REGISTERING APPLICATION... ]' : '[ SUBMIT WHITELIST APPLICATION ]'}
                  </button>
                  {verificationStatus !== 'QUALIFIED' && (
                    <p className="font-mono text-[10px] text-gray-500 text-center mt-2">
                      * Verify holdings on-chain to unlock application submission.
                    </p>
                  )}
                </div>
              </form>
            </div>
          ) : (
            /* SUCCESS CONFIRMATION SCREEN */
            <div className="text-center space-y-6">
              <div className="inline-block bg-[#06240d] border-2 border-[#00FF66] px-4 py-2 rounded-lg">
                <h2 className="font-pixel text-lg sm:text-xl text-[#00FF66] font-extrabold">
                  APPLICATION REGISTERED!
                </h2>
              </div>

              <div className="bg-black/90 border-2 border-[#222] p-5 rounded-lg space-y-3.5 text-left font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[#222] pb-2.5">
                  <span className="text-gray-400">BROKER ID:</span>
                  <span className="font-pixel text-[#FFD700] text-sm">{submittedData?.brokerId}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#222] pb-2.5">
                  <span className="text-gray-400">ALLOCATION STATUS:</span>
                  <span className={submittedData?.isGtd ? 'text-[#FFD700] font-bold' : 'text-[#00FF66] font-bold'}>
                    {submittedData?.isGtd ? '🌟 GUARANTEED (GTD) ALLOCATION' : '✓ VERIFIED HOLDER ALLOCATION'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-[#222] pb-2.5">
                  <span className="text-gray-400">HOLDINGS VERIFIED:</span>
                  <span className="text-gray-200">
                    ~$${Number(submittedData?.verificationResult?.tokenUsd || 0).toFixed(2)} USD • {submittedData?.verificationResult?.nftBalance || 0} NFTs
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-[#222] pb-2.5">
                  <span className="text-gray-400">X HANDLE:</span>
                  <span className="text-white font-bold">{submittedData?.xUsername}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">REGISTERED WALLET:</span>
                  <span className="text-white font-mono text-[11px] truncate max-w-[220px]">
                    {submittedData?.walletAddress}
                  </span>
                </div>
              </div>

              {cardDataUrl && (
                <div className="space-y-2">
                  <img
                    src={cardDataUrl}
                    alt="Broker Identification Card"
                    className="w-full max-w-md mx-auto rounded-lg border-2 border-[#00FF66] shadow-[4px_4px_0px_0px_rgba(0,255,102,0.3)]"
                  />
                  <div>
                    <a
                      href={cardDataUrl}
                      download={`${submittedData?.brokerId || 'apebroker'}-card.png`}
                      className="inline-block pixel-btn pixel-btn-black px-4 py-2 text-[10px] font-bold text-[#00FF66] border border-[#00FF66]"
                    >
                      [ 💾 DOWNLOAD BROKER CARD ]
                    </a>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleFollowX}
                  className="w-full pixel-btn pixel-btn-black py-3 px-4 text-xs font-bold text-white border-2 border-[#333] hover:border-[#00FF66] flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span>[ SHARE ON X ]</span>
                </button>

                <button
                  type="button"
                  onClick={handleHome}
                  className="w-full pixel-btn pixel-btn-lime py-3 px-4 text-xs font-extrabold text-black flex items-center justify-center gap-2"
                >
                  <span>🏠</span>
                  <span>[ RETURN TO HOME ]</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center font-mono text-[11px] text-gray-500 border-t border-[#1a1a1a] relative z-10">
        © 2026 APESYNDICATE. ROBINHOOD CHAIN. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
};
