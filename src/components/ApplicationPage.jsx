import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';
import { verifyHolderStatus, fetchLiveTokenPrice, TOKEN_CONTRACT, NFT_CONTRACT, DEFAULT_TOKEN_PRICE, TOTAL_SPOTS } from '../utils/holderVerification';
import { supabase, saveApplicationToSupabase, checkExistingApplication } from '../utils/supabase';

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
    <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-between font-pixel selection:bg-[#00FF66] selection:text-black relative overflow-x-hidden">
      {/* Background Animated Pixel Scanline Overlay */}
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
          
          {/* Header Status Bar */}
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

          {/* DUPLICATE APPLICATION NOTICE */}
          {duplicateData && (
            <div className="bg-[#241306] border-2 border-[#FFD700] p-5 rounded-lg text-left font-mono text-xs space-y-3 mb-6">
              <div className="flex items-center gap-2 text-[#FFD700] font-pixel text-xs font-extrabold">
                <span>⚠️</span>
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
                <h1 className="font-pixel text-lg sm:text-2xl text-white font-extrabold tracking-tight">
                  WHITELIST APPLICATION
                </h1>

                {/* Open to Everyone & GTD vs Standard WL explanation */}
                <div className="bg-[#121a14] border-2 border-[#00FF66]/50 p-4 rounded-lg space-y-2.5">
                  <div className="flex items-center gap-2 text-[#00FF66] text-xs font-extrabold">
                    <span>⚡</span>
                    <span>APPLICATIONS OPEN FOR EVERYONE</span>
                  </div>
                  <p className="font-mono text-xs text-gray-300 leading-relaxed">
                    Anyone can apply for the 9,000 whitelist spots. Guaranteed (GTD) mint spots are awarded based on holding volume:
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                    <div className="bg-black/70 border border-[#00FF66]/50 p-2.5 rounded">
                      <div className="text-[#FFD700] font-bold flex items-center gap-1.5">
                        <span>🌟</span>
                        <span>GUARANTEED (GTD) MINT</span>
                      </div>
                      <div className="text-gray-300 mt-1">
                        Hold <strong>≥ $1.00 USD of $APEBROKERS</strong> OR <strong>≥ 1 ApeSyndicate NFT</strong>.
                      </div>
                      <div className="text-[#00FF66] text-[10px] mt-1 font-semibold">
                        ✓ Directly Eligible For Mint!
                      </div>
                    </div>

                    <div className="bg-black/70 border border-[#444] p-2.5 rounded">
                      <div className="text-gray-300 font-bold flex items-center gap-1.5">
                        <span>📋</span>
                        <span>STANDARD WHITELIST (WL)</span>
                      </div>
                      <div className="text-gray-400 mt-1">
                        For non-holders or wallets holding under $1.00 in tokens.
                      </div>
                      <div className="text-gray-400 text-[10px] mt-1">
                        ✓ Entered into Whitelist Review
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
                  <label className="block font-pixel text-[10px] sm:text-xs text-gray-300">
                    1. X (TWITTER) USERNAME <span className="text-[#00FF66]">*</span>
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
                    className="w-full bg-black border-2 border-[#333] focus:border-[#00FF66] text-[#00FF66] font-mono text-sm px-3.5 py-2.5 rounded outline-none transition-colors"
                  />
                </div>

                {/* Field 2: Wallet Address + Live GTD Check */}
                <div className="space-y-2">
                  <label className="block font-pixel text-[10px] sm:text-xs text-gray-300">
                    2. ROBINHOOD CHAIN WALLET ADDRESS <span className="text-[#00FF66]">*</span>
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
                      className="flex-grow bg-black border-2 border-[#333] focus:border-[#00FF66] text-[#00FF66] font-mono text-xs sm:text-sm px-3.5 py-2.5 rounded outline-none transition-colors"
                    />
                    <button
                      type="button"
                      disabled={verificationStatus === 'VERIFYING'}
                      onClick={handleCheckHoldings}
                      className="pixel-btn pixel-btn-black border-2 border-[#00FF66] text-[#00FF66] px-4 py-2.5 text-[10px] sm:text-xs font-extrabold shrink-0 hover:bg-[#00FF66] hover:text-black transition-all disabled:opacity-50"
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
                          <span className="text-base">{verificationResult.isGtd ? '🌟' : '📋'}</span>
                          <span className={`font-pixel text-[11px] font-extrabold ${
                            verificationResult.isGtd ? 'text-[#00FF66]' : 'text-gray-200'
                          }`}>
                            {verificationResult.isGtd
                              ? 'GUARANTEED (GTD) - DIRECTLY ELIGIBLE FOR MINT!'
                              : 'STANDARD WHITELIST (WL) APPLICATION'}
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
                            ≈ ${Number(verificationResult.tokenUsd).toFixed(2)} USD {verificationResult.hasMinToken ? '(≥ $1.00 GTD Qualified!)' : ''}
                          </div>
                        </div>

                        <div className="bg-black/60 p-2 rounded border border-[#222]">
                          <div className="text-gray-400">ApeSyndicate NFTs:</div>
                          <div className="text-white font-bold">
                            {verificationResult.nftBalance} NFT{verificationResult.nftBalance !== 1 ? 's' : ''} owned
                          </div>
                          <div className={verificationResult.hasNft ? 'text-[#FFD700] font-bold' : 'text-gray-500'}>
                            {verificationResult.hasNft ? '(≥ 1 NFT GTD Qualified!)' : '0 NFTs'}
                          </div>
                        </div>
                      </div>

                      {!verificationResult.isGtd && (
                        <div className="bg-black/70 border border-[#333] p-2 rounded text-[11px] text-gray-300 flex items-center justify-between">
                          <span>💡 <em>Tip: Hold ≥ $1.00 in tokens or 1 NFT to get Guaranteed (GTD) mint!</em></span>
                          <a
                            href="https://dexscreener.com/robinhood/0x67c0c7602a27ad284792d19d159750f260c78c776ce0e5666856533e493c55ae"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#FFD700] hover:underline shrink-0 ml-2 font-bold"
                          >
                            [ BUY $APEBROKERS ]
                          </a>
                        </div>
                      )}
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
                    disabled={isSubmitting}
                    className="w-full pixel-btn pixel-btn-lime py-3.5 text-xs sm:text-sm font-extrabold text-black disabled:opacity-40 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:opacity-95"
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
                  {submittedData?.isGtd ? 'GUARANTEED (GTD) ALLOCATION CONFIRMED!' : 'APPLICATION RECEIVED'}
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
                      ? '🌟 GUARANTEED (GTD) - DIRECTLY ELIGIBLE FOR MINT'
                      : '📋 STANDARD WHITELIST (WL) - UNDER REVIEW'}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-[#222] pb-2.5">
                  <span className="text-gray-400">HOLDINGS DETECTED:</span>
                  <span className="text-gray-300">
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

              {/* GTD HOLDERS: Confirmation notice (No card to download) */}
              {submittedData?.isGtd ? (
                <div className="bg-[#051c0d] border-2 border-[#00FF66] p-4 rounded-lg text-left font-mono text-xs space-y-2 text-[#00FF66]">
                  <div className="font-pixel text-xs text-[#00FF66] font-extrabold flex items-center gap-1.5">
                    <span>🌟</span>
                    <span>GUARANTEED (GTD) SPOT SECURED</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-gray-300">
                    Your allocation has been verified and registered on Robinhood Chain. Your wallet is <strong className="text-white">directly eligible for the upcoming Guaranteed (GTD) mint</strong>!
                  </p>
                </div>
              ) : (
                /* NON-HOLDERS / LOW HOLDERS: Standard WL notice (No card to download) */
                <div className="bg-[#111] border border-[#333] p-4 rounded-lg text-left font-mono text-xs space-y-2 text-gray-300">
                  <div className="text-white font-bold flex items-center gap-1.5 font-pixel text-[11px]">
                    <span>📋</span>
                    <span>APPLICATION IN REVIEW QUEUE</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-gray-400">
                    Your application has been received for the Standard Whitelist. Wallets holding at least <strong>$1.00 USD in $APEBROKERS tokens</strong> or <strong>1 ApeSyndicate NFT</strong> on Robinhood Chain receive <strong>Guaranteed (GTD) mint eligibility directly</strong>.
                  </p>
                  <div className="pt-1">
                    <a
                      href="https://dexscreener.com/robinhood/0x67c0c7602a27ad284792d19d159750f260c78c776ce0e5666856533e493c55ae"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FFD700] hover:underline font-bold text-[11px]"
                    >
                      🛒 [ BUY $APEBROKERS TO QUALIFY FOR GTD ] →
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
