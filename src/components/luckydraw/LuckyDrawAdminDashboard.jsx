import React, { useState } from 'react';
import { formatEther } from 'viem';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { useEthPrice } from '../../hooks/useEthPrice';

export function LuckyDrawAdminDashboard({
  draws,
  totalDraws,
  availableTicketRevenue,
  onBackToTerminal,
  onCreateDraw,
  onSelectWinnerRandom,
  onSelectWinnerManual,
  onUpdatePrizeStatus,
  onClaimAllRevenue,
}) {
  const { ethPrice } = useEthPrice();
  const [activeTab, setActiveTab] = useState('active'); // 'create' | 'active' | 'winners' | 'revenue'

  // Create Draw Form State
  const [formData, setFormData] = useState({
    title: '',
    prizeDescription: '',
    prizeCategory: 0, // 0: Physical, 1: ETH, 2: Token, 3: NFT, 4: Custom
    imageUrl: '',
    ticketPriceApe: '50000',
    maxTickets: '100',
    maxTicketsPerWallet: '10',
    minNftRequired: '1',
    durationDays: '2',
  });
  const [imagePreview, setImagePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual Winner Modal State
  const [manualModal, setManualModal] = useState({
    isOpen: false,
    drawId: null,
    drawTitle: '',
    winnerAddress: '',
  });

  // Prize Status Update State
  const [fulfillmentInputs, setFulfillmentInputs] = useState({});

  // Image upload handler
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData((prev) => ({ ...prev, imageUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.prizeDescription) {
      alert('Please fill out the draw title and prize description.');
      return;
    }
    sound?.playClick?.();
    setIsSubmitting(true);
    try {
      await onCreateDraw(formData);
      sound?.playSuccess?.();
      confetti({ particleCount: 60, spread: 60 });
      alert('Lucky Draw created successfully!');
      setActiveTab('active');
    } catch (err) {
      sound?.playError?.();
      alert('Failed to create draw: ' + (err.message || 'Transaction rejected.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRandomDraw = async (drawId) => {
    if (!confirm(`Execute on-chain RANDOM winner selection for Draw #${drawId}? Winner selection is irreversible.`)) {
      return;
    }
    sound?.playClick?.();
    try {
      await onSelectWinnerRandom(drawId);
      sound?.playSuccess?.();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    } catch (err) {
      sound?.playError?.();
      alert('Random selection failed: ' + err.message);
    }
  };

  const handleManualDrawSubmit = async () => {
    if (!manualModal.winnerAddress || !manualModal.winnerAddress.startsWith('0x')) {
      alert('Please enter a valid EVM address that holds at least 1 ticket.');
      return;
    }
    sound?.playClick?.();
    try {
      await onSelectWinnerManual(manualModal.drawId, manualModal.winnerAddress);
      sound?.playSuccess?.();
      setManualModal({ isOpen: false, drawId: null, drawTitle: '', winnerAddress: '' });
      confetti({ particleCount: 80, spread: 70 });
    } catch (err) {
      sound?.playError?.();
      alert('Manual selection failed: ' + err.message);
    }
  };

  const handleStatusUpdate = async (drawId, newStatus) => {
    sound?.playClick?.();
    const proof = fulfillmentInputs[drawId] || '';
    try {
      await onUpdatePrizeStatus(drawId, Number(newStatus), proof);
      sound?.playSuccess?.();
      alert('Prize status updated successfully!');
    } catch (err) {
      sound?.playError?.();
      alert('Status update failed: ' + err.message);
    }
  };

  const handleClaimRevenue = async () => {
    sound?.playClick?.();
    try {
      await onClaimAllRevenue();
      sound?.playSuccess?.();
      confetti({ particleCount: 80, spread: 70 });
      alert('All ticket revenue claimed successfully to treasury!');
    } catch (err) {
      sound?.playError?.();
      alert('Revenue claim failed: ' + err.message);
    }
  };

  const activeDraws = draws.filter((d) => d.status === 0 || d.status === 1);
  const completedDraws = draws.filter((d) => d.status === 2);

  const totalRevenueApe = draws.reduce((acc, d) => acc + (d.totalRevenueCollected || 0n), 0n);
  const apePriceUsd = 0.00000411;
  const totalRevenueUsd = Number(formatEther(totalRevenueApe)) * apePriceUsd;

  return (
    <div className="space-y-6 select-none font-pixel text-white">
      {/* Header Bar */}
      <div className="bg-[#12072e] border-3 border-[#FFD700] rounded-xl p-4 sm:p-6 shadow-[6px_6px_0px_#000] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFD700] animate-pulse" />
              <span className="text-[10px] font-mono text-[#FFD700] uppercase tracking-wider font-extrabold">
                ADMIN CONSOLE • ROBINHOOD EVM
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#FFD700] tracking-wider uppercase">
              LUCKY DRAW ADMIN DASHBOARD
            </h1>
            <p className="text-xs font-mono text-gray-300">
              Create custom prize raffles, execute on-chain winner draws (Random vs Manual), track prize fulfillment, and claim ticket revenue.
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleClaimRevenue}
              className="pixel-btn pixel-btn-vibrant-gold px-3.5 py-2 text-xs font-extrabold rounded-lg shadow-[3px_3px_0px_#000] flex items-center gap-1.5"
            >
              <span>💰</span>
              <span>CLAIM REVENUE (${totalRevenueUsd.toFixed(2)})</span>
            </button>

            <button
              type="button"
              onClick={onBackToTerminal}
              className="pixel-btn pixel-btn-black px-3.5 py-2 text-xs font-bold text-[#00FF66] hover:bg-[#150a36] rounded-lg border border-[#00FF66] shadow-[2px_2px_0px_#000]"
            >
              [ ← USER TERMINAL ]
            </button>
          </div>
        </div>

        {/* HUD Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-4 border-t border-purple-900/50 font-mono">
          <div className="bg-black/50 border border-purple-800 p-3 rounded-lg">
            <div className="text-[9px] text-gray-400 uppercase">ACTIVE DRAWS</div>
            <div className="text-lg font-bold text-[#00FF66] mt-0.5">{activeDraws.length} Active</div>
            <div className="text-[9px] text-gray-400">Open for tickets</div>
          </div>

          <div className="bg-black/50 border border-purple-800 p-3 rounded-lg">
            <div className="text-[9px] text-gray-400 uppercase">WINNERS DRAWN</div>
            <div className="text-lg font-bold text-[#00F0FF] mt-0.5">{completedDraws.length} Draws</div>
            <div className="text-[9px] text-gray-400">Prizes being fulfilled</div>
          </div>

          <div className="bg-black/50 border border-purple-800 p-3 rounded-lg">
            <div className="text-[9px] text-gray-400 uppercase">TICKET REVENUE</div>
            <div className="text-lg font-bold text-[#FFD700] mt-0.5">
              ${totalRevenueUsd.toFixed(2)} USD
            </div>
            <div className="text-[9px] text-[#FFD700]">
              {(Number(formatEther(totalRevenueApe)) / 1e6).toFixed(2)}M $APE
            </div>
          </div>

          <div className="bg-black/50 border border-purple-800 p-3 rounded-lg">
            <div className="text-[9px] text-gray-400 uppercase">CLAIMABLE REVENUE</div>
            <div className="text-lg font-bold text-[#00FF66] mt-0.5">
              100% Claimable
            </div>
            <div className="text-[9px] text-gray-400">To protocol treasury</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b-2 border-purple-900/60 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            sound?.playClick?.();
            setActiveTab('active');
          }}
          className={`px-4 py-2 text-xs font-bold rounded-lg border-2 transition-all flex items-center gap-1.5 whitespace-nowrap shadow-[2px_2px_0px_#000] ${
            activeTab === 'active'
              ? 'bg-[#00FF66] text-black border-[#00FF66]'
              : 'bg-[#12072e] text-gray-300 border-purple-900 hover:border-gray-500'
          }`}
        >
          <span>🎯</span>
          <span>ACTIVE DRAWS ({activeDraws.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound?.playClick?.();
            setActiveTab('create');
          }}
          className={`px-4 py-2 text-xs font-bold rounded-lg border-2 transition-all flex items-center gap-1.5 whitespace-nowrap shadow-[2px_2px_0px_#000] ${
            activeTab === 'create'
              ? 'bg-[#FFD700] text-black border-[#FFD700]'
              : 'bg-[#12072e] text-gray-300 border-purple-900 hover:border-gray-500'
          }`}
        >
          <span>➕</span>
          <span>CREATE DRAW WIZARD</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound?.playClick?.();
            setActiveTab('winners');
          }}
          className={`px-4 py-2 text-xs font-bold rounded-lg border-2 transition-all flex items-center gap-1.5 whitespace-nowrap shadow-[2px_2px_0px_#000] ${
            activeTab === 'winners'
              ? 'bg-[#00F0FF] text-black border-[#00F0FF]'
              : 'bg-[#12072e] text-gray-300 border-purple-900 hover:border-gray-500'
          }`}
        >
          <span>🏆</span>
          <span>WINNERS & PRIZE FULFILLMENT ({completedDraws.length})</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE DRAWS & WINNER SELECTION */}
      {activeTab === 'active' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-[#00FF66] tracking-wider uppercase">
              ACTIVE PRIZE DRAWS ({activeDraws.length})
            </h2>
            <span className="text-[10px] font-mono text-gray-400">
              Admin controls: Execute Random Draw or Select Manual Winner
            </span>
          </div>

          {activeDraws.length === 0 ? (
            <div className="bg-[#12072e] border-2 border-purple-900 p-8 rounded-xl text-center space-y-3 font-mono">
              <div className="text-gray-400 text-sm">No active draws currently running.</div>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="pixel-btn pixel-btn-vibrant-gold px-4 py-2 text-xs font-bold rounded-lg"
              >
                [ + CREATE FIRST LUCKY DRAW ]
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeDraws.map((draw) => {
                const sold = draw.totalTicketsSold;
                const max = draw.maxTickets || 100;
                const pct = Math.min(100, Math.round((sold / max) * 100));
                const revApe = Number(formatEther(draw.totalRevenueCollected));
                const revUsd = revApe * apePriceUsd;

                return (
                  <div
                    key={draw.drawId}
                    className="bg-[#140833] border-2 border-purple-800 hover:border-[#00FF66] rounded-xl p-5 shadow-[4px_4px_0px_#000] space-y-4 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={draw.imageUrl}
                        alt={draw.title}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover border border-purple-700 shrink-0 bg-black"
                      />
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-[#FFD700] text-black text-[9px] font-extrabold">
                            DRAW #{draw.drawId}
                          </span>
                          <span className="text-[10px] font-mono text-cyan-300">
                            {draw.prizeCategory === 0 ? 'PHYSICAL' : draw.prizeCategory === 1 ? 'ETH' : draw.prizeCategory === 2 ? 'TOKEN' : 'NFT'}
                          </span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2">
                          {draw.title}
                        </h3>
                        <p className="text-[10px] font-mono text-gray-300 line-clamp-2">
                          {draw.prizeDescription}
                        </p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1 font-mono text-xs">
                      <div className="flex justify-between text-[10px] text-gray-300">
                        <span>Tickets Sold:</span>
                        <span className="font-bold text-[#00FF66]">
                          {sold} / {draw.maxTickets > 0 ? draw.maxTickets : '∞'} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-purple-900">
                        <div
                          className="h-full bg-gradient-to-r from-[#00F0FF] to-[#00FF66]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 pt-1">
                        <span>Revenue Collected:</span>
                        <span className="text-[#FFD700] font-bold">
                          ${revUsd.toFixed(2)} USD ({revApe.toLocaleString()} $APE)
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons for Winner Selection */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-900/60">
                      <button
                        type="button"
                        onClick={() => handleRandomDraw(draw.drawId)}
                        className="pixel-btn pixel-btn-vibrant-lime py-2 px-2 text-[10px] sm:text-xs font-extrabold rounded-lg shadow-[2px_2px_0px_#000] text-center"
                        title="Contract selects random winner using on-chain seed"
                      >
                        [ 🎲 RANDOM DRAW ]
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setManualModal({
                            isOpen: true,
                            drawId: draw.drawId,
                            drawTitle: draw.title,
                            winnerAddress: '',
                          })
                        }
                        className="pixel-btn pixel-btn-vibrant-gold py-2 px-2 text-[10px] sm:text-xs font-extrabold rounded-lg shadow-[2px_2px_0px_#000] text-center"
                        title="Pick a specific ticket holder wallet"
                      >
                        [ ✍️ MANUAL PICK ]
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: CREATE DRAW WIZARD */}
      {activeTab === 'create' && (
        <section className="bg-[#12072e] border-3 border-[#FFD700] rounded-xl p-5 sm:p-7 shadow-[6px_6px_0px_#000] space-y-6">
          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-extrabold text-[#FFD700] tracking-wider uppercase flex items-center gap-2">
              <span>➕</span>
              <span>LAUNCH NEW CUSTOM LUCKY DRAW</span>
            </h2>
            <p className="text-xs font-mono text-gray-300">
              Create a raffle for any prize (PS5, ETH, Tokens, NFTs, Merch). Prizes are fulfilled externally by the admin once a winner is chosen.
            </p>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-5 font-mono text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 font-bold mb-1 uppercase text-[10px]">
                    Draw Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sony PlayStation 5 Disc Edition"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-black/60 border border-purple-800 focus:border-[#FFD700] text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1 uppercase text-[10px]">
                    Prize Category *
                  </label>
                  <select
                    value={formData.prizeCategory}
                    onChange={(e) => setFormData({ ...formData, prizeCategory: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-lg bg-black/60 border border-purple-800 focus:border-[#FFD700] text-white focus:outline-none"
                  >
                    <option value={0}>Physical Product (PS5, Electronics, Merch)</option>
                    <option value={1}>Native ETH (Direct Crypto Transfer)</option>
                    <option value={2}>$APEBROKE Token Bundle</option>
                    <option value={3}>Ape Broker NFT</option>
                    <option value={4}>Custom / Whitelist / Syndicate Role</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1 uppercase text-[10px]">
                    Prize Description & Fulfillment Details *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe the prize specs, shipping conditions, or on-chain transfer details."
                    value={formData.prizeDescription}
                    onChange={(e) => setFormData({ ...formData, prizeDescription: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-black/60 border border-purple-800 focus:border-[#FFD700] text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1 uppercase text-[10px]">
                      Ticket Price ($APEBROKE) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.ticketPriceApe}
                      onChange={(e) => setFormData({ ...formData, ticketPriceApe: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-purple-800 focus:border-[#FFD700] text-white focus:outline-none"
                    />
                    <span className="text-[9px] text-[#00FF66] mt-0.5 block">
                      ≈ ${(Number(formData.ticketPriceApe || 0) * apePriceUsd).toFixed(2)} USD
                    </span>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1 uppercase text-[10px]">
                      Duration (Days) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="30"
                      value={formData.durationDays}
                      onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-purple-800 focus:border-[#FFD700] text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Image Upload & Limits */}
              <div className="space-y-4">
                {/* Image Upload Box */}
                <div>
                  <label className="block text-gray-300 font-bold mb-1 uppercase text-[10px]">
                    Prize Image Upload / URL *
                  </label>
                  
                  <div className="border-2 border-dashed border-purple-700 hover:border-[#FFD700] rounded-xl p-4 text-center space-y-2 bg-black/40">
                    {imagePreview || formData.imageUrl ? (
                      <div className="relative inline-block">
                        <img
                          src={imagePreview || formData.imageUrl}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-lg border-2 border-[#FFD700] mx-auto shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview('');
                            setFormData((prev) => ({ ...prev, imageUrl: '' }));
                          }}
                          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-2xl">📸</span>
                        <div className="text-[11px] text-gray-300">
                          Click to select image file from desktop
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-[#FFD700] file:text-black cursor-pointer"
                        />
                      </div>
                    )}

                    <div className="pt-2 border-t border-purple-900/60">
                      <span className="text-[9px] text-gray-400 block mb-1">
                        OR PASTE DIRECT IMAGE URL:
                      </span>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={formData.imageUrl}
                        onChange={(e) => {
                          setImagePreview(e.target.value);
                          setFormData({ ...formData, imageUrl: e.target.value });
                        }}
                        className="w-full px-2.5 py-1.5 text-[10px] rounded bg-black/80 border border-purple-800 text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1 uppercase text-[10px]">
                      Max Tickets Total (0=Uncapped)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maxTickets}
                      onChange={(e) => setFormData({ ...formData, maxTickets: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-purple-800 focus:border-[#FFD700] text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1 uppercase text-[10px]">
                      Max Per Wallet (0=Uncapped)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maxTicketsPerWallet}
                      onChange={(e) => setFormData({ ...formData, maxTicketsPerWallet: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-purple-800 focus:border-[#FFD700] text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1 uppercase text-[10px]">
                    Min Ape Broker NFTs Required
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minNftRequired}
                    onChange={(e) => setFormData({ ...formData, minNftRequired: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-purple-800 focus:border-[#FFD700] text-white focus:outline-none"
                  />
                  <span className="text-[9px] text-gray-400 mt-0.5 block">
                    Default 1 Ape Broker NFT (Enforces exclusive holder gating)
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-purple-900/60 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className="px-4 py-2.5 text-xs font-bold text-gray-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="pixel-btn pixel-btn-vibrant-gold px-6 py-2.5 text-xs font-extrabold rounded-lg shadow-[3px_3px_0px_#000] disabled:opacity-50"
              >
                {isSubmitting ? '[ LAUNCHING DRAW... ]' : '[ 🚀 LAUNCH LUCKY DRAW ]'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* TAB 3: WINNERS & PRIZE FULFILLMENT TRACKER */}
      {activeTab === 'winners' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-[#00F0FF] tracking-wider uppercase">
              WINNERS & PRIZE DISTRIBUTION PIPELINE ({completedDraws.length})
            </h2>
            <span className="text-[10px] font-mono text-gray-400">
              Contract records who won; Admin fulfills prizes and updates status
            </span>
          </div>

          {completedDraws.length === 0 ? (
            <div className="bg-[#12072e] border-2 border-purple-900 p-8 rounded-xl text-center font-mono text-gray-400">
              No completed draws yet. Once a winner is drawn, their fulfillment card will appear here.
            </div>
          ) : (
            <div className="space-y-4">
              {completedDraws.map((draw) => {
                const statusNames = ['PENDING', 'WINNER CONTACTED', 'PRIZE SENT', 'COMPLETED'];
                const statusColors = ['text-yellow-400', 'text-cyan-400', 'text-purple-400', 'text-[#00FF66]'];
                const currentStatus = draw.prizeStatus || 0;

                return (
                  <div
                    key={draw.drawId}
                    className="bg-[#140833] border-2 border-cyan-800 rounded-xl p-5 shadow-[4px_4px_0px_#000] space-y-4 font-mono"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-purple-900/60 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-[#00F0FF] text-black text-[10px] font-extrabold rounded">
                            DRAW #{draw.drawId}
                          </span>
                          <span className="text-xs font-bold text-white font-pixel">
                            {draw.title}
                          </span>
                          <span className="px-2 py-0.5 bg-black/60 border border-purple-700 text-[9px] text-gray-300 rounded">
                            {draw.selectionMode === 1 ? '🎲 RANDOM DRAW' : '✍️ MANUAL PICK'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-300">
                          Prize: <strong className="text-white">{draw.prizeDescription}</strong>
                        </p>
                      </div>

                      {/* Current Status Pill */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">STATUS:</span>
                        <span className={`text-xs font-extrabold uppercase px-2.5 py-1 rounded bg-black/60 border border-purple-700 ${statusColors[currentStatus]}`}>
                          {statusNames[currentStatus]}
                        </span>
                      </div>
                    </div>

                    {/* Winner Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-black/40 p-3.5 rounded-lg border border-purple-900/40">
                      <div>
                        <div className="text-[9px] text-gray-400 uppercase">WINNER WALLET</div>
                        <div className="text-[#00FF66] font-bold font-mono break-all mt-0.5">
                          {draw.winner}
                        </div>
                        {draw.winningTicketId > 0 && (
                          <div className="text-[9px] text-gray-400">
                            Winning Ticket: #{draw.winningTicketId}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-[9px] text-gray-400 uppercase">SELECTED BY ADMIN</div>
                        <div className="text-gray-300 font-mono break-all mt-0.5">
                          {draw.selectedByAdmin || 'Admin'}
                        </div>
                        <div className="text-[9px] text-gray-400">
                          {draw.selectedTimestamp ? new Date(draw.selectedTimestamp * 1000).toLocaleString() : ''}
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] text-gray-400 uppercase">PROOF / TRACKING</div>
                        <div className="text-cyan-300 font-mono break-all mt-0.5">
                          {draw.prizeFulfillmentProof || 'No proof recorded yet'}
                        </div>
                      </div>
                    </div>

                    {/* Status Update Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-[10px] text-gray-400 uppercase shrink-0">
                          UPDATE PIPELINE:
                        </span>
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusUpdate(draw.drawId, e.target.value)}
                          className="px-2.5 py-1.5 rounded bg-black/80 border border-purple-700 text-xs text-white focus:outline-none"
                        >
                          <option value={0}>0 - Pending Fulfillment</option>
                          <option value={1}>1 - Winner Contacted</option>
                          <option value={2}>2 - Prize Sent / Shipped</option>
                          <option value={3}>3 - Completed & Received</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          placeholder="Tracking #, FedEx/USPS, or Tx Hash"
                          value={fulfillmentInputs[draw.drawId] || ''}
                          onChange={(e) =>
                            setFulfillmentInputs({ ...fulfillmentInputs, [draw.drawId]: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded bg-black/80 border border-purple-700 text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(draw.drawId, currentStatus)}
                          className="pixel-btn pixel-btn-vibrant-lime px-3 py-1.5 text-[10px] font-bold shrink-0 rounded"
                        >
                          SAVE
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Manual Winner Selection Modal */}
      {manualModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#12072e] border-3 border-[#FFD700] rounded-xl p-5 shadow-[0_0_30px_rgba(255,215,0,0.3)] space-y-4 font-mono text-white">
            <div className="flex items-center justify-between border-b border-purple-800 pb-3">
              <h3 className="text-xs sm:text-sm font-bold text-[#FFD700] font-pixel">
                ✍️ SELECT MANUAL WINNER
              </h3>
              <button
                type="button"
                onClick={() => setManualModal({ isOpen: false, drawId: null, drawTitle: '', winnerAddress: '' })}
                className="text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-gray-300">
                Draw: <strong className="text-white">{manualModal.drawTitle}</strong>
              </div>
              <div className="bg-amber-950/80 border border-amber-600 p-2.5 rounded text-[10px] text-amber-200">
                ⚠️ <strong>Contract Requirement:</strong> The candidate address must have purchased at least 1 ticket for this specific draw. The smart contract will strictly revert if the address owns 0 tickets.
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1 text-[10px] uppercase">
                  Winner Wallet Address:
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={manualModal.winnerAddress}
                  onChange={(e) => setManualModal({ ...manualModal, winnerAddress: e.target.value.trim() })}
                  className="w-full px-3 py-2 rounded bg-black/80 border border-purple-700 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-purple-800">
              <button
                type="button"
                onClick={() => setManualModal({ isOpen: false, drawId: null, drawTitle: '', winnerAddress: '' })}
                className="px-3 py-2 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualDrawSubmit}
                className="pixel-btn pixel-btn-vibrant-gold px-4 py-2 text-xs font-bold rounded"
              >
                [ CONFIRM MANUAL WINNER ]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
