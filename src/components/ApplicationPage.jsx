import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';
import { verifyHolderStatus, fetchLiveTokenPrice, TOKEN_CONTRACT, NFT_CONTRACT, DEFAULT_TOKEN_PRICE, TOTAL_SPOTS } from '../utils/holderVerification';
import { supabase, saveApplicationToSupabase, checkExistingApplication } from '../utils/supabase';
import { PixelFluidBackground } from './PixelFluidBackground';

// Burn / Dummy addresses to block from spamming
const BLOCKED_ADDRESSES = [
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dead',
  '0x0000000000000000000000000000000000000001',
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
];

export const ApplicationPage = ({ onBackHome }) => {
  const [tokenPrice, setTokenPrice] = useState(DEFAULT_TOKEN_PRICE);
  const [totalSpots] = useState(TOTAL_SPOTS);
  const [claimedCount, setClaimedCount] = useState(0);
  const [formMountedAt] = useState(Date.now());

  const [formData, setFormData] = useState({
    xUsername: '',
    walletAddress: '',
  });

  // Anti-bot honeypot field
  const [honeypot, setHoneypot] = useState('');

  const [verificationStatus, setVerificationStatus] = useState('IDLE'); // 'IDLE' | 'VERIFYING' | 'CHECKED' | 'ERROR'
  const [verificationResult, setVerificationResult] = useState(null);

  const [tasks, setTasks] = useState({
    followX: 'READY', // 'READY' | 'VERIFYING' | 'VERIFIED'
    repostWL: 'READY',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [duplicateData, setDuplicateData] = useState(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  // Fetch token price and active count on mount
  useEffect(() => {
    fetchLiveTokenPrice().then((p) => {
      if (p > 0) setTokenPrice(p);
    });

    supabase
      .from('apebrokers_applications')
      .select('*', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (!error && typeof count === 'number') {
          setClaimedCount(count);
        } else {
          setClaimedCount(0);
        }
      })
      .catch(() => {
        setClaimedCount(0);
      });
  }, []);

  const handleFollowX = () => {
    sound?.playClick?.();
    window.open('https://x.com/Apesyndicates', '_blank', 'noopener,noreferrer');
  };

  const handleOpenSea = () => {
    sound?.playClick?.();
    window.open('https://opensea.io/collection/apesyndicate-212388086', '_blank', 'noopener,noreferrer');
  };

  const handleApebroke = () => {
    sound?.playClick?.();
    window.open('https://www.letscash.fun/token/0xe0F384ebCede975342c5431aCad515b4A1B862cc', '_blank', 'noopener,noreferrer');
  };

  const handleHome = () => {
    sound?.playClick?.();
    if (onBackHome) onBackHome();
    else window.location.href = '/';
  };

  // Run On-Chain Verification (Check holdings)
  const handleCheckHoldings = async () => {
    const rawWallet = formData.walletAddress.trim();
    if (!rawWallet) {
      sound?.playBlip?.();
      setVerificationStatus('ERROR');
      setVerificationResult({ error: 'Please enter a valid wallet address first.' });
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(rawWallet)) {
      sound?.playBlip?.();
      setVerificationStatus('ERROR');
      setVerificationResult({ error: 'Invalid address format (must be 42-character 0x EVM address).' });
      return;
    }

    if (BLOCKED_ADDRESSES.includes(rawWallet.toLowerCase())) {
      sound?.playBlip?.();
      setVerificationStatus('ERROR');
      setVerificationResult({ error: 'Invalid address: Burn or dummy address cannot be used.' });
      return;
    }

    sound?.playClick?.();
    setVerificationStatus('VERIFYING');
    setVerificationResult(null);

    try {
      const result = await verifyHolderStatus(rawWallet);
      setVerificationResult(result);
      setVerificationStatus('CHECKED');

      if (result.isGtd) {
        sound?.playVerifyChime?.();
      } else {
        sound?.playBlip?.();
      }
    } catch (err) {
      console.error('Verification error:', err);
      setVerificationStatus('ERROR');
      setVerificationResult({ error: 'Could not connect to Robinhood Chain RPC. You can still submit for Standard WL.' });
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
    }, 600);
  };

  // Submit Application with Anti-Spam & Duplicate Checks
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setDuplicateData(null);

    // Anti-Bot: Honeypot check
    if (honeypot && honeypot.trim().length > 0) {
      console.warn('Bot detected via honeypot.');
      setSubmitError('Submission blocked by security filter.');
      return;
    }

    // Anti-Bot: Submission speed check (must be at least 1.5 seconds)
    if (Date.now() - formMountedAt < 1500) {
      setSubmitError('Submission too rapid. Please take a moment to review.');
      return;
    }

    // Validate X handle
    let cleanX = formData.xUsername.trim();
    if (cleanX.startsWith('@')) cleanX = cleanX.substring(1);

    if (!cleanX || !/^[a-zA-Z0-9_]{2,20}$/.test(cleanX)) {
      setSubmitError('Please enter a valid X (Twitter) handle (letters, numbers, underscores only, 2-20 chars).');
      return;
    }

    // Validate Wallet
    const cleanWallet = formData.walletAddress.trim().toLowerCase();
    if (!cleanWallet || !/^0x[a-f0-9]{40}$/.test(cleanWallet)) {
      setSubmitError('Please enter a valid 42-character 0x EVM wallet address.');
      return;
    }

    if (BLOCKED_ADDRESSES.includes(cleanWallet)) {
      setSubmitError('Invalid address: Burn or dummy addresses are rejected.');
      return;
    }

    if (tasks.followX !== 'VERIFIED' || tasks.repostWL !== 'VERIFIED') {
      setSubmitError('Please complete both community checklist tasks.');
      return;
    }

    setIsSubmitting(true);
    sound?.playClick?.();

    // 1. Client-Side Pre-Check for Duplicates
    try {
      const dupCheck = await checkExistingApplication('@' + cleanX, cleanWallet);
      if (dupCheck.exists) {
        sound?.playStamp?.();
        setDuplicateData({
          duplicateUser: dupCheck.duplicateUser,
          duplicateWallet: dupCheck.duplicateWallet,
          existingApp: dupCheck.existingApp,
        });
        setIsSubmitting(false);
        return;
      }
    } catch (dupErr) {
      console.warn('Pre-check duplicate note:', dupErr);
    }

    // 2. Check holdings if not already checked
    let currentCheck = verificationResult;
    if (!currentCheck) {
      try {
        currentCheck = await verifyHolderStatus(cleanWallet);
        setVerificationResult(currentCheck);
      } catch {
        currentCheck = { isGtd: false, tier: 'STANDARD_WL' };
      }
    }

    const isGtd = !!currentCheck?.isGtd;
    const cardTier = isGtd ? 'GOLDEN_GTD' : 'STANDARD';
    const brokerId = '#APE-' + Math.floor(1000 + Math.random() * 9000);

    try {
      const saveRes = await saveApplicationToSupabase({
        brokerId,
        xUsername: '@' + cleanX,
        walletAddress: cleanWallet,
        isGtd,
        proofLinks: {
          holder_verification: {
            tokenContract: TOKEN_CONTRACT,
            tokenBalance: currentCheck?.tokenBalance || 0,
            tokenUsd: currentCheck?.tokenUsd || 0,
            nftContract: NFT_CONTRACT,
            nftBalance: currentCheck?.nftBalance || 0,
            tokenPrice: currentCheck?.tokenPrice || tokenPrice,
            isGtd,
            tier: cardTier,
            verifiedAt: new Date().toISOString(),
          },
        },
      });

      // If database caught duplicate (via unique index or check)
      if (saveRes.isDuplicate) {
        sound?.playStamp?.();
        setDuplicateData({
          duplicateUser: saveRes.duplicateUser,
          duplicateWallet: saveRes.duplicateWallet,
          existingApp: saveRes.existingApp,
          message: saveRes.error || 'An application with this wallet address or X username is already registered.',
        });
        setIsSubmitting(false);
        return;
      }

      if (!saveRes.success) {
        setSubmitError('Failed to register application. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const submissionPayload = {
        brokerId,
        xUsername: '@' + cleanX,
        walletAddress: cleanWallet,
        timestamp: new Date().toLocaleTimeString(),
        isGtd,
        cardTier,
        verificationResult: currentCheck,
      };

      setSubmittedData(submissionPayload);
      setClaimedCount((prev) => prev + 1);
      setSubmissionSuccess(true);

      if (isGtd) {
        sound?.playFanfare?.();
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#00FF66', '#FFD700', '#ffffff'],
        });
      } else {
        sound?.playVerifyChime?.();
      }
    } catch (err) {
      console.error('Submission failed:', err);
      setSubmitError('Failed to register application. Please check connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070314] text-white flex flex-col justify-between font-pixel selection:bg-[#00FF66] selection:text-black relative overflow-x-hidden">
      {/* Interactive Pixel Fluid Background */}
      <PixelFluidBackground />
      
      {/* Background Dimmer & Scanline Overlay */}
      <div className="fixed inset-0 bg-black/40 pointer-events-none -z-0" />
      <div className="fixed inset-0 bg-[linear-gradient(rgba(18,16,38,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] pointer-events-none opacity-35 -z-0" />

      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full bg-[#0c061e]/95 backdrop-blur-md border-b-4 border-black px-4 sm:px-8 py-3 select-none relative shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
        {/* Neon Ceiling Light Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FF007F] via-[#00F0FF] to-[#00FF66] opacity-90" />

        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <a href="/" onClick={(e) => { e.preventDefault(); handleHome(); }} className="flex items-center gap-2 sm:gap-3 shrink-0 group">
            <div className="p-0.5 bg-[#00FF66]/20 border border-[#00FF66] rounded-md shadow-[0_0_10px_rgba(0,255,102,0.4)]">
              <img
                src="/logo.png"
                alt="ApeSyndicate Logo"
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain pixelated shrink-0"
              />
            </div>
            <span className="font-pixel text-xs sm:text-base pixel-text-3d-lime tracking-wider font-extrabold whitespace-nowrap">
              APESYNDICATE
            </span>
          </a>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleOpenSea}
              className="pixel-btn pixel-btn-vibrant-cyan px-2 sm:px-3 py-1.5 text-[9px] sm:text-xs font-bold rounded-lg"
            >
              <span>[ OPENSEA ]</span>
            </button>

            <button
              type="button"
              onClick={handleApebroke}
              className="pixel-btn pixel-btn-vibrant-gold px-2 sm:px-3 py-1.5 text-[9px] sm:text-xs font-bold rounded-lg"
            >
              <span>[ $APEBROKE ]</span>
            </button>

            <button
              type="button"
              onClick={handleFollowX}
              className="pixel-btn pixel-btn-vibrant-magenta px-2 sm:px-3 py-1.5 text-[9px] sm:text-xs font-extrabold rounded-lg flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="hidden sm:inline">[ OFFICIAL X ]</span>
              <span className="sm:hidden">[ X ]</span>
            </button>

            <button
              type="button"
              onClick={handleHome}
              className="pixel-btn pixel-btn-vibrant-lime px-2.5 sm:px-3.5 py-1.5 text-[9px] sm:text-xs font-extrabold rounded-lg"
            >
              <span>[ HOME ]</span>
            </button>
          </div>
        </div>

        {/* Bottom Neon Accent Bar */}
        <div className="absolute bottom-[-4px] left-0 right-0 h-[2px] bg-gradient-to-r from-[#00FF66] via-[#FF007F] to-[#00F0FF] opacity-80" />
      </header>

      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center p-4 sm:p-6 relative z-10 my-6">
        <div className="w-full max-w-2xl bg-[#0e0722]/95 backdrop-blur-md border-4 border-black ring-2 ring-[#FF007F]/40 p-5 sm:p-8 shadow-[8px_8px_0px_0px_#000] relative rounded-lg">
          
          {/* Header Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-[#36195e] pb-4 mb-6 gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#00FF66] rounded-full animate-blink shadow-[0_0_8px_#00FF66]" />
              <span className="font-pixel text-[10px] sm:text-xs text-[#00FF66] font-extrabold tracking-wider">
                ● 9,000 SPOTS ALLOCATION
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] sm:text-xs text-black bg-[#00FF66] px-2.5 py-0.5 font-extrabold rounded shadow-[2px_2px_0px_#000]">
                SPOTS: {claimedCount} / {totalSpots.toLocaleString()} CLAIMED
              </span>
              <a
                href="https://www.letscash.fun/token/0xe0F384ebCede975342c5431aCad515b4A1B862cc"
                target="_blank"
                rel="noopener noreferrer"
                title="View $APEBROKE on Let's Cash"
                className="font-mono text-[10px] sm:text-xs text-[#FFB800] bg-[#241705] px-2 py-0.5 border border-[#FFB800] rounded hover:text-white transition-colors shadow-[2px_2px_0px_#000]"
              >
                ~$${Number(tokenPrice).toFixed(8)} ↗
              </a>
            </div>
          </div>

          {/* DUPLICATE APPLICATION NOTICE */}
          {duplicateData && (
            <div className="bg-[#241306] border-2 border-[#FFD700] p-5 rounded-lg text-left font-mono text-xs space-y-3 mb-6">
              <div className="flex items-center gap-2 text-[#FFD700] font-pixel text-xs font-extrabold">
                <span className="text-[#FFD700]">[!]</span>
                <span>DUPLICATE APPLICATION DETECTED</span>
              </div>
              <p className="text-gray-300 text-[11px] leading-relaxed">
                An application with this {duplicateData.duplicateWallet && duplicateData.duplicateUser ? 'wallet address and X handle' : duplicateData.duplicateWallet ? 'wallet address' : 'X handle'} is already registered in the whitelist.
              </p>
              {duplicateData.existingApp && (
                <div className="bg-black/80 border border-[#593d0d] p-3 rounded space-y-1 text-[11px] text-gray-300">
                  <div>REGISTERED ID: <strong className="text-[#FFD700]">{duplicateData.existingApp.broker_id || 'LOGGED'}</strong></div>
                  <div>STATUS: <strong className={duplicateData.existingApp.is_gtd ? 'text-[#00FF66]' : 'text-gray-200'}>{duplicateData.existingApp.is_gtd ? 'GUARANTEED (GTD)' : 'STANDARD WHITELIST (WL)'}</strong></div>
                  <div>DATE: <span className="text-gray-400">{new Date(duplicateData.existingApp.created_at || Date.now()).toLocaleDateString()}</span></div>
                </div>
              )}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setDuplicateData(null)}
                  className="pixel-btn pixel-btn-black text-white px-3 py-1.5 text-[10px] font-bold border border-[#555]"
                >
                  [ TRY DIFFERENT WALLET ]
                </button>
                <button
                  type="button"
                  onClick={handleHome}
                  className="pixel-btn pixel-btn-lime text-black px-3 py-1.5 text-[10px] font-extrabold"
                >
                  [ RETURN HOME ]
                </button>
              </div>
            </div>
          )}

          {!submissionSuccess && !duplicateData ? (
            <div>
              {/* Headline & Allocation Rules */}
              <div className="space-y-4 mb-6">
                <h1 className="font-pixel text-xl sm:text-3xl pixel-text-3d-lime font-extrabold tracking-tight">
                  WHITELIST APPLICATION
                </h1>

                {/* Open to Everyone & GTD vs Standard WL explanation */}
                <div className="bg-[#140a2c]/95 border-2 border-[#A855F7] p-4 rounded-lg space-y-2.5 shadow-[5px_5px_0px_0px_#000]">
                  <div className="flex items-center gap-2 text-[#00FF66] text-xs font-extrabold">
                    <span className="w-2.5 h-2.5 bg-[#00FF66] rounded-full inline-block shadow-[0_0_8px_#00FF66]" />
                    <span>APPLICATIONS OPEN FOR EVERYONE</span>
                  </div>
                  <p className="font-mono text-xs text-gray-200 leading-relaxed">
                    Anyone can apply for the 9,000 whitelist spots. Wallets holding both $1.00+ in tokens and 1 ApeSyndicate NFT unlock Guaranteed (GTD) mint allocation based on holdings:
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 font-mono text-[11px]">
                    <div className="bg-[#051c12]/90 border border-[#00FF66] p-3 rounded-lg shadow-[3px_3px_0px_0px_#000]">
                      <div className="text-[#00FF66] font-bold flex items-center gap-1.5">
                        <span className="text-[#FFD700] font-extrabold">[GTD]</span>
                        <span>GUARANTEED (GTD) MINT</span>
                      </div>
                      <div className="text-gray-200 mt-1">
                        Hold <strong>≥ $1.00 USD of $APEBROKERS + ≥ 1 ApeSyndicate NFT</strong>.
                      </div>
                      <div className="text-[#00FF66] text-[10px] mt-1.5 font-bold">
                        [✓] Higher token & NFT holdings increase GTD allocation chance!
                      </div>
                    </div>

                    <div className="bg-[#051a26]/90 border border-[#00F0FF] p-3 rounded-lg shadow-[3px_3px_0px_0px_#000]">
                      <div className="text-[#00F0FF] font-bold flex items-center gap-1.5">
                        <span className="text-gray-300 font-extrabold">[WL]</span>
                        <span>STANDARD WHITELIST (WL)</span>
                      </div>
                      <div className="text-gray-300 mt-1">
                        For non-holders or entries without both $1 tokens and 1 NFT.
                      </div>
                      <div className="text-[#80f5ff] text-[10px] mt-1.5 font-bold">
                        [•] Entered into Whitelist Review
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Honeypot hidden input for anti-bot / spam prevention */}
                <input
                  type="text"
                  name="bot_field_honey"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  style={{ display: 'none', position: 'absolute', left: '-9999px' }}
                />

                {/* Field 1: X (Twitter) Handle */}
                <div className="space-y-1.5">
                  <label className="block font-pixel text-[10px] sm:text-xs text-[#00F0FF] font-bold">
                    1. X (TWITTER) USERNAME <span className="text-[#FF007F]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={25}
                    placeholder="@YourHandle"
                    value={formData.xUsername}
                    onChange={(e) => {
                      sound?.playTyping?.();
                      setFormData({ ...formData, xUsername: e.target.value });
                    }}
                    className="w-full bg-[#060312] border-2 border-[#4c1d95] focus:border-[#00F0FF] focus:shadow-[4px_4px_0px_0px_#FF007F] text-[#00FF66] font-mono text-sm px-3.5 py-2.5 rounded-lg outline-none transition-all"
                  />
                </div>

                {/* Field 2: Wallet Address + Live GTD Check */}
                <div className="space-y-2">
                  <label className="block font-pixel text-[10px] sm:text-xs text-[#00F0FF] font-bold">
                    2. ROBINHOOD CHAIN WALLET ADDRESS <span className="text-[#FF007F]">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      required
                      maxLength={44}
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
                      className="flex-grow bg-[#060312] border-2 border-[#4c1d95] focus:border-[#00F0FF] focus:shadow-[4px_4px_0px_0px_#FF007F] text-[#00FF66] font-mono text-xs sm:text-sm px-3.5 py-2.5 rounded-lg outline-none transition-all"
                    />
                    <button
                      type="button"
                      disabled={verificationStatus === 'VERIFYING'}
                      onClick={handleCheckHoldings}
                      className="pixel-btn pixel-btn-vibrant-gold px-4 py-2.5 text-[10px] sm:text-xs font-extrabold shrink-0 rounded-lg disabled:opacity-50"
                    >
                      {verificationStatus === 'VERIFYING' ? '[ CHECKING... ]' : '[ CHECK GTD STATUS ]'}
                    </button>
                  </div>

                  {/* Verification Status Result Boxes */}
                  {verificationStatus === 'VERIFYING' && (
                    <div className="bg-[#111] border border-[#333] p-3 rounded text-left font-mono text-xs text-[#00FF66] flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#00FF66] rounded-full animate-ping" />
                      <span>Checking holdings on Robinhood Chain RPC...</span>
                    </div>
                  )}

                  {/* Live Status Feedback */}
                  {verificationStatus === 'CHECKED' && verificationResult && (
                    <div className={`p-4 rounded text-left font-mono text-xs space-y-2.5 border-2 ${
                      verificationResult.isGtd
                        ? 'bg-[#051c0d] border-[#00FF66]'
                        : 'bg-[#141414] border-[#444]'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#222] pb-2 gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`font-pixel text-[11px] font-extrabold ${
                            verificationResult.isGtd ? 'text-[#00FF66]' : 'text-gray-200'
                          }`}>
                            {verificationResult.isGtd
                              ? `[GTD] WON GTD ALLOCATION! (${verificationResult.winChancePercent}% WINNER)`
                              : verificationResult.qualifiesForGtdDraw
                                ? `[WL] ${verificationResult.winChancePercent}% DRAW ENTERED - STANDARD WL SECURED`
                                : '[WL] STANDARD WHITELIST APPLICATION'}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-pixel ${
                          verificationResult.isGtd
                            ? 'bg-[#FFD700] text-black'
                            : 'bg-[#222] text-gray-400 border border-[#444]'
                        }`}>
                          {verificationResult.isGtd ? 'GTD ALLOCATION' : 'STANDARD WL'}
                        </span>
                      </div>

                      {/* Holdings Breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-300 text-[11px]">
                        <div className="bg-black/60 p-2 rounded border border-[#222]">
                          <div className="text-gray-400">$APEBROKERS Balance:</div>
                          <div className="text-white font-bold">
                            {Number(verificationResult.tokenBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens
                          </div>
                          <div className={verificationResult.hasMinToken ? 'text-[#00FF66] font-bold' : 'text-gray-400'}>
                            ≈ ${Number(verificationResult.tokenUsd).toFixed(2)} USD {verificationResult.hasMinToken ? '(≥ $1.00 ✓)' : '(Needs ≥ $1.00)'}
                          </div>
                        </div>

                        <div className="bg-black/60 p-2 rounded border border-[#222]">
                          <div className="text-gray-400">ApeSyndicate NFTs:</div>
                          <div className="text-white font-bold">
                            {verificationResult.nftBalance} NFT{verificationResult.nftBalance !== 1 ? 's' : ''} owned
                          </div>
                          <div className={verificationResult.hasMinNft ? 'text-[#FFD700] font-bold' : 'text-gray-500'}>
                            {verificationResult.hasMinNft ? '(≥ 1 NFT ✓)' : '(Needs ≥ 1 NFT)'}
                          </div>
                        </div>
                      </div>

                      <div className="bg-black/70 border border-[#333] p-2.5 rounded text-[11px] text-gray-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          {verificationResult.qualifiesForGtdDraw ? (
                            <div>
                              <span className="font-pixel text-[#FFD700] text-[10px]">
                                GTD WIN CHANCE: {verificationResult.winChancePercent}%
                              </span>
                              <span className="text-gray-400 text-[10px] ml-2">
                                (Higher holdings increase your allocation chance)
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[#FFD700] font-bold">TIP:</span> Hold ≥ $1.00 in $APEBROKER + 1 NFT to enter dynamic GTD win chance!
                            </div>
                          )}
                        </div>
                        <a
                          href="https://www.letscash.fun/token/0xe0F384ebCede975342c5431aCad515b4A1B862cc"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pixel-btn pixel-btn-black px-2.5 py-1 text-[10px] font-bold text-[#FFD700] border border-[#FFD700] hover:bg-[#FFD700] hover:text-black shrink-0 text-center"
                        >
                          [ BUY $APEBROKE TO INCREASE CHANCE ]
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
                  <label className="block font-pixel text-[10px] sm:text-xs text-[#00F0FF] font-bold">
                    3. COMMUNITY CHECKLIST <span className="text-[#FF007F]">*</span>
                  </label>
                  
                  {/* Task 1 */}
                  <div className="bg-[#051a26]/90 border-2 border-[#00F0FF]/50 p-3 rounded-lg flex items-center justify-between gap-3 shadow-[3px_3px_0px_0px_#000]">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-[#00F0FF] font-pixel text-[10px]">01</span>
                      <span className="text-gray-200">Follow @Apesyndicates on X</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenTask('https://x.com/Apesyndicates', 'followX')}
                        className="pixel-btn pixel-btn-vibrant-cyan px-2.5 py-1 text-[9px] font-bold rounded"
                      >
                        [ OPEN ]
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerifyTask('followX')}
                        disabled={tasks.followX === 'VERIFIED'}
                        className={`pixel-btn px-2.5 py-1 text-[9px] font-extrabold rounded ${
                          tasks.followX === 'VERIFIED'
                            ? 'pixel-btn-vibrant-lime'
                            : 'pixel-btn-vibrant-cyan'
                        }`}
                      >
                        {tasks.followX === 'VERIFIED' ? '✓ DONE' : tasks.followX === 'VERIFYING' ? '...' : '[ VERIFY ]'}
                      </button>
                    </div>
                  </div>

                  {/* Task 2 */}
                  <div className="bg-[#260517]/90 border-2 border-[#FF007F]/50 p-3 rounded-lg flex items-center justify-between gap-3 shadow-[3px_3px_0px_0px_#000]">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-[#FF007F] font-pixel text-[10px]">02</span>
                      <span className="text-gray-200">Repost Whitelist Post on X</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenTask('https://x.com/Apesyndicates', 'repostWL')}
                        className="pixel-btn pixel-btn-vibrant-magenta px-2.5 py-1 text-[9px] font-bold rounded"
                      >
                        [ OPEN ]
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerifyTask('repostWL')}
                        disabled={tasks.repostWL === 'VERIFIED'}
                        className={`pixel-btn px-2.5 py-1 text-[9px] font-extrabold rounded ${
                          tasks.repostWL === 'VERIFIED'
                            ? 'pixel-btn-vibrant-lime'
                            : 'pixel-btn-vibrant-magenta'
                        }`}
                      >
                        {tasks.repostWL === 'VERIFIED' ? '✓ DONE' : tasks.repostWL === 'VERIFYING' ? '...' : '[ VERIFY ]'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Error Banner if any */}
                {submitError && (
                  <div className="bg-[#260517] border-2 border-[#FF007F] p-3 rounded font-mono text-xs text-[#FF007F]">
                    {submitError}
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full pixel-btn pixel-btn-vibrant-lime py-3.5 sm:py-4 text-xs sm:text-sm font-extrabold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed shadow-[5px_5px_0px_0px_#000]"
                  >
                    {isSubmitting ? '[ CHECKING & SUBMITTING... ]' : '[ SUBMIT WHITELIST APPLICATION ]'}
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {/* SUCCESS CONFIRMATION SCREEN */}
          {submissionSuccess && (
            <div className="text-center space-y-6">
              {/* Header Badge */}
              <div className={`inline-block border-2 px-4 py-2 rounded-lg ${
                submittedData?.isGtd
                  ? 'bg-[#06240d] border-[#00FF66]'
                  : 'bg-[#141414] border-[#444]'
              }`}>
                <h2 className={`font-pixel text-lg sm:text-xl font-extrabold ${
                  submittedData?.isGtd ? 'text-[#00FF66]' : 'text-white'
                }`}>
                  {submittedData?.isGtd
                    ? `GUARANTEED (GTD) ALLOCATION CONFIRMED! (${submittedData?.verificationResult?.winChancePercent || 5}% WINNER)`
                    : 'APPLICATION RECEIVED'}
                </h2>
              </div>

              {/* Status Details Card */}
              <div className="bg-black/90 border-2 border-[#222] p-5 rounded-lg space-y-3.5 text-left font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[#222] pb-2.5">
                  <span className="text-gray-400">APPLICATION ID:</span>
                  <span className="font-pixel text-[#FFD700] text-sm">{submittedData?.brokerId}</span>
                </div>
                
                <div className="flex items-center justify-between border-b border-[#222] pb-2.5">
                  <span className="text-gray-400">STATUS:</span>
                  <span className={submittedData?.isGtd ? 'text-[#00FF66] font-bold' : 'text-gray-200 font-bold'}>
                    {submittedData?.isGtd
                      ? `GUARANTEED (GTD) - ${submittedData?.verificationResult?.winChancePercent || 5}% CHANCE WINNER!`
                      : submittedData?.verificationResult?.qualifiesForGtdDraw
                        ? `STANDARD WHITELIST (WL) - ${submittedData?.verificationResult?.winChancePercent || 5}% DRAW ENTERED`
                        : 'STANDARD WHITELIST (WL) - UNDER REVIEW'}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-[#222] pb-2.5">
                  <span className="text-gray-400">HOLDINGS DETECTED:</span>
                  <span className="text-gray-300">
                    ~${Number(submittedData?.verificationResult?.tokenUsd || 0).toFixed(2)} USD • {submittedData?.verificationResult?.nftBalance || 0} NFTs
                    {submittedData?.verificationResult?.qualifiesForGtdDraw && (
                      <span className="text-[#FFD700] ml-1 font-bold">({submittedData?.verificationResult?.winChancePercent}% Win Chance)</span>
                    )}
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

              {/* GTD HOLDERS: Confirmation notice (No card to download) */}
              {submittedData?.isGtd ? (
                <div className="bg-[#051c0d] border-2 border-[#00FF66] p-4 rounded-lg text-left font-mono text-xs space-y-2 text-[#00FF66]">
                  <div className="font-pixel text-xs text-[#00FF66] font-extrabold flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-[#00FF66] rounded-full inline-block" />
                    <span>GUARANTEED (GTD) SPOT SECURED ({submittedData?.verificationResult?.winChancePercent || 5}% WINNER)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-gray-300">
                    Your holdings of ~${Number(submittedData?.verificationResult?.tokenUsd || 0).toFixed(2)} in $APEBROKERS + {submittedData?.verificationResult?.nftBalance || 0} ApeSyndicate NFT gave you a <strong className="text-[#FFD700]">{submittedData?.verificationResult?.winChancePercent || 5}% win chance</strong>, and your wallet <strong className="text-white">successfully won a Guaranteed (GTD) mint spot</strong>!
                  </p>
                </div>
              ) : (
                /* NON-HOLDERS / LOW HOLDERS: Standard WL notice (No card to download) */
                <div className="bg-[#111] border border-[#333] p-4 rounded-lg text-left font-mono text-xs space-y-2 text-gray-300">
                  <div className="text-white font-bold flex items-center gap-1.5 font-pixel text-[11px]">
                    <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />
                    <span>APPLICATION IN REVIEW QUEUE</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-gray-400">
                    Your application has been received for the Standard Whitelist. Wallets holding at least <strong>$1.00 USD in $APEBROKERS tokens + 1 ApeSyndicate NFT</strong> receive Guaranteed (GTD) mint allocation based on holdings.
                  </p>
                  <div className="pt-1">
                    <a
                      href="https://www.letscash.fun/token/0xe0F384ebCede975342c5431aCad515b4A1B862cc"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FFD700] hover:underline font-bold text-[11px]"
                    >
                      [ BUY MORE $APEBROKE TO INCREASE YOUR GTD WIN CHANCE ] →
                    </a>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
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
