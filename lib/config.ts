/**
 * Production Configuration System
 */

// Environment configuration
export const ENV_CONFIG = {
  // API Configuration
  API: {
    YOUTUBE_API_KEY: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '',
    SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || '',
    BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || '',
  },
  
  // Feature Flags
  FEATURES: {
    VOICE_CHAT: process.env.NEXT_PUBLIC_ENABLE_VOICE_CHAT !== 'false',
    ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    ERROR_REPORTING: process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING === 'true',
  }
};

// Helper function to get socket URL
function getSocketUrl(): string {
  if (typeof window === 'undefined') {
    return ENV_CONFIG.API.SOCKET_URL || 'http://localhost:3001';
  }

  const currentUrl = window.location;
  
  if (ENV_CONFIG.API.SOCKET_URL) {
    return ENV_CONFIG.API.SOCKET_URL;
  }
  
  // Development URL logic
  const protocol = currentUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  
  if (currentUrl.hostname.includes('webcontainer-api.io')) {
    const socketHostname = currentUrl.hostname.replace(/--3000--/, '--3001--');
    return `http://${socketHostname}`;
  }
  
  if (currentUrl.hostname === 'localhost') {
    return `http://localhost:3001`;
  }
  
  return `${currentUrl.protocol}//${currentUrl.hostname}:3001`;
}

// Computed configuration
export const CONFIG = {
  // Environment flags
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  
  // Debug configuration
  DEBUG: {
    ENABLED: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG === 'true',
  },
  
  // API endpoints
  API_ENDPOINTS: {
    YOUTUBE_BASE: 'https://www.googleapis.com/youtube/v3',
    SOCKET_URL: ENV_CONFIG.API.SOCKET_URL || getSocketUrl(),
    ROOMS_API: '/api/rooms',
  },
  
  // Performance settings
  PERFORMANCE: {
    CACHE_DURATION: 300000, // 5 minutes
    REQUEST_TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
  }
};

// Environment info for debugging
export const getEnvironmentInfo = () => ({
  features: ENV_CONFIG.FEATURES,
  apiEndpoints: CONFIG.API_ENDPOINTS,
  isProduction: CONFIG.IS_PRODUCTION,
  debugEnabled: CONFIG.DEBUG.ENABLED,
});

// Console logging helper
export const envLog = {
  info: (...args: any[]) => {
    console.log('[INFO]', ...args);
  },
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
  debug: (...args: any[]) => {
    if (CONFIG.DEBUG.ENABLED) {
      console.debug('[DEBUG]', ...args);
    }
  }
};