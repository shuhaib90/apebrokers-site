import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/audio';

/**
 * High-Resolution Canvas Generator for Downloadable PNL Share Card (1200x675)
 */
async function generateCardCanvas(claimData) {
  const canvas = document.createElement('canvas');
  const width = 1200;
  const height = 675;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 1. Cyber Dark Gradient Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#070214');
  bgGrad.addColorStop(0.4, '#130630');
  bgGrad.addColorStop(1, '#05010d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle Neon Grid Lines
  ctx.strokeStyle = 'rgba(0, 255, 102, 0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 3. Glowing Neon Double Border
  ctx.strokeStyle = '#00FF66';
  ctx.lineWidth = 6;
  ctx.shadowColor = '#00FF66';
  ctx.shadowBlur = 24;
  ctx.strokeRect(20, 20, width - 40, height - 40);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  // 4. Header Bar
  ctx.fillStyle = '#160838';
  ctx.fillRect(32, 32, width - 64, 72);
  ctx.strokeStyle = '#00FF66';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(32, 104);
  ctx.lineTo(width - 32, 104);
  ctx.stroke();

  // Header Title
  ctx.fillStyle = '#00FF66';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('APE BROKER DESK  •  REWARD CLAIM RECEIPT', 60, 76);

  // Header Badge
  ctx.fillStyle = '#00F0FF';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('ROBINHOOD EVM (CHAIN 4663)', width - 60, 76);
  ctx.textAlign = 'left';

  // 5. Draw User's NFT Image Safely
  const imgX = 60;
  const imgY = 135;
  const imgSize = 420;

  // Frame for NFT
  ctx.strokeStyle = '#00F0FF';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#00F0FF';
  ctx.shadowBlur = 18;
  ctx.strokeRect(imgX, imgY, imgSize, imgSize);
  ctx.shadowBlur = 0;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  const imgUrl = claimData.image || '/brokerdesk-art.png';

  await new Promise((resolve) => {
    img.onload = resolve;
    img.onerror = () => {
      // Fallback to local image
      img.crossOrigin = null;
      img.src = '/brokerdesk-art.png';
      img.onload = resolve;
      img.onerror = resolve;
    };
    img.src = imgUrl;
  });

  try {
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
    } else {
      ctx.fillStyle = '#180838';
      ctx.fillRect(imgX, imgY, imgSize, imgSize);
      ctx.fillStyle = '#00FF66';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(`DESK #${claimData.tokenId || 1}`, imgX + 110, imgY + 210);
    }
  } catch (e) {
    ctx.fillStyle = '#180838';
    ctx.fillRect(imgX, imgY, imgSize, imgSize);
  }

  // Token ID Banner at bottom of Image Frame
  ctx.fillStyle = 'rgba(5, 2, 15, 0.9)';
  ctx.fillRect(imgX, imgY + imgSize - 54, imgSize, 54);
  ctx.strokeStyle = '#00FF66';
  ctx.lineWidth = 2;
  ctx.strokeRect(imgX, imgY + imgSize - 54, imgSize, 54);
  ctx.fillStyle = '#00FF66';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    claimData.deskName || `BROKER DESK #${claimData.tokenId || 1}`,
    imgX + imgSize / 2,
    imgY + imgSize - 20
  );
  ctx.textAlign = 'left';

  // 6. Right Column: Reward PNL & Specs
  const contentX = 520;

  // Header Subtitle
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('>>> REWARD PAYOUT RECEIVED <<<', contentX, 175);

  // Big Hero ETH Claim Amount
  ctx.fillStyle = '#00FF66';
  ctx.font = 'bold 64px monospace';
  ctx.shadowColor = '#00FF66';
  ctx.shadowBlur = 24;
  ctx.fillText(`+${claimData.amountEth} ETH`, contentX, 255);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#9ca3af';
  ctx.font = '15px monospace';
  ctx.fillText('Automated 5-Hour Yield Distribution Mined', contentX, 290);

  // Specs Container Box
  ctx.fillStyle = '#0f0526';
  ctx.fillRect(contentX, 325, 620, 195);
  ctx.strokeStyle = 'rgba(147, 51, 234, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(contentX, 325, 620, 195);

  // Specs Helper
  const drawRow = (label, value, valueColor, y) => {
    ctx.fillStyle = '#8b80b0';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(label, contentX + 25, y);
    ctx.fillStyle = valueColor;
    ctx.font = 'bold 17px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(value, contentX + 595, y);
    ctx.textAlign = 'left';
  };

  drawRow('DESK WEIGHT:', `${claimData.deskWeight || 100} WGT`, '#00FF66', 368);
  drawRow('BOOST MULTIPLIER:', `${claimData.boostCount || 0} / 5 BOOSTED`, '#FFD700', 408);
  drawRow(
    'WALLET OWNER:',
    claimData.address
      ? `${claimData.address.slice(0, 8)}...${claimData.address.slice(-6)}`
      : 'CONNECTED WALLET',
    '#00F0FF',
    448
  );
  drawRow(
    'TIMESTAMP:',
    claimData.timestamp
      ? new Date(claimData.timestamp).toLocaleString()
      : new Date().toLocaleString(),
    '#ffffff',
    488
  );

  // 7. Footer Bar
  ctx.fillStyle = '#00FF66';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    'MINE ETH EVERY 5 HOURS WITH BROKERDESK  •  ROBINHOOD EVM  •  $APEBROKE',
    width / 2,
    608
  );
  ctx.textAlign = 'left';

  return canvas;
}

