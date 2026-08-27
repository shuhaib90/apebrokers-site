// Utility to generate and download a horizontal ID-card matching the official Broker Identification style
export async function downloadBrokerCardPng({ brokerId, xUsername, walletAddress, gifId, gifUrl, isGtd, gtdArtId }) {
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

        // 1. Background gradient (Gold luxury if isGtd)
        const bgGrad = ctx.createLinearGradient(0, 0, W, H);
        if (isGtd) {
          bgGrad.addColorStop(0, '#2e1c02');
          bgGrad.addColorStop(0.5, '#190e01');
          bgGrad.addColorStop(1, '#0c0700');
        } else {
          bgGrad.addColorStop(0, '#1a1028');
          bgGrad.addColorStop(0.5, '#120c1d');
          bgGrad.addColorStop(1, '#090510');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Subtle geometric watermark pattern on background
        ctx.strokeStyle = isGtd ? 'rgba(255, 215, 0, 0.08)' : 'rgba(255, 215, 0, 0.035)';
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
        ctx.strokeStyle = isGtd ? '#FFD700' : '#3d2e54';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, W - 6, H - 6);

        ctx.strokeStyle = isGtd ? '#FFF275' : 'rgba(255, 215, 0, 0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, W - 20, H - 20);

        // 3. Top Header Strip
        ctx.fillStyle = isGtd ? '#231402' : '#160e24';
        ctx.fillRect(12, 12, W - 24, 140);

        // Header double divider lines
        ctx.strokeStyle = isGtd ? '#B38F00' : '#4a3765';
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

        // 4. Logo Emblem (Top Left)
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
        ctx.fillStyle = isGtd ? '#FFD700' : '#c7b299';
        ctx.letterSpacing = '3px';
        ctx.fillText(
          isGtd ? '👑 GUARANTEED (GTD) BROKER PASS' : 'OFFICIAL BROKER IDENTIFICATION',
          162,
          78
        );

        // Header Metadata (EXP, ID, CLASS)
        ctx.font = "bold 12px 'Courier New', monospace";
        ctx.fillStyle = isGtd ? '#f5d77f' : '#9e8fae';
        ctx.fillText('EXP: 12/2026', 162, 114);

        ctx.textAlign = 'right';
        ctx.font = "bold 32px 'Courier New', monospace";
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`APE-${cleanBrokerId}`, W - 40, 38);

        ctx.font = "bold 13px 'Courier New', monospace";
        ctx.fillStyle = '#FFD700';
        ctx.fillText(isGtd ? 'CLASS: 👑 GTD TIER 1' : 'CLASS: 5★ BROKER', W - 40, 114);

        // 6. Left Photo Frame
        const photoX = 40;
        const photoY = 180;
        const photoW = 275;
        const photoH = 390;

        // Photo Frame Border & Background
        ctx.fillStyle = '#0a0612';
        ctx.fillRect(photoX, photoY, photoW, photoH);
        ctx.strokeStyle = isGtd ? '#FFD700' : '#4a3765';
        ctx.lineWidth = 4;
        ctx.strokeRect(photoX, photoY, photoW, photoH);

        // Draw the ApeBroker NFT Image
        try {
          ctx.drawImage(img, photoX + 6, photoY + 6, photoW - 12, photoH - 12);
        } catch (e) {}

        // Photo inner corner gold accents
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = isGtd ? 2 : 1.5;
        ctx.strokeRect(photoX + 10, photoY + 10, photoW - 20, photoH - 20);

        // Photo badge top left
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(photoX + 14, photoY + 14, isGtd ? 140 : 110, 24);
        ctx.font = "bold 10px 'Press Start 2P', monospace, sans-serif";
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          isGtd ? `👑 GOLD APE #${gtdArtId || 1}` : `APE #${gifId}`,
          photoX + (isGtd ? 84 : 69),
          photoY + 26
        );

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
        ctx.fillStyle = isGtd ? '#FFD700' : '#c7b299';
        ctx.fillText(
          isGtd
            ? '👑 GUARANTEED VIP FLOOR, ROBINHOOD NETWORK'
            : 'APEBROKERS TRADING FLOOR, ROBINHOOD NETWORK',
          infoX,
          infoY + 36
        );

        // Divider below affiliation
        ctx.strokeStyle = isGtd ? '#664d00' : '#3d2e54';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(infoX, infoY + 66);
        ctx.lineTo(W - 40, infoY + 66);
        ctx.stroke();

        // 8. Stats & Spec Grid (3-column layout)
        const col1X = infoX;
        const col2X = infoX + 210;
        const col3X = infoX + 410;

        const renderCell = (label, val, x, y, valColor = '#f0e6d2') => {
          ctx.font = "bold 11px 'Courier New', monospace";
          ctx.fillStyle = isGtd ? '#e6c35c' : '#9e8fae';
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
        renderCell('STATUS:', isGtd ? '👑 GTD APPROVED' : 'UNDER REVIEW', col3X, row1Y, '#FFD700');

        // Row 2: WALLET (spanning col 1 & 2) | ALLOCATION
        renderCell('WALLET:', shortWallet, col1X, row2Y, '#FFFFFF');
        renderCell('ALLOCATION:', isGtd ? '👑 GUARANTEED (GTD)' : 'APPLIED', col3X, row2Y, isGtd ? '#FFD700' : '#00DDFF');

        // Row 3: ROLE | ACCESS | DOB
        renderCell('ROLE:', isGtd ? '👑 GTD BROKER' : 'APPLICANT', col1X, row3Y, isGtd ? '#FFD700' : '#f0e6d2');
        renderCell('ACCESS:', isGtd ? 'GUARANTEED' : 'PENDING', col2X, row3Y, isGtd ? '#00FF66' : '#FFD700');
        renderCell('DOB:', '2026/RH', col3X, row3Y, '#FF2247');

        // 9. Bottom Footer Bar
        const footerY = infoY + 276;
        ctx.strokeStyle = isGtd ? '#664d00' : '#3d2e54';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(infoX, footerY);
        ctx.lineTo(W - 40, footerY);
        ctx.stroke();

        // Footer Left: Serial ID
        ctx.font = "bold 11px 'Courier New', monospace";
        ctx.fillStyle = '#8c7b60';
        ctx.fillText(
          isGtd
            ? `APE-RH-GTD-5555 // #${cleanBrokerId}`
            : `APE-RH-5555 // #${cleanBrokerId}`,
          infoX,
          footerY + 16
        );

        // Footer Right: Signature & Stamp
        ctx.font = "italic 26px 'Brush Script MT', 'Dancing Script', 'Lucida Handwriting', cursive, serif";
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'right';
        ctx.fillText('ApeBrokers Executive', W - 150, footerY + 10);

        // 10. Official Gold Watermark Stamp (bottom right corner)
        ctx.save();
        ctx.translate(W - 85, footerY + 22);
        ctx.rotate((-8 * Math.PI) / 180);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-46, -13, 92, 26);
        ctx.font = "bold 8px 'Press Start 2P', monospace, sans-serif";
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isGtd ? '👑 GTD PASS' : 'RECEIVED', 0, 0);
        ctx.restore();

        ctx.restore();

        // 11. Trigger PNG file download
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = isGtd
          ? `ApeBrokers_GOLDEN_GTD_Pass_${cleanBrokerId}.png`
          : `ApeBrokers_Identification_${cleanBrokerId}.png`;
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
