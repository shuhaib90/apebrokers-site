import React, { useState } from 'react';
import { formatEther, parseEther } from 'viem';
import { useWalletClient, usePublicClient } from 'wagmi';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { useEthPrice } from '../../hooks/useEthPrice';

export function LuckyDrawAdminDashboard({
  draws,
  totalDraws,
  availableTicketRevenue,
  onBackToTerminal,
  onCreateDraw,
  onSetTicketPrice,
  onSelectWinnerRandom,
  onSelectWinnerManual,
  onSelectWinnersManual,
  onUpdatePrizeStatus,
  onClaimAllRevenue,
  isPublicLocked = true,
  onTogglePublicLock,
  onCancelDraw,
  onDeleteDraw,
  onEditDraw,
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
    winnerCount: '1',
    noDeadline: false,
  });
  const [imagePreview, setImagePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Draw Modal State
  const [editModal, setEditModal] = useState({
    isOpen: false,
    drawId: null,
    title: '',
    prizeDescription: '',
    prizeCategory: 0,
    imageUrl: '',
    ticketPriceApe: '',
    maxTickets: '',
    maxTicketsPerWallet: '',
    minNftRequired: '1',
    durationDays: '2',
    noDeadline: false,
    isSubmitting: false,
  });

  // Customize Ticket Fee Modal State
  const [feeModal, setFeeModal] = useState({
    isOpen: false,
    drawId: null,
    drawTitle: '',
    currentPriceApe: '',
    newPriceApe: '',
  });

  // Manual Winner Modal State (supports custom multiple winners)
  const [manualModal, setManualModal] = useState({
    isOpen: false,
    drawId: null,
    drawTitle: '',
    winnerCount: 1,
    winnerAddresses: [''],
  });

  // Prize Status Update State
  const [fulfillmentInputs, setFulfillmentInputs] = useState({});

  // Direct Send / Copy State
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [copiedAddress, setCopiedAddress] = useState(null);

  const handleCopyAddress = (addr) => {
    if (!addr) return;
    navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    sound?.playClick?.();
    setTimeout(() => setCopiedAddress(null), 2500);
  };

  // Direct Send Crypto Modal State
  const [directSendModal, setDirectSendModal] = useState({
    isOpen: false,
    drawId: null,
    winnerAddress: '',
    drawTitle: '',
    prizeDescription: '',
    amount: '',
    assetType: 'ETH', // 'ETH' | 'APEBROKE'
    isSending: false,
  });

  const handleDirectSendCryptoSubmit = async (e) => {
    e?.preventDefault?.();
    if (!walletClient) {
      alert('Admin wallet not connected.');
      return;
    }
    const { winnerAddress, amount, assetType, drawId } = directSendModal;
    if (!winnerAddress || !amount || Number(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (!confirm(`Send ${amount} ${assetType} directly from your admin wallet to winner ${winnerAddress}?`)) {
      return;
    }

    sound?.playClick?.();
    setDirectSendModal((prev) => ({ ...prev, isSending: true }));
    try {
      let txHash = '';
      if (assetType === 'ETH') {
        txHash = await walletClient.sendTransaction({
          to: winnerAddress,
          value: parseEther(amount),
        });
      } else {
        // Transfer $APEBROKE token
        txHash = await walletClient.writeContract({
          address: '0xe0F384ebCede975342c5431aCad515b4A1B862cc',
          abi: [
            {
              name: 'transfer',
              type: 'function',
              stateMutability: 'nonpayable',
              inputs: [
                { name: 'to', type: 'address' },
                { name: 'amount', type: 'uint256' },
              ],
              outputs: [{ name: '', type: 'bool' }],
            },
          ],
          functionName: 'transfer',
          args: [winnerAddress, parseEther(amount)],
        });
      }

      if (publicClient && txHash) {
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      }

      // Automatically update prize status to PRIZE SENT with txHash proof on-chain
      await onUpdatePrizeStatus(drawId, 2, txHash);
      sound?.playSuccess?.();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      alert(`Success! ${amount} ${assetType} sent directly to winner. On-chain status updated to PRIZE SENT with tx hash proof: ${txHash}`);
      setDirectSendModal({
        isOpen: false,
        drawId: null,
        winnerAddress: '',
        drawTitle: '',
        prizeDescription: '',
        amount: '',
        assetType: 'ETH',
        isSending: false,
      });
    } catch (err) {
      sound?.playError?.();
      alert('Direct send failed: ' + (err.shortMessage || err.message));
      setDirectSendModal((prev) => ({ ...prev, isSending: false }));
    }
  };

  // Image compression and resize helper (keeps images crisp while staying lightweight)
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // Image upload handler
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedDataUrl = await compressImage(file);
        setImagePreview(compressedDataUrl);
        setFormData((prev) => ({ ...prev, imageUrl: compressedDataUrl }));
      } catch (err) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
          setFormData((prev) => ({ ...prev, imageUrl: reader.result }));
        };
        reader.readAsDataURL(file);
      }
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

  const handleSetTicketPriceSubmit = async () => {
    if (!feeModal.newPriceApe || Number(feeModal.newPriceApe) <= 0) {
      alert('Please enter a valid positive ticket price in $APEBROKE.');
      return;
    }
    sound?.playClick?.();
    try {
      await onSetTicketPrice(feeModal.drawId, feeModal.newPriceApe);
      sound?.playSuccess?.();
      confetti({ particleCount: 60, spread: 60 });
      alert(`Ticket fee for Draw #${feeModal.drawId} successfully updated to ${Number(feeModal.newPriceApe).toLocaleString()} $APEBROKE!`);
      setFeeModal({ isOpen: false, drawId: null, drawTitle: '', currentPriceApe: '', newPriceApe: '' });
    } catch (err) {
      sound?.playError?.();
      alert('Failed to update ticket fee: ' + (err.message || 'Transaction rejected.'));
    }
  };

  const handleDeleteDraw = async (drawId, title) => {
    if (
      !confirm(
        `Are you sure you want to delete / cancel Draw #${drawId} ("${title}")?\n\nIf tickets were purchased, participants can claim their refunds on-chain.`
      )
    ) {
      return;
    }
    sound?.playClick?.();
    try {
      if (onDeleteDraw) {
        await onDeleteDraw(drawId);
      } else if (onCancelDraw) {
        await onCancelDraw(drawId, 'Cancelled by admin');
      }
      sound?.playSuccess?.();
      alert(`Draw #${drawId} deleted successfully!`);
    } catch (err) {
      sound?.playError?.();
      alert('Failed to delete draw: ' + (err.message || 'Error occurred.'));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editModal.title || !editModal.prizeDescription) {
      alert('Please fill out the draw title and prize description.');
      return;
    }
    sound?.playClick?.();
    setEditModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      if (onEditDraw) {
        await onEditDraw(editModal.drawId, {
          title: editModal.title,
          prizeDescription: editModal.prizeDescription,
          prizeCategory: Number(editModal.prizeCategory),
          imageUrl: editModal.imageUrl,
          ticketPriceApe: editModal.ticketPriceApe,
          maxTickets: Number(editModal.maxTickets || 0),
          maxTicketsPerWallet: Number(editModal.maxTicketsPerWallet || 0),
          minNftRequired: Number(editModal.minNftRequired || 1),
          durationDays: Number(editModal.durationDays || 2),
          noDeadline: Boolean(editModal.noDeadline),
        });
      }
      sound?.playSuccess?.();
      alert(`Draw #${editModal.drawId} updated successfully!`);
      setEditModal((prev) => ({ ...prev, isOpen: false, isSubmitting: false }));
    } catch (err) {
      sound?.playError?.();
      alert('Failed to update draw: ' + (err.message || 'Error occurred.'));
      setEditModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleRandomDraw = async (drawId) => {
    const targetDraw = draws.find((d) => d.drawId === drawId);
    const count = targetDraw?.winnerCount || 1;
    if (
      !confirm(
        `Execute on-chain RANDOM winner selection for Draw #${drawId}? Mode 1 will pick ${count} unique winner${count > 1 ? 's' : ''} proportionally from ticket holders. Selection is irreversible.`
      )
    ) {
      return;
    }
    sound?.playClick?.();
    try {
      await onSelectWinnerRandom(drawId);
      sound?.playSuccess?.();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      alert(`Random draw executed successfully! ${count} winner${count > 1 ? 's' : ''} recorded on-chain.`);
    } catch (err) {
      sound?.playError?.();
      alert('Random selection failed: ' + err.message);
    }
  };

  const handleManualDrawSubmit = async () => {
    // Filter and sanitize addresses
    const cleaned = manualModal.winnerAddresses
      .map((a) => a.trim().toLowerCase())
      .filter((a) => a.length > 0);

    if (cleaned.length === 0) {
      alert('Please enter at least 1 valid EVM wallet address.');
      return;
    }

    // Validate format
    for (let i = 0; i < cleaned.length; i++) {
      const addr = cleaned[i];
      if (!addr.startsWith('0x') || addr.length !== 42) {
        alert(`Invalid EVM address for Winner #${i + 1}: ${addr}. Must start with 0x and have 42 characters.`);
        return;
      }
    }

    // Check duplicate addresses
    const set = new Set(cleaned);
    if (set.size !== cleaned.length) {
      alert('Duplicate winner addresses detected. Each candidate winner must have a unique wallet address.');
      return;
    }

    // Check count against draw winnerCount
    if (cleaned.length > manualModal.winnerCount) {
      alert(`Cannot select more than ${manualModal.winnerCount} winners for this draw.`);
      return;
    }

    sound?.playClick?.();
    try {
      if (onSelectWinnersManual) {
        await onSelectWinnersManual(manualModal.drawId, cleaned);
      } else {
        await onSelectWinnerManual(manualModal.drawId, cleaned[0]);
      }
      sound?.playSuccess?.();
      setManualModal({ isOpen: false, drawId: null, drawTitle: '', winnerCount: 1, winnerAddresses: [''] });
      confetti({ particleCount: 80, spread: 70 });
      alert(`Manual selection confirmed! ${cleaned.length} winner${cleaned.length > 1 ? 's' : ''} recorded on-chain.`);
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
            {/* Public Access Lock Toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-[#FFD700] rounded-lg">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isPublicLocked ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                <span className="text-[10px] font-mono text-gray-300">PUBLIC ACCESS:</span>
                <span className={`text-[10px] font-mono font-extrabold ${isPublicLocked ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {isPublicLocked ? '[ LOCKED ]' : '[ OPEN ]'}
                </span>
              </div>
              {onTogglePublicLock && (
                <button
                  type="button"
                  onClick={() => {
                    sound?.playClick?.();
                    onTogglePublicLock(!isPublicLocked);
                  }}
                  className={`pixel-btn px-2 py-0.5 text-[9px] font-bold rounded ${
                    isPublicLocked
                      ? 'pixel-btn-vibrant-lime text-black'
                      : 'pixel-btn-black text-amber-300 border border-amber-500'
                  }`}
                  title={isPublicLocked ? 'Unlock Lucky Draw for public users' : 'Lock Lucky Draw for public users'}
                >
                  {isPublicLocked ? '[ UNLOCK FOR PUBLIC ]' : '[ LOCK FOR PUBLIC ]'}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleClaimRevenue}
              className="pixel-btn pixel-btn-vibrant-gold px-3.5 py-2 text-xs font-extrabold rounded-lg shadow-[3px_3px_0px_#000] flex items-center gap-1.5"
            >
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
                          <span className="px-1.5 py-0.5 rounded bg-purple-900/80 border border-purple-500 text-[#00F0FF] text-[9px] font-bold">
                            {draw.winnerCount || 1} WINNER{(draw.winnerCount || 1) > 1 ? 'S' : ''}
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
                      <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-purple-800">
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

                    {/* Ticket Fee & Dynamic Customization */}
                    <div className="flex items-center justify-between text-[10px] bg-black/40 px-2.5 py-1.5 rounded border border-purple-900/60 font-mono">
                      <span className="text-gray-400">Ticket Fee:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#FFD700]">
                          {Number(formatEther(draw.ticketPriceApe)).toLocaleString()} $APE
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            sound?.playClick?.();
                            const currentApe = Number(formatEther(draw.ticketPriceApe));
                            setFeeModal({
                              isOpen: true,
                              drawId: draw.drawId,
                              drawTitle: draw.title,
                              currentPriceApe: currentApe.toString(),
                              newPriceApe: currentApe.toString(),
                            });
                          }}
                          className="px-2 py-0.5 rounded bg-[#00F0FF]/20 hover:bg-[#00F0FF]/40 text-[#00F0FF] text-[9px] font-bold border border-[#00F0FF]/60 transition-colors flex items-center gap-1 shadow-[1px_1px_0px_#000]"
                          title="Admin can customize / update the ticket fee for this active draw"
                        >
                          <span>CUSTOMIZE FEE</span>
                        </button>
                      </div>
                    </div>

                    {/* Duration / Deadline Status */}
                    {(() => {
                      const isNoDead = Boolean(draw.noDeadline || (draw.endTime - draw.startTime >= 180 * 86400));
                      return (
                        <div className="flex items-center justify-between text-[10px] bg-black/40 px-2.5 py-1.5 rounded border border-purple-900/60 font-mono">
                          <span className="text-gray-400">Deadline:</span>
                          {isNoDead ? (
                            <span className="text-[#00FF66] font-bold flex items-center gap-1">
                              <span>NO DEADLINE (OPEN UNTIL DRAWN)</span>
                            </span>
                          ) : (
                            <span className="text-cyan-300 font-mono">
                              {draw.endTime * 1000 > Date.now()
                                ? `Ends in ${Math.max(1, Math.ceil((draw.endTime * 1000 - Date.now()) / 86400000))}d`
                                : 'EXPIRED / READY TO DRAW'}
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Winner Selection Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-900/60">
                      <button
                        type="button"
                        onClick={() => handleRandomDraw(draw.drawId)}
                        className="pixel-btn pixel-btn-vibrant-lime py-2 px-2 text-[10px] sm:text-xs font-extrabold rounded-lg shadow-[2px_2px_0px_#000] text-center"
                        title={`Contract selects ${draw.winnerCount || 1} random unique winner(s) using on-chain seed`}
                      >
                        [ RANDOM DRAW {draw.winnerCount > 1 ? `(${draw.winnerCount})` : ''} ]
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const wCount = draw.winnerCount || 1;
                          setManualModal({
                            isOpen: true,
                            drawId: draw.drawId,
                            drawTitle: draw.title,
                            winnerCount: wCount,
                            winnerAddresses: new Array(wCount).fill(''),
                          });
                        }}
                        className="pixel-btn pixel-btn-vibrant-gold py-2 px-2 text-[10px] sm:text-xs font-extrabold rounded-lg shadow-[2px_2px_0px_#000] text-center"
                        title={`Pick ${draw.winnerCount || 1} specific ticket holder wallet(s)`}
                      >
                        [ MANUAL PICK {draw.winnerCount > 1 ? `(${draw.winnerCount})` : ''} ]
                      </button>
                    </div>

                    {/* Admin Edit & Delete Options */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-900/40">
                      <button
                        type="button"
                        onClick={() => {
                          sound?.playClick?.();
                          const currentApe = Number(formatEther(draw.ticketPriceApe));
                          const isNoDead = Boolean(draw.noDeadline || (draw.endTime - draw.startTime >= 180 * 86400));
                          setEditModal({
                            isOpen: true,
                            drawId: draw.drawId,
                            title: draw.title || '',
                            prizeDescription: draw.prizeDescription || '',
                            prizeCategory: draw.prizeCategory !== undefined ? Number(draw.prizeCategory) : 0,
                            imageUrl: draw.imageUrl || '',
                            ticketPriceApe: currentApe.toString(),
                            maxTickets: String(draw.maxTickets || 0),
                            maxTicketsPerWallet: String(draw.maxTicketsPerWallet || 0),
                            minNftRequired: String(draw.minNftRequired || 1),
                            durationDays: String(draw.durationDays || 2),
                            noDeadline: isNoDead,
                            isSubmitting: false,
                          });
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900/90 text-blue-300 hover:text-white border border-blue-600/80 text-[10px] font-bold flex items-center justify-center gap-1.5 shadow-[1px_1px_0px_#000] transition-colors"
                      >
                        <span>EDIT DRAW</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDraw(draw.drawId, draw.title)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900/90 text-red-300 hover:text-white border border-red-600/80 text-[10px] font-bold flex items-center justify-center gap-1.5 shadow-[1px_1px_0px_#000] transition-colors"
                      >
                        <span>DELETE DRAW</span>
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
                      Ticket Fee ($APEBROKE) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.ticketPriceApe}
                      onChange={(e) => setFormData({ ...formData, ticketPriceApe: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-purple-800 focus:border-[#FFD700] text-white focus:outline-none"
                    />
                    <div className="flex items-center justify-between text-[9px] text-[#00FF66] mt-0.5">
                      <span>≈ ${(Number(formData.ticketPriceApe || 0) * apePriceUsd).toFixed(2)} USD</span>
                      <span className="text-gray-400 font-mono">
                        Max Pool: ${(Number(formData.ticketPriceApe || 0) * Number(formData.maxTickets || 100) * apePriceUsd).toFixed(1)}
                      </span>
                    </div>
                    {/* Quick Fee Presets */}
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <span className="text-[9px] text-gray-400">Presets:</span>
                      {['10000', '25000', '50000', '100000', '250000'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            sound?.playClick?.();
                            setFormData((prev) => ({ ...prev, ticketPriceApe: preset }));
                          }}
                          className={`px-1.5 py-0.5 text-[9px] rounded font-bold border ${
                            formData.ticketPriceApe === preset
                              ? 'bg-[#FFD700] text-black border-[#FFD700]'
                              : 'bg-black/60 text-gray-300 border-purple-800 hover:border-gray-500'
                          }`}
                        >
                          {Number(preset) >= 1000 ? `${Number(preset) / 1000}K` : preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-gray-300 font-bold uppercase text-[10px]">
                        Duration *
                      </label>
                      <label className="inline-flex items-center gap-1 cursor-pointer bg-black/50 px-2 py-0.5 rounded border border-purple-800 hover:border-[#00FF66]">
                        <input
                          type="checkbox"
                          checked={formData.noDeadline}
                          onChange={(e) => {
                            sound?.playClick?.();
                            setFormData((prev) => ({ ...prev, noDeadline: e.target.checked }));
                          }}
                          className="accent-[#00FF66] w-3 h-3 cursor-pointer rounded"
                        />
                        <span className={`text-[10px] font-bold font-mono ${formData.noDeadline ? 'text-[#00FF66]' : 'text-gray-400'}`}>
                          NO DEADLINE
                        </span>
                      </label>
                    </div>
                    {formData.noDeadline ? (
                      <div className="px-3 py-2 rounded-lg bg-[#00FF66]/10 border border-[#00FF66]/50 text-[#00FF66] text-[10px] font-mono flex items-center gap-1.5">
                        <span>Open indefinitely until Admin manually triggers draw</span>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="number"
                          required={!formData.noDeadline}
                          min="1"
                          max="365"
                          placeholder="e.g. 2"
                          value={formData.durationDays}
                          onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-black/60 border border-purple-800 focus:border-[#FFD700] text-white focus:outline-none"
                        />
                        <span className="absolute right-3 top-2 text-gray-400 text-[10px]">Days</span>
                      </div>
                    )}
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
                        placeholder={formData.imageUrl?.startsWith('data:') ? 'Image file selected (stored off-chain)' : 'https://...'}
                        value={formData.imageUrl?.startsWith('data:') ? '' : (formData.imageUrl || '')}
                        onChange={(e) => {
                          setImagePreview(e.target.value);
                          setFormData({ ...formData, imageUrl: e.target.value });
                        }}
                        className="w-full px-2.5 py-1.5 text-[10px] rounded bg-black/80 border border-purple-800 text-white focus:outline-none"
                      />
                      {formData.imageUrl?.startsWith('data:') && (
                        <div className="text-[9px] text-[#00FF66] font-mono mt-1 text-left">
                          ✓ Image file attached (stored off-chain)
                        </div>
                      )}
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-bold mb-1 uppercase text-[10px]">
                      Min NFTs Required
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.minNftRequired}
                      onChange={(e) => setFormData({ ...formData, minNftRequired: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-purple-800 focus:border-[#FFD700] text-white focus:outline-none"
                    />
                    <span className="text-[9px] text-gray-400 mt-0.5 block">
                      Default 1 NFT
                    </span>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-bold mb-1 uppercase text-[10px] flex items-center justify-between">
                      <span>Winners Count *</span>
                      <span className="text-[#FFD700] font-bold">{formData.winnerCount || 1}</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      required
                      value={formData.winnerCount}
                      onChange={(e) => setFormData({ ...formData, winnerCount: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-purple-800 focus:border-[#FFD700] text-white focus:outline-none font-bold"
                    />
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {['1', '2', '3', '5', '10'].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => {
                            sound?.playClick?.();
                            setFormData((prev) => ({ ...prev, winnerCount: cnt }));
                          }}
                          className={`px-1.5 py-0.5 text-[9px] rounded font-bold border ${
                            String(formData.winnerCount) === cnt
                              ? 'bg-[#00F0FF] text-black border-[#00F0FF]'
                              : 'bg-black/60 text-gray-300 border-purple-800 hover:border-gray-500'
                          }`}
                        >
                          {cnt}W
                        </button>
                      ))}
                    </div>
                  </div>
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
                {isSubmitting ? '[ LAUNCHING DRAW... ]' : '[ LAUNCH LUCKY DRAW ]'}
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

          {/* Explicit Architecture Principle Banner */}
          <div className="bg-[#190938] border-2 border-amber-500 rounded-xl p-4 space-y-1.5 font-mono shadow-[3px_3px_0px_#000]">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs sm:text-sm">
              <span>ADMIN DIRECT PRIZE DELIVERY — NO CONTRACT AUTO-DISTRIBUTIONS</span>
            </div>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              <strong>Protocol Architecture:</strong> The Lucky Draw smart contract <em>only manages ticket pricing and conducts the draw</em>. It does <strong>not automatically send rewards</strong> to winners. As the admin, you can see each winner's address and details below, and <strong>directly send the prize</strong> to their wallet or dispatch physical goods, then record the transaction hash or tracking code on-chain.
            </p>
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
                            {draw.selectionMode === 1 ? 'RANDOM DRAW' : 'MANUAL PICK'}
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

                    {/* Winner(s) List Section */}
                    {(() => {
                      const allWinners = (draw.winners && draw.winners.length > 0)
                        ? draw.winners
                        : (draw.winner && draw.winner !== '0x0000000000000000000000000000000000000000' ? [draw.winner] : []);
                      const winningTicketIds = draw.winningTicketIds || [];

                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-[11px] font-bold text-gray-300">
                            <span className="flex items-center gap-2">
                              <span className="text-[#FFD700]">OFFICIAL WINNERS ({allWinners.length})</span>
                              <span className="px-1.5 py-0.5 bg-purple-900/60 border border-purple-600 text-[9px] text-cyan-300 font-normal rounded">
                                {draw.winnerCount || allWinners.length} Winner{(draw.winnerCount || allWinners.length) > 1 ? 's' : ''} Configured
                              </span>
                            </span>
                            <span className="text-[9px] text-gray-400 font-normal">
                              Direct admin prize dispatch per winner
                            </span>
                          </div>

                          <div className="space-y-2">
                            {allWinners.map((winnerAddr, idx) => {
                              const ticketId = winningTicketIds[idx] || (idx === 0 ? draw.winningTicketId : 0);
                              return (
                                <div
                                  key={idx}
                                  className="bg-black/50 p-3 rounded-lg border border-purple-900/50 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                                >
                                  <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="px-1.5 py-0.5 bg-[#FFD700] text-black text-[9px] font-extrabold rounded">
                                        WINNER #{idx + 1}
                                      </span>
                                      <span className="text-[#00FF66] font-bold font-mono break-all select-all">
                                        {winnerAddr}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                      {ticketId > 0 ? (
                                        <span>Ticket ID: #{ticketId}</span>
                                      ) : (
                                        <span className="text-amber-300">Verified Ticket Holder</span>
                                      )}
                                      <span>•</span>
                                      <a
                                        href={`https://explorer.testnet.robinhood.com/address/${winnerAddr}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-cyan-400 hover:underline"
                                      >
                                        Explorer ↗
                                      </a>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyAddress(winnerAddr)}
                                      className="px-2.5 py-1 text-[10px] font-bold text-[#00FF66] bg-black/60 border border-[#00FF66]/50 rounded hover:bg-[#00FF66]/10 flex items-center gap-1"
                                    >
                                      {copiedAddress === winnerAddr ? '✓ COPIED!' : 'COPY'}
                                    </button>

                                    {(draw.prizeCategory === 1 || draw.prizeCategory === 2) ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          sound?.playClick?.();
                                          setDirectSendModal({
                                            isOpen: true,
                                            drawId: draw.drawId,
                                            winnerAddress: winnerAddr,
                                            drawTitle: `${draw.title} (Winner #${idx + 1})`,
                                            prizeDescription: draw.prizeDescription,
                                            amount: '',
                                            assetType: draw.prizeCategory === 1 ? 'ETH' : 'APEBROKE',
                                            isSending: false,
                                          });
                                        }}
                                        className="pixel-btn pixel-btn-vibrant-lime px-2.5 py-1 text-[10px] font-bold rounded flex items-center gap-1 shadow-[2px_2px_0px_#000]"
                                        title={`Directly send crypto to Winner #${idx + 1}`}
                                      >
                                        <span>SEND {draw.prizeCategory === 1 ? 'ETH' : '$APEBROKE'}</span>
                                      </button>
                                    ) : (
                                      <div className="px-2 py-1 text-[9px] text-amber-300 bg-amber-950/40 border border-amber-700/60 rounded flex items-center gap-1">
                                        <span>Physical Delivery</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Audit & Proof Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-black/30 p-2.5 rounded-lg border border-purple-900/30 text-[10px]">
                            <div>
                              <span className="text-gray-400 uppercase">Draw Execution: </span>
                              <span className="text-gray-300 font-mono">
                                {draw.selectedByAdmin || 'Admin'}
                                {draw.selectedTimestamp ? ` • ${new Date(draw.selectedTimestamp * 1000).toLocaleString()}` : ''}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 uppercase">Delivery Proof / Tracking: </span>
                              <span className="text-cyan-300 font-mono break-all">
                                {draw.prizeFulfillmentProof || 'No proof recorded yet'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Direct Admin Delivery Controls & Status Update */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-2 border-t border-purple-900/60">

                      {/* Status Update & Tracking Proof */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 sm:justify-end">
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusUpdate(draw.drawId, e.target.value)}
                          className="px-2.5 py-1.5 rounded bg-black/80 border border-purple-700 text-xs text-white focus:outline-none"
                        >
                          <option value={0}>0 - Pending Direct Delivery</option>
                          <option value={1}>1 - Winner Contacted</option>
                          <option value={2}>2 - Prize Sent / Dispatched</option>
                          <option value={3}>3 - Completed & Confirmed</option>
                        </select>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Tracking # or Tx Hash"
                            value={fulfillmentInputs[draw.drawId] || ''}
                            onChange={(e) =>
                              setFulfillmentInputs({ ...fulfillmentInputs, [draw.drawId]: e.target.value })
                            }
                            className="w-44 px-2.5 py-1.5 text-xs rounded bg-black/80 border border-purple-700 text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(draw.drawId, currentStatus)}
                            className="pixel-btn pixel-btn-vibrant-gold px-3 py-1.5 text-[10px] font-bold shrink-0 rounded"
                          >
                            SAVE PROOF
                          </button>
                        </div>
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
                SELECT MANUAL WINNER{manualModal.winnerCount > 1 ? `S (${manualModal.winnerCount} SLOTS)` : ''}
              </h3>
              <button
                type="button"
                onClick={() => setManualModal({ isOpen: false, drawId: null, drawTitle: '', winnerCount: 1, winnerAddresses: [''] })}
                className="text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-gray-300 flex justify-between">
                <span>Draw: <strong className="text-white">{manualModal.drawTitle}</strong></span>
                <span className="text-[#00F0FF] font-bold">Max: {manualModal.winnerCount} Winner{manualModal.winnerCount > 1 ? 's' : ''}</span>
              </div>
              <div className="bg-amber-950/80 border border-amber-600 p-2.5 rounded text-[10px] text-amber-200 leading-normal">
                <strong>Strict Protocol Rule:</strong> Every candidate winner wallet must own at least 1 valid ticket for this draw. Duplicate addresses and non-ticket holders will be strictly rejected on-chain.
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {manualModal.winnerAddresses.map((addr, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between text-[10px] text-gray-300 font-bold mb-1">
                      <span>WINNER #{idx + 1} WALLET:</span>
                      {manualModal.winnerAddresses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = manualModal.winnerAddresses.filter((_, i) => i !== idx);
                            setManualModal({ ...manualModal, winnerAddresses: next });
                          }}
                          className="text-red-400 hover:text-red-300 text-[9px]"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={addr}
                      onChange={(e) => {
                        const next = [...manualModal.winnerAddresses];
                        next[idx] = e.target.value.trim();
                        setManualModal({ ...manualModal, winnerAddresses: next });
                      }}
                      className="w-full px-3 py-2 rounded bg-black/80 border border-purple-700 text-xs text-white focus:outline-none focus:border-[#FFD700] font-mono"
                    />
                  </div>
                ))}

                {manualModal.winnerAddresses.length < manualModal.winnerCount && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualModal({
                        ...manualModal,
                        winnerAddresses: [...manualModal.winnerAddresses, ''],
                      });
                    }}
                    className="w-full py-1.5 text-[10px] font-bold text-cyan-300 bg-black/50 border border-dashed border-cyan-700 hover:border-cyan-400 rounded"
                  >
                    + Add Winner Slot ({manualModal.winnerAddresses.length}/{manualModal.winnerCount})
                  </button>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-purple-800">
              <button
                type="button"
                onClick={() => setManualModal({ isOpen: false, drawId: null, drawTitle: '', winnerCount: 1, winnerAddresses: [''] })}
                className="px-3 py-2 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualDrawSubmit}
                className="pixel-btn pixel-btn-vibrant-gold px-4 py-2 text-xs font-bold rounded"
              >
                [ CONFIRM {manualModal.winnerAddresses.filter(a => a.trim().length > 0).length || 1} MANUAL WINNER{(manualModal.winnerAddresses.filter(a => a.trim().length > 0).length || 1) > 1 ? 'S' : ''} ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customize Ticket Fee Modal */}
      {feeModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#12072e] border-3 border-[#00F0FF] rounded-xl p-5 shadow-[0_0_30px_rgba(0,240,255,0.3)] space-y-4 font-mono text-white">
            <div className="flex items-center justify-between border-b border-purple-800 pb-3">
              <h3 className="text-xs sm:text-sm font-bold text-[#00F0FF] font-pixel flex items-center gap-2">
                <span>CUSTOMIZE TICKET FEE</span>
              </h3>
              <button
                type="button"
                onClick={() => setFeeModal({ isOpen: false, drawId: null, drawTitle: '', currentPriceApe: '', newPriceApe: '' })}
                className="text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="text-gray-300">
                Draw: <strong className="text-white">{feeModal.drawTitle}</strong> (Draw #{feeModal.drawId})
              </div>
              <div className="text-gray-400 text-[11px]">
                Current Fee: <span className="text-[#FFD700] font-bold">{Number(feeModal.currentPriceApe).toLocaleString()} $APEBROKE</span>
              </div>

              <div className="bg-[#170a36] border border-cyan-800/80 p-2.5 rounded text-[10px] text-cyan-200">
                <strong>Dynamic Fee Customization:</strong> You can customize or discount the ticket fee anytime. Any new ticket purchases will immediately charge the new fee.
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1 text-[10px] uppercase">
                  New Ticket Fee ($APEBROKE):
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 25000"
                  value={feeModal.newPriceApe}
                  onChange={(e) => setFeeModal({ ...feeModal, newPriceApe: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-black/80 border border-purple-700 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
                />
                <div className="flex items-center justify-between text-[9px] text-gray-400 pt-1">
                  <span className="text-[#00FF66]">
                    ≈ ${(Number(feeModal.newPriceApe || 0) * apePriceUsd).toFixed(2)} USD
                  </span>
                  <div className="flex gap-1">
                    {['10000', '25000', '50000', '100000'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFeeModal((prev) => ({ ...prev, newPriceApe: p }))}
                        className="px-1.5 py-0.5 rounded bg-black/50 border border-purple-800 hover:border-cyan-400 text-[9px] text-gray-300"
                      >
                        {Number(p) / 1000}K
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-purple-800">
              <button
                type="button"
                onClick={() => setFeeModal({ isOpen: false, drawId: null, drawTitle: '', currentPriceApe: '', newPriceApe: '' })}
                className="px-3 py-2 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSetTicketPriceSubmit}
                className="pixel-btn pixel-btn-vibrant-lime px-4 py-2 text-xs font-bold rounded"
              >
                [ UPDATE TICKET FEE ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Send Crypto Prize Modal */}
      {directSendModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#12072e] border-3 border-[#00FF66] rounded-xl p-5 shadow-[0_0_30px_rgba(0,255,102,0.3)] space-y-4 font-mono text-white">
            <div className="flex items-center justify-between border-b border-purple-800 pb-3">
              <h3 className="text-xs sm:text-sm font-bold text-[#00FF66] font-pixel flex items-center gap-2">
                <span>DIRECT SEND PRIZE TO WINNER</span>
              </h3>
              <button
                type="button"
                onClick={() =>
                  setDirectSendModal({
                    isOpen: false,
                    drawId: null,
                    winnerAddress: '',
                    drawTitle: '',
                    prizeDescription: '',
                    amount: '',
                    assetType: 'ETH',
                    isSending: false,
                  })
                }
                className="text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#170a36] border border-[#00FF66]/50 p-2.5 rounded text-[10px] text-green-200">
                <strong>Direct Fulfillment:</strong> You are transferring the prize directly from your admin wallet to the winner address. Once confirmed, the transaction hash will automatically be recorded as on-chain proof and status updated to <strong>PRIZE SENT</strong>.
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 uppercase">Draw Title:</span>
                <div className="font-bold text-white text-xs">{directSendModal.drawTitle}</div>
                <div className="text-[10px] text-gray-300">Prize: {directSendModal.prizeDescription}</div>
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1 text-[10px] uppercase">
                  Winner Recipient Address:
                </label>
                <div className="w-full px-3 py-2 rounded bg-black/80 border border-purple-700 text-xs text-[#00FF66] font-mono break-all select-all">
                  {directSendModal.winnerAddress}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-bold mb-1 text-[10px] uppercase">
                    Asset Type:
                  </label>
                  <select
                    value={directSendModal.assetType}
                    onChange={(e) => setDirectSendModal({ ...directSendModal, assetType: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-black/80 border border-purple-700 text-xs text-white focus:outline-none"
                  >
                    <option value="ETH">Native ETH</option>
                    <option value="APEBROKE">$APEBROKE Tokens</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1 text-[10px] uppercase">
                    Prize Amount to Send:
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    placeholder="e.g. 0.5 or 100000"
                    value={directSendModal.amount}
                    onChange={(e) => setDirectSendModal({ ...directSendModal, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-black/80 border border-purple-700 text-xs text-white focus:outline-none focus:border-[#00FF66]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-purple-800">
              <button
                type="button"
                onClick={() =>
                  setDirectSendModal({
                    isOpen: false,
                    drawId: null,
                    winnerAddress: '',
                    drawTitle: '',
                    prizeDescription: '',
                    amount: '',
                    assetType: 'ETH',
                    isSending: false,
                  })
                }
                className="px-3 py-2 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={directSendModal.isSending}
                onClick={handleDirectSendCryptoSubmit}
                className="pixel-btn pixel-btn-vibrant-lime px-4 py-2 text-xs font-bold rounded disabled:opacity-50"
              >
                {directSendModal.isSending ? '[ SENDING VIA WALLET... ]' : `[ SEND ${directSendModal.assetType} TO WINNER ]`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Draw Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-[#12072e] border-3 border-blue-500 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(59,130,246,0.3)] font-mono text-white p-5 sm:p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-purple-800 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-blue-400 uppercase tracking-wider">
                  EDIT DRAW #{editModal.drawId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-gray-300 font-bold uppercase text-[10px]">
                  Draw Title *
                </label>
                <input
                  type="text"
                  required
                  value={editModal.title}
                  onChange={(e) => setEditModal({ ...editModal, title: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-black/80 border border-purple-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-gray-300 font-bold uppercase text-[10px]">
                    Prize Category
                  </label>
                  <select
                    value={editModal.prizeCategory}
                    onChange={(e) => setEditModal({ ...editModal, prizeCategory: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded bg-black/80 border border-purple-700 text-xs text-white focus:outline-none"
                  >
                    <option value={0}>Physical Product</option>
                    <option value={1}>Native ETH</option>
                    <option value={2}>$APEBROKE Token Bundle</option>
                    <option value={3}>Ape Broker NFT</option>
                    <option value={4}>Custom</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-gray-300 font-bold uppercase text-[10px]">
                    Ticket Fee ($APEBROKE) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editModal.ticketPriceApe}
                    onChange={(e) => setEditModal({ ...editModal, ticketPriceApe: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-black/80 border border-purple-700 text-xs text-[#FFD700] font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-gray-300 font-bold uppercase text-[10px]">
                  Prize Description *
                </label>
                <textarea
                  rows={2}
                  required
                  value={editModal.prizeDescription}
                  onChange={(e) => setEditModal({ ...editModal, prizeDescription: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-black/80 border border-purple-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-gray-300 font-bold uppercase text-[10px]">
                  Prize Image
                </label>
                {editModal.imageUrl && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <img
                      src={editModal.imageUrl}
                      alt="Preview"
                      className="w-14 h-14 object-cover rounded border border-[#FFD700]"
                    />
                    <button
                      type="button"
                      onClick={() => setEditModal({ ...editModal, imageUrl: '' })}
                      className="text-[9px] text-red-400 hover:text-red-300 underline"
                    >
                      [ Remove Image ]
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const compressed = await compressImage(file);
                        setEditModal((prev) => ({ ...prev, imageUrl: compressed }));
                      } catch (err) {}
                    }
                  }}
                  className="text-xs text-gray-400 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-[#FFD700] file:text-black cursor-pointer block"
                />
                <input
                  type="url"
                  placeholder={editModal.imageUrl?.startsWith('data:') ? 'Image attached (stored off-chain)' : 'Or paste URL: https://...'}
                  value={editModal.imageUrl?.startsWith('data:') ? '' : (editModal.imageUrl || '')}
                  onChange={(e) => setEditModal({ ...editModal, imageUrl: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-black/80 border border-purple-700 text-xs text-white focus:outline-none focus:border-blue-500 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-gray-300 font-bold uppercase text-[10px]">
                    Max Tickets (0=Uncapped)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editModal.maxTickets}
                    onChange={(e) => setEditModal({ ...editModal, maxTickets: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-black/80 border border-purple-700 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-gray-300 font-bold uppercase text-[10px]">
                    Max Per Wallet (0=Uncapped)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editModal.maxTicketsPerWallet}
                    onChange={(e) => setEditModal({ ...editModal, maxTicketsPerWallet: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-black/80 border border-purple-700 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Duration / Deadline Settings */}
              <div className="space-y-1.5 p-3 rounded-lg bg-black/40 border border-purple-900/80">
                <div className="flex items-center justify-between">
                  <label className="block text-gray-300 font-bold uppercase text-[10px]">
                    Draw Duration & Deadline
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer bg-black/60 px-2 py-0.5 rounded border border-purple-800 hover:border-[#00FF66]">
                    <input
                      type="checkbox"
                      checked={editModal.noDeadline}
                      onChange={(e) => {
                        sound?.playClick?.();
                        setEditModal((prev) => ({ ...prev, noDeadline: e.target.checked }));
                      }}
                      className="accent-[#00FF66] w-3 h-3 cursor-pointer rounded"
                    />
                    <span className={`text-[10px] font-bold font-mono ${editModal.noDeadline ? 'text-[#00FF66]' : 'text-gray-400'}`}>
                      NO DEADLINE
                    </span>
                  </label>
                </div>
                {editModal.noDeadline ? (
                  <div className="px-2.5 py-1.5 rounded bg-[#00FF66]/10 border border-[#00FF66]/40 text-[#00FF66] text-[10px] font-mono flex items-center gap-1.5">
                    <span>No deadline: draw will stay active until admin manually executes winner selection</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      placeholder="Days"
                      value={editModal.durationDays}
                      onChange={(e) => setEditModal({ ...editModal, durationDays: e.target.value })}
                      className="w-24 px-3 py-1.5 rounded bg-black/80 border border-purple-700 text-xs text-white focus:outline-none"
                    />
                    <span className="text-gray-400 text-[10px]">Days from now</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-purple-800">
                <button
                  type="button"
                  onClick={() => setEditModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-3 py-2 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editModal.isSubmitting}
                  className="pixel-btn pixel-btn-vibrant-lime px-4 py-2 text-xs font-bold rounded disabled:opacity-50"
                >
                  {editModal.isSubmitting ? '[ SAVING CHANGES... ]' : '[ SAVE DRAW CHANGES ]'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
