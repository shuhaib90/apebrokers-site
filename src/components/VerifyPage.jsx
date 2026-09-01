import React, { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';
import { scanMultiChainWalletActivity } from '../utils/web3Contract';
import { lookupApplicationForVerification, verifyAndClearForMint } from '../utils/supabase';
import { startTwitterOAuth, checkTwitterOAuthCallback } from '../utils/xAuth';

export const VerifyPage = ({ onBackHome }) => {
  // RainbowKit & Wagmi Web3 Hooks
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();

  // Authentication State
  const [xUser, setXUser] = useState(null);
  const [xInput, setXInput] = useState('');
  const [walletInput, setWalletInput] = useState('');
  const [isXAuthenticating, setIsXAuthenticating] = useState(false);

  // Verification & Application State
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [matchedApp, setMatchedApp] = useState(null);

  // Scanning & Progress State
  const [isScanningChain, setIsScanningChain] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('');
  const [scanLogs, setScanLogs] = useState([]);
  const [chainActivity, setChainActivity] = useState(null);

  // Final Clearance State
  const [clearanceResult, setClearanceResult] = useState(null);

  // Sync connected wallet from RainbowKit / Wagmi
  useEffect(() => {
    if (isConnected && address) {
      setWalletInput(address.toLowerCase());
    } else {
      setWalletInput('');
    }
  }, [isConnected, address]);

  // Check for saved X session or OAuth return callback
  useEffect(() => {
    const savedUser = sessionStorage.getItem('x_authenticated_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setXUser(parsed);
        setXInput(parsed.username);
      } catch (e) {
        // ignore
      }
    }

    async function handleAuthCallback() {
      const authResult = await checkTwitterOAuthCallback();
      if (authResult) {
        if (authResult.success && authResult.user) {
          setXUser(authResult.user);
          setXInput(authResult.user.username);
          sessionStorage.setItem('x_authenticated_user', JSON.stringify(authResult.user));
          sound?.playSuccess?.();
        } else if (authResult.error) {
          setSearchError(authResult.error);
          sound?.playError?.();
        }
      }
    }
    handleAuthCallback();
  }, []);

  const handleTwitterLogin = async () => {
    sound?.playClick?.();
    setIsXAuthenticating(true);
    setSearchError(null);
    try {
      await startTwitterOAuth();
    } catch (e) {
      console.error('Twitter OAuth start failed:', e);
      setSearchError('Failed to initialize Twitter Login. Please try again.');
      setIsXAuthenticating(false);
    }
  };

  const handleTwitterLogout = () => {
    sound?.playClick?.();
    setXUser(null);
    setXInput('');
    sessionStorage.removeItem('x_authenticated_user');
    sessionStorage.removeItem('x_oauth_state');
    sessionStorage.removeItem('x_oauth_verifier');
    sessionStorage.removeItem('x_oauth_redirect_uri');
    setMatchedApp(null);
    setClearanceResult(null);
  };

  const handleConnectWallet = () => {
    sound?.playClick?.();
    setSearchError(null);
    if (openConnectModal) {
      openConnectModal();
    }
  };

  const handleDisconnectWallet = () => {
    sound?.playClick?.();
    disconnect();
    setWalletInput('');
    setMatchedApp(null);
    setClearanceResult(null);
  };

  // Auto-check application status on page load / refresh if both X and Wallet are connected
  useEffect(() => {
    const cleanX = (xInput || xUser?.username || '').trim().replace(/^@/, '');
    const cleanWallet = (walletInput || address || '').trim().toLowerCase();

    if (cleanX && cleanWallet && !clearanceResult && !matchedApp && !isSearching) {
      handleLookupApplication(null, cleanX, cleanWallet);
    }
  }, [xInput, xUser, walletInput, address]);

  const handleLookupApplication = async (e, directX = null, directWallet = null) => {
    if (e) e.preventDefault();
    sound?.playClick?.();
    setSearchError(null);
    setMatchedApp(null);
    setClearanceResult(null);
    setChainActivity(null);
    setScanLogs([]);

    const cleanX = (directX || xInput || xUser?.username || '').trim().replace(/^@/, '');
    const cleanWallet = (directWallet || walletInput || address || '').trim().toLowerCase();

    if (!cleanX) {
      setSearchError('Please connect your X (Twitter) account first.');
      sound?.playError?.();
      return;
    }

    if (!cleanWallet) {
      setSearchError('Please connect your Web3 wallet first.');
      sound?.playError?.();
      return;
    }

    setIsSearching(true);
    try {
      const result = await lookupApplicationForVerification(cleanX, cleanWallet);
      if (!result.found || !result.application) {
        setSearchError(result.error || 'No registered application found for this account. Please submit an application on /apply first.');
        sound?.playError?.();
      } else {
        const app = result.application;
        setMatchedApp(app);
        sound?.playSuccess?.();

        // If user is already verified for mint, show existing clearance immediately after refresh or lookup!
        const isVerified = app.is_mint_verified || app.proof_links?.is_mint_verified || (app.mint_tier && app.mint_tier !== 'PENDING');
        if (isVerified) {
          const tier = app.mint_tier || app.proof_links?.mint_tier || (app.is_gtd ? 'GTD' : 'FCFS');
          setClearanceResult({
            brokerId: app.broker_id || `#${app.id}`,
            mintTier: tier,
            isGtd: tier === 'GTD' || app.is_gtd,
            gtdArtId: app.gtd_art_id || 1,
            verifiedAt: app.mint_verified_at || app.proof_links?.mint_verified_at || app.created_at,
            chainActivity: app.chain_activity || app.proof_links?.chain_activity || {},
            alreadyVerified: true,
          });
        }
      }
    } catch (err) {
      setSearchError('Lookup error: ' + err.message);
      sound?.playError?.();
    } finally {
      setIsSearching(false);
    }
  };

  const handleRunOnChainScanAndClear = async () => {
    if (!matchedApp) return;
    sound?.playClick?.();
    setIsScanningChain(true);
    setScanLogs([]);
    setScanProgress(5);
    setScanStatusText('INITIALIZING SECURE SCANNER...');

    const addLog = (msg) => {
      setScanLogs((prev) => [...prev, msg]);
      sound?.playTypewriterKey?.();
    };

    try {
      // Step 1: Connect to RPC
      setScanProgress(20);
      setScanStatusText('QUERYING ROBINHOOD CHAIN RPC NODE...');
      addLog('CONNECTING TO ROBINHOOD CHAIN RPC NODE...');
      await new Promise((r) => setTimeout(r, 400));

      // Step 2: Fetch Multi-Chain Activity
      setScanProgress(45);
      setScanStatusText('ANALYZING WALLET NONCE & TRANSACTION HISTORY...');
      addLog(`SCANNING ON-CHAIN ACTIVITY FOR ${matchedApp.wallet_address.substring(0, 8)}...`);
      const scanRes = await scanMultiChainWalletActivity(matchedApp.wallet_address);
      const act = scanRes.activity || {};
      const totalTx = (act.robinhoodTxCount || 0) + (act.totalEvmTxns || 0);
      setChainActivity(act);
      await new Promise((r) => setTimeout(r, 500));

      const ethBal = act.totalEthBalance || act.robinhoodBalance || 0;
      const usdBal = act.estimatedUsdBalance || (ethBal * 2800);

      addLog(`[✓] TRANSACTION FOOTPRINT: ${totalTx} TOTAL ON-CHAIN TXNS`);
      addLog(`[✓] MULTI-CHAIN ASSETS: ${ethBal.toFixed(4)} ETH (~$${usdBal.toFixed(2)})`);
      await new Promise((r) => setTimeout(r, 450));

      // Step 3: Check GTD Winners vs Standard
      setScanProgress(70);
      setScanStatusText('RESOLVING ALLOCATION CLEARANCE TIER...');
      if (matchedApp.is_gtd || matchedApp.is_code_claim || matchedApp.is_partner_claim || matchedApp.card_tier === 'GOLDEN_GTD') {
        addLog('[👑 GTD WINNER DETECTED] CHECKING >= $1-2 HOLDINGS OR >= 1 TXN HISTORY...');
      } else if (usdBal >= 10 || ethBal >= 0.0035) {
        addLog('[💎 HOLDINGS QUALIFIED] >= $10 HOLDINGS DETECTED -> GTD ALLOCATION QUALIFIED');
      } else if (totalTx >= 1 || usdBal > 0) {
        addLog('[⚡ FCFS QUALIFIED] ACTIVE ON-CHAIN WALLET DETECTED -> FCFS ALLOCATION QUALIFIED');
      } else {
        addLog('[⚠️ NO ON-CHAIN ACTIVITY] 0 TRANSACTIONS & $0 BALANCE DETECTED');
      }
      await new Promise((r) => setTimeout(r, 500));

      // Step 4: Database Save & Lock
      setScanProgress(90);
      setScanStatusText('LOCKING RECORD IN DATABASE (SINGLE-TIME VERIFIED)...');
      addLog('WRITING PERMANENT CLEARANCE RECORD TO DATABASE...');
      const clearance = await verifyAndClearForMint(matchedApp.id, {
        xUsername: matchedApp.x_username,
        walletAddress: matchedApp.wallet_address,
        chainActivity: act,
      });

      // Step 5: Completion
      setScanProgress(100);
      if (clearance.mintTier === 'INELIGIBLE') {
        setScanStatusText('SCAN COMPLETE: MINIMUM REQUIREMENTS NOT MET');
        addLog('[🚫 STATUS: INELIGIBLE] 0 ON-CHAIN TRANSACTIONS DETECTED');
        addLog('[🔒 RECORD LOCKED] SAVED ON DATABASE AS INELIGIBLE');
        sound?.playError?.();
      } else {
        setScanStatusText('VERIFICATION COMPLETE! MINT PASS ISSUED!');
        addLog('[✓] MINT CLEARANCE SECURED & LOCKED IN DATABASE');
        sound?.playPowerUp?.();
        // Glorious Confetti Explosion
        confetti({
          particleCount: 180,
          spread: 120,
          origin: { y: 0.5 },
          colors: clearance.isGtd ? ['#FFD700', '#00FF66', '#FFFFFF', '#FFA500'] : ['#00DDFF', '#00FF66', '#FFFFFF'],
        });
      }
      await new Promise((r) => setTimeout(r, 400));

      if (clearance.application) {
        setMatchedApp(clearance.application);
      }
      setClearanceResult(clearance);
    } catch (err) {
      console.error('Error during on-chain verification:', err);
      addLog(`[X] ERROR: ${err.message}`);
      setSearchError(err.message);
      sound?.playError?.();
    } finally {
      setIsScanningChain(false);
    }
  };

  const handleShareOnX = () => {
    if (!clearanceResult) return;
    sound?.playClick?.();
    const tierName = clearanceResult.mintTier === 'GTD' ? '👑 GUARANTEED (GTD) MINT' : '⚡ FIRST-COME (FCFS) MINT';
    const text = `🎉 I just verified my on-chain activity for @Apesyndicates mint on Robinhood Chain!\n\n🛡️ Clearance: ${tierName}\n🆔 Broker ID: ${clearanceResult.brokerId}\n\nVerify your pre-mint allocation: https://apesyndicates.xyz/verify\n\n#ApeSyndicate #RobinhoodChain #GTD`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const isBothConnected = !!(xInput || xUser?.username) && !!(walletInput || address);

  return (
    <div
      className="min-h-screen text-white flex flex-col items-center justify-between relative bg-cover bg-center bg-no-repeat bg-fixed select-none"
      style={{
        backgroundImage: 'url(/landscape_bg.gif)',
        backgroundColor: '#0a0612',
      }}
    >
      {/* Background Dimmer */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] pointer-events-none" />

      {/* Top Navigation Bar */}
      <div className="relative z-20 w-full max-w-5xl mx-auto px-4 py-4 sm:py-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            sound?.playClick?.();
            if (onBackHome) onBackHome();
            else window.location.href = '/';
          }}
          className="pixel-btn pixel-btn-black px-3.5 sm:px-4 py-2 text-[10px] sm:text-xs font-pixel text-white border-2 border-white hover:border-[#00FF66] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-lg"
        >
          [ ← HOME ]
        </button>

        <div className="flex items-center gap-2 bg-black/90 px-3.5 py-1.5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
          <span className="w-2.5 h-2.5 bg-[#00FF66] inline-block animate-blink" />
          <span className="font-pixel text-[10px] text-[#00FF66] font-extrabold tracking-wider">
            PRE-MINT VERIFICATION VAULT
          </span>
        </div>
      </div>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-2xl mx-auto px-4 py-4 sm:py-6 text-center space-y-6">
        {/* Title Header */}
        <div className="space-y-2.5">
          <div className="inline-block bg-black text-[#00FF66] px-4 py-1.5 border-3 border-black font-pixel text-[9px] sm:text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
            [ ROBINHOOD CHAIN • ON-CHAIN ACTIVITY VERIFICATION ]
          </div>
          <h1 className="font-pixel text-2xl sm:text-4xl text-white font-extrabold tracking-tight drop-shadow-[6px_6px_0px_rgba(0,0,0,1)]">
            VERIFY FOR MINT
          </h1>
          <div className="bg-black/90 max-w-xl mx-auto p-3.5 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-lg">
            <p className="font-mono text-xs sm:text-sm text-gray-200 font-semibold leading-relaxed">
              Connect your registered X account & Web3 wallet to verify on-chain activity and secure your official Mint Clearance Pass. (Single-Time Verification Only).
            </p>
          </div>
        </div>

        {/* Step 1: Connect Only Cards (NO manual typing) */}
        <div className="bg-black/95 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 sm:p-8 rounded-2xl text-left space-y-5">
          <div className="flex items-center justify-between border-b-2 border-[#222] pb-3">
            <span className="font-pixel text-xs text-[#00FF66] flex items-center gap-2">
              <span>●</span>
              <span>VERIFY REGISTERED OPERATOR</span>
            </span>
            <span className="font-mono text-[10px] text-gray-400">1x Anti-Sybil Lock</span>
          </div>

          <div className="space-y-4">
            {/* 1. X (Twitter) Connection Card */}
            <div className="p-4 bg-[#111] border-2 border-black rounded-xl space-y-2.5 shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[9px] text-[#00FF66] tracking-wider flex items-center gap-1.5">
                  <span>𝕏</span>
                  <span>X (TWITTER) ACCOUNT</span>
                </span>
                {xUser || xInput ? (
                  <button
                    type="button"
                    onClick={handleTwitterLogout}
                    className="px-2.5 py-1 bg-red-950 text-red-400 border border-red-800 text-[9px] font-pixel hover:bg-red-900 rounded transition-all"
                  >
                    LOGOUT
                  </button>
                ) : null}
              </div>

              {xUser || xInput ? (
                <div className="flex items-center justify-between p-3 bg-black/70 border-2 border-[#00FF66]/40 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">𝕏</span>
                    <div>
                      <span className="font-pixel text-xs text-[#00FF66] font-bold block">
                        @{xUser?.username || xInput}
                      </span>
                      <span className="font-mono text-[9px] text-gray-400">
                        {xUser?.name || 'Authenticated X Handle'}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-[#00FF66]/20 text-[#00FF66] text-[9px] font-pixel font-bold rounded border border-[#00FF66]/30">
                    ✓ AUTHENTICATED
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleTwitterLogin}
                  disabled={isXAuthenticating}
                  className="w-full py-3.5 bg-[#1da1f2] hover:bg-[#1a91da] text-white font-pixel text-xs font-bold border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  <span className="text-base">𝕏</span>
                  <span>{isXAuthenticating ? 'CONNECTING TO X...' : '[ CONNECT WITH X ]'}</span>
                </button>
              )}
            </div>

            {/* 2. Web3 Wallet Connection Card */}
            <div className="p-4 bg-[#111] border-2 border-black rounded-xl space-y-2.5 shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[9px] text-[#00FF66] tracking-wider flex items-center gap-1.5">
                  <span>🦊</span>
                  <span>EVM / ROBINHOOD WALLET (MIN 1 TX)</span>
                </span>
                {isConnected && address ? (
                  <button
                    type="button"
                    onClick={handleDisconnectWallet}
                    className="px-2.5 py-1 bg-red-950 text-red-400 border border-red-800 text-[9px] font-pixel hover:bg-red-900 rounded transition-all"
                  >
                    DISCONNECT
                  </button>
                ) : null}
              </div>

              {isConnected && address ? (
                <div className="flex items-center justify-between p-3 bg-black/70 border-2 border-[#00FF66]/40 rounded-lg">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="text-lg">🦊</span>
                    <div className="overflow-hidden">
                      <span className="font-mono text-xs text-[#00FF66] font-bold block truncate">
                        {address}
                      </span>
                      <span className="font-mono text-[9px] text-gray-400">
                        Robinhood Chain • Web3 Connected
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-[#00FF66]/20 text-[#00FF66] text-[9px] font-pixel font-bold rounded border border-[#00FF66]/30 shrink-0 ml-2">
                    ✓ CONNECTED
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  className="w-full py-3.5 bg-[#00FF66] hover:bg-[#00e65c] text-black font-pixel text-xs font-bold border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  <span className="text-base">🌈</span>
                  <span>[ CONNECT WEB3 WALLET ]</span>
                </button>
              )}
            </div>

            {searchError && (
              <div className="p-3.5 bg-red-950/80 border-2 border-red-500 rounded-lg text-left text-xs font-mono text-red-200">
                ⚠️ {searchError}
              </div>
            )}

            {/* Check Status Button */}
            <button
              type="button"
              onClick={handleLookupApplication}
              disabled={!isBothConnected || isSearching}
              className={`w-full py-4 font-pixel text-xs font-extrabold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl transition-all ${
                isBothConnected && !isSearching
                  ? 'bg-[#00FF66] hover:bg-[#00e65c] text-black cursor-pointer animate-pulse'
                  : 'bg-gray-800 text-gray-400 cursor-not-allowed opacity-60'
              }`}
            >
              {isSearching
                ? 'SEARCHING DATABASE...'
                : !isBothConnected
                ? '[ CONNECT X & WALLET TO CHECK STATUS ]'
                : '[ 🔍 CHECK APPLICATION STATUS ]'}
            </button>
          </div>
        </div>

        {/* Step 2: Application Found & On-Chain Scanning */}
        {matchedApp && (matchedApp.is_partner_claim || matchedApp.is_community_claim || !!matchedApp.community_name) ? (
          <div className="bg-black/95 border-4 border-[#b388ff] shadow-[8px_8px_0px_0px_rgba(179,136,255,0.3)] p-6 sm:p-8 rounded-2xl text-left space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b-2 border-[#222] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏛️</span>
                <span className="font-pixel text-xs text-[#b388ff] font-extrabold">
                  PARTNER NFT HOLDER: {matchedApp.community_name || 'PARTNER COLLECTION'}
                </span>
              </div>
              <span className="px-2.5 py-1 bg-[#b388ff] text-black font-pixel text-[8px] font-bold rounded">
                DIRECT GTD
              </span>
            </div>

            <div className="p-4 bg-[#160d26] border-2 border-[#b388ff]/50 rounded-xl space-y-2 font-mono text-xs text-purple-100">
              <div className="font-pixel text-xs text-white font-bold">
                ✓ NO NEED TO VERIFY! YOU ARE ALREADY DIRECTLY ELIGIBLE FOR GTD MINT.
              </div>
              <p className="text-gray-300 leading-relaxed text-[11px]">
                As an approved Partner NFT Holder, your connected wallet (<strong>{matchedApp.wallet_address}</strong>) is already whitelisted on-chain. You do not need any additional verification step for Mint Day!
              </p>
            </div>

            <a
              href="/holders"
              className="w-full py-4 bg-[#b388ff] hover:bg-[#cbb0ff] text-black font-pixel text-xs font-extrabold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl flex items-center justify-center gap-2 transition-all block text-center"
            >
              <span>🏛️</span>
              <span>[ VIEW YOUR ALLOCATION ON /HOLDERS ]</span>
            </a>
          </div>
        ) : matchedApp && !clearanceResult && (
          <div className="bg-black/95 border-4 border-[#00FF66] shadow-[8px_8px_0px_0px_rgba(0,255,102,0.3)] p-6 sm:p-8 rounded-2xl text-left space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b-2 border-[#222] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#00FF66] rounded-full animate-blink" />
                <span className="font-pixel text-xs text-[#00FF66] font-extrabold">
                  FOUND: {matchedApp.broker_id || `#${matchedApp.id}`}
                </span>
              </div>
              <span className="px-2.5 py-1 bg-black text-[#FFD700] border border-[#FFD700]/50 font-pixel text-[8px] rounded">
                {matchedApp.is_code_claim
                  ? '🔑 SECRET CODE'
                  : matchedApp.is_gtd
                  ? '👑 GTD WINNER'
                  : '📜 STANDARD APPLICANT'}
              </span>
            </div>

            {/* Application Overview Grid */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-[#111] border-2 border-black rounded-xl font-mono text-xs">
              <div>
                <span className="text-gray-400 text-[10px] block font-bold">X USERNAME</span>
                <span className="text-white font-bold">{matchedApp.x_username}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block font-bold">WALLET</span>
                <span className="text-[#00FF66] truncate block font-mono">
                  {matchedApp.wallet_address?.substring(0, 6)}...{matchedApp.wallet_address?.substring(matchedApp.wallet_address?.length - 4)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block font-bold">PREVIOUS STATUS</span>
                <span className={matchedApp.is_gtd ? 'text-[#FFD700] font-bold' : 'text-[#00DDFF] font-bold'}>
                  {matchedApp.is_gtd ? '👑 GOLDEN GTD' : 'STANDARD WL'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block font-bold">DATABASE STATUS</span>
                <span className={matchedApp.is_mint_verified ? 'text-[#00FF66] font-bold' : 'text-yellow-400 font-bold'}>
                  {matchedApp.is_mint_verified ? `[✓] SAVED & LOCKED (${matchedApp.mint_tier})` : 'AWAITING SCAN'}
                </span>
              </div>
            </div>

            {/* High-Tech Animated Radar Scanner */}
            {isScanningChain && (
              <div className="p-5 bg-[#0a0a0a] border-3 border-[#00FF66] rounded-xl font-mono text-xs space-y-4 shadow-[0_0_30px_rgba(0,255,102,0.2)]">
                <div className="flex items-center justify-between pb-2 border-b border-[#222]">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF66] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00FF66]"></span>
                    </span>
                    <span className="font-pixel text-[10px] text-[#00FF66]">ON-CHAIN RADAR SCANNER</span>
                  </div>
                  <span className="font-pixel text-[10px] text-[#FFD700]">{scanProgress}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#111] h-3 rounded-full overflow-hidden border border-black p-0.5">
                  <div
                    className="bg-gradient-to-r from-[#00DDFF] via-[#00FF66] to-[#FFD700] h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>

                <div className="text-[10px] text-gray-300 font-bold text-center animate-pulse">
                  {scanStatusText}
                </div>

                {/* Real-time Terminal Log Feed */}
                <div className="space-y-1 pt-2 border-t border-[#1a1a1a]">
                  {scanLogs.map((log, idx) => (
                    <div key={idx} className="text-[#00FF66] text-[10px] leading-relaxed">
                      &gt; {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!clearanceResult && !isScanningChain && (
              <button
                type="button"
                onClick={handleRunOnChainScanAndClear}
                className="w-full py-4 bg-[#FFD700] hover:bg-[#ffe34d] text-black font-pixel text-xs font-extrabold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl animate-pulse transition-all"
              >
                [ ⚡ SCAN ON-CHAIN ACTIVITY & CLEAR FOR MINT ]
              </button>
            )}
          </div>
        )}

        {/* Step 3: Clearance Mint Pass Display or Ineligible Notice */}
        {clearanceResult && clearanceResult.mintTier === 'INELIGIBLE' ? (
          <div className="space-y-5 animate-scale-up text-left">
            <div className="p-6 sm:p-8 rounded-2xl border-4 border-red-600 bg-gradient-to-b from-[#2a0404] via-[#140202] to-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <div className="flex items-center gap-3 border-b-2 border-red-900/60 pb-3">
                <div className="text-4xl">🚫</div>
                <div>
                  <h3 className="font-pixel text-sm sm:text-base font-extrabold tracking-wide text-red-400">
                    INELIGIBLE FOR MINT
                  </h3>
                  <p className="font-mono text-[10px] text-gray-400">
                    MINIMUM REQUIREMENTS NOT MET • SINGLE-TIME LOCKED
                  </p>
                </div>
              </div>

              <div className="p-4 bg-black/80 border-2 border-red-900 rounded-xl space-y-2 font-mono text-xs text-red-200">
                <p className="leading-relaxed">
                  Your connected wallet and X account did not meet the required holding or on-chain activity criteria for an allocation spot on Robinhood Chain.
                </p>
                <div className="text-[11px] text-gray-400 pt-1 border-t border-red-950">
                  🔒 <strong>Record Permanently Saved & Locked:</strong> You cannot verify again. Only an administrator can review or re-evaluate your eligibility in the Admin Dashboard.
                </div>
              </div>
            </div>
          </div>
        ) : clearanceResult && (
          <div className="space-y-5 animate-scale-up text-left">
            {/* Celebratory Congratulatory Header */}
            <div className="p-4 bg-[#00FF66]/10 border-3 border-[#00FF66] rounded-2xl text-center space-y-1 shadow-[0_0_25px_rgba(0,255,102,0.25)]">
              <span className="font-pixel text-xs text-[#00FF66] font-extrabold tracking-wider block">
                🎉 CONGRATULATIONS OPERATOR!
              </span>
              <p className="font-mono text-xs text-gray-200">
                {clearanceResult.isGtd
                  ? 'You have been officially granted 👑 GUARANTEED (GTD) Mint Allocation on Robinhood Chain!'
                  : 'You have been officially granted ⚡ FIRST-COME (FCFS) Mint Allocation on Robinhood Chain!'}
              </p>
              <span className="inline-block mt-1 px-2.5 py-0.5 bg-black text-[#00FF66] border border-[#00FF66]/50 rounded text-[9px] font-mono">
                ✓ PERMANENTLY SAVED & LOCKED ON DATABASE
              </span>
            </div>

            {/* 3D Gold Holographic Pass Card */}
            <div
              className={`p-6 sm:p-8 rounded-2xl border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] space-y-5 relative overflow-hidden ${
                clearanceResult.isGtd
                  ? 'bg-gradient-to-b from-[#2a1e02] via-[#140e02] to-black border-[#FFD700]/60'
                  : 'bg-gradient-to-b from-[#021f24] via-[#011114] to-black border-[#00DDFF]/60'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-black/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="text-4xl animate-bounce">{clearanceResult.isGtd ? '👑' : '⚡'}</div>
                  <div>
                    <h3
                      className={`font-pixel text-sm sm:text-base font-extrabold tracking-wide ${
                        clearanceResult.isGtd ? 'text-[#FFD700]' : 'text-[#00DDFF]'
                      }`}
                    >
                      {clearanceResult.isGtd ? '24K GOLD GTD MINT PASS' : 'CYBER FCFS MINT PASS'}
                    </h3>
                    <p className="font-mono text-[10px] text-gray-400">
                      OFFICIAL PRE-MINT CLEARANCE • ROBINHOOD CHAIN
                    </p>
                  </div>
                </div>
                <div className="px-3.5 py-1.5 bg-black border-2 border-black rounded-lg text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <span className="font-pixel text-[10px] text-[#00FF66] font-bold block">CLEARED</span>
                  <span className="font-mono text-[9px] text-gray-400">{clearanceResult.brokerId}</span>
                </div>
              </div>

              {/* Pass Metadata Grid */}
              <div className="grid grid-cols-2 gap-3.5 font-mono text-xs bg-black/80 p-4 rounded-xl border-2 border-black">
                <div>
                  <span className="text-gray-400 text-[10px] block font-bold">OPERATOR X HANDLE</span>
                  <span className="text-white font-bold">{matchedApp?.x_username}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block font-bold">CLEARED WALLET</span>
                  <span className="text-[#00FF66] truncate block font-mono">
                    {matchedApp?.wallet_address}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block font-bold">ALLOCATION TIER</span>
                  <span
                    className={`font-pixel text-xs font-bold ${
                      clearanceResult.isGtd ? 'text-[#FFD700]' : 'text-[#00DDFF]'
                    }`}
                  >
                    {clearanceResult.mintTier === 'GTD' ? '👑 GUARANTEED MINT' : '⚡ FCFS MINT'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block font-bold">VERIFIED AT</span>
                  <span className="text-gray-300 text-[11px]">
                    {new Date(clearanceResult.verifiedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* On-Chain Activity Badge */}
              <div className="p-3 bg-black/90 border-2 border-black rounded-xl flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-blink" />
                  <span className="text-[#00FF66] font-bold">ON-CHAIN FOOTPRINT:</span>
                  <span className="text-gray-300">
                    {clearanceResult.chainActivity?.totalEvmTxns || 1}+ Transactions Verified
                  </span>
                </div>
                <span className="px-2.5 py-0.5 bg-[#00FF66]/20 text-[#00FF66] text-[10px] rounded font-bold border border-[#00FF66]/40">
                  ✓ VERIFIED & SAVED
                </span>
              </div>

              {/* Share & Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleShareOnX}
                  className="w-full py-4 bg-[#00FF66] hover:bg-[#00e65c] text-black font-pixel text-xs font-extrabold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>𝕏</span>
                  <span>[ SHARE YOUR GTD CLEARANCE ON X ]</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-[10px] font-pixel text-white/50 tracking-wider">
        APESYNDICATE • ROBINHOOD CHAIN PRE-MINT VERIFICATION
      </footer>
    </div>
  );
};
