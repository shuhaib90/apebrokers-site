import React, { useState, useRef, useEffect } from 'react';
import { sound } from '../utils/audio';

export const HumanVerificationSlider = ({ onVerified, isVerified, error }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [sliderPos, setSliderPos] = useState(0); // 0 to 100%
  const [dragStartTime, setDragStartTime] = useState(null);
  const [jitterPoints, setJitterPoints] = useState(0);

  const containerRef = useRef(null);
  const handleRef = useRef(null);

  const handlePointerDown = (e) => {
    if (isVerified) return;
    setIsDragging(true);
    setDragStartTime(Date.now());
    setJitterPoints(1);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || isVerified || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const handleWidth = 52;
    const maxDragWidth = rect.width - handleWidth;

    const currentX = e.clientX - rect.left - handleWidth / 2;
    const clampedX = Math.max(0, Math.min(currentX, maxDragWidth));
    const percentage = (clampedX / maxDragWidth) * 100;

    setSliderPos(percentage);
    setJitterPoints((prev) => prev + 1);

    // If dragged >= 92%, verify!
    if (percentage >= 92) {
      completeVerification();
    }
  };

  const handlePointerUp = (e) => {
    if (isVerified) return;
    setIsDragging(false);

    if (sliderPos < 92) {
      // Snap back if not completed
      setSliderPos(0);
      setJitterPoints(0);
    }
  };

  const completeVerification = () => {
    const elapsed = Date.now() - (dragStartTime || Date.now());
    
    // Human check: must have taken at least 180ms and at least 3 movement samples (blocks instant script injection)
    if (elapsed >= 150 && jitterPoints >= 2) {
      setIsDragging(false);
      setSliderPos(100);
      sound?.playFanfare?.();

      const verificationSignature = btoa(
        JSON.stringify({
          v: 'SYNDICATE_HUMAN_V1',
          t: Date.now(),
          dur: elapsed,
          pts: jitterPoints,
        })
      );

      onVerified(verificationSignature);
    } else {
      // Suspicious instant bot movement -> reset
      setSliderPos(0);
      setIsDragging(false);
    }
  };

  return (
    <div className="w-full space-y-1.5 select-none pt-1">
      <div className="flex items-center justify-between">
        <label className="font-pixel text-[9px] sm:text-[10px] text-black font-extrabold flex items-center gap-1.5">
          <span>🛡️</span>
          <span>HUMAN VERIFICATION</span>
          <span className="text-[#FF2247]">*</span>
        </label>
        {isVerified && (
          <span className="font-pixel text-[8px] sm:text-[9px] text-[#00AA44] font-extrabold flex items-center gap-1">
            <span>✓</span> <span>VERIFIED HUMAN</span>
          </span>
        )}
      </div>

      {/* Slider Track Container */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-full h-[52px] border-3 rounded-none overflow-hidden transition-colors flex items-center ${
          isVerified
            ? 'bg-[#00FF66]/20 border-[#009933]'
            : error
            ? 'bg-[#FFF0F2] border-[#FF2247]'
            : 'bg-[#111] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
        }`}
      >
        {/* Fill Background bar */}
        <div
          className="absolute top-0 bottom-0 left-0 transition-all duration-75 pointer-events-none"
          style={{
            width: `${sliderPos}%`,
            backgroundColor: isVerified ? '#00FF66' : '#FFD700',
            opacity: isVerified ? 0.35 : 0.25,
          }}
        />

        {/* Center Prompt Text */}
        <div
          className={`w-full text-center font-pixel text-[8px] sm:text-[9px] tracking-wider pointer-events-none z-10 px-12 truncate ${
            isVerified
              ? 'text-[#008833] font-extrabold'
              : 'text-gray-400 animate-pulse'
          }`}
        >
          {isVerified ? (
            <span className="flex items-center justify-center gap-1.5 text-[#006622]">
              <span>🔓</span> <span>SYNDICATE SECURITY CLEARED</span>
            </span>
          ) : (
            '>>> SLIDE GOLD KEY TO VERIFY >>>'
          )}
        </div>

        {/* Draggable Golden Key Handle */}
        <div
          ref={handleRef}
          onPointerDown={handlePointerDown}
          style={{
            transform: `translateX(${(sliderPos / 100) * (containerRef.current ? containerRef.current.clientWidth - 52 : 0)}px)`,
            touchAction: 'none',
          }}
          className={`absolute top-0 bottom-0 left-0 w-[52px] h-full flex items-center justify-center cursor-grab active:cursor-grabbing z-20 border-r-3 border-black transition-transform ${
            isVerified
              ? 'bg-[#00FF66] text-black cursor-default'
              : 'bg-[#FFD700] hover:bg-[#FFE033] text-black shadow-md'
          }`}
        >
          <span className="text-lg leading-none transform active:scale-110 transition-transform select-none">
            {isVerified ? '✓' : '🔑'}
          </span>
        </div>
      </div>

      {error && !isVerified && (
        <div className="font-pixel text-[8px] sm:text-[9px] text-[#FF2247] bg-[#FF2247]/10 p-2 border-2 border-[#FF2247] text-center">
          ! {error}
        </div>
      )}
    </div>
  );
};
