import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../utils/audio';

export const TypewriterText = ({
  text,
  speed = 40,
  delay = 250,
  playSound = true,
  cursor = true,
  cursorChar = '█',
  loop = false,
  pauseBetween = 2500,
  className = '',
  onComplete,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [textIndex, setTextIndex] = useState(0);

  const textsArray = Array.isArray(text) ? text : [text];
  const currentTargetText = textsArray[textIndex % textsArray.length] || '';

  const indexRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    setDisplayedText('');
    indexRef.current = 0;
    setIsTyping(true);

    const startTimer = setTimeout(() => {
      typeNextChar();
    }, delay);

    return () => {
      clearTimeout(startTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [textIndex, currentTargetText]);

  const typeNextChar = () => {
    if (indexRef.current < currentTargetText.length) {
      const nextChar = currentTargetText.charAt(indexRef.current);
      indexRef.current += 1;
      setDisplayedText(currentTargetText.substring(0, indexRef.current));

      if (playSound && nextChar.trim() !== '') {
        sound?.playTypewriterKey?.();
      }

      // Variable speed for realistic human cadence
      const randomSpeed = speed + (Math.random() * 25 - 12);
      timerRef.current = setTimeout(typeNextChar, Math.max(15, randomSpeed));
    } else {
      setIsTyping(false);
      if (playSound) {
        sound?.playTypewriterDing?.();
      }
      if (onComplete) {
        onComplete();
      }

      if (loop && textsArray.length > 1) {
        timerRef.current = setTimeout(() => {
          setTextIndex((prev) => (prev + 1) % textsArray.length);
        }, pauseBetween);
      }
    }
  };

  return (
    <span className={`inline-block ${className}`}>
      {displayedText}
      {cursor && (
        <span
          className={`inline-block ml-0.5 text-[#00FF66] ${
            isTyping ? 'opacity-100' : 'animate-blink'
          }`}
        >
          {cursorChar}
        </span>
      )}
    </span>
  );
};
