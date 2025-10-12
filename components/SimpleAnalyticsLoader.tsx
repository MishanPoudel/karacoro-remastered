'use client';
import { useEffect } from 'react';

interface SimpleAnalyticsLoaderProps {
  enabled?: boolean;
}

export default function SimpleAnalyticsLoader({ 
  enabled = process.env.NODE_ENV === 'production' 
}: SimpleAnalyticsLoaderProps) {
  useEffect(() => {
    if (!enabled) return;

    const scriptSrc = 'https://scripts.simpleanalyticscdn.com/latest.js';
    
    // Check if script already exists
    if (document.querySelector(`script[src="${scriptSrc}"]`)) {
      return;
    }

    // Create and configure script element
    const script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;
    script.setAttribute('data-collect-dnt', 'true');
    
    script.onload = () => {
      console.info('Simple Analytics loaded successfully');
    };
    
    script.onerror = () => {
      // Gracefully handle blocking (ad-blockers, privacy extensions, etc.)
      console.info('Simple Analytics was blocked by client (likely privacy extension or ad-blocker)');
    };

    // Add script to head
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      const existingScript = document.querySelector(`script[src="${scriptSrc}"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [enabled]);

  // Also handle noscript fallback for non-JS users
  useEffect(() => {
    if (!enabled) return;

    // Add noscript fallback image
    const noscriptImg = document.createElement('img');
    noscriptImg.src = 'https://queue.simpleanalyticscdn.com/noscript.gif?collect-dnt=true';
    noscriptImg.alt = '';
    noscriptImg.style.display = 'none';
    noscriptImg.referrerPolicy = 'no-referrer-when-downgrade';
    
    document.body.appendChild(noscriptImg);

    return () => {
      if (document.body.contains(noscriptImg)) {
        document.body.removeChild(noscriptImg);
      }
    };
  }, [enabled]);

  return null;
}