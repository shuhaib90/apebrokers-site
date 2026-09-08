import React, { useState } from 'react';

export const Header = ({ onDeskClick, onStakingClick, onLuckyDrawClick, onApplyClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleFollowX = () => {
    window.open('https://x.com/Apesyndicates', '_blank', 'noopener,noreferrer');
  };

  const handleOpenSea = () => {
    window.open('https://opensea.io/collection/brokerdesk-583588970', '_blank', 'noopener,noreferrer');
  };

  const handleApebroke = () => {
    window.open('https://www.letscash.fun/token/0xe0F384ebCede975342c5431aCad515b4A1B862cc', '_blank', 'noopener,noreferrer');
  };

  const handleDesk = () => {
    setMobileMenuOpen(false);
    if (onDeskClick) onDeskClick();
    else window.location.href = '/brokerdesk';
  };

  const handleStaking = () => {
    setMobileMenuOpen(false);
    if (onStakingClick) onStakingClick();
    else window.location.href = '/staking';
  };

  const handleLuckyDraw = () => {
    setMobileMenuOpen(false);
    if (onLuckyDrawClick) onLuckyDrawClick();
    else window.location.href = '/luckydraw';
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#00FF66] border-b-4 border-black px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 select-none shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Brand */}
        <a href="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0 hover:opacity-90 transition-opacity">
          <img
            src="/logo.png"
            alt="ApeSyndicate Logo"
            className="w-7 h-7 sm:w-9 sm:h-9 object-contain pixelated shrink-0"
          />
          <span className="font-pixel text-[11px] sm:text-sm lg:text-base text-black tracking-wider font-extrabold whitespace-nowrap">
            APESYNDICATE
          </span>
        </a>

        {/* Desktop & Tablet Navigation (visible on md+) */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2 overflow-x-auto no-scrollbar py-0.5">
          {onDeskClick && (
            <button
              type="button"
              onClick={handleDesk}
              aria-label="Ape Broker Desk"
              className="pixel-btn pixel-btn-black px-2 lg:px-2.5 xl:px-3 py-1.5 text-[10px] xl:text-xs whitespace-nowrap font-extrabold text-[#00FF66] bg-black hover:bg-[#111] shadow-[2px_2px_0px_#000] border-2 border-black flex items-center gap-1.5 rounded-md"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66]" />
              <span className="hidden xl:inline">[ BROKERDESK ]</span>
              <span className="xl:hidden">[ DESK ]</span>
            </button>
          )}

          {onStakingClick && (
            <button
              type="button"
              onClick={handleStaking}
              aria-label="Ape Broker Staking"
              className="pixel-btn pixel-btn-black px-2 lg:px-2.5 xl:px-3 py-1.5 text-[10px] xl:text-xs whitespace-nowrap font-extrabold text-[#00F0FF] bg-black hover:bg-[#111] shadow-[2px_2px_0px_#000] border-2 border-black flex items-center gap-1.5 rounded-md"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF]" />
              <span className="hidden lg:inline">[ STAKING ]</span>
              <span className="lg:hidden">[ STAKE ]</span>
            </button>
          )}

          {onLuckyDrawClick && (
            <button
              type="button"
              onClick={handleLuckyDraw}
              aria-label="Ape Broker Lucky Draw (Locked)"
              className="pixel-btn pixel-btn-black px-2 lg:px-2.5 xl:px-3 py-1.5 text-[10px] xl:text-xs whitespace-nowrap font-extrabold text-[#FFD700] bg-black hover:bg-[#111] shadow-[2px_2px_0px_#000] border-2 border-black flex items-center gap-1.5 rounded-md"
              title="Lucky Draw Protocol (Locked for Public)"
            >
              <span className="text-[10px]">🔒</span>
              <span className="hidden xl:inline">[ LUCKY DRAW ]</span>
              <span className="xl:hidden">[ DRAWS ]</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenSea}
            aria-label="OpenSea Collection"
            className="pixel-btn pixel-btn-black px-2 lg:px-2.5 xl:px-3 py-1.5 text-[10px] xl:text-xs whitespace-nowrap font-bold text-white hover:text-[#00FF66] shadow-[2px_2px_0px_#000] border-2 border-black flex items-center gap-1 rounded-md"
          >
            <span className="hidden lg:inline">[ OPENSEA ]</span>
            <span className="lg:hidden">[ OS ]</span>
          </button>

          <button
            type="button"
            onClick={handleApebroke}
            aria-label="Buy $APEBROKE"
            className="pixel-btn pixel-btn-black px-2 lg:px-2.5 xl:px-3 py-1.5 text-[10px] xl:text-xs whitespace-nowrap font-bold text-[#FFD700] hover:bg-[#FFD700] hover:text-black shadow-[2px_2px_0px_#000] border-2 border-black flex items-center gap-1 rounded-md"
          >
            <span className="hidden 2xl:inline">[ BUY NOW $APEBROKE ]</span>
            <span className="hidden lg:inline 2xl:hidden">[ BUY $APEBROKE ]</span>
            <span className="lg:hidden">[ BUY $APE ]</span>
          </button>

          <button
            type="button"
            onClick={handleFollowX}
            aria-label="Official X"
            className="pixel-btn pixel-btn-black px-2 lg:px-2.5 xl:px-3 py-1.5 text-[10px] xl:text-xs whitespace-nowrap font-extrabold text-[#00FF66] shadow-[2px_2px_0px_#000] border-2 border-black flex items-center gap-1 rounded-md"
          >
            <svg className="w-3 h-3 lg:w-3.5 lg:h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="hidden xl:inline">[ OFFICIAL X ]</span>
            <span className="xl:hidden">[ X ]</span>
          </button>
        </nav>

        {/* Mobile Quick Action + Menu Toggle (< md) */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          {onDeskClick && (
            <button
              type="button"
              onClick={handleDesk}
              className="pixel-btn pixel-btn-black px-2.5 py-1.5 text-[9px] font-extrabold text-[#00FF66] bg-black border-2 border-black rounded-md flex items-center gap-1 shadow-[2px_2px_0px_#000]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66]" />
              <span>[ DESK ]</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle Navigation Menu"
            className="pixel-btn pixel-btn-black px-2.5 py-1.5 text-[9px] font-bold text-white bg-black border-2 border-black rounded-md flex items-center gap-1 shadow-[2px_2px_0px_#000]"
          >
            {mobileMenuOpen ? '✕ CLOSE' : '☰ MENU'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2.5 pt-2.5 border-t-2 border-black/30 flex flex-col gap-1.5 font-pixel animate-fadeIn">
          {onDeskClick && (
            <button
              type="button"
              onClick={handleDesk}
              className="w-full text-left px-3 py-2 text-xs font-bold text-[#00FF66] bg-black rounded border-2 border-black flex items-center justify-between shadow-[2px_2px_0px_#000]"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00FF66]" />
                <span>BROKERDESK PROTOCOL</span>
              </span>
              <span className="text-[10px] text-gray-400">↗</span>
            </button>
          )}

          {onStakingClick && (
            <button
              type="button"
              onClick={handleStaking}
              className="w-full text-left px-3 py-2 text-xs font-bold text-[#00F0FF] bg-black rounded border-2 border-black flex items-center justify-between shadow-[2px_2px_0px_#000]"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00F0FF]" />
                <span>STAKING PROTOCOL</span>
              </span>
              <span className="text-[10px] text-gray-400">↗</span>
            </button>
          )}

          {onLuckyDrawClick && (
            <button
              type="button"
              onClick={handleLuckyDraw}
              className="w-full text-left px-3 py-2 text-xs font-bold text-[#FFD700] bg-black rounded border-2 border-black flex items-center justify-between shadow-[2px_2px_0px_#000]"
            >
              <span className="flex items-center gap-2">
                <span>🔒</span>
                <span>LUCKY DRAW (LOCKED)</span>
              </span>
              <span className="text-[10px] text-gray-400">↗</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              handleOpenSea();
            }}
            className="w-full text-left px-3 py-2 text-xs font-bold text-white bg-black rounded border-2 border-black flex items-center justify-between shadow-[2px_2px_0px_#000]"
          >
            <span>OPENSEA COLLECTION</span>
            <span className="text-[10px] text-gray-400">↗</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              handleApebroke();
            }}
            className="w-full text-left px-3 py-2 text-xs font-bold text-[#FFD700] bg-black rounded border-2 border-black flex items-center justify-between shadow-[2px_2px_0px_#000]"
          >
            <span>BUY $APEBROKE TOKEN</span>
            <span className="text-[10px] text-gray-400">↗</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              handleFollowX();
            }}
            className="w-full text-left px-3 py-2 text-xs font-bold text-[#00FF66] bg-black rounded border-2 border-black flex items-center justify-between shadow-[2px_2px_0px_#000]"
          >
            <span>OFFICIAL X (TWITTER)</span>
            <span className="text-[10px] text-gray-400">↗</span>
          </button>
        </div>
      )}
    </header>
  );
};