export function DeskPnlModal({ isOpen, onClose, claimData }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#00FF66', '#00F0FF', '#FFD700', '#FFFFFF'],
        });
      } catch (e) {}
    }
  }, [isOpen]);

  if (!isOpen || !claimData) return null;

  const tokenId = claimData.tokenId;
  const deskName = claimData.deskName || `Broker Desk #${tokenId}`;
  const amountEth = claimData.amountEth || '0.000000';
  const deskWeight = claimData.deskWeight || 100;
  const boostCount = claimData.boostCount || 0;
  const userAddress = claimData.address || '';
  const txHash = claimData.txHash || '';
  const imageSrc = claimData.image || '/brokerdesk-art.png';

  // Direct 1-Click Share to X (Twitter)
  const handleShareOnX = () => {
    sound?.playClick?.();
    const tweetText = `Just claimed +${amountEth} ETH mining rewards from my Broker Desk #${tokenId || 'NFTs'} on @RobinhoodApp Chain! ???\n\n?? Desk Weight: ${deskWeight} WGT\n?? Boost Level: ${boostCount}/5\n?? 5-Hour Automated ETH Yield Engine\n\nCheck your desk & mine with $APEBROKE:\nhttps://brokerdesk.xyz\n\n#RobinhoodChain #BrokerDesk #ETH #ApeBroke`;

    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(tweetUrl, '_blank', 'width=580,height=450,noopener,noreferrer');
  };

  // Download PNL Card as PNG
  const handleDownload = async () => {
    sound?.playClick?.();
    setIsDownloading(true);
    setDownloadSuccess(false);
    try {
      const canvas = await generateCardCanvas(claimData);
      canvas.toBlob((blob) => {
        if (!blob) {
          setIsDownloading(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `brokerdesk-pnl-#${tokenId || 'reward'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
        setDownloadSuccess(true);
        sound?.playSuccess?.();
        setTimeout(() => setDownloadSuccess(false), 3000);
      }, 'image/png');
    } catch (err) {
      console.error('Failed to generate PNL card:', err);
      setIsDownloading(false);
      sound?.playError?.();
    }
  };

  const handleClose = () => {
    sound?.playClick?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0b041c] border-3 border-[#00FF66] shadow-[0_0_35px_rgba(0,255,102,0.3)] rounded-2xl overflow-hidden font-pixel text-white my-6">
        {/* Modal Top Bar */}
        <div className="bg-[#17083a] px-4 py-3 border-b-2 border-[#00FF66] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00FF66] animate-ping" />
            <h3 className="text-xs sm:text-sm font-extrabold text-[#00FF66] tracking-wider">
              ETH MINING REWARD CLAIMED!
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-xs px-2.5 py-1 border border-gray-700 hover:border-gray-500 rounded transition-colors"
          >
            [ ESC ]
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* ================= PNL SHARE CARD VISUAL ================= */}
          <div
            id="pnl-share-card"
            className="relative bg-gradient-to-br from-[#0e0524] via-[#140733] to-[#080216] border-2 border-[#00FF66] rounded-xl p-4 sm:p-5 shadow-[0_0_20px_rgba(0,255,102,0.15)] space-y-4 font-mono overflow-hidden"
          >
            {/* Ambient CRT Scanline Overlay */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,38,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] opacity-40" />

            {/* Card Top Branding */}
            <div className="flex items-center justify-between border-b border-purple-900/60 pb-3 relative z-10">
              <div className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="ApeSyndicate"
                  className="w-6 h-6 object-contain pixelated"
                />
                <span className="text-xs sm:text-sm font-pixel font-bold text-[#00FF66] tracking-wider">
                  APE BROKER DESK
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-[#00F0FF] font-bold">
                ROBINHOOD EVM
              </span>
            </div>

            {/* Main Showcase: NFT Art + Hero PNL */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center relative z-10">
              {/* NFT Artwork Box */}
              <div className="sm:col-span-2 relative group flex flex-col items-center">
                <div className="relative w-full aspect-square rounded-lg border-2 border-[#00F0FF] overflow-hidden bg-black/60 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                  <img
                    src={imageSrc}
                    alt={deskName}
                    className="w-full h-full object-cover pixelated"
                    onError={(e) => {
                      e.currentTarget.src = '/brokerdesk-art.png';
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-black/80 py-1 px-2 border-t border-[#00FF66] text-center">
                    <span className="text-[10px] font-pixel text-[#00FF66] font-bold">
                      {deskName}
                    </span>
                  </div>
                </div>
              </div>

              {/* PNL Numbers & Stats */}
              <div className="sm:col-span-3 space-y-3">
                <div>
                  <span className="text-[10px] font-pixel text-[#FFD700] uppercase tracking-wider block">
                    [ REWARD PAYOUT RECEIVED ]
                  </span>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#00FF66] tracking-tight drop-shadow-[0_0_12px_rgba(0,255,102,0.4)] mt-0.5">
                    +{amountEth} ETH
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    Automated 5-Hour Yield Distribution Mined
                  </span>
                </div>

                {/* Specs Pill Box */}
                <div className="bg-[#0b041c] border border-purple-900/60 rounded-lg p-2.5 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-gray-400">
                    <span className="text-[10px]">Desk Weight:</span>
                    <span className="text-[#00FF66] font-bold">{deskWeight} WGT</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-400">
                    <span className="text-[10px]">Boost Level:</span>
                    <span className="text-[#FFD700] font-bold">{boostCount} / 5</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-400">
                    <span className="text-[10px]">Wallet:</span>
                    <span className="text-[#00F0FF] font-bold">
                      {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Connected'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="border-t border-purple-900/60 pt-2.5 flex flex-col sm:flex-row items-center justify-between text-[9px] text-gray-400 relative z-10 gap-1 font-mono">
              <span>Mine ETH every 5 hours with BrokerDesk • $APEBROKE</span>
              {txHash && (
                <a
                  href={`https://explorer.robinhood.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  View Explorer: {txHash.slice(0, 10)}...
                </a>
              )}
            </div>
          </div>

          {/* ================= ACTION BUTTONS ================= */}
          <div className="space-y-2.5 pt-1 font-pixel">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Share on X */}
              <button
                type="button"
                onClick={handleShareOnX}
                className="w-full min-h-[46px] pixel-btn pixel-btn-vibrant-cyan py-2.5 px-4 text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000] flex items-center justify-center gap-2"
              >
                <span>[ SHARE ON X ]</span>
              </button>

              {/* Download PNG Card */}
              <button
                type="button"
                disabled={isDownloading}
                onClick={handleDownload}
                className="w-full min-h-[46px] pixel-btn pixel-btn-vibrant-lime py-2.5 px-4 text-xs font-bold rounded-lg shadow-[3px_3px_0px_#000] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>
                  {isDownloading
                    ? '[ GENERATING CARD... ]'
                    : downloadSuccess
                    ? '[ DOWNLOADED! ]'
                    : '[ DOWNLOAD CARD (PNG) ]'}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2 text-[11px] text-gray-400 hover:text-white font-mono transition-colors text-center"
            >
              [ Done / Close Receipt ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
