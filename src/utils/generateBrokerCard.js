// Utility to generate a horizontal ID-card DataURL matching the official Broker Identification style
export async function generateBrokerCardDataUrl({ brokerId, xUsername, walletAddress, gifId, gifUrl, isGtd, gtdArtId, communityName }) {
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

        // 1. Luxury Background Gradient
        if (isGtd) {
          // Ultra-luxury Deep Obsidian Black & 24K Gold Radial Glow
          const bgGrad = ctx.createLinearGradient(0, 0, W, H);
          bgGrad.addColorStop(0, '#261803');
          bgGrad.addColorStop(0.3, '#140c01');
          bgGrad.addColorStop(0.7, '#0c0700');
          bgGrad.addColorStop(1, '#050300');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, W, H);

          // Radial gold spotlight behind photo
          const radGrad = ctx.createRadialGradient(180, 360, 20, 180, 360, 380);
          radGrad.addColorStop(0, 'rgba(255, 215, 0, 0.14)');
          radGrad.addColorStop(0.6, 'rgba(255, 180, 0, 0.04)');
          radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = radGrad;
          ctx.fillRect(0, 0, W, H);
        } else {
          const bgGrad = ctx.createLinearGradient(0, 0, W, H);
          bgGrad.addColorStop(0, '#1a1028');
          bgGrad.addColorStop(0.5, '#120c1d');
          bgGrad.addColorStop(1, '#090510');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, W, H);
        }

        // Geometric Watermark Grid
        ctx.strokeStyle = isGtd ? 'rgba(255, 215, 0, 0.07)' : 'rgba(255, 215, 0, 0.035)';
        ctx.lineWidth = 1.5;
        for (let x = -100; x < W + 100; x += 50) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + H, H);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, H);
          ctx.lineTo(x + H, 0);
          ctx.stroke();
        }

        // 2. Luxury Outer Card Borders
        if (isGtd) {
          // Metallic 24K Gold Outer Frame
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 7;
          ctx.strokeRect(3, 3, W - 6, H - 6);

          ctx.strokeStyle = '#FFF380';
          ctx.lineWidth = 2;
          ctx.strokeRect(9, 9, W - 18, H - 18);

          ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(14, 14, W - 28, H - 28);

          // 4 Corner Gold Accents
          const cornerSize = 28;
          ctx.fillStyle = '#FFD700';
          // Top Left
          ctx.fillRect(14, 14, cornerSize, 4);
          ctx.fillRect(14, 14, 4, cornerSize);
          // Top Right
          ctx.fillRect(W - 14 - cornerSize, 14, cornerSize, 4);
          ctx.fillRect(W - 18, 14, 4, cornerSize);
          // Bottom Left
          ctx.fillRect(14, H - 18, cornerSize, 4);
          ctx.fillRect(14, H - 14 - cornerSize, 4, cornerSize);
          // Bottom Right
          ctx.fillRect(W - 14 - cornerSize, H - 18, cornerSize, 4);
          ctx.fillRect(W - 18, H - 14 - cornerSize, 4, cornerSize);
        } else {
          ctx.strokeStyle = '#3d2e54';
          ctx.lineWidth = 6;
          ctx.strokeRect(3, 3, W - 6, H - 6);

          ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
          ctx.lineWidth = 2;
          ctx.strokeRect(10, 10, W - 20, H - 20);
        }

        // 3. Top Header Strip
        ctx.fillStyle = isGtd ? '#1c1102' : '#160e24';
        ctx.fillRect(16, 16, W - 32, 136);

        // Header double divider lines
        ctx.strokeStyle = isGtd ? '#D4AF37' : '#4a3765';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(16, 152);
        ctx.lineTo(W - 16, 152);
        ctx.stroke();

        ctx.strokeStyle = isGtd ? '#FFE066' : '#FFD700';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(16, 156);
        ctx.lineTo(W - 16, 156);
        ctx.stroke();

        // 4. Logo Emblem (Top Left)
        const emblemX = 36;
        const emblemY = 24;
        const emblemSize = 110;

        try {
          ctx.drawImage(logoImg, emblemX, emblemY, emblemSize, emblemSize);
        } catch (e) {}

        // 5. Header Titles
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = "900 36px 'Cinzel', 'Times New Roman', Georgia, serif";
        ctx.fillStyle = isGtd ? '#FFFFFF' : '#FFFFFF';
        ctx.fillText('APESYNDICATE', 160, 32);

        if (isGtd) {
          // Luxury Gold Pill Badge for GTD
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(160, 78, 380, 24);
          ctx.font = "900 11px 'Press Start 2P', monospace, sans-serif";
          ctx.fillStyle = '#000000';
          ctx.fillText('👑 GUARANTEED (GTD) SYNDICATE PASS', 170, 84);

          ctx.font = "bold 12px 'Courier New', monospace";
          ctx.fillStyle = '#f5d77f';
          ctx.fillText('EXP: 12/2026  •  ROBINHOOD CHAIN', 162, 116);
        } else {
          ctx.font = "bold 14px 'Cinzel', 'Times New Roman', Georgia, serif";
          ctx.fillStyle = '#c7b299';
          ctx.letterSpacing = '3px';
          ctx.fillText('OFFICIAL SYNDICATE IDENTIFICATION', 162, 78);

          ctx.font = "bold 12px 'Courier New', monospace";
          ctx.fillStyle = '#9e8fae';
          ctx.fillText('EXP: 12/2026', 162, 116);
        }

        // Header Metadata Right (ID, CLASS)
        ctx.textAlign = 'right';
        ctx.font = "bold 34px 'Courier New', monospace";
        ctx.fillStyle = isGtd ? '#FFD700' : '#FFFFFF';
        ctx.fillText(`APE-${cleanBrokerId}`, W - 40, 34);

        if (isGtd) {
          ctx.fillStyle = '#2d1c02';
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 1.5;
          ctx.fillRect(W - 250, 106, 210, 28);
          ctx.strokeRect(W - 250, 106, 210, 28);

          ctx.font = "bold 11px 'Press Start 2P', monospace, sans-serif";
          ctx.fillStyle = '#FFD700';
          ctx.textAlign = 'center';
          ctx.fillText('CLASS: 👑 GTD TIER 1', W - 145, 114);
        } else {
          ctx.font = "bold 13px 'Courier New', monospace";
          ctx.fillStyle = '#FFD700';
          ctx.fillText('CLASS: 5★ BROKER', W - 40, 116);
        }

        // 6. Left Photo Frame
        const photoX = 40;
        const photoY = 178;
        const photoW = 275;
        const photoH = 395;

        // Photo Frame Border & Background
        ctx.fillStyle = '#0a0612';
        ctx.fillRect(photoX, photoY, photoW, photoH);
        ctx.strokeStyle = isGtd ? '#FFD700' : '#4a3765';
        ctx.lineWidth = isGtd ? 5 : 4;
        ctx.strokeRect(photoX, photoY, photoW, photoH);

        // Draw the ApeBroker NFT Image
        try {
          ctx.drawImage(img, photoX + 6, photoY + 6, photoW - 12, photoH - 12);
        } catch (e) {}

        // Photo inner corner gold accents
        ctx.strokeStyle = isGtd ? '#FFE873' : 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = isGtd ? 2 : 1.5;
        ctx.strokeRect(photoX + 10, photoY + 10, photoW - 20, photoH - 20);

        // Photo badge top left
        const badgeW = isGtd ? 160 : 110;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(photoX + 14, photoY + 14, badgeW, 26);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(photoX + 14, photoY + 14, badgeW, 26);

        ctx.font = "bold 10px 'Press Start 2P', monospace, sans-serif";
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          isGtd ? `👑 GOLD APE #${gtdArtId || 1}` : `APE #${gifId}`,
          photoX + 14 + badgeW / 2,
          photoY + 27
        );

        // 7. Right Side Information Block
        const infoX = 350;
        const infoY = 178;

        // Name / Title
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = "900 25px 'Cinzel', 'Times New Roman', Georgia, serif";
        ctx.fillStyle = isGtd ? '#FFF2D6' : '#f0e6d2';
        ctx.fillText(`"THE SYNDICATE" ${cleanUsername.toUpperCase()}`, infoX, infoY);

        // Affiliation
        ctx.font = "bold 14px 'Cinzel', 'Times New Roman', Georgia, serif";
        ctx.fillStyle = isGtd ? '#FFD700' : '#c7b299';
        ctx.fillText(
          isGtd
            ? '👑 GUARANTEED VIP FLOOR  //  ROBINHOOD NETWORK'
            : 'APESYNDICATE FLOOR, ROBINHOOD NETWORK',
          infoX,
          infoY + 36
        );

        // Divider below affiliation
        ctx.strokeStyle = isGtd ? '#805d00' : '#3d2e54';
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
          ctx.fillStyle = isGtd ? '#d9b44a' : '#9e8fae';
          ctx.fillText(label, x, y);

          ctx.font = "bold 15px 'Courier New', monospace";
          ctx.fillStyle = valColor;
          ctx.fillText(val, x, y + 16);
        };

        const row1Y = infoY + 82;
        const row2Y = infoY + 144;
        const row3Y = infoY + 206;

        // Row 1: CHAIN | SUPPLY | STATUS
        renderCell('CHAIN:', 'ROBINHOOD', col1X, row1Y, '#00F0FF');
        renderCell('SUPPLY:', '5,555', col2X, row1Y, '#00FF66');
        renderCell('STATUS:', isGtd ? '👑 GTD APPROVED' : 'UNDER REVIEW', col3X, row1Y, '#FFD700');

        // Row 2: WALLET (spanning col 1 & 2) | ALLOCATION
        renderCell('WALLET:', shortWallet, col1X, row2Y, '#FFFFFF');
        renderCell('ALLOCATION:', isGtd ? '👑 GUARANTEED (GTD)' : 'APPLIED', col3X, row2Y, isGtd ? '#FFD700' : '#00DDFF');

        // Row 3: ROLE | ACCESS | DOB
        renderCell('ROLE:', isGtd ? '👑 VIP SYNDICATE' : 'APPLICANT', col1X, row3Y, isGtd ? '#FFE8A3' : '#f0e6d2');
        renderCell('ACCESS:', isGtd ? 'UNRESTRICTED' : 'PENDING', col2X, row3Y, isGtd ? '#00FFAA' : '#FFD700');
        renderCell('DOB:', '2026 / RH', col3X, row3Y, '#FF3366');

        // 9. Bottom Footer Bar
        const footerY = infoY + 282;
        ctx.strokeStyle = isGtd ? '#805d00' : '#3d2e54';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(infoX, footerY);
        ctx.lineTo(W - 40, footerY);
        ctx.stroke();

        // Footer Left: Serial ID
        ctx.font = "bold 11px 'Courier New', monospace";
        ctx.fillStyle = isGtd ? '#aa8c52' : '#8c7b60';
        ctx.fillText(
          isGtd
            ? `AUTHENTICATED // RH-GTD-5555 // #${cleanBrokerId}`
            : `APE-RH-5555 // #${cleanBrokerId}`,
          infoX,
          footerY + 16
        );

        // Footer Right: Signature & Stamp
        ctx.font = "italic 28px 'Brush Script MT', 'Dancing Script', 'Lucida Handwriting', cursive, serif";
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'right';
        ctx.fillText('ApeSyndicate Executive', W - 160, footerY + 10);

        // 10. Official Gold Watermark Stamp
        ctx.save();
        ctx.translate(W - 85, footerY + 20);
        ctx.rotate((-8 * Math.PI) / 180);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-50, -14, 100, 28);
        ctx.strokeStyle = '#FFE066';
        ctx.lineWidth = 1;
        ctx.strokeRect(-46, -11, 92, 22);

        ctx.font = "bold 8px 'Press Start 2P', monospace, sans-serif";
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isGtd ? '★ GTD PASS ★' : 'RECEIVED', 0, 0);
        ctx.restore();

        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (err) {
        console.error('Error creating ID card image:', err);
        resolve(null);
      }
    };

    img.onload = checkAndRender;
    img.onerror = checkAndRender;
    logoImg.onload = checkAndRender;
    logoImg.onerror = checkAndRender;

    img.src = gifUrl || (isGtd ? `/nfts/gold_${gtdArtId || 1}.png` : '/nfts/1.png');
    logoImg.src = '/logo.png';
  });
}

