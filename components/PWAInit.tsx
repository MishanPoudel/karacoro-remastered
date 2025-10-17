"use client";

import React, { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/pwa';

export function PWAInit(): null {
  useEffect(() => {
    // Register service worker
    registerServiceWorker();

    // Handle online/offline status
    const handleOnline = () => {
      console.log('[PWA] Back online');
      // You could show a toast notification here
    };

    const handleOffline = () => {
      console.log('[PWA] Gone offline');
      // You could show a toast notification here
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null; // This component doesn't render anything
}

export default PWAInit;
