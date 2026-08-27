import React, { useEffect, useRef, useState } from 'react';

// Cloudflare Turnstile Widget Component
// Default testing sitekey (Always passes): '1x00000000000000000000AA'
// Set VITE_TURNSTILE_SITE_KEY in .env for custom production domain key
const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

export const TurnstileWidget = ({ onVerify, onExpire, onError }) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    // 1. Check if script is already present
    const existingScript = document.getElementById('cf-turnstile-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'cf-turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => setIsScriptLoaded(true);
      document.head.appendChild(script);
    } else {
      if (window.turnstile) {
        setIsScriptLoaded(true);
      } else {
        existingScript.addEventListener('load', () => setIsScriptLoaded(true));
      }
    }
  }, []);

  useEffect(() => {
    if (!isScriptLoaded || !containerRef.current || !window.turnstile) return;

    // 2. Render turnstile explicitly
    try {
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'auto',
        size: 'normal',
        callback: (token) => {
          if (onVerify) onVerify(token);
        },
        'expired-callback': () => {
          if (onExpire) onExpire();
        },
        'error-callback': (err) => {
          console.warn('Turnstile error:', err);
          if (onError) onError(err);
          // Fallback pass on local/offline environments
          if (TURNSTILE_SITE_KEY.startsWith('1x0000')) {
            if (onVerify) onVerify('cf_test_pass');
          }
        },
      });
    } catch (e) {
      console.warn('Turnstile render exception:', e);
    }

    return () => {
      try {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
        }
      } catch (e) {}
    };
  }, [isScriptLoaded]);

  return (
    <div className="w-full flex justify-center py-1">
      <div ref={containerRef} className="flex justify-center" />
    </div>
  );
};
