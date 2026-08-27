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
      ? walletAddress.length > 26
        ? `${walletAddress.slice(0, 14)}...${walletAddress.slice(-10)}`
        : walletAddress
      : '0x0000...0000';

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';

    let imagesLoaded = 0;
    const checkAndRender = () => {
      imagesLoaded++;
      if (imagesLoaded >= 2) {
        renderCard();
      }
    };

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
        bgGrad.addColorStop(0, '#1a1028');
        bgGrad.addColorStop(0.5, '#120c1d');
        bgGrad.addColorStop(1, '#090510');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Subtle geometric watermark pattern on background
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.035)';
        ctx.lineWidth = 1.5;
        for (let x = -100; x < W + 100; x += 55) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + H, H);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, H);
          ctx.lineTo(x + H, 0);
          ctx.stroke();
        }

        // 2. Outer Card Borders
        ctx.strokeStyle = '#3d2e54';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, W - 6, H - 6);

        ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, W - 20, H - 20);

        // 3. Top Header Strip
        ctx.fillStyle = '#160e24';
        ctx.fillRect(12, 12, W - 24, 140);

        // Header double divider lines
        ctx.strokeStyle = '#4a3765';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(12, 152);
        ctx.lineTo(W - 12, 152);
        ctx.stroke();

        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(12, 156);
        ctx.lineTo(W - 12, 156);
        ctx.stroke();

        // 4. Logo Emblem (Top Left - Clean Transparent Logo)
        const emblemX = 35;
        const emblemY = 24;
        const emblemSize = 110;

        try {
          ctx.drawImage(logoImg, emblemX, emblemY, emblemSize, emblemSize);
        } catch (e) {}

        // 5. Header Titles
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = "900 34px 'Cinzel', 'Times New Roman', Georgia, serif";
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('APEBROKERS', 160, 32);

        ctx.font = "bold 14px 'Cinzel', 'Times New Roman', Georgia, serif";
        ctx.fillStyle = '#c7b299';
        ctx.letterSpacing = '3px';
        ctx.fillText('OFFICIAL BROKER IDENTIFICATION', 162, 78);

        // Header Metadata (EXP, ID, CLASS)
        ctx.font = "bold 12px 'Courier New', monospace";
        ctx.fillStyle = '#9e8fae';
        ctx.fillText('EXP: 12/2026', 162, 114);

        ctx.textAlign = 'right';
        ctx.font = "bold 32px 'Courier New', monospace";
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`APE-${cleanBrokerId}`, W - 40, 38);

        ctx.font = "bold 13px 'Courier New', monospace";
        ctx.fillStyle = '#FFD700';
        ctx.fillText('CLASS: 5★ BROKER', W - 40, 114);

        // 6. Left Photo Frame
        const photoX = 40;
        const photoY = 180;
        const photoW = 275;
        const photoH = 390;

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

        // Photo inner corner gold accents
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 1.5;
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
        const infoX = 350;
        const infoY = 180;

        // Name / Title
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = "900 24px 'Cinzel', 'Times New Roman', Georgia, serif";
        ctx.fillStyle = '#f0e6d2';
        ctx.fillText(`"THE BROKER" ${cleanUsername.toUpperCase()}`, infoX, infoY);

        // Affiliation
        ctx.font = "bold 14px 'Cinzel', 'Times New Roman', Georgia, serif";
        ctx.fillStyle = '#c7b299';
        ctx.fillText('APEBROKERS TRADING FLOOR, ROBINHOOD NETWORK', infoX, infoY + 36);

        // Divider below affiliation
        ctx.strokeStyle = '#3d2e54';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(infoX, infoY + 66);
        ctx.lineTo(W - 40, infoY + 66);
        ctx.stroke();

        // 8. Stats & Spec Grid (Structured 3-column layout matching on-screen card)
        const col1X = infoX;
        const col2X = infoX + 210;
        const col3X = infoX + 410;

        const renderCell = (label, val, x, y, valColor = '#f0e6d2') => {
          ctx.font = "bold 11px 'Courier New', monospace";
          ctx.fillStyle = '#9e8fae';
          ctx.fillText(label, x, y);

          ctx.font = "bold 15px 'Courier New', monospace";
          ctx.fillStyle = valColor;
          ctx.fillText(val, x, y + 16);
        };

        const row1Y = infoY + 82;
        const row2Y = infoY + 142;
        const row3Y = infoY + 202;

        // Row 1: CHAIN | SUPPLY | STATUS
        renderCell('CHAIN:', 'ROBINHOOD', col1X, row1Y, '#00DDFF');
        renderCell('SUPPLY:', '5,555', col2X, row1Y, '#00FF66');
        renderCell('STATUS:', 'UNDER REVIEW', col3X, row1Y, '#FFD700');

        // Row 2: WALLET (spanning col 1 & 2) | ALLOCATION
        renderCell('WALLET:', shortWallet, col1X, row2Y, '#FFFFFF');
        renderCell('ALLOCATION:', 'APPLIED', col3X, row2Y, '#00DDFF');

        // Row 3: ROLE | ACCESS | DOB
        renderCell('ROLE:', 'APPLICANT', col1X, row3Y, '#f0e6d2');
        renderCell('ACCESS:', 'PENDING', col2X, row3Y, '#FFD700');
        renderCell('DOB:', '2026/RH', col3X, row3Y, '#FF2247');

        // 9. Bottom Footer Bar
        const footerY = infoY + 276;
        ctx.strokeStyle = '#3d2e54';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(infoX, footerY);
        ctx.lineTo(W - 40, footerY);
        ctx.stroke();

        // Footer Left: Serial ID
        ctx.font = "bold 11px 'Courier New', monospace";
        ctx.fillStyle = '#6b7280';
        ctx.fillText(`APE-RH-5555 // #${cleanBrokerId}`, infoX, footerY + 16);

        // Footer Right: Signature & Received Badge
        ctx.font = "italic 26px 'Brush Script MT', 'Dancing Script', 'Lucida Handwriting', cursive, serif";
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'right';
        ctx.fillText('ApeBrokers Executive', W - 150, footerY + 10);

        // 10. Official Gold Watermark Stamp (bottom right corner)
        ctx.save();
        ctx.translate(W - 85, footerY + 22);
        ctx.rotate((-8 * Math.PI) / 180);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(-42, -13, 84, 26);
        ctx.font = "bold 8px 'Press Start 2P', monospace, sans-serif";
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('RECEIVED', 0, 0);
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

    img.onload = checkAndRender;
    img.onerror = checkAndRender;
    logoImg.onload = checkAndRender;
    logoImg.onerror = checkAndRender;

    img.src = gifUrl;
    logoImg.src = '/logo.png';
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
