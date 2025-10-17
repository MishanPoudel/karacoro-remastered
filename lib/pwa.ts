/**
 * PWA Service Worker Registration
 * Handles installation, updates, and offline support
 */

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers not supported');
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[PWA] Service Worker registered successfully:', registration.scope);

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Check every hour

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[PWA] New service worker found, installing...');

        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available, prompt user to refresh
            showUpdateNotification();
          }
        });
      });

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  });

  // Handle controller change (new SW activated)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[PWA] New service worker activated, reloading page...');
    window.location.reload();
  });

  // Handle messages from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('[PWA] Message from SW:', event.data);
    
    if (event.data.type === 'CACHE_UPDATED') {
      console.log('[PWA] Cache updated');
    }
  });
}

function showUpdateNotification() {
  // Create a subtle notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideIn 0.3s ease-out;
    max-width: 400px;
  `;

  notification.innerHTML = `
    <style>
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    </style>
    <div style="flex: 1;">
      <div style="font-weight: 600; margin-bottom: 4px;">🎉 Update Available!</div>
      <div style="font-size: 14px; opacity: 0.9;">A new version of KaraCoro is ready</div>
    </div>
    <button id="update-btn" style="
      background: white;
      color: #dc2626;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    ">
      Update
    </button>
    <button id="dismiss-btn" style="
      background: transparent;
      color: white;
      border: 1px solid rgba(255,255,255,0.3);
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    ">
      Later
    </button>
  `;

  document.body.appendChild(notification);

  // Update button click
  document.getElementById('update-btn')?.addEventListener('click', () => {
    notification.remove();
    // Skip waiting and activate new service worker
    navigator.serviceWorker.getRegistration().then((reg) => {
      reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    });
  });

  // Dismiss button click
  document.getElementById('dismiss-btn')?.addEventListener('click', () => {
    notification.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => notification.remove(), 300);
  });

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), 300);
    }
  }, 10000);
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
        console.log('[PWA] Service Worker unregistered');
      })
      .catch((error) => {
        console.error('[PWA] Error unregistering:', error);
      });
  }
}

// Install prompt for PWA
let deferredPrompt: any = null;

// Only run on client-side
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] Install prompt available');
    
    // Show custom install button
    showInstallPrompt();
  });
}

function showInstallPrompt() {
  // Only run on client-side
  if (typeof window === 'undefined') return;
  
  // Don't show if already dismissed or installed
  if (localStorage.getItem('pwa-install-dismissed') === 'true') {
    return;
  }

  if (window.matchMedia('(display-mode: standalone)').matches) {
    return; // Already installed
  }

  const installBanner = document.createElement('div');
  installBanner.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #7c0a02, #dc2626);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 16px;
    animation: slideUp 0.5s ease-out;
    max-width: 90%;
  `;

  installBanner.innerHTML = `
    <style>
      @keyframes slideUp {
        from {
          transform: translateX(-50%) translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
    </style>
    <div style="font-size: 32px;">🎤</div>
    <div style="flex: 1;">
      <div style="font-weight: 600; margin-bottom: 4px;">Install KaraCoro</div>
      <div style="font-size: 14px; opacity: 0.9;">Add to home screen for quick access!</div>
    </div>
    <button id="install-pwa-btn" style="
      background: white;
      color: #dc2626;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    ">
      Install
    </button>
    <button id="dismiss-pwa-btn" style="
      background: transparent;
      color: white;
      border: none;
      padding: 10px;
      cursor: pointer;
      font-size: 20px;
      opacity: 0.7;
    ">
      ✕
    </button>
  `;

  document.body.appendChild(installBanner);

  // Install button
  document.getElementById('install-pwa-btn')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log('[PWA] User choice:', outcome);
    
    if (outcome === 'accepted') {
      console.log('[PWA] App installed');
    }
    
    deferredPrompt = null;
    installBanner.remove();
  });

  // Dismiss button
  document.getElementById('dismiss-pwa-btn')?.addEventListener('click', () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    installBanner.style.animation = 'slideUp 0.3s ease-out reverse';
    setTimeout(() => installBanner.remove(), 300);
  });
}

// Track installation
if (typeof window !== 'undefined') {
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App was installed');
    deferredPrompt = null;
  });
}
