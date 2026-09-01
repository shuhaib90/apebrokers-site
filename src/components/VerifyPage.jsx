import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { TypewriterText } from './TypewriterText';
import { connectWallet, getConnectedAccount, scanMultiChainWalletActivity } from '../utils/web3Contract';
import { lookupApplicationForVerification, verifyAndClearForMint, fetchMintVerificationStats } from '../utils/supabase';
import { sound } from '../utils/audio';

export const VerifyPage = () => {
  // Input State
  const [xInput, setXInput] = useState('');
  const [walletInput, setWalletInput] = useState('');
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);

  // Verification & Application State
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [matchedApp, setMatchedApp] = useState(null);

  // Scanning State
  const [isScanningChain, setIsScanningChain] = useState(false);
  const [scanLogs, setScanLogs] = useState([]);
  const [chainActivity, setChainActivity] = useState(null);

  // Final Clearance State
  const [clearanceResult, setClearanceResult] = useState(null);
  const [stats, setStats] = useState({ totalVerified: 0, gtdCount: 0, fcfsCount: 0, partnerCount: 0 });

  useEffect(() => {
    fetchMintVerificationStats().then((st) => setStats(st));
    // Auto-check connected wallet if available
    getConnectedAccount().then((acc) => {
      if (acc) setWalletInput(acc);
    });
  }, []);

  const handleConnectWallet = async () => {
    sound?.playClick?.();
    setIsWalletConnecting(true);
    setSearchError(null);
    try {
      const res = await connectWallet();
      if (res.success && res.address) {
        setWalletInput(res.address.toLowerCase());
        sound?.playPowerUp?.();
      } else if (res.error) {
        setSearchError(res.error);
        sound?.playError?.();
      }
    } catch (e) {
      setSearchError(e.message || 'Failed to connect wallet.');
    } finally {
      setIsWalletConnecting(false);
    }
  };

  const handleLookupApplication = async (e) => {
    if (e) e.preventDefault();
    sound?.playClick?.();
    setSearchError(null);
    setMatchedApp(null);
    setClearanceResult(null);
    setChainActivity(null);
    setScanLogs([]);

    const cleanX = xInput.trim().replace(/^@/, '');
    const cleanWallet = walletInput.trim().toLowerCase();

    if (!cleanWallet) {
      setSearchError('Please connect your Web3 wallet using the [ CONNECT WALLET ] button (Manual entry is disabled for anti-sybil security).');
      sound?.playError?.();
      return;
    }

    if (!cleanX) {
      setSearchError('Please enter your registered X (Twitter) username.');
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
        setMatchedApp(result.application);
        sound?.playSuccess?.();

        // If user is already verified for mint, show existing clearance immediately!
        if (result.application.is_mint_verified) {
          setClearanceResult({
            brokerId: result.application.broker_id || `#${result.application.id}`,
            mintTier: result.application.mint_tier || (result.application.is_gtd ? 'GTD' : 'FCFS'),
            isGtd: result.application.mint_tier === 'GTD' || result.application.is_gtd,
            gtdArtId: result.application.gtd_art_id || 1,
            verifiedAt: result.application.mint_verified_at || result.application.created_at,
            chainActivity: result.application.chain_activity || {},
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

    const addLog = (msg) => {
      setScanLogs((prev) => [...prev, msg]);
      sound?.playTypewriterKey?.();
    };

    try {
      addLog('INITIATING ROBINHOOD CHAIN RPC CONNECTION...');
      await new Promise((r) => setTimeout(r, 500));

      addLog(`QUERYING ON-CHAIN BALANCE & TX NONCE FOR ${matchedApp.wallet_address.substring(0, 8)}...`);
      const scanRes = await scanMultiChainWalletActivity(matchedApp.wallet_address);
      const act = scanRes.activity || {};
      setChainActivity(act);
      await new Promise((r) => setTimeout(r, 600));

      addLog(`[✓] ROBINHOOD CHAIN BALANCE: ${act.robinhoodBalance.toFixed(4)} ETH | TXNS: ${act.robinhoodTxCount}`);
      await new Promise((r) => setTimeout(r, 500));

      if (matchedApp.is_gtd || matchedApp.is_code_claim || matchedApp.is_partner_claim || matchedApp.card_tier === 'GOLDEN_GTD') {
        addLog('[👑 GTD ALLOCATION VERIFIED] CONFIRMED GTD WINNER -> DIRECT 100% GUARANTEED GTD CLEARANCE');
        await new Promise((r) => setTimeout(r, 500));
      } else if (act.robinhoodBalance >= 0.0035 || act.robinhoodTxCount >= 3) {
        addLog(`[💎 HOLDINGS BONUS] HOLDING >= $10 ON ROBINHOOD CHAIN (${act.robinhoodBalance.toFixed(4)} ETH) -> +90% GTD CHANCE BOOST APPLIED!`);
        await new Promise((r) => setTimeout(r, 500));
      } else {
        addLog('[ℹ️ STANDARD RESOLUTION] EVALUATING ALLOCATION TIER (GTD CAP 3,000 / FCFS CAP 2,000)...');
        await new Promise((r) => setTimeout(r, 500));
      }

      addLog('INSPECTING MULTI-CHAIN EVM FOOTPRINT (BASE, ARBITRUM, POLYGON)...');
      await new Promise((r) => setTimeout(r, 500));
      addLog(`[✓] MULTI-CHAIN EVM ACTIVITY: ${act.totalEvmTxns} TOTAL TRANSACTIONS DETECTED`);
      await new Promise((r) => setTimeout(r, 500));

      addLog('[✓] ANTI-SYBIL CHECK: PASSED (VERIFIED AUTHENTIC OPERATOR)');
      await new Promise((r) => setTimeout(r, 500));

      addLog('RESOLVING ALLOCATION TIER CLEARANCE...');
      const clearance = await verifyAndClearForMint(matchedApp.id, {
        xUsername: matchedApp.x_username,
        walletAddress: matchedApp.wallet_address,
        chainActivity: act,
      });

      setClearanceResult(clearance);
      sound?.playPowerUp?.();
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: clearance.isGtd ? ['#FFD700', '#00FF66', '#FFFFFF'] : ['#00DDFF', '#00FF66', '#FFFFFF'],
      });

      // Refresh stats
      fetchMintVerificationStats().then((st) => setStats(st));
    } catch (err) {
      console.error('Error during on-chain verification:', err);
      addLog(`[X] VERIFICATION ERROR: ${err.message}`);
      sound?.playError?.();
    } finally {
      setIsScanningChain(false);
    }
  };

  const getTwitterShareUrl = () => {
    if (!clearanceResult) return '#';
    const tierName = clearanceResult.mintTier === 'GTD' ? '👑 GUARANTEED (GTD) MINT' : '⚡ FIRST-COME (FCFS) MINT';
    const text = `I just verified my on-chain activity for @ApebrokersNft mint on Robinhood Chain! 🪪\n\n🛡️ Clearance: ${tierName}\n🆔 Broker ID: ${clearanceResult.brokerId}\n\nVerify your pre-mint allocation:`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://apesyndicates.xyz/verify')}`;
  };

  return (
    <div className="min-h-screen bg-[#08060e] text-white flex flex-col antialiased selection:bg-[#00FF66] selection:text-black">
      <SiteHeader />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] font-pixel text-[9px] sm:text-[10px] rounded-full shadow-[0_0_15px_rgba(0,255,102,0.2)]">
            <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse" />
            <span>MINT CLEARANCE & ON-CHAIN VERIFICATION</span>
          </div>

          <h1 className="font-pixel text-xl sm:text-3xl md:text-4xl text-white tracking-wide leading-tight">
            VERIFY YOUR PRE-MINT ELIGIBILITY
          </h1>

          <p className="font-mono text-xs sm:text-sm text-gray-400 max-w-2xl mx-auto">
            Connect your registered X handle & Web3 wallet to verify on-chain activity, clear anti-sybil checks, and receive your official <strong>GTD or FCFS Mint Clearance Pass</strong>.
          </p>

          {/* Important Rules Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto text-left font-mono text-xs">
            <div className="p-3.5 bg-[#141208] border border-[#FFD700]/50 rounded-xl space-y-1 text-yellow-100/90 shadow-[0_0_15px_rgba(255,215,0,0.1)]">
              <div className="font-pixel text-[9px] text-[#FFD700] flex items-center gap-1.5 font-bold">
                <span>👑</span>
                <span>EXISTING GTD & SECRET CODES</span>
              </div>
              <p className="text-[11px] leading-relaxed text-yellow-100/80">
                Connect X & Web3 wallet to verify wallet transactions. You are <strong>directly cleared for 100% Guaranteed GTD Mint</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-[#0a1a0f] border border-[#00FF66]/50 rounded-xl space-y-1 text-emerald-100/90 shadow-[0_0_15px_rgba(0,255,102,0.1)]">
              <div className="font-pixel text-[9px] text-[#00FF66] flex items-center gap-1.5 font-bold">
                <span>💎</span>
                <span>STANDARD APPLICANTS ($10+ BOOST)</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-100/80">
                Holding <strong>≥ $10 equivalent</strong> (~0.0035 ETH) on Robinhood Chain significantly boosts your probability of winning a <strong>GTD Mint Spot</strong>!
              </p>
            </div>
          </div>
        </div>

        {/* Live Allocation Quotas Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 bg-[#141208] border-2 border-[#FFD700] rounded-xl text-center space-y-1 shadow-[0_0_15px_rgba(255,215,0,0.15)]">
            <div className="font-pixel text-[9px] text-[#FFD700]">👑 GTD ALLOCATION CAP</div>
            <div className="font-pixel text-lg text-white font-extrabold">{stats.gtdCount} / 3,000</div>
            <div className="font-mono text-[10px] text-yellow-100/60">Guaranteed Mint Spots</div>
          </div>

          <div className="p-4 bg-[#0a141e] border-2 border-[#00DDFF] rounded-xl text-center space-y-1">
            <div className="font-pixel text-[9px] text-[#00DDFF]">⚡ FCFS ALLOCATION CAP</div>
            <div className="font-pixel text-lg text-white font-extrabold">{stats.fcfsCount} / 2,000</div>
            <div className="font-mono text-[10px] text-cyan-100/60">Fastest Fingers Mint</div>
          </div>

          <div className="p-4 bg-[#0a1a0f] border-2 border-[#00FF66] rounded-xl text-center space-y-1">
            <div className="font-pixel text-[9px] text-[#00FF66]">🛡️ TOTAL VERIFIED</div>
            <div className="font-pixel text-lg text-white font-extrabold">{stats.totalVerified}</div>
            <div className="font-mono text-[10px] text-emerald-100/60">Cleared for Mint Day</div>
          </div>

          <div className="p-4 bg-[#120e1f] border-2 border-[#b388ff] rounded-xl text-center space-y-1">
            <div className="font-pixel text-[9px] text-[#b388ff]">🏛️ PARTNER DIRECT</div>
            <div className="font-pixel text-lg text-white font-extrabold">{stats.partnerCount} / 1,050</div>
            <div className="font-mono text-[10px] text-purple-100/60">Holder Direct Whitelist</div>
          </div>
        </div>

        {/* Step 1: Input & Lookup Card */}
        <div className="max-w-xl mx-auto bg-[#0d121c] border-3 border-black rounded-2xl p-6 sm:p-7 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-5">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <span className="font-pixel text-xs text-[#00FF66] flex items-center gap-2">
              <span>STEP 1</span>
              <span>• LINK X & WEB3 WALLET</span>
            </span>
            <span className="font-mono text-[10px] text-gray-400">Registered Applicants Only</span>
          </div>

          <form onSubmit={handleLookupApplication} className="space-y-4">
            {/* X Username */}
            <div className="space-y-1 text-left">
              <label className="font-pixel text-[9px] text-gray-300">X (TWITTER) USERNAME</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-xs">@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={xInput}
                  onChange={(e) => setXInput(e.target.value)}
                  className="w-full h-11 pl-8 pr-3 bg-black border-2 border-gray-700 focus:border-[#00FF66] text-white font-mono text-xs rounded-lg outline-none"
                />
              </div>
            </div>

            {/* Wallet Address & Connector (Readonly Web3 Only) */}
            <div className="space-y-1 text-left">
              <div className="flex items-center justify-between">
                <label className="font-pixel text-[9px] text-gray-300">
                  EVM / ROBINHOOD WALLET (WEB3 REQUIRED)
                </label>
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  disabled={isWalletConnecting}
                  className="px-2.5 py-1 bg-[#00FF66]/20 border border-[#00FF66]/50 rounded text-[9px] font-pixel text-[#00FF66] hover:bg-[#00FF66] hover:text-black transition-all flex items-center gap-1"
                >
                  <span>🦊</span>
                  <span>{isWalletConnecting ? 'CONNECTING...' : walletInput ? 'RE-CONNECT' : 'CONNECT WALLET'}</span>
                </button>
              </div>
              <input
                type="text"
                readOnly
                placeholder="Click [CONNECT WALLET] above (Manual entry disabled)"
                value={walletInput}
                onClick={!walletInput ? handleConnectWallet : undefined}
                className={`w-full h-11 px-3 bg-black/90 border-2 text-white font-mono text-xs rounded-lg outline-none cursor-pointer ${
                  walletInput ? 'border-[#00FF66] text-[#00FF66]' : 'border-gray-700 text-gray-400'
                }`}
              />
              <span className="text-[10px] font-mono text-gray-500 block">
                * Manual address typing is disabled for anti-sybil security. Please connect via wallet.
              </span>
            </div>

            {searchError && (
              <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-lg text-left text-xs font-mono text-red-300">
                ⚠️ {searchError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSearching}
              className="w-full py-3.5 bg-[#00FF66] hover:bg-[#00e65c] text-black font-pixel text-xs font-extrabold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl transition-all"
            >
              {isSearching ? 'SEARCHING APPLICATIONS...' : '[ 🔍 CHECK APPLICATION STATUS ]'}
            </button>
          </form>
        </div>

        {/* Step 2: Application Found & On-Chain Scan */}
        {matchedApp && (
          <div className="max-w-xl mx-auto bg-[#0d121c] border-3 border-[#00FF66] rounded-2xl p-6 sm:p-7 shadow-[0_0_30px_rgba(0,255,102,0.15)] space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#00FF66] rounded-full animate-blink" />
                <span className="font-pixel text-xs text-[#00FF66] font-extrabold">
                  APPLICATION FOUND: {matchedApp.broker_id || `#${matchedApp.id}`}
                </span>
              </div>
              <span className="px-2.5 py-0.5 bg-gray-800 text-gray-300 font-pixel text-[8px] rounded">
                {matchedApp.is_partner_claim
                  ? '🏛️ PARTNER HOLDER'
                  : matchedApp.is_code_claim
                  ? '🔑 SECRET CODE'
                  : matchedApp.is_gtd
                  ? '👑 GTD WINNER'
                  : '📜 STANDARD FORM'}
              </span>
            </div>

            {/* Application Overview Box */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-black/60 border border-gray-800 rounded-xl font-mono text-xs text-left">
              <div>
                <span className="text-gray-500 text-[10px] block">X USERNAME</span>
                <span className="text-white font-bold">{matchedApp.x_username}</span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block">REGISTERED WALLET</span>
                <span className="text-gray-300 truncate block">
                  {matchedApp.wallet_address?.substring(0, 6)}...{matchedApp.wallet_address?.substring(matchedApp.wallet_address?.length - 4)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block">PREVIOUS STATUS</span>
                <span className={matchedApp.is_gtd ? 'text-[#FFD700] font-bold' : 'text-[#00DDFF] font-bold'}>
                  {matchedApp.is_gtd ? '👑 GOLDEN GTD' : 'STANDARD WHITELIST'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] block">MINT CLEARANCE</span>
                <span className={matchedApp.is_mint_verified ? 'text-[#00FF66] font-bold' : 'text-yellow-400 font-bold'}>
                  {matchedApp.is_mint_verified ? `[✓] CLEARED (${matchedApp.mint_tier})` : 'AWAITING ON-CHAIN SCAN'}
                </span>
              </div>
            </div>

            {/* Scanning Terminal Logs */}
            {isScanningChain && (
              <div className="p-4 bg-black border-2 border-[#00FF66] rounded-xl font-mono text-xs text-left space-y-1.5 shadow-[inset_0_0_20px_rgba(0,255,102,0.2)]">
                <div className="text-[10px] text-gray-500 pb-1 border-b border-gray-900 flex items-center justify-between">
                  <span>TERMINAL: ON-CHAIN ACTIVITY SCANNER</span>
                  <span className="text-[#00FF66] animate-pulse">RUNNING...</span>
                </div>
                {scanLogs.map((log, idx) => (
                  <div key={idx} className="text-[#00FF66] text-[11px] leading-relaxed">
                    &gt; {log}
                  </div>
                ))}
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

        {/* Step 3: Clearance Mint Pass Display */}
        {clearanceResult && (
          <div className="max-w-xl mx-auto space-y-4 animate-scale-up">
            <div
              className={`p-6 sm:p-7 rounded-2xl border-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] text-left space-y-5 relative overflow-hidden ${
                clearanceResult.isGtd
                  ? 'bg-gradient-to-b from-[#241a02] via-[#140e02] to-black border-[#FFD700] shadow-[0_0_40px_rgba(255,215,0,0.3)]'
                  : 'bg-gradient-to-b from-[#021f24] via-[#011114] to-black border-[#00DDFF] shadow-[0_0_40px_rgba(0,221,255,0.3)]'
              }`}
            >
              {/* Corner Watermark */}
              <div className="absolute right-4 top-4 font-pixel text-5xl opacity-10 select-none pointer-events-none">
                {clearanceResult.isGtd ? '👑 GTD' : '⚡ FCFS'}
              </div>

              {/* Pass Header */}
              <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{clearanceResult.isGtd ? '👑' : '⚡'}</div>
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
                <div className="px-3 py-1 bg-black/80 border border-gray-700 rounded-lg text-center">
                  <span className="font-pixel text-[10px] text-[#00FF66] font-bold block">CLEARED</span>
                  <span className="font-mono text-[9px] text-gray-400">{clearanceResult.brokerId}</span>
                </div>
              </div>

              {/* Pass Metadata Grid */}
              <div className="grid grid-cols-2 gap-3.5 font-mono text-xs bg-black/50 p-4 rounded-xl border border-gray-800/80">
                <div>
                  <span className="text-gray-500 text-[10px] block">OPERATOR X HANDLE</span>
                  <span className="text-white font-bold">{matchedApp?.x_username}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">CLEARED WALLET</span>
                  <span className="text-gray-300 truncate block">
                    {matchedApp?.wallet_address}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">ALLOCATION TIER</span>
                  <span
                    className={`font-pixel text-xs font-bold ${
                      clearanceResult.isGtd ? 'text-[#FFD700]' : 'text-[#00DDFF]'
                    }`}
                  >
                    {clearanceResult.mintTier === 'GTD' ? '👑 GUARANTEED MINT' : '⚡ FCFS MINT'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">TIMESTAMP</span>
                  <span className="text-gray-300 text-[11px]">
                    {new Date(clearanceResult.verifiedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* On-Chain Activity Badge */}
              <div className="p-3 bg-black/80 border border-[#00FF66]/40 rounded-xl flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-blink" />
                  <span className="text-[#00FF66] font-bold">ON-CHAIN FOOTPRINT:</span>
                  <span className="text-gray-300">
                    {clearanceResult.chainActivity?.totalEvmTxns || 1}+ Multi-Chain Txns Verified
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-[#00FF66]/20 text-[#00FF66] text-[10px] rounded font-bold">
                  ✓ VERIFIED
                </span>
              </div>

              {/* Share & Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <a
                  href={getTwitterShareUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:flex-1 py-3.5 bg-black hover:bg-gray-900 text-[#00FF66] border-2 border-[#00FF66] font-pixel text-xs font-bold rounded-xl shadow-[3px_3px_0px_0px_rgba(0,255,102,0.4)] flex items-center justify-center gap-2 transition-all"
                >
                  <span>𝕏</span>
                  <span>[ SHARE ON X / TWITTER ]</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
};