// Utility to generate and download a horizontal ID-card matching the official Broker Identification style
export async function downloadBrokerCardPng(params) {
  const dataUrl = await generateBrokerCardDataUrl(params);
  if (!dataUrl) return;
  const cleanBrokerId = (params.brokerId || '#0000').replace('#', '');
  const link = document.createElement('a');
  link.download = params.isGtd
    ? `ApeSyndicate_GOLDEN_GTD_Pass_${cleanBrokerId}.png`
    : `ApeSyndicate_Identification_${cleanBrokerId}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Utility to directly download the animated GIF file
export function downloadBrokerGif(gifUrl, gifId) {
  const link = document.createElement('a');
  link.href = gifUrl;
  link.download = `ApeSyndicate_${gifId}.gif`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Dedicated High-Resolution 24K GTD Pass Generator for Code Claimers
export async function generateCodeClaimerCardDataUrl({ brokerId, xUsername, walletAddress, codeName, campaignTag }) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const W = 1200;
    const H = 800;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const cleanBrokerId = (brokerId || '#0000').replace('#', '');
    const cleanUsername = (xUsername || '@broker').trim().replace(/^@/, '');
    const shortWallet = walletAddress
      ? walletAddress.length > 24
        ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}`
        : walletAddress
      : '0x000...000';

    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';

    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';

    let loaded = 0;
    const checkReady = () => {
      loaded++;
      if (loaded >= 2) {
        render();
      }
    };

    const render = () => {
      try {
        ctx.save();

        // 1. Draw Background Vault Artwork
        if (bgImg.complete && bgImg.naturalWidth > 0) {
          ctx.drawImage(bgImg, 0, 0, W, H);
        } else {
          const grad = ctx.createLinearGradient(0, 0, W, H);
          grad.addColorStop(0, '#041208');
          grad.addColorStop(1, '#020503');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, W, H);
        }

        // 2. Cinematic Vignette & Bottom Readability Gradient
        const vigGrad = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 700);
        vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
        vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, W, H);

        const botGrad = ctx.createLinearGradient(0, H - 320, 0, H);
        botGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        botGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.75)');
        botGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
        ctx.fillStyle = botGrad;
        ctx.fillRect(0, H - 320, W, 320);

        // 3. Glowing Neon Green & Gold Outer Frame
        ctx.strokeStyle = '#00FF66';
        ctx.lineWidth = 8;
        ctx.strokeRect(4, 4, W - 8, H - 8);

        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(12, 12, W - 24, H - 24);

        // 4. Top Header HUD Bar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(16, 16, W - 32, 70);
        ctx.strokeStyle = 'rgba(0, 255, 102, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(16, 16, W - 32, 70);

        // Header Logo
        if (logoImg.complete && logoImg.naturalWidth > 0) {
          ctx.drawImage(logoImg, 32, 27, 48, 48);
        }

        // Header Brand Text
        ctx.font = "bold 20px 'Press Start 2P', monospace, sans-serif";
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText('APESYNDICATE', 95, 58);

        ctx.font = "bold 13px 'Courier New', monospace";
        ctx.fillStyle = '#00FF66';
        ctx.fillText('// SECRET CODE REDEMPTION VAULT', 360, 56);

        // Header Right: 100% GTD Pill
        const gtdPillX = W - 340;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(gtdPillX, 28, 305, 45);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeRect(gtdPillX, 28, 305, 45);

        ctx.font = "bold 13px 'Press Start 2P', monospace, sans-serif";
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText('★ 100% GTD PASS ★', gtdPillX + 152, 57);

        // 5. Bottom Left: Information Cyber Panel
        const panelX = 35;
        const panelY = H - 250;
        const panelW = 720;
        const panelH = 200;

        ctx.fillStyle = 'rgba(6, 12, 8, 0.88)';
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = '#00FF66';
        ctx.lineWidth = 3;
        ctx.strokeRect(panelX, panelY, panelW, panelH);

        // Internal gold accent border
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX + 4, panelY + 4, panelW - 8, panelH - 8);

        // Field 1: CODE REDEEMED
        ctx.textAlign = 'left';
        ctx.font = "bold 11px 'Press Start 2P', monospace, sans-serif";
        ctx.fillStyle = '#999999';
        ctx.fillText('REDEEMED CODE:', panelX + 25, panelY + 42);

        ctx.font = "bold 22px 'Press Start 2P', monospace, sans-serif";
        ctx.fillStyle = '#FFD700';
        ctx.fillText(codeName ? `[${codeName}]` : '[VIP-CODE]', panelX + 200, panelY + 44);

        // Field 2: BROKER ID
        ctx.font = "bold 11px 'Press Start 2P', monospace, sans-serif";
        ctx.fillStyle = '#999999';
        ctx.fillText('BROKER ID:', panelX + 25, panelY + 86);

        ctx.font = "bold 18px 'Courier New', monospace";
        ctx.fillStyle = '#00FF66';
        ctx.fillText(`#${cleanBrokerId}`, panelX + 200, panelY + 86);

        // Field 3: X USERNAME
        ctx.font = "bold 11px 'Press Start 2P', monospace, sans-serif";
        ctx.fillStyle = '#999999';
        ctx.fillText('X HANDLE:', panelX + 25, panelY + 128);

        ctx.font = "bold 17px 'Courier New', monospace";
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`@${cleanUsername}`, panelX + 200, panelY + 128);

        // Field 4: WALLET & NETWORK
        ctx.font = "bold 11px 'Press Start 2P', monospace, sans-serif";
        ctx.fillStyle = '#999999';
        ctx.fillText('HOLDER WALLET:', panelX + 25, panelY + 170);

        ctx.font = "bold 15px 'Courier New', monospace";
        ctx.fillStyle = '#00DDFF';
        ctx.fillText(shortWallet, panelX + 200, panelY + 170);

        // 6. Bottom Right: Verification Badge & Stamp
        const stampCenterX = W - 180;
        const stampCenterY = H - 150;

        ctx.save();
        ctx.translate(stampCenterX, stampCenterY);
        ctx.rotate((-10 * Math.PI) / 180);

        ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
        ctx.fillRect(-130, -50, 260, 100);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 4;
        ctx.strokeRect(-130, -50, 260, 100);

        ctx.strokeStyle = '#FFF380';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-123, -43, 246, 86);

        ctx.font = "bold 12px 'Press Start 2P', monospace, sans-serif";
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.fillText('APPROVED', 0, -18);

        ctx.font = "bold 10px 'Press Start 2P', monospace, sans-serif";
        ctx.fillStyle = '#00FF66';
        ctx.fillText('ROBINHOOD CHAIN', 0, 6);

        ctx.font = "bold 8px 'Courier New', monospace";
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('MINT DATE: SEP 3RD', 0, 28);

        ctx.restore();

        // 7. Security Micro-Print / Watermark
        ctx.font = "bold 10px 'Courier New', monospace";
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.textAlign = 'right';
        ctx.fillText(
          `AUTH-HASH // RH-GTD-VAULT-2026 // #${cleanBrokerId} // GUARANTEED`,
          W - 35,
          H - 25
        );

        ctx.restore();

        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (err) {
        console.error('Error rendering code claim card:', err);
        resolve(null);
      }
    };

    bgImg.onload = checkReady;
    bgImg.onerror = checkReady;
    logoImg.onload = checkReady;
    logoImg.onerror = checkReady;

    bgImg.src = '/code_card_bg.jpg';
    logoImg.src = '/logo.png';
  });
}

export async function downloadCodeClaimerCardPng(data) {
  const dataUrl = await generateCodeClaimerCardDataUrl(data);
  if (!dataUrl) return;
  const link = document.createElement('a');
  link.download = `ApeSyndicate_Code_GTD_Pass_${(data.brokerId || '0000').replace('#', '')}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

