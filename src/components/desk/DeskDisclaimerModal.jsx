import React, { useState } from 'react';
import { sound } from '../../utils/audio';

export function DeskDisclaimerModal({ isOpen, onClose, onAccept }) {
  const [hasAgreed, setHasAgreed] = useState(false);

  if (!isOpen) return null;

  const handleAgreeAndProceed = () => {
    sound?.playSuccess?.();
    if (onAccept) onAccept();
    if (onClose) onClose();
  };

  const handleDismiss = () => {
    sound?.playClick?.();
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none overflow-y-auto">
      {/* Parchment / Cream Paper Document */}
      <div className="relative w-full max-w-2xl bg-[#FAF6EE] text-[#1F1A14] rounded-lg border-4 border-[#8B7355] shadow-[0_20px_60px_rgba(0,0,0,0.85),8px_8px_0px_#000] overflow-hidden my-auto font-serif">
        
        {/* Vintage Paper Header with Red Ink Stamp */}
        <div className="bg-[#F3ECE0] px-5 py-4 border-b-2 border-[#D8C7B0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-700 animate-pulse" />
              <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-[#63513D]">
                APE BROKERS SYNDICATE • LEGAL MEMORANDUM
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-bold font-pixel tracking-wide text-[#1A1510]">
              BROKER DESK PROTOCOL DISCLAIMER
            </h2>
          </div>

          {/* Official Rubber Stamp Badge */}
          <div className="inline-flex self-start sm:self-auto items-center px-2.5 py-1 border-2 border-red-700 text-red-700 text-[10px] font-mono font-extrabold uppercase tracking-wider rounded -rotate-1 shadow-sm bg-red-50/60">
            OFFICIAL NOTICE // MANDATORY DISCLOSURE
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-[#7D6B57] hover:text-black text-xs font-mono px-2 py-1 border border-[#D8C7B0] hover:border-black rounded bg-[#FAF6EE]"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Legal Document Body */}
        <div className="p-5 sm:p-7 max-h-[62vh] overflow-y-auto space-y-5 text-xs sm:text-sm leading-relaxed text-[#2C241B] font-mono border-b-2 border-[#D8C7B0]">
          
          {/* Memorandum Notice Banner */}
          <div className="bg-[#F2EADB] border-l-4 border-amber-700 p-3.5 rounded-r text-[11px] sm:text-xs text-[#4A3B2C] space-y-1">
            <div className="font-bold uppercase tracking-wider text-[#2E2319] flex items-center gap-1.5">
              <span>⚠️</span>
              <span>IMPORTANT PARTICIPATION MEMORANDUM</span>
            </div>
            <p>
              Please review these disclosures thoroughly before activating or boosting an Ape Broker Desk. By proceeding, you explicitly acknowledge and accept all protocol terms, mechanics, and operational risks.
            </p>
          </div>

          {/* Article 1 */}
          <div className="space-y-1.5">
            <h3 className="text-xs sm:text-sm font-extrabold text-[#110E0B] uppercase tracking-wide flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-[#8B7355] text-white rounded text-[10px] font-bold">1</span>
              <span>REWARD ESTIMATES & APY ARE NOT GUARANTEED</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-[#3D3226]">
              All displayed epoch yields, projected reward estimates, and APY metrics are <strong>purely mathematical estimates</strong> derived from current pool balances, active network weights, and historical distributions. Reward funding is dynamic and dependent entirely on protocol activity and available pool reserves. <strong>No specific rate of return, profit, or yield is guaranteed or promised by the protocol or developers.</strong>
            </p>
          </div>

          {/* Article 2 */}
          <div className="space-y-1.5">
            <h3 className="text-xs sm:text-sm font-extrabold text-[#110E0B] uppercase tracking-wide flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-[#8B7355] text-white rounded text-[10px] font-bold">2</span>
              <span>ACTIVATION & BOOST FEES ARE NON-REFUNDABLE</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-[#3D3226]">
              The <strong>349,693 $APEBROKE</strong> Desk activation fee and all progressive boost tier costs are permanent on-chain protocol fee sinks. Once broadcast to the Robinhood EVM blockchain, <strong>these tokens cannot be refunded, reversed, redeemed, or withdrawn</strong> under any circumstance.
            </p>
          </div>

          {/* Article 3 */}
          <div className="space-y-1.5">
            <h3 className="text-xs sm:text-sm font-extrabold text-[#110E0B] uppercase tracking-wide flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-[#8B7355] text-white rounded text-[10px] font-bold">3</span>
              <span>NOT AN INVESTMENT PRODUCT OR FINANCIAL CONTRACT</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-[#3D3226]">
              Ape Broker Desks are decentralized gamified community utility mechanics designed for Ape Broker NFT holders. They do not constitute shares, securities, interest-bearing bank deposits, debentures, or investment vehicles. Desk ownership represents mining weight allocation within the smart contract, not equity in any entity.
            </p>
          </div>

          {/* Article 4 */}
          <div className="space-y-1.5">
            <h3 className="text-xs sm:text-sm font-extrabold text-[#110E0B] uppercase tracking-wide flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-[#8B7355] text-white rounded text-[10px] font-bold">4</span>
              <span>NATIVE ETH GAS PREREQUISITE & BLOCKCHAIN RISK</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-[#3D3226]">
              All smart contract calls execute on <strong>Robinhood EVM (Chain ID 4663)</strong>. Users are solely responsible for maintaining sufficient native <strong>ETH</strong> in their connected wallet to pay network gas fees for token approvals, desk activations, boosts, and reward claims. Smart contract protocols carry inherent market volatility and software risk.
            </p>
          </div>

          {/* Article 5 */}
          <div className="space-y-1.5">
            <h3 className="text-xs sm:text-sm font-extrabold text-[#110E0B] uppercase tracking-wide flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-[#8B7355] text-white rounded text-[10px] font-bold">5</span>
              <span>NO FINANCIAL ADVICE • DO YOUR OWN RESEARCH (DYOR)</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-[#3D3226]">
              Nothing contained within this website, interface, or smart contract constitutes financial, investment, legal, or tax advice. Users are encouraged to evaluate their own risk tolerance and perform independent due diligence before participating.
            </p>
          </div>
        </div>

        {/* Vintage Paper Footer & Agreement Controls */}
        <div className="bg-[#F5EFEB] p-5 sm:p-6 space-y-4">
          {/* Checkbox Agreement */}
          <label className="flex items-start gap-3 cursor-pointer group select-none">
            <input
              type="checkbox"
              checked={hasAgreed}
              onChange={(e) => {
                sound?.playClick?.();
                setHasAgreed(e.target.checked);
              }}
              className="mt-1 w-4 h-4 rounded border-2 border-[#8B7355] text-[#1F1A14] focus:ring-0 focus:outline-none cursor-pointer accent-[#2E2319]"
            />
            <span className="text-xs sm:text-sm font-mono text-[#2E2319] leading-tight">
              <strong>I HAVE READ AND AGREE</strong> to the Broker Desk Protocol Terms. I understand that rewards/APY are <strong>NOT guaranteed</strong> and that activation and boost fees are <strong>strictly non-refundable</strong>.
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <button
              type="button"
              disabled={!hasAgreed}
              onClick={handleAgreeAndProceed}
              className={`w-full sm:flex-1 py-3 px-5 font-pixel text-xs sm:text-sm font-extrabold uppercase rounded border-2 transition-all shadow-[3px_3px_0px_#000] ${
                hasAgreed
                  ? 'bg-[#1E1914] hover:bg-black text-[#FAF6EE] border-[#1E1914] cursor-pointer hover:shadow-[4px_4px_0px_#000]'
                  : 'bg-[#D8CEBE] text-[#7A6C58] border-[#B8AA94] cursor-not-allowed opacity-60'
              }`}
            >
              [ I AGREE & ENTER BROKER DESK ]
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full sm:w-auto py-3 px-4 font-mono text-xs text-[#63513D] hover:text-black hover:underline transition-colors"
            >
              Close Notice
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
