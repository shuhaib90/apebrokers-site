// Utility to generate and download a horizontal ID-card matching the official Broker Identification style
export async function downloadBrokerCardPng({ brokerId, xUsername, walletAddress, gifId, gifUrl }) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const W = 1000;
    const H = 625;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const cleanBrokerId = (brokerId || '#0000').replace('#', '');
    const cleanUsername = (xUsername || '@broker').trim();
    const shortWallet = walletAddress
      ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}`
      : '0x0000...0000';

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const renderCard = () => {
      try {
        // 1. Base Card Background (Rich Dark Broker / Gold Luxury ID)
        ctx.save();
        // Card rounded clipping
        const r = 24;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(W - r, 0);
        ctx.quadraticCurveTo(W, 0, W, r);
        ctx.lineTo(W, H - r);
        ctx.quadraticCurveTo(W, H, W - r, H);
        ctx.lineTo(r, H);
        ctx.quadraticCurveTo(0, H, 0, H - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.clip();

        // Background gradient
        const bgGrad = ctx.createLinearGradient(0, 0, W, H);
        bgGrad.addColorStop(0, '#1f162b');
        bgGrad.addColorStop(0.5, '#120d1c');
        bgGrad.addColorStop(1, '#0b0812');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Subtle geometric watermark pattern on background
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.04)';
        ctx.lineWidth = 1.5;
        for (let x = -100; x < W + 100; x += 60) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + H, H);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, H);
          ctx.lineTo(x + H, 0);
          ctx.stroke();
        }

        // 2. Outer Card Border
        ctx.strokeStyle = '#3d2e54';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, W - 6, H - 6);

        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, W - 20, H - 20);

        // 3. Top Header Strip
        ctx.fillStyle = '#160e22';
        ctx.fillRect(12, 12, W - 24, 150);

        // Header double divider lines
        ctx.strokeStyle = '#4a3765';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(12, 162);
        ctx.lineTo(W - 12, 162);
        ctx.stroke();

        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(12, 166);
        ctx.lineTo(W - 12, 166);
        ctx.stroke();

        // 4. Logo Emblem (Diamond badge on left)
        const emblemX = 85;
        const emblemY = 85;
        ctx.save();
        ctx.translate(emblemX, emblemY);
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(0, -42);
        ctx.lineTo(42, 0);
        ctx.lineTo(0, 42);
        ctx.lineTo(-42, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#06030F';
        ctx.beginPath();
        ctx.moveTo(0, -32);
        ctx.lineTo(32, 0);
        ctx.lineTo(0, 32);
        ctx.lineTo(-32, 0);
        ctx.closePath();
        ctx.fill();

        ctx.font = "bold 26px 'Press Start 2P', monospace, sans-serif";
        ctx.fillStyle = '#00FF66';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('A', 0, 2);
        ctx.restore();

        // 5. Header Titles
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = "900 38px 'Cinzel', 'Times New Roman', Georgia, serif";
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('APEBROKERS', 155, 34);

        ctx.font = "bold 16px 'Cinzel', 'Times New Roman', Georgia, serif";
        ctx.fillStyle = '#c7b299';
        ctx.letterSpacing = '3px';
        ctx.fillText('OFFICIAL BROKER IDENTIFICATION', 158, 84);

        // Header Metadata Right (EXP, ID, CLASS)
        ctx.font = "bold 13px 'Courier New', monospace";
        ctx.fillStyle = '#a89bb5';
        ctx.fillText('EXP: 12/2026', 158, 125);

        ctx.textAlign = 'right';
        ctx.font = "bold 32px 'Courier New', monospace";
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`APE-${cleanBrokerId}`, W - 45, 78);

        ctx.font = "bold 15px 'Courier New', monospace";
        ctx.fillStyle = '#FFD700';
        ctx.fillText('CLASS: 5★ BROKER', W - 45, 125);

        // 6. Left Photo Frame
        const photoX = 45;
        const photoY = 195;
        const photoW = 280;
        const photoH = 370;

        // Photo Frame Border & Background
        ctx.fillStyle = '#0a0612';
        ctx.fillRect(photoX, photoY, photoW, photoH);
        ctx.strokeStyle = '#4a3765';
        ctx.lineWidth = 4;
        ctx.strokeRect(photoX, photoY, photoW, photoH);

        // Draw the ApeBroker NFT Image
        try {
          ctx.drawImage(img, photoX + 6, photoY + 6, photoW - 12, photoH - 12);
        } catch (e) {}

        // Photo inner corner accents
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(photoX + 10, photoY + 10, photoW - 20, photoH - 20);

        // Photo badge top left
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(photoX + 14, photoY + 14, 110, 24);
        ctx.font = "bold 10px 'Press Start 2P', monospace, sans-serif";
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`APE #${gifId}`, photoX + 69, photoY + 26);

        // 7. Right Side Information Block
        const infoX = 360;
        const infoY = 195;

        // Name / Title
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = "900 24px 'Cinzel', 'Times New Roman', Georgia, serif";
        ctx.fillStyle = '#f0e6d2';
        ctx.fillText(`"THE BROKER" ${cleanUsername.toUpperCase()}`, infoX, infoY);

        // Affiliation
        ctx.font = "bold 17px 'Cinzel', 'Times New Roman', Georgia, serif";
        ctx.fillStyle = '#c7b299';
        ctx.fillText('APEBROKERS TRADING FLOOR,', infoX, infoY + 38);
        ctx.fillText('ROBINHOOD NETWORK', infoX, infoY + 66);

        // 8. Stats & Spec Grid (2 columns like the ID card)
        const gridY = infoY + 115;
        const rowH = 34;

        const drawField = (label, val, x, y, valColor = '#f0e6d2') => {
          ctx.font = "bold 12px 'Courier New', monospace";
          ctx.fillStyle = '#9e8fae';
          ctx.fillText(label, x, y);

          const labelW = ctx.measureText(label).width;
          ctx.font = "bold 14px 'Courier New', monospace";
          ctx.fillStyle = valColor;
          ctx.fillText(val, x + labelW + 6, y);
        };

        // Row 1
        drawField('CHAIN:', 'ROBINHOOD', infoX, gridY, '#00DDFF');
        drawField('SUPPLY:', '5,555', infoX + 220, gridY, '#00FF66');
        drawField('STATUS:', 'VERIFIED', infoX + 430, gridY, '#00FF66');

        // Row 2
        drawField('WALLET:', shortWallet, infoX, gridY + rowH, '#FFFFFF');
        drawField('ALLOCATION:', 'WHITELIST', infoX + 380, gridY + rowH, '#FFD700');

        // Row 3
        drawField('ROLE:', 'FLOOR ALPHA', infoX, gridY + rowH * 2, '#f0e6d2');
        drawField('ACCESS:', 'LEVEL-5', infoX + 260, gridY + rowH * 2, '#FFD700');
        drawField('DOB:', '2026/RH', infoX + 440, gridY + rowH * 2, '#FF2247');

        // Row 4
        drawField('DESK:', 'VIP FLOOR', infoX, gridY + rowH * 3, '#f0e6d2');
        drawField('CONVICTION:', 'MAXIMALIST', infoX + 260, gridY + rowH * 3, '#00FF66');

        // 9. Cursive Signature on bottom right
        ctx.font = "italic 32px 'Brush Script MT', 'Dancing Script', 'Lucida Handwriting', cursive, serif";
        ctx.fillStyle = '#FFD700';
        ctx.fillText('ApeBrokers Executive', infoX + 220, gridY + rowH * 4 + 8);

        // 10. Official Gold Watermark Stamp (bottom right corner)
        ctx.save();
        ctx.translate(W - 90, H - 75);
        ctx.rotate((-15 * Math.PI) / 180);
        ctx.strokeStyle = '#00FF66';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-55, -16, 110, 32);
        ctx.font = "bold 9px 'Press Start 2P', monospace, sans-serif";
        ctx.fillStyle = '#00FF66';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('APPROVED', 0, 0);
        ctx.restore();

        ctx.restore();

        // 11. Trigger PNG file download
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `ApeBrokers_Identification_${cleanBrokerId}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        resolve(true);
      } catch (err) {
        console.error('Error creating ID card image:', err);
        reject(err);
      }
    };

    img.onload = renderCard;
    img.onerror = renderCard;
    img.src = gifUrl;
  });
}

// Utility to directly download the animated GIF file
export function downloadBrokerGif(gifUrl, gifId) {
  const link = document.createElement('a');
  link.href = gifUrl;
  link.download = `ApeBroker_${gifId}.gif`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
