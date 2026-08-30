import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';
import { fetchCommunities, claimCommunityGtdSpot } from '../utils/supabase';
import { scanAllPartnerContracts } from '../utils/web3Contract';
import { TurnstileWidget } from './TurnstileWidget';
import { HumanVerificationSlider } from './HumanVerificationSlider';
import { validateTweetUrlFormat } from '../utils/xVerification';
import { downloadBrokerCardPng, generateBrokerCardDataUrl } from '../utils/generateBrokerCard';

export const ClaimPage = ({ onBackHome }) => {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [walletInput, setWalletInput] = useState(() => {
    return localStorage.getItem('apebrokers_holder_wallet') || '';
  });
  const [walletAddress, setWalletAddress] = useState(() => {
    const saved = localStorage.getItem('apebrokers_holder_wallet');
    return saved && /^0x[a-fA-F0-9]{40}$/.test(saved) ? saved.toLowerCase() : null;
  });
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [eligibility, setEligibility] = useState({}); // { [commId]: { isHolder, balance } }
  const [copiedContractId, setCopiedContractId] = useState(null);

  // Selected Community Detail Modal (Pop-up on card click)
  const [detailCommunity, setDetailCommunity] = useState(null);
  const [modalWalletInput, setModalWalletInput] = useState('');

  // Claim Form State (When user proceeds to claim in modal)
  const [isClaimFormOpen, setIsClaimFormOpen] = useState(false);
  const [xUsername, setXUsername] = useState('');
  const [commentLink, setCommentLink] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [humanSignature, setHumanSignature] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Modal & Live Card Preview
  const [claimSuccessData, setClaimSuccessData] = useState(null);
  const [cardPreviewUrl, setCardPreviewUrl] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      try {
        const comms = await fetchCommunities();
        if (!mounted) return;
        setCommunities(comms);

        // If a valid wallet was previously verified / saved, scan on-chain automatically!
        if (walletAddress && mounted) {
          setScanning(true);
          const results = await scanAllPartnerContracts(walletAddress, comms);
          if (mounted) {
            setEligibility(results);
          }
          setScanning(false);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Generate 24K GTD Pass Card Preview whenever an allocation is claimed
  useEffect(() => {
    if (claimSuccessData) {
      generateBrokerCardDataUrl({
        brokerId: claimSuccessData.brokerId,
        xUsername: claimSuccessData.xUsername,
        walletAddress: claimSuccessData.walletAddress,
        isGtd: true,
        gtdArtId: claimSuccessData.gtdArtId || 1,
        gifUrl: `/nfts/gold_${claimSuccessData.gtdArtId || 1}.png`,
        communityName: claimSuccessData.communityName,
      }).then((url) => {
        if (url) setCardPreviewUrl(url);
      });
    } else {
      setCardPreviewUrl(null);
    }
  }, [claimSuccessData]);

  const handleVerifyAddress = async (addrToVerify) => {
    sound?.playClick?.();
    setScanError(null);
    const clean = (addrToVerify || '').trim().toLowerCase();

    if (!clean) {
      setScanError('Please enter an EVM wallet address.');
      sound?.playError?.();
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(clean)) {
      setScanError('Invalid EVM address format. Must start with 0x and be 42 characters.');
      sound?.playError?.();
      return;
    }

    setWalletAddress(clean);
    setWalletInput(clean);
    localStorage.setItem('apebrokers_holder_wallet', clean);
    await runScan(clean, communities);
  };

  const handleClearWallet = () => {
    sound?.playClick?.();
    setWalletAddress(null);
    setWalletInput('');
    setEligibility({});
    setScanError(null);
    localStorage.removeItem('apebrokers_holder_wallet');
  };

  const runScan = async (address, commList) => {
    const targetList = commList && commList.length > 0 ? commList : communities;
    if (!address || targetList.length === 0) return;
    setScanning(true);
    setScanError(null);
    try {
      const results = await scanAllPartnerContracts(address, targetList);
      setEligibility(results);
      const isAnyEligible = Object.values(results).some((r) => r?.isHolder);
      if (isAnyEligible) {
        sound?.playPowerUp?.();
      } else {
        sound?.playSuccess?.();
      }
    } catch (err) {
      console.error('Error scanning contracts:', err);
      setScanError('Failed to query RPC. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleCopyContract = (commId, contract) => {
    sound?.playClick?.();
    navigator.clipboard.writeText(contract);
    setCopiedContractId(commId);
    setTimeout(() => setCopiedContractId(null), 2000);
  };

  // Open Pop-up Detail Modal
  const handleCardClick = (comm) => {
    sound?.playClick?.();
    setDetailCommunity(comm);
    setModalWalletInput(walletAddress || '');
    setIsClaimFormOpen(false);
    setXUsername('');
    setCommentLink('');
    setCaptchaToken(null);
    setHumanSignature(null);
    setFormErrors({});
  };

  const handleCloseModal = () => {
    sound?.playClick?.();
    setDetailCommunity(null);
    setIsClaimFormOpen(false);
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
      // Claim community GTD spot directly for verified on-chain holder
      const result = await claimCommunityGtdSpot(detailCommunity.id, {
        xUsername,
        walletAddress,
        commentLink: commentLink.trim() || null,
        proofLinks: commentLink.trim() ? { community_proof: commentLink.trim() } : {},
      });

      sound?.playSuccess?.();
      confetti({
        particleCount: 160,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#00FF66', '#FFD700', '#FFFFFF', '#00DDFF', '#FF2247'],
      });

      setClaimSuccessData({
        brokerId: result.brokerId,
        communityName: detailCommunity.name,
        xUsername,
        walletAddress,
        gtdArtId: result.gtdArtId,
        submittedAt: new Date().toISOString(),
      });

      setDetailCommunity(null);
      setIsClaimFormOpen(false);
      const updatedComms = await fetchCommunities();
      setCommunities(updatedComms);
      if (walletAddress) runScan(walletAddress, updatedComms);
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
    const text = `I just claimed a GUARANTEED (GTD) Whitelist Spot for @Apesyndicates as a verified ${claimSuccessData?.communityName} NFT holder on Robinhood Chain!\n\nVerify your allocation here: https://apesyndicates.xyz/holders.html\n\n#ApeSyndicate #RobinhoodChain #GTD https://x.com/Apesyndicates/status/2093348238971846874/photo/1`;
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
          <span className="w-2.5 h-2.5 bg-[#00FF66] inline-block animate-blink" />
          <span className="font-pixel text-[10px] text-[#00FF66] font-extrabold tracking-wider">
            HOLDERS CLAIM PORTAL
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-4 py-6 text-center space-y-7">
        {/* Title Header */}
        <div className="space-y-2.5">
          <div className="inline-block bg-black text-[#FFD700] px-4 py-1.5 border-3 border-black font-pixel text-[9px] sm:text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            [ PARTNER NFT HOLDER ALLOCATIONS ]
          </div>
          <h1 className="font-pixel text-2xl sm:text-4xl md:text-5xl text-white font-extrabold tracking-tight drop-shadow-[6px_6px_0px_rgba(0,0,0,1)]">
            NFT HOLDER GTD CLAIM
          </h1>
          <div className="bg-black/90 max-w-xl mx-auto p-3.5 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-mono text-xs sm:text-sm text-gray-200 font-semibold leading-relaxed">
              Paste your wallet address below to verify on-chain NFT ownership and claim your guaranteed (GTD) spot. No wallet connection needed!
            </p>
          </div>
        </div>

        {/* Manual Address Input & Direct On-Chain Scanner */}
        <div className="max-w-xl mx-auto bg-black/95 p-4 sm:p-5 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-left space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-pixel text-[9px] sm:text-[10px] text-[#00FF66] font-extrabold">
              PASTE EVM / ROBINHOOD WALLET ADDRESS:
            </label>
            {walletAddress && (
              <button
                type="button"
                onClick={handleClearWallet}
                className="font-pixel text-[8px] text-[#FF2247] hover:underline font-bold"
              >
                [ CLEAR ]
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="0x..."
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVerifyAddress(walletInput);
              }}
              className="flex-1 h-11 px-3 bg-[#080d14] border-2 border-[#00FF66]/50 focus:border-[#00FF66] font-mono text-xs sm:text-sm text-white font-bold rounded outline-none"
            />
            <button
              type="button"
              onClick={() => handleVerifyAddress(walletInput)}
              disabled={scanning}
              className="h-11 px-5 pixel-btn pixel-btn-lime text-black font-pixel text-xs font-extrabold shrink-0 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            >
              {scanning ? 'SCANNING...' : '[ VERIFY WALLET ]'}
            </button>
          </div>

          {scanError && (
            <p className="font-pixel text-[8px] text-[#FF2247]">! {scanError}</p>
          )}

          {walletAddress && !scanning && (
            <div className="pt-2 border-t border-gray-800 flex items-center justify-between font-mono text-xs text-gray-300">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00FF66] inline-block animate-blink" />
                <span className="text-[#00FF66] font-bold">VERIFIED ADDRESS:</span>
                <span className="text-white">{walletAddress.substring(0, 8)}...{walletAddress.substring(walletAddress.length - 6)}</span>
              </div>
              <button
                type="button"
                onClick={() => runScan(walletAddress, communities)}
                disabled={scanning}
                className="font-pixel text-[8px] text-[#FFD700] hover:underline"
              >
                [ RE-SCAN ]
              </button>
            </div>
          )}
        </div>

        {/* Minimalist Cream Box Grid: ONLY Logo & Name */}
        {loading ? (
          <div className="py-16 text-center font-pixel text-xs text-gray-400 animate-pulse">
            LOADING PARTNER COMMUNITIES...
          </div>
        ) : communities.length === 0 ? (
          <div className="bg-black/90 p-8 border-4 border-black max-w-md mx-auto">
            <p className="font-pixel text-xs text-gray-400">NO PARTNER COMMUNITIES ACTIVE YET</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5 pt-2">
            {communities.map((comm) => {
              const elig = eligibility[comm.id];
              const isHolder = elig?.isHolder;
              const claimed = comm.claimed_spots || 0;
              const total = comm.total_spots || 1;
              const remaining = Math.max(0, total - claimed);
              const isSoldOut = remaining === 0;

              return (
                <div
                  key={comm.id}
                  onClick={() => handleCardClick(comm)}
                  className={`bg-[#FFF9EE] text-black border-4 border-black p-4 sm:p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1.5 transition-all duration-200 cursor-pointer flex flex-col items-center justify-between relative group ${
                    isHolder && !isSoldOut ? 'ring-4 ring-[#00FF66] shadow-[0_0_20px_rgba(0,255,102,0.5)]' : ''
                  }`}
                >
                  {/* NFT Logo Showcase */}
                  <div className="w-full aspect-square bg-[#EFE8D8] border-3 border-black rounded-lg overflow-hidden flex items-center justify-center p-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] group-hover:bg-[#EAE1CE] transition-colors">
                    {comm.logo_url ? (
                      <img
                        src={comm.logo_url}
                        alt={comm.name}
                        className="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-amber-400 to-purple-600 border-2 border-black flex items-center justify-center font-pixel text-xl font-extrabold text-white">
                        {comm.name?.substring(0, 2)?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Project Name Only Under Logo */}
                  <div className="mt-3.5 w-full text-center">
                    <h3 className="font-pixel text-xs sm:text-sm text-black font-extrabold truncate uppercase tracking-tight">
                      {comm.name}
                    </h3>
                  </div>

                  {/* Status Indicator Pill */}
                  <div className="mt-3 w-full">
                    {isHolder && !isSoldOut ? (
                      <div className="w-full py-1.5 bg-[#00FF66] text-black font-pixel text-[8px] border-2 border-black font-extrabold text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-pulse">
                        [ ELIGIBLE ]
                      </div>
                    ) : isSoldOut ? (
                      <div className="w-full py-1.5 bg-gray-300 text-gray-600 font-pixel text-[8px] border-2 border-gray-400 font-bold text-center">
                        [ SOLD OUT ]
                      </div>
                    ) : (
                      <div className="w-full py-1.5 bg-black text-[#FFD700] font-pixel text-[8px] border-2 border-black font-extrabold text-center group-hover:bg-[#FFD700] group-hover:text-black transition-colors">
                        [ VIEW PASS ]
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Pop-up Detail & Claim Modal */}
      {detailCommunity && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FFF9EE] text-black border-4 border-black max-w-lg w-full p-5 sm:p-7 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] my-8 rounded-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b-3 border-black">
              <div>
                <span className="font-pixel text-[9px] text-[#007A33] font-extrabold">
                  [ PARTNER GTD ALLOCATION ]
                </span>
                <h2 className="font-pixel text-base sm:text-lg text-black font-extrabold mt-0.5">
                  {detailCommunity.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 flex items-center justify-center bg-black text-white font-pixel text-xs hover:bg-[#FF2247]"
              >
                [X]
              </button>
            </div>

            {/* View Mode (Details, Eligibility, Spots) */}
            {!isClaimFormOpen ? (
              <div className="space-y-4 pt-4 text-left">
                {/* Logo Banner & Network Tag */}
                <div className="flex items-start gap-4 p-3.5 bg-[#EFE8D8] border-3 border-black rounded-lg">
                  {detailCommunity.logo_url ? (
                    <img
                      src={detailCommunity.logo_url}
                      alt={detailCommunity.name}
                      className="w-20 h-20 object-contain rounded border-2 border-black bg-white shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded bg-gradient-to-br from-amber-400 to-purple-600 border-2 border-black flex items-center justify-center font-pixel text-2xl font-extrabold text-white shrink-0">
                      {detailCommunity.name?.substring(0, 2)?.toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="font-pixel text-sm text-black font-extrabold truncate">
                      {detailCommunity.name}
                    </h3>
                    <div className="font-pixel text-[8px] text-[#007A33] font-bold">
                      ● {detailCommunity.network || 'Robinhood Chain'}
                    </div>
                    {detailCommunity.description && (
                      <p className="font-mono text-xs text-gray-700 line-clamp-2">
                        {detailCommunity.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Contract Address Bar with Copy */}
                <div className="bg-[#F2EADB] border-2 border-black rounded px-3 py-2 flex items-center justify-between gap-2">
                  <div className="font-mono text-xs text-gray-800 font-bold truncate">
                    <span className="text-gray-500">NFT CONTRACT:</span> {detailCommunity.contract_address}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyContract(detailCommunity.id, detailCommunity.contract_address)}
                    className="shrink-0 px-2.5 py-1 bg-black text-white font-mono text-[9px] rounded font-bold hover:bg-gray-800 transition-colors"
                  >
                    {copiedContractId === detailCommunity.id ? '[ COPIED ]' : '[ COPY ]'}
                  </button>
                </div>

                {/* Spots Allocation Meter */}
                {(() => {
                  const claimed = detailCommunity.claimed_spots || 0;
                  const total = detailCommunity.total_spots || 1;
                  const remaining = Math.max(0, total - claimed);
                  const isSoldOut = remaining === 0;

                  return (
                    <div className="p-3.5 bg-[#EFE7D5] border-3 border-black rounded space-y-2">
                      <div className="flex items-center justify-between font-mono text-xs font-bold">
                        <span className="text-gray-700">GUARANTEED SPOTS LEFT:</span>
                        <span className="font-pixel text-[11px] text-black font-extrabold">
                          {remaining} / {total} AVAILABLE
                        </span>
                      </div>
                      <div className="w-full h-3 bg-white rounded-full overflow-hidden border-2 border-black">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            isSoldOut
                              ? 'bg-[#FF2247]'
                              : remaining < 10
                              ? 'bg-[#FFD700]'
                              : 'bg-[#00FF66]'
                          }`}
                          style={{ width: `${Math.min(100, (claimed / total) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Inline Wallet Address Verification within Modal */}
                {!walletAddress && (
                  <div className="p-3.5 bg-[#EFE8D8] border-3 border-black rounded space-y-2">
                    <label className="block font-pixel text-[9px] text-black font-extrabold">
                      ENTER YOUR HOLDER WALLET ADDRESS:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="0x..."
                        value={modalWalletInput}
                        onChange={(e) => setModalWalletInput(e.target.value)}
                        className="flex-1 h-10 px-3 bg-white border-2 border-black font-mono text-xs text-black font-bold outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleVerifyAddress(modalWalletInput)}
                        disabled={scanning}
                        className="px-3.5 py-2 pixel-btn pixel-btn-lime text-black font-pixel text-[9px] font-extrabold shrink-0"
                      >
                        {scanning ? 'SCANNING...' : '[ VERIFY ]'}
                      </button>
                    </div>
                  </div>
                )}

                {/* On-Chain Eligibility Banner */}
                {(() => {
                  const elig = eligibility[detailCommunity.id];
                  const isHolder = elig?.isHolder;
                  const holderCount = elig?.balance || 0;
                  const claimed = detailCommunity.claimed_spots || 0;
                  const total = detailCommunity.total_spots || 1;
                  const isSoldOut = Math.max(0, total - claimed) === 0;

                  return (
                    <div>
                      {scanning ? (
                        <div className="font-pixel text-[9px] text-amber-800 text-center p-3 bg-amber-100 border-2 border-amber-400 animate-pulse font-extrabold">
                          SCANNING ON-CHAIN BALANCE VIA ALCHEMY RPC...
                        </div>
                      ) : !walletAddress ? (
                        <div className="font-pixel text-[9px] text-gray-700 text-center p-3 bg-white border-2 border-dashed border-gray-400 font-bold">
                          [ PASTE YOUR WALLET ADDRESS ABOVE TO VERIFY ON-CHAIN ]
                        </div>
                      ) : isHolder ? (
                        <div className="font-pixel text-[9px] text-[#006622] text-center p-3 bg-[#00FF66]/25 border-3 border-[#00AA44] font-extrabold shadow-[0_0_10px_rgba(0,255,102,0.3)]">
                          [✓] ELIGIBLE TO CLAIM ({holderCount} NFT{holderCount > 1 ? 'S' : ''} VERIFIED ON-CHAIN)
                        </div>
                      ) : (
                        <div className="font-pixel text-[9px] text-[#CC0022] text-center p-3 bg-[#FF2247]/15 border-2 border-[#FF2247] font-bold">
                          [X] NO NFT DETECTED IN WALLET ({walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)})
                        </div>
                      )}

                      {/* Modal Action Buttons */}
                      <div className="pt-3">
                        {isSoldOut ? (
                          <button
                            type="button"
                            disabled
                            className="w-full py-3.5 bg-gray-300 text-gray-600 font-pixel text-xs cursor-not-allowed border-3 border-gray-400 font-bold"
                          >
                            [ ALL SPOTS CLAIMED ]
                          </button>
                        ) : isHolder ? (
                          <button
                            type="button"
                            onClick={() => setIsClaimFormOpen(true)}
                            className="w-full py-4 bg-[#FFD700] hover:bg-[#FFE34D] text-black font-pixel text-xs font-extrabold border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse"
                          >
                            [ CLAIM GTD SPOT NOW ]
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="w-full py-3.5 bg-[#E8DEC8] text-gray-500 font-pixel text-xs cursor-not-allowed border-2 border-gray-400 font-bold"
                          >
                            {walletAddress ? '[ NOT ELIGIBLE ]' : '[ VERIFY WALLET FIRST ]'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Claim Form Mode (When Eligible User clicks Claim GTD Spot) */
              <form onSubmit={handleClaimSubmit} className="space-y-4 pt-4 text-left">
                {/* Verified Wallet (Readonly & Locked - Non Editable) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-pixel text-[9px] text-gray-800 font-extrabold">
                      VERIFIED HOLDER WALLET
                    </label>
                    <span className="font-pixel text-[8px] text-[#007A33] font-bold">
                      [ LOCKED • VERIFIED ]
                    </span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={walletAddress || ''}
                    className="w-full h-11 px-3 bg-[#E8DEC8] border-3 border-black font-mono text-xs text-black font-extrabold cursor-not-allowed select-all"
                  />
                  <p className="font-mono text-[10px] text-gray-600 mt-1">
                    Auto-locked to your verified on-chain NFT holder address.
                  </p>
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

                {/* Optional Comment / Proof URL */}
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

                {/* Submit & Back Buttons */}
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsClaimFormOpen(false)}
                    className="px-4 py-3.5 bg-gray-200 hover:bg-gray-300 font-pixel text-[9px] font-bold border-2 border-black"
                  >
                    [ BACK ]
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !humanSignature}
                    className={`flex-1 py-3.5 font-pixel text-xs font-extrabold transition-all border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                      humanSignature && !isSubmitting
                        ? 'bg-[#FFD700] hover:bg-[#ffe033] text-black animate-pulse'
                        : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? '[ CLAIMING SPOT... ]' : humanSignature ? '[ CONFIRM & CLAIM GTD ]' : '[ SLIDE KEY TO UNLOCK ]'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Success Modal with Prominent Live 24K GTD Card Preview */}
      {claimSuccessData && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-black text-white border-4 border-[#FFD700] max-w-lg w-full p-5 sm:p-6 text-center shadow-[0_0_40px_rgba(255,215,0,0.5)] space-y-4 my-8 rounded-2xl overflow-hidden">
            <div className="inline-block bg-[#FFD700] text-black font-pixel text-xs px-3.5 py-1.5 border-2 border-black font-extrabold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              [ GUARANTEED GTD PASS ]
            </div>

            <div className="space-y-1">
              <span className="font-pixel text-[9px] text-[#00FF66] tracking-widest font-extrabold">
                GUARANTEED ALLOCATION CONFIRMED
              </span>
              <h2 className="font-pixel text-lg sm:text-2xl text-white font-extrabold">
                GTD SPOT CLAIMED!
              </h2>
            </div>

            {/* Live 24K Golden GTD Pass Visual Artwork Card */}
            <div className="relative w-full aspect-[1000/625] bg-[#050505] border-3 border-[#FFD700] rounded overflow-hidden shadow-[0_0_25px_rgba(255,215,0,0.35)]">
              {cardPreviewUrl ? (
                <img
                  src={cardPreviewUrl}
                  alt="ApeSyndicate 24K Golden GTD Pass"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-2 text-gray-400 font-pixel text-[9px]">
                  <div className="w-6 h-6 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
                  <span>MINTING 24K GOLDEN PASS...</span>
                </div>
              )}
            </div>

            {/* Details Summary Bar */}
            <div className="p-3 bg-[#111] border-2 border-[#FFD700]/40 text-left space-y-1.5 font-mono text-xs">
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
        APESYNDICATE • ROBINHOOD CHAIN • PARTNER ALLOCATIONS
      </footer>
    </div>
  );
};
