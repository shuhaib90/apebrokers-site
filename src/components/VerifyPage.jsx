import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';
import { connectWallet, getConnectedAccount, scanMultiChainWalletActivity } from '../utils/web3Contract';
import { lookupApplicationForVerification, verifyAndClearForMint } from '../utils/supabase';

export const VerifyPage = ({ onBackHome }) => {
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

  useEffect(() => {
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
      setSearchError('Please connect your Web3 wallet via [ CONNECT WALLET ] (Manual typing is disabled for security).');
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
      addLog('CONNECTING TO ROBINHOOD CHAIN RPC...');
      await new Promise((r) => setTimeout(r, 450));

      addLog(`SCANNING ON-CHAIN BALANCE & TX NONCE FOR ${matchedApp.wallet_address.substring(0, 8)}...`);
      const scanRes = await scanMultiChainWalletActivity(matchedApp.wallet_address);
      const act = scanRes.activity || {};
      setChainActivity(act);
      await new Promise((r) => setTimeout(r, 550));

      addLog(`[✓] ROBINHOOD CHAIN: ${act.robinhoodBalance.toFixed(4)} ETH | ${act.robinhoodTxCount} TXNS`);
      await new Promise((r) => setTimeout(r, 450));

      if (matchedApp.is_gtd || matchedApp.is_code_claim || matchedApp.is_partner_claim || matchedApp.card_tier === 'GOLDEN_GTD') {
        addLog('[👑 GTD WINNER DETECTED] DIRECT 100% GUARANTEED GTD MINT CLEARANCE APPLIED');
        await new Promise((r) => setTimeout(r, 450));
      } else if (act.robinhoodBalance >= 0.0035 || act.robinhoodTxCount >= 3) {
        addLog(`[💎 HOLDINGS BONUS] HOLDING >= $10 ON ROBINHOOD CHAIN -> +90% GTD CHANCE BOOST!`);
        await new Promise((r) => setTimeout(r, 450));
      }

      addLog('INSPECTING MULTI-CHAIN EVM FOOTPRINT (BASE, ARBITRUM, POLYGON)...');
      await new Promise((r) => setTimeout(r, 450));
      addLog(`[✓] MULTI-CHAIN ACTIVITY: ${act.totalEvmTxns} TOTAL TRANSACTIONS DETECTED`);
      await new Promise((r) => setTimeout(r, 450));

      addLog('[✓] ANTI-SYBIL VERIFICATION: PASSED (VERIFIED OPERATOR)');
      await new Promise((r) => setTimeout(r, 450));

      addLog('ISSUING OFFICIAL MINT CLEARANCE PASS...');
      const clearance = await verifyAndClearForMint(matchedApp.id, {
        xUsername: matchedApp.x_username,
        walletAddress: matchedApp.wallet_address,
        chainActivity: act,
      });

      setClearanceResult(clearance);
      sound?.playPowerUp?.();
      confetti({
        particleCount: 160,
        spread: 100,
        origin: { y: 0.55 },
        colors: clearance.isGtd ? ['#FFD700', '#00FF66', '#FFFFFF'] : ['#00DDFF', '#00FF66', '#FFFFFF'],
      });
    } catch (err) {
      console.error('Error during on-chain verification:', err);
      addLog(`[X] VERIFICATION ERROR: ${err.message}`);
      sound?.playError?.();
    } finally {
      setIsScanningChain(false);
    }
  };

  const handleShareOnX = () => {
    if (!clearanceResult) return;
    sound?.playClick?.();
    const tierName = clearanceResult.mintTier === 'GTD' ? '👑 GUARANTEED (GTD) MINT' : '⚡ FIRST-COME (FCFS) MINT';
    const text = `I just verified my on-chain activity for @Apesyndicates mint on Robinhood Chain! 🪪\n\n🛡️ Clearance: ${tierName}\n🆔 Broker ID: ${clearanceResult.brokerId}\n\nVerify your pre-mint allocation: https://apesyndicates.xyz/verify\n\n#ApeSyndicate #RobinhoodChain #GTD`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
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
            [ ROBINHOOD CHAIN • PRE-MINT VERIFICATION ]
          </div>
          <h1 className="font-pixel text-2xl sm:text-4xl text-white font-extrabold tracking-tight drop-shadow-[6px_6px_0px_rgba(0,0,0,1)]">
            VERIFY FOR MINT
          </h1>
          <div className="bg-black/90 max-w-xl mx-auto p-3.5 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-lg">
            <p className="font-mono text-xs sm:text-sm text-gray-200 font-semibold leading-relaxed">
              Connect your registered X handle & Web3 wallet to verify on-chain activity on Robinhood Chain and secure your official Mint Clearance Pass.
            </p>
          </div>
        </div>

        {/* Step 1: Input & Lookup Card */}
        <div className="bg-black/95 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 sm:p-8 rounded-2xl text-left space-y-5">
          <div className="flex items-center justify-between border-b-2 border-[#222] pb-3">
            <span className="font-pixel text-xs text-[#00FF66] flex items-center gap-2">
              <span>●</span>
              <span>VERIFY REGISTERED OPERATOR</span>
            </span>
            <span className="font-mono text-[10px] text-gray-400">Registered Applicants Only</span>
          </div>

          <form onSubmit={handleLookupApplication} className="space-y-4">
            {/* X Username */}
            <div className="space-y-1.5">
              <label className="font-pixel text-[9px] text-[#00FF66] tracking-wider block">
                X (TWITTER) USERNAME
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-xs font-bold">@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={xInput}
                  onChange={(e) => setXInput(e.target.value)}
                  className="w-full h-12 pl-8 pr-3 bg-[#111] border-3 border-black focus:border-[#00FF66] text-white font-mono text-xs rounded-lg outline-none shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.5)]"
                />
              </div>
            </div>

            {/* Wallet Address & Connector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-pixel text-[9px] text-[#00FF66] tracking-wider">
                  EVM / ROBINHOOD WALLET (WEB3)
                </label>
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  disabled={isWalletConnecting}
                  className="px-2.5 py-1 bg-[#00FF66] text-black border-2 border-black text-[9px] font-pixel font-bold hover:bg-[#00e65c] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded transition-all flex items-center gap-1"
                >
                  <span>🦊</span>
                  <span>{isWalletConnecting ? 'CONNECTING...' : walletInput ? 'RE-CONNECT' : 'CONNECT WALLET'}</span>
                </button>
              </div>
              <input
                type="text"
                readOnly
                placeholder="Click [CONNECT WALLET] above (Manual typing disabled)"
                value={walletInput}
                onClick={!walletInput ? handleConnectWallet : undefined}
                className={`w-full h-12 px-3 bg-[#111] border-3 border-black text-white font-mono text-xs rounded-lg outline-none cursor-pointer shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.5)] ${
                  walletInput ? 'text-[#00FF66]' : 'text-gray-400'
                }`}
              />
              <span className="text-[10px] font-mono text-gray-400 block">
                * Manual address typing is disabled for security. Connect via Web3 wallet.
              </span>
            </div>

            {searchError && (
              <div className="p-3.5 bg-red-950/80 border-2 border-red-500 rounded-lg text-left text-xs font-mono text-red-200">
                ⚠️ {searchError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSearching}
              className="w-full py-4 bg-[#00FF66] hover:bg-[#00e65c] text-black font-pixel text-xs font-extrabold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl transition-all"
            >
              {isSearching ? 'SEARCHING DATABASE...' : '[ 🔍 CHECK APPLICATION STATUS ]'}
            </button>
          </form>
        </div>

        {/* Step 2: Application Found & On-Chain Scanner */}
        {matchedApp && (
          <div className="bg-black/95 border-4 border-[#00FF66] shadow-[8px_8px_0px_0px_rgba(0,255,102,0.3)] p-6 sm:p-8 rounded-2xl text-left space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b-2 border-[#222] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#00FF66] rounded-full animate-blink" />
                <span className="font-pixel text-xs text-[#00FF66] font-extrabold">
                  FOUND: {matchedApp.broker_id || `#${matchedApp.id}`}
                </span>
              </div>
              <span className="px-2.5 py-1 bg-black text-[#FFD700] border border-[#FFD700]/50 font-pixel text-[8px] rounded">
                {matchedApp.is_partner_claim
                  ? '🏛️ PARTNER HOLDER'
                  : matchedApp.is_code_claim
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
                <span className="text-gray-400 text-[10px] block font-bold">CLEARANCE STATUS</span>
                <span className={matchedApp.is_mint_verified ? 'text-[#00FF66] font-bold' : 'text-yellow-400 font-bold'}>
                  {matchedApp.is_mint_verified ? `[✓] CLEARED (${matchedApp.mint_tier})` : 'AWAITING ON-CHAIN SCAN'}
                </span>
              </div>
            </div>

            {/* Scanning Terminal Logs */}
            {isScanningChain && (
              <div className="p-4 bg-[#0a0a0a] border-3 border-[#00FF66] rounded-xl font-mono text-xs space-y-1.5 shadow-[inset_0_0_20px_rgba(0,255,102,0.15)]">
                <div className="text-[10px] text-gray-400 pb-1 border-b border-[#222] flex items-center justify-between">
                  <span>ROBINHOOD ON-CHAIN SCANNER</span>
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
          <div className="space-y-4 animate-scale-up text-left">
            <div
              className={`p-6 sm:p-8 rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-5 relative overflow-hidden ${
                clearanceResult.isGtd
                  ? 'bg-gradient-to-b from-[#241a02] via-[#140e02] to-black'
                  : 'bg-gradient-to-b from-[#021f24] via-[#011114] to-black'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-black/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{clearanceResult.isGtd ? '👑' : '⚡'}</div>
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
              <div className="grid grid-cols-2 gap-3.5 font-mono text-xs bg-black/70 p-4 rounded-xl border-2 border-black">
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
              <div className="p-3 bg-black/80 border-2 border-black rounded-xl flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-blink" />
                  <span className="text-[#00FF66] font-bold">ON-CHAIN FOOTPRINT:</span>
                  <span className="text-gray-300">
                    {clearanceResult.chainActivity?.totalEvmTxns || 1}+ Multi-Chain Txns Verified
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-[#00FF66]/20 text-[#00FF66] text-[10px] rounded font-bold border border-[#00FF66]/40">
                  ✓ VERIFIED
                </span>
              </div>

              {/* Share & Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleShareOnX}
                  className="w-full py-4 bg-[#00FF66] hover:bg-[#00e65c] text-black font-pixel text-xs font-extrabold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <span>𝕏</span>
                  <span>[ SHARE CLEARANCE ON X ]</span>
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
