import React, { useState, useEffect } from 'react';
import { sound } from '../utils/audio';
import { FEATURED_BROKERS } from '../utils/nftData';

export const PixelOffice = ({ onOpenTerminal, onOpenAbout, onOpenGallery, onOpenRules }) => {
  const [hoveredAction, setHoveredAction] = useState('EXPLORE THE BROKER FLOOR');
  const [isBlinking, setIsBlinking] = useState(false);
  const [clockSec, setClockSec] = useState(0);
  const [activeBrokerIdx, setActiveBrokerIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(sound.isMuted());

  useEffect(() => {
    const clockTimer = setInterval(() => setClockSec((prev) => (prev + 1) % 60), 1000);
    const blinkTimer = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 220);
    }, 3800);
    const galleryTimer = setInterval(() => {
      setActiveBrokerIdx((prev) => (prev + 1) % FEATURED_BROKERS.length);
    }, 2800);

    return () => {
      clearInterval(clockTimer);
      clearInterval(blinkTimer);
      clearInterval(galleryTimer);
    };
  }, []);

  const handleHover = (act) => {
    setHoveredAction(act);
    sound.playBlip();
  };

  const handleLeave = () => {
    setHoveredAction('EXPLORE THE BROKER FLOOR');
  };

  const handleToggleAudio = () => {
    const next = !isMuted;
    sound.setMuted(next);
    setIsMuted(next);
    if (!next) sound.playClick();
  };

  const handleDoorClick = () => {
    sound.playClick();
    window.open('https://x.com', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0A0514] select-none flex flex-col justify-between">
      {/* 16-Bit CRT Scanlines Overlay */}
      <div className="absolute inset-0 retro-scanlines pointer-events-none z-40 opacity-25" />

      {/* Ambient Floating Dust Motes */}
      <div className="absolute top-1/4 left-1/5 w-2 h-2 bg-neon-lime/50 animate-pixel-float pointer-events-none z-10" />
      <div className="absolute top-1/3 right-1/4 w-2.5 h-2.5 bg-broker-gold/50 animate-pixel-float-rev pointer-events-none z-10" />
      <div className="absolute top-2/3 left-1/3 w-1.5 h-1.5 bg-broker-cyan/60 animate-pixel-float pointer-events-none z-10" />
      <div className="absolute top-1/2 right-1/6 w-2 h-2 bg-broker-crimson/40 animate-pixel-float-rev pointer-events-none z-10" />

      {/* ================= HIGH-DETAIL RETRO 16-BIT HUD BAR (TOP) ================= */}
      <div className="relative z-30 w-full px-3 py-1.5 sm:px-6 sm:py-2 bg-broker-black/95 border-b-4 border-black flex items-center justify-between gap-2 shadow-pixel-md">
        {/* Left: Dynamic Interactive Cursor Command Feed */}
        <div className="flex items-center gap-2 sm:gap-3 font-pixel text-xs sm:text-sm">
          <span className="w-3 h-3 bg-neon-lime inline-block animate-blink shadow-[0_0_8px_#00FF66]" />
          <span className="text-broker-gold font-bold">&gt;</span>
          <span className="text-neon-lime tracking-wider font-extrabold uppercase drop-shadow-[0_2px_0_#000000]">
            {hoveredAction}
          </span>
        </div>

        {/* Right: Sound Radio & Direct Whitelist CTA */}
        <div className="flex items-center gap-2 font-pixel text-[9px] sm:text-[10px]">
          <button
            type="button"
            onClick={handleToggleAudio}
            onMouseEnter={() => handleHover('RADIO: TOGGLE 8-BIT STEREO SOUND FX')}
            onMouseLeave={handleLeave}
            className={`pixel-btn px-2.5 sm:px-3 py-1.5 flex items-center gap-1.5 ${
              isMuted ? 'bg-broker-card text-gray-400' : 'bg-broker-gold text-broker-black'
            }`}
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              {isMuted ? (
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27l4.73 4.73H4v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              ) : (
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              )}
            </svg>
            <span className="hidden sm:inline">{isMuted ? 'MUTED' : 'AUDIO ON'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playZoom();
              onOpenTerminal();
            }}
            onMouseEnter={() => handleHover('LAUNCH WHITELIST APPLICATION TERMINAL')}
            onMouseLeave={handleLeave}
            className="pixel-btn bg-neon-lime text-broker-black px-3.5 sm:px-5 py-1.5 font-extrabold hover:bg-neon-lime-light animate-pulse shadow-[0_0_12px_#00FF66]"
          >
            [ ▶ APPLY FOR WL ]
          </button>
        </div>
      </div>

      {/* ================= HIGH-DETAIL 16-BIT BROKER OFFICE VIEWPORT ================= */}
      <div className="relative flex-grow w-full h-full flex items-center justify-center p-0 overflow-hidden">
        <svg
          viewBox="0 0 1440 820"
          className="w-full h-full object-fill block"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Ceiling Conduit & Structural Ribs */}
            <pattern id="ceilingPanels" width="60" height="30" patternUnits="userSpaceOnUse">
              <rect width="60" height="30" fill="#0D0717" />
              <rect x="0" y="0" width="60" height="3" fill="#1A0F2E" />
              <rect x="0" y="27" width="60" height="3" fill="#07030C" />
              <line x1="0" y1="0" x2="0" y2="30" stroke="#1F1238" strokeWidth="2" />
              <line x1="59" y1="0" x2="59" y2="30" stroke="#06020A" strokeWidth="1" />
            </pattern>

            {/* Shaded Wallpaper with Wainscoting Damask Motif */}
            <pattern id="ornateWallGrid" width="32" height="32" patternUnits="userSpaceOnUse">
              <rect width="32" height="32" fill="#1B0F30" />
              <rect x="0" y="0" width="32" height="1" fill="#2A184A" />
              <rect x="0" y="31" width="32" height="1" fill="#10081E" />
              <rect x="0" y="0" width="1" height="32" fill="#2A184A" />
              <rect x="31" y="0" width="1" height="32" fill="#10081E" />
              {/* Inner Diamond Shading */}
              <polygon points="16,6 26,16 16,26 6,16" fill="#150B26" />
              <polygon points="16,10 22,16 16,22 10,16" fill="#24143F" />
              <rect x="15" y="15" width="2" height="2" fill="#FFD700" opacity="0.6" />
            </pattern>

            {/* High-Detail 16-Bit Herringbone Wood Parquet Floor */}
            <pattern id="detailedParquet" width="64" height="32" patternUnits="userSpaceOnUse">
              {/* Plank 1 */}
              <rect x="0" y="0" width="32" height="16" fill="#42220D" />
              <rect x="0" y="0" width="32" height="2" fill="#5A3013" />
              <rect x="0" y="14" width="32" height="2" fill="#281206" />
              <line x1="0" y1="0" x2="0" y2="16" stroke="#5A3013" strokeWidth="1" />
              <line x1="31" y1="0" x2="31" y2="16" stroke="#1B0B03" strokeWidth="1" />
              <line x1="6" y1="5" x2="24" y2="5" stroke="#331808" strokeWidth="1" />
              <line x1="10" y1="10" x2="28" y2="10" stroke="#331808" strokeWidth="1" />

              {/* Plank 2 */}
              <rect x="32" y="16" width="32" height="16" fill="#3D1F0C" />
              <rect x="32" y="16" width="32" height="2" fill="#542C12" />
              <rect x="32" y="30" width="32" height="2" fill="#220F05" />
              <line x1="32" y1="16" x2="32" y2="32" stroke="#542C12" strokeWidth="1" />
              <line x1="63" y1="16" x2="63" y2="32" stroke="#180A03" strokeWidth="1" />
              <line x1="38" y1="21" x2="56" y2="21" stroke="#2D1507" strokeWidth="1" />
              <line x1="42" y1="26" x2="58" y2="26" stroke="#2D1507" strokeWidth="1" />

              {/* Plank 3 */}
              <rect x="32" y="0" width="32" height="16" fill="#48260F" />
              <rect x="32" y="0" width="32" height="2" fill="#613416" />
              <rect x="32" y="14" width="32" height="2" fill="#2D1507" />

              {/* Plank 4 */}
              <rect x="0" y="16" width="32" height="16" fill="#381C0B" />
              <rect x="0" y="16" width="32" height="2" fill="#4E2810" />
              <rect x="0" y="30" width="32" height="2" fill="#1F0E04" />
            </pattern>
          </defs>

          {/* ================= 1. CEILING, STEEL BEAMS & CONDUITS ================= */}
          <rect x="0" y="0" width="1440" height="90" fill="url(#ceilingPanels)" />
          {/* Main Structural I-Beam */}
          <rect x="0" y="78" width="1440" height="14" fill="#221438" stroke="#000000" strokeWidth="2" />
          <rect x="0" y="82" width="1440" height="6" fill="#160C26" />
          <line x1="0" y1="79" x2="1440" y2="79" stroke="#382458" strokeWidth="2" />
          {/* Rivets along I-Beam */}
          {[60, 180, 300, 420, 540, 660, 780, 900, 1020, 1140, 1260, 1380].map((rx) => (
            <circle key={rx} cx={rx} cy="85" r="2" fill="#FFD700" opacity="0.7" />
          ))}

          {/* Ventilation Duct Pipes */}
          <rect x="0" y="18" width="1440" height="16" fill="#1F242E" stroke="#0F1217" strokeWidth="2" />
          <rect x="0" y="22" width="1440" height="8" fill="#2D3442" />
          {[120, 280, 460, 680, 920, 1160, 1340].map((dx) => (
            <rect key={dx} x={dx} y="16" width="8" height="20" fill="#3F495C" stroke="#0A0D12" strokeWidth="1" />
          ))}

          {/* Hanging Industrial High-Bay Lamps with Pixel Glow Cones */}
          {/* Left Lamp */}
          <g>
            <line x1="380" y1="0" x2="380" y2="46" stroke="#0A0D12" strokeWidth="3" />
            <line x1="420" y1="0" x2="420" y2="46" stroke="#0A0D12" strokeWidth="3" />
            <polygon points="360,62 440,62 425,46 375,46" fill="#2A303D" stroke="#000000" strokeWidth="2" />
            <rect x="368" y="62" width="64" height="6" fill="#FFFAE0" />
            <polygon points="368,68 432,68 550,560 250,560" fill="#FFD700" opacity="0.04" pointerEvents="none" />
          </g>

          {/* Right Lamp */}
          <g>
            <line x1="1020" y1="0" x2="1020" y2="46" stroke="#0A0D12" strokeWidth="3" />
            <line x1="1060" y1="0" x2="1060" y2="46" stroke="#0A0D12" strokeWidth="3" />
            <polygon points="1000,62 1080,62 1065,46 1015,46" fill="#2A303D" stroke="#000000" strokeWidth="2" />
            <rect x="1008" y="62" width="64" height="6" fill="#FFFAE0" />
            <polygon points="1008,68 1072,68 1190,560 890,560" fill="#FFD700" opacity="0.04" pointerEvents="none" />
          </g>

          {/* Hanging Digital LED Trading Ticker Strip */}
          <g transform="translate(540, 20)">
            <rect x="30" y="-12" width="6" height="14" fill="#1A1A1A" />
            <rect x="324" y="-12" width="6" height="14" fill="#1A1A1A" />
            <rect x="0" y="0" width="360" height="44" fill="#050505" stroke="#00FF66" strokeWidth="3" />
            <rect x="4" y="4" width="352" height="36" fill="#021206" />
            <line x1="4" y1="16" x2="356" y2="16" stroke="#04260D" strokeWidth="1" />
            <line x1="4" y1="28" x2="356" y2="28" stroke="#04260D" strokeWidth="1" />
            <text x="14" y="26" fill="#00FF66" fontSize="11" fontFamily="monospace" fontWeight="bold" letterSpacing="1">
              $APE ▲ +420.69% • 5,555 APES • RH_CHAIN
            </text>
            <circle cx="342" cy="22" r="4" fill="#00FF66" className="animate-pulse" />
          </g>

          {/* ================= 2. BACKGROUND WALL & BASEBOARDS ================= */}
          <rect x="0" y="92" width="1440" height="488" fill="url(#ornateWallGrid)" />

          {/* Wainscoting Wooden Molding Trim (Upper & Lower Wall Chair Rail) */}
          <rect x="0" y="420" width="1440" height="14" fill="#301607" stroke="#000000" strokeWidth="2" />
          <line x1="0" y1="422" x2="1440" y2="422" stroke="#52270E" strokeWidth="2" />
          <line x1="0" y1="432" x2="1440" y2="432" stroke="#1A0B03" strokeWidth="2" />
          <rect x="0" y="434" width="1440" height="146" fill="#140B24" />
          {[80, 240, 400, 560, 720, 880, 1040, 1200, 1360].map((px) => (
            <rect key={px} x={px - 60} y="446" width="120" height="122" fill="#1C1032" stroke="#0C0617" strokeWidth="2" />
          ))}

          {/* Heavy Baseboard Molding */}
          <rect x="0" y="574" width="1440" height="16" fill="#3D1E0B" stroke="#000000" strokeWidth="2" />
          <line x1="0" y1="576" x2="1440" y2="576" stroke="#613113" strokeWidth="2" />
          <line x1="0" y1="588" x2="1440" y2="588" stroke="#1C0B03" strokeWidth="2" />

          {/* ================= 3. PARQUET FLOOR ================= */}
          <rect x="0" y="590" width="1440" height="230" fill="url(#detailedParquet)" />

          {/* ================= 4. LEFT SKYLINE WINDOW (NIGHT CITY) ================= */}
          <g>
            <rect x="65" y="115" width="280" height="300" fill="#000000" stroke="#3D1E0B" strokeWidth="6" />
            <rect x="75" y="125" width="260" height="280" fill="#05020D" />
            <rect x="75" y="280" width="260" height="125" fill="#0E061E" />
            <rect x="75" y="340" width="260" height="65" fill="#1A0B33" />

            {/* Stars */}
            <rect x="110" y="145" width="2" height="2" fill="#FFFFFF" />
            <rect x="220" y="135" width="2" height="2" fill="#FFFFFF" />
            <rect x="180" y="160" width="2" height="2" fill="#00F0FF" />
            <rect x="290" y="150" width="2" height="2" fill="#FFD700" />

            {/* Distant Background Towers */}
            <rect x="90" y="230" width="40" height="175" fill="#0F0820" />
            <rect x="150" y="180" width="65" height="225" fill="#180E30" />
            <polygon points="182,130 185,180 179,180" fill="#FFD700" />
            <rect x="235" y="210" width="48" height="195" fill="#130A26" />
            <rect x="290" y="170" width="45" height="235" fill="#1E123D" />

            {/* Foreground Skyscraper Silhouettes */}
            <rect x="80" y="260" width="55" height="145" fill="#221544" />
            <rect x="145" y="210" width="70" height="195" fill="#2C1A57" />
            <polygon points="180,170 183,210 177,210" fill="#FF2247" />
            <circle cx="180" cy="168" r="3" fill="#FF2247" className="animate-pulse" />
            <rect x="225" y="240" width="52" height="165" fill="#221544" />
            <rect x="285" y="220" width="48" height="185" fill="#321E63" />

            {/* Glowing Skyscraper Windows */}
            <rect x="95" y="275" width="4" height="4" fill="#00FF66" />
            <rect x="110" y="275" width="4" height="4" fill="#FFD700" />
            <rect x="95" y="295" width="4" height="4" fill="#00F0FF" />
            <rect x="110" y="295" width="4" height="4" fill="#00FF66" />
            <rect x="160" y="230" width="5" height="5" fill="#FFD700" />
            <rect x="180" y="230" width="5" height="5" fill="#00FF66" />
            <rect x="198" y="230" width="5" height="5" fill="#00F0FF" />
            <rect x="160" y="255" width="5" height="5" fill="#00FF66" />
            <rect x="180" y="255" width="5" height="5" fill="#FFD700" />
            <rect x="198" y="255" width="5" height="5" fill="#00FF66" />
            <rect x="240" y="260" width="4" height="4" fill="#FFD700" />
            <rect x="258" y="260" width="4" height="4" fill="#00FF66" />
            <rect x="240" y="285" width="4" height="4" fill="#00F0FF" />
            <rect x="298" y="240" width="5" height="5" fill="#00FF66" />
            <rect x="314" y="240" width="5" height="5" fill="#FFD700" />

            {/* Window Glass Cross Bars */}
            <rect x="200" y="125" width="10" height="280" fill="#221006" stroke="#000000" strokeWidth="1" />
            <rect x="75" y="260" width="260" height="10" fill="#221006" stroke="#000000" strokeWidth="1" />
          </g>

          {/* ================= 5. RIGHT SKYLINE WINDOW (NIGHT CITY) ================= */}
          <g>
            <rect x="1095" y="115" width="280" height="300" fill="#000000" stroke="#3D1E0B" strokeWidth="6" />
            <rect x="1105" y="125" width="260" height="280" fill="#05020D" />
            <rect x="1105" y="280" width="260" height="125" fill="#0E061E" />
            <rect x="1105" y="340" width="260" height="65" fill="#1A0B33" />

            {/* Stars */}
            <rect x="1140" y="140" width="2" height="2" fill="#FFFFFF" />
            <rect x="1260" y="135" width="2" height="2" fill="#00F0FF" />
            <rect x="1320" y="155" width="2" height="2" fill="#FFD700" />

            {/* Towers */}
            <rect x="1115" y="220" width="50" height="185" fill="#160D2B" />
            <rect x="1180" y="160" width="75" height="245" fill="#241544" />
            <polygon points="1217,110 1220,160 1214,160" fill="#00FF66" />
            <circle cx="1217" cy="108" r="3" fill="#00FF66" className="animate-pulse" />
            <rect x="1270" y="200" width="55" height="205" fill="#1C1036" />
            <rect x="1330" y="180" width="35" height="225" fill="#2C1A57" />

            {/* Foreground Skyscraper Silhouettes */}
            <rect x="1120" y="250" width="65" height="155" fill="#2C1A57" />
            <rect x="1195" y="210" width="68" height="195" fill="#38216E" />
            <rect x="1275" y="230" width="52" height="175" fill="#2C1A57" />

            {/* Lights */}
            <rect x="1135" y="270" width="5" height="5" fill="#FFD700" />
            <rect x="1155" y="270" width="5" height="5" fill="#00FF66" />
            <rect x="1135" y="295" width="5" height="5" fill="#00F0FF" />
            <rect x="1210" y="230" width="5" height="5" fill="#00FF66" />
            <rect x="1232" y="230" width="5" height="5" fill="#FFD700" />
            <rect x="1210" y="255" width="5" height="5" fill="#00F0FF" />
            <rect x="1232" y="255" width="5" height="5" fill="#00FF66" />
            <rect x="1290" y="250" width="4" height="4" fill="#FFD700" />
            <rect x="1308" y="250" width="4" height="4" fill="#00FF66" />

            {/* Cross Bars */}
            <rect x="1230" y="125" width="10" height="280" fill="#221006" stroke="#000000" strokeWidth="1" />
            <rect x="1105" y="260" width="260" height="10" fill="#221006" stroke="#000000" strokeWidth="1" />
          </g>

          {/* ================= 6. WALL CLOCK (SWISS RETRO ANALOG) ================= */}
          <g transform="translate(720, 115)">
            <circle cx="0" cy="0" r="32" fill="#050505" stroke="#FFD700" strokeWidth="5" />
            <circle cx="0" cy="0" r="26" fill="#FFFDF0" stroke="#333333" strokeWidth="2" />
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <line
                key={deg}
                x1={20 * Math.sin((deg * Math.PI) / 180)}
                y1={-20 * Math.cos((deg * Math.PI) / 180)}
                x2={24 * Math.sin((deg * Math.PI) / 180)}
                y2={-24 * Math.cos((deg * Math.PI) / 180)}
                stroke="#000000"
                strokeWidth={deg % 90 === 0 ? '3' : '1.5'}
              />
            ))}
            <line x1="0" y1="0" x2="0" y2="-15" stroke="#000000" strokeWidth="4" strokeLinecap="round" />
            <line
              x1="0"
              y1="0"
              x2={18 * Math.sin((clockSec * 6 * Math.PI) / 180)}
              y2={-18 * Math.cos((clockSec * 6 * Math.PI) / 180)}
              stroke="#FF2247"
              strokeWidth="2"
            />
            <circle cx="0" cy="0" r="3.5" fill="#000000" />
          </g>

          {/* ================= 7. LEFT SECTION: HEAVY STEEL FILING CABINET (RULES) ================= */}
          <g
            className="cursor-pointer group"
            onClick={onOpenRules}
            onMouseEnter={() => handleHover('FILING CABINET: OPEN 5 BROKER RULES DOSSIER')}
            onMouseLeave={handleLeave}
          >
            <rect x="45" y="370" width="145" height="295" fill="#232830" stroke="#000000" strokeWidth="6" className="group-hover:stroke-broker-gold transition-colors" />
            <line x1="47" y1="372" x2="188" y2="372" stroke="#4A5466" strokeWidth="3" />
            <line x1="47" y1="372" x2="47" y2="663" stroke="#4A5466" strokeWidth="3" />
            <line x1="188" y1="372" x2="188" y2="663" stroke="#12151A" strokeWidth="3" />

            {[0, 1, 2, 3].map((idx) => {
              const dy = 384 + idx * 68;
              return (
                <g key={idx}>
                  <rect x="55" y={dy} width="125" height="60" fill="#2E3540" stroke="#000000" strokeWidth="3" />
                  <line x1="57" y1={dy + 2} x2="178" y2={dy + 2} stroke="#4C5769" strokeWidth="2" />
                  <line x1="57" y1={dy + 58} x2="178" y2={dy + 58} stroke="#181C22" strokeWidth="2" />
                  <rect x="70" y={dy + 12} width="40" height="16" fill="#D0D6E0" stroke="#000000" strokeWidth="1.5" />
                  <rect x="74" y={dy + 15} width="32" height="10" fill="#FFFFFF" />
                  <line x1="78" y1={dy + 20} x2="102" y2="20" stroke="#000000" strokeWidth="1" />
                  <rect x="118" y={dy + 22} width="38" height="12" fill="#FFD700" stroke="#000000" strokeWidth="2" />
                  <rect x="122" y={dy + 25} width="30" height="6" fill="#FFA500" />
                </g>
              );
            })}

            <rect x="65" y="350" width="85" height="20" fill="#FFD700" stroke="#000000" strokeWidth="3" />
            <rect x="58" y="332" width="98" height="18" fill="#00FF66" stroke="#000000" strokeWidth="3" />
            <rect x="70" y="316" width="78" height="16" fill="#FF2247" stroke="#000000" strokeWidth="3" />
            <rect x="75" y="302" width="68" height="14" fill="#FFFFFF" stroke="#000000" strokeWidth="3" />
            <text x="75" y="345" fill="#000000" fontSize="8" fontFamily="monospace" fontWeight="bold">
              RULES // WL
            </text>
          </g>

          {/* ================= 8. RIGHT SECTION: WALL BULLETIN BOARD (ABOUT) ================= */}
          <g
            className="cursor-pointer group"
            onClick={onOpenAbout}
            onMouseEnter={() => handleHover('WALL BULLETIN: ABOUT APEBROKERS & SPECS')}
            onMouseLeave={handleLeave}
          >
            <rect x="840" y="110" width="215" height="180" fill="#6E3C17" stroke="#000000" strokeWidth="6" className="group-hover:stroke-broker-gold transition-colors" />
            <rect x="852" y="122" width="191" height="156" fill="#A86832" stroke="#42210B" strokeWidth="3" />
            <rect x="856" y="126" width="183" height="148" fill="#C27E42" />

            <rect x="868" y="136" width="75" height="62" fill="#FFFDF0" stroke="#000000" strokeWidth="2" />
            <circle cx="905" cy="140" r="4" fill="#FF2247" stroke="#000000" strokeWidth="1" />
            <line x1="876" y1="155" x2="934" y2="155" stroke="#333333" strokeWidth="2.5" />
            <line x1="876" y1="168" x2="926" y2="168" stroke="#333333" strokeWidth="2.5" />
            <line x1="876" y1="181" x2="916" y2="181" stroke="#333333" strokeWidth="2.5" />

            <rect x="955" y="142" width="78" height="65" fill="#031407" stroke="#00FF66" strokeWidth="2.5" />
            <circle cx="994" cy="146" r="4" fill="#FFD700" stroke="#000000" strokeWidth="1" />
            <line x1="964" y1="190" x2="978" y2="168" stroke="#00FF66" strokeWidth="3" />
            <line x1="978" y1="168" x2="996" y2="178" stroke="#00FF66" strokeWidth="3" />
            <line x1="996" y1="178" x2="1024" y2="154" stroke="#00FF66" strokeWidth="3" />
            <rect x="1020" y="150" width="6" height="6" fill="#00FF66" />

            <rect x="868" y="214" width="158" height="56" fill="#220638" stroke="#FFD700" strokeWidth="2.5" />
            <text x="878" y="236" fill="#FFD700" fontSize="10" fontFamily="monospace" fontWeight="bold">
              ABOUT APEBROKERS
            </text>
            <text x="878" y="256" fill="#00FF66" fontSize="9" fontFamily="monospace">
              5,555 SUPPLY • [READ]
            </text>
          </g>

          {/* ================= 9. RIGHT SECTION: HEAVY REINFORCED STEEL VAULT (10 NFTS) ================= */}
          <g
            className="cursor-pointer group"
            onClick={onOpenGallery}
            onMouseEnter={() => handleHover('BROKER VAULT: 10 FEATURED COLLECTION NFTS')}
            onMouseLeave={handleLeave}
          >
            <rect x="1125" y="370" width="205" height="255" fill="#1B1F26" stroke="#000000" strokeWidth="7" className="group-hover:stroke-neon-lime transition-colors" />
            <line x1="1128" y1="373" x2="1327" y2="373" stroke="#3D4554" strokeWidth="3" />
            <line x1="1128" y1="373" x2="1128" y2="622" stroke="#3D4554" strokeWidth="3" />
            {[1140, 1175, 1210, 1245, 1280, 1315].map((vx) => (
              <React.Fragment key={vx}>
                <circle cx={vx} cy="382" r="3" fill="#5A657A" stroke="#000000" strokeWidth="1" />
                <circle cx={vx} cy="615" r="3" fill="#5A657A" stroke="#000000" strokeWidth="1" />
              </React.Fragment>
            ))}

            <rect x="1142" y="392" width="171" height="216" fill="#2B313D" stroke="#000000" strokeWidth="3" />

            <rect x="1160" y="406" width="135" height="110" fill="#000000" stroke="#00F0FF" strokeWidth="3.5" />
            <image
              href={FEATURED_BROKERS[activeBrokerIdx].image}
              x="1175"
              y="411"
              width="105"
              height="100"
              preserveAspectRatio="xMidYMid slice"
            />
            <line x1="1160" y1="450" x2="1295" y2="450" stroke="#00F0FF" strokeWidth="1" opacity="0.5" />

            <circle cx="1228" cy="552" r="28" fill="#D65A31" stroke="#000000" strokeWidth="4" />
            <circle cx="1228" cy="552" r="18" fill="#FFD700" stroke="#B8860B" strokeWidth="2" />
            <rect x="1224" y="530" width="8" height="44" fill="#000000" />
            <rect x="1206" y="548" width="44" height="8" fill="#000000" />

            <rect x="1155" y="590" width="145" height="16" fill="#000000" stroke="#00FF66" strokeWidth="1.5" />
            <text x="1162" y="602" fill="#00FF66" fontSize="8" fontFamily="monospace" fontWeight="bold">
              10 BROKERS [INSPECT]
            </text>
          </g>

          {/* ================= 10. RIGHT SECTION: EXECUTIVE WALNUT DOOR ================= */}
          <g
            className="cursor-pointer group"
            onClick={handleDoorClick}
            onMouseEnter={() => handleHover('EXECUTIVE DOOR: EXIT TO OFFICIAL X')}
            onMouseLeave={handleLeave}
          >
            <rect x="1335" y="170" width="105" height="450" fill="#3D1E0B" stroke="#000000" strokeWidth="6" />
            <line x1="1338" y1="173" x2="1437" y2="173" stroke="#613113" strokeWidth="3" />

            <rect x="1348" y="190" width="80" height="195" fill="#241105" stroke="#000000" strokeWidth="3" />
            <line x1="1350" y1="192" x2="1426" y2="192" stroke="#452109" strokeWidth="2" />

            <rect x="1348" y="410" width="80" height="195" fill="#241105" stroke="#000000" strokeWidth="3" />
            <line x1="1350" y1="412" x2="1426" y2="412" stroke="#452109" strokeWidth="2" />

            <rect x="1352" y="390" width="14" height="28" fill="#FFD700" stroke="#000000" strokeWidth="2" />
            <circle cx="1359" cy="398" r="8" fill="#FFA500" stroke="#000000" strokeWidth="2" />
            <rect x="1357" y="408" width="4" height="6" fill="#000000" />

            <rect x="1354" y="255" width="68" height="30" fill="#FFD700" stroke="#000000" strokeWidth="2" />
            <text x="1360" y="274" fill="#000000" fontSize="8" fontFamily="monospace" fontWeight="bold">
              X / EXIT
            </text>
          </g>

          {/* ================= 11. CENTER: EXECUTIVE LEATHER CHAIR & APE BROKER ================= */}
          <g>
            <rect x="630" y="190" width="180" height="255" fill="#150324" stroke="#000000" strokeWidth="7" />
            <rect x="644" y="204" width="152" height="145" fill="#2C0B4A" stroke="#481675" strokeWidth="3" />
            <rect x="658" y="218" width="124" height="118" fill="#3D1066" />
            {[680, 720, 760].map((cx) => (
              <React.Fragment key={cx}>
                <circle cx={cx} cy="245" r="3" fill="#1B032E" stroke="#5C1999" strokeWidth="1" />
                <circle cx={cx} cy="285" r="3" fill="#1B032E" stroke="#5C1999" strokeWidth="1" />
              </React.Fragment>
            ))}
          </g>

          {/* HIGH-DETAIL APE BROKER CHARACTER */}
          <g transform="translate(645, 155)">
            <rect x="20" y="0" width="110" height="125" fill="#6B3314" stroke="#000000" strokeWidth="4" />
            <rect x="24" y="4" width="102" height="16" fill="#8A421A" />

            <rect x="0" y="34" width="20" height="46" fill="#6B3314" stroke="#000000" strokeWidth="3" />
            <rect x="6" y="43" width="10" height="24" fill="#D99B6A" />
            <rect x="130" y="34" width="20" height="46" fill="#6B3314" stroke="#000000" strokeWidth="3" />
            <rect x="134" y="43" width="10" height="24" fill="#D99B6A" />

            <rect x="34" y="66" width="82" height="54" fill="#D99B6A" stroke="#000000" strokeWidth="2" />
            <rect x="38" y="70" width="74" height="12" fill="#E5B288" />
            <rect x="56" y="78" width="9" height="8" fill="#3D190B" />
            <rect x="85" y="78" width="9" height="8" fill="#3D190B" />
            <rect x="52" y="102" width="46" height="6" fill="#3D190B" />

            {/* 3D Glasses with Specular Highlighting */}
            {isBlinking ? (
              <g>
                <rect x="28" y="36" width="44" height="7" fill="#050505" />
                <rect x="78" y="36" width="44" height="7" fill="#050505" />
              </g>
            ) : (
              <g>
                <rect x="26" y="26" width="46" height="34" fill="#080808" stroke="#000000" strokeWidth="3.5" />
                <rect x="78" y="26" width="46" height="34" fill="#080808" stroke="#000000" strokeWidth="3.5" />
                <rect x="66" y="35" width="18" height="9" fill="#FFD700" stroke="#000000" strokeWidth="2" />

                <rect x="32" y="32" width="16" height="14" fill="#FF2247" />
                <rect x="32" y="32" width="5" height="5" fill="#FFFFFF" />

                <rect x="86" y="32" width="16" height="14" fill="#00F0FF" />
                <rect x="86" y="32" width="5" height="5" fill="#FFFFFF" />
              </g>
            )}

            <rect x="12" y="122" width="126" height="120" fill="#140821" stroke="#000000" strokeWidth="4.5" />
            {[26, 40, 54, 96, 110, 124].map((lx) => (
              <line key={lx} x1={lx} y1="122" x2={lx} y2="242" stroke="#31174F" strokeWidth="3" />
            ))}

            <polygon points="58,122 92,122 75,158" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
            <polygon points="67,132 83,132 85,186 75,198 65,186" fill="#FFD700" stroke="#000000" strokeWidth="2" />
            <line x1="75" y1="136" x2="75" y2="192" stroke="#E5B200" strokeWidth="2" />
          </g>

          {/* ================= 12. MAIN EXECUTIVE MAHOGANY DESK ================= */}
          <g>
            <rect x="290" y="390" width="860" height="285" fill="#221206" stroke="#000000" strokeWidth="8" />
            <rect x="298" y="398" width="844" height="34" fill="#4A280F" />
            <line x1="298" y1="400" x2="1142" y2="400" stroke="#703E19" strokeWidth="3" />
            <rect x="298" y="432" width="844" height="235" fill="#301A0A" />

            <rect x="325" y="450" width="195" height="62" fill="#221206" stroke="#000000" strokeWidth="3.5" />
            <rect x="330" y="455" width="185" height="52" fill="#3B200C" />
            <rect x="405" y="476" width="35" height="10" fill="#FFD700" stroke="#000000" strokeWidth="2" />

            <rect x="325" y="528" width="195" height="62" fill="#221206" stroke="#000000" strokeWidth="3.5" />
            <rect x="330" y="533" width="185" height="52" fill="#3B200C" />
            <rect x="405" y="554" width="35" height="10" fill="#FFD700" stroke="#000000" strokeWidth="2" />

            <rect x="920" y="450" width="195" height="62" fill="#221206" stroke="#000000" strokeWidth="3.5" />
            <rect x="925" y="455" width="185" height="52" fill="#3B200C" />
            <rect x="1000" y="476" width="35" height="10" fill="#FFD700" stroke="#000000" strokeWidth="2" />

            <rect x="920" y="528" width="195" height="62" fill="#221206" stroke="#000000" strokeWidth="3.5" />
            <rect x="925" y="533" width="185" height="52" fill="#3B200C" />
            <rect x="1000" y="554" width="35" height="10" fill="#FFD700" stroke="#000000" strokeWidth="2" />
          </g>

          {/* ================= 13. LEFT CANDLESTICK CRT MONITOR (CLICKABLE) ================= */}
          <g
            className="cursor-pointer group"
            onClick={() => {
              sound.playZoom();
              onOpenTerminal();
            }}
            onMouseEnter={() => handleHover('CANDLESTICK MONITOR: LAUNCH WL APPLICATION')}
            onMouseLeave={handleLeave}
          >
            <rect x="315" y="230" width="215" height="165" fill="#14181F" stroke="#000000" strokeWidth="6" className="group-hover:stroke-neon-lime transition-all" />
            <line x1="318" y1="233" x2="527" y2="233" stroke="#3B4659" strokeWidth="3" />
            <rect x="328" y="243" width="189" height="138" fill="#021206" stroke="#00FF66" strokeWidth="3.5" className="group-hover:fill-[#04240D] transition-colors" />

            <rect x="405" y="395" width="36" height="22" fill="#0A0A0A" stroke="#000000" strokeWidth="3" />
            <rect x="380" y="414" width="86" height="12" fill="#000000" />

            <line x1="345" y1="335" x2="378" y2="295" stroke="#00FF66" strokeWidth="4" />
            <line x1="378" y1="295" x2="425" y2="318" stroke="#00FF66" strokeWidth="4" />
            <line x1="425" y1="318" x2="495" y2="262" stroke="#00FF66" strokeWidth="4" />
            <rect x="488" y="256" width="12" height="12" fill="#00FF66" />

            {[345, 365, 385, 405, 425, 445, 465, 485].map((bx, idx) => (
              <rect key={bx} x={bx} y={350 - (idx % 3) * 6} width="12" height={(idx % 3) * 6 + 8} fill="#00FF66" opacity="0.6" />
            ))}

            <text x="340" y="268" fill="#00FF66" fontSize="12" fontFamily="monospace" fontWeight="bold">
              $APE ▲ +420%
            </text>
            <text x="340" y="370" fill="#FFD700" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
              [ APPLY FOR WL ]
            </text>
          </g>

          {/* ================= 14. RIGHT ORDER BOOK CRT MONITOR (CLICKABLE) ================= */}
          <g
            className="cursor-pointer group"
            onClick={() => {
              sound.playZoom();
              onOpenTerminal();
            }}
            onMouseEnter={() => handleHover('ORDER BOOK MONITOR: LAUNCH WL APPLICATION')}
            onMouseLeave={handleLeave}
          >
            <rect x="910" y="230" width="215" height="165" fill="#14181F" stroke="#000000" strokeWidth="6" className="group-hover:stroke-broker-cyan transition-all" />
            <line x1="913" y1="233" x2="1122" y2="233" stroke="#3B4659" strokeWidth="3" />
            <rect x="923" y="243" width="189" height="138" fill="#01101C" stroke="#00F0FF" strokeWidth="3.5" className="group-hover:fill-[#021F38] transition-colors" />

            <rect x="1000" y="395" width="36" height="22" fill="#0A0A0A" stroke="#000000" strokeWidth="3" />
            <rect x="975" y="414" width="86" height="12" fill="#000000" />

            <rect x="940" y="268" width="85" height="8" fill="#00F0FF" />
            <rect x="1040" y="268" width="62" height="8" fill="#00FF66" />
            <rect x="940" y="282" width="75" height="8" fill="#00F0FF" />
            <rect x="1040" y="282" width="48" height="8" fill="#00FF66" />
            <rect x="940" y="296" width="95" height="8" fill="#00F0FF" />
            <rect x="1040" y="296" width="72" height="8" fill="#FF2247" />
            <rect x="940" y="310" width="80" height="8" fill="#00F0FF" />
            <rect x="1040" y="310" width="56" height="8" fill="#00FF66" />

            <text x="940" y="346" fill="#00F0FF" fontSize="11" fontFamily="monospace" fontWeight="bold">
              RH_CHAIN: 5555
            </text>
            <text x="940" y="370" fill="#00FF66" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
              [ APPLY FOR WL ]
            </text>
          </g>

          {/* Clean Executive Desk Surface (Clickable Terminal Shortcut) */}
          <g
            className="cursor-pointer group"
            onClick={() => {
              sound.playZoom();
              onOpenTerminal();
            }}
            onMouseEnter={() => handleHover('BROKER DESK: LAUNCH WHITELIST APPLICATION')}
            onMouseLeave={handleLeave}
          >
            <rect x="520" y="400" width="400" height="90" fill="transparent" />
          </g>
        </svg>
      </div>

      {/* ================= 17. BOTTOM RETRO ADVENTURE NAVIGATION BAR ================= */}
      <div className="relative z-30 w-full px-3 sm:px-6 py-2 bg-broker-black border-t-4 border-black flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 font-pixel text-[8px] sm:text-[10px] text-broker-gold shadow-pixel-lg">
        <div className="flex items-center gap-2">
          <span className="text-neon-lime font-bold">APEBROKERS TRADING FLOOR</span>
          <span className="text-gray-500 hidden sm:inline">|</span>
          <span className="text-broker-white hidden sm:inline">ROBINHOOD CHAIN PROTOCOL</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-6 flex-wrap">
          <button
            onClick={onOpenGallery}
            onMouseEnter={() => handleHover('BROKER VAULT: INSPECT 10 OFFICIAL COLLECTION NFTS')}
            onMouseLeave={handleLeave}
            className="text-neon-lime hover:text-broker-gold transition-colors"
          >
            [ ★ 10 BROKERS VAULT ]
          </button>
          <button
            onClick={onOpenAbout}
            onMouseEnter={() => handleHover('WALL BULLETIN: ABOUT APEBROKERS & SPECS')}
            onMouseLeave={handleLeave}
            className="text-broker-cyan hover:text-broker-gold transition-colors"
          >
            [ ⓘ ABOUT PROJECT ]
          </button>
          <button
            onClick={onOpenRules}
            onMouseEnter={() => handleHover('FILING CABINET: 5 BROKER APPLICATION RULES')}
            onMouseLeave={handleLeave}
            className="text-broker-gold hover:text-neon-lime transition-colors"
          >
            [ RULES ]
          </button>
        </div>
      </div>
    </div>
  );
};
