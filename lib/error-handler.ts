/**
 * Centralized Error Handling System
 * Provides user-friendly error messages and logging
 */

import { toast } from 'sonner';

export enum ErrorCategory {
  NETWORK = 'NETWORK',
  YOUTUBE_API = 'YOUTUBE_API',
  SOCKET = 'SOCKET',
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  STORAGE = 'STORAGE',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  category: ErrorCategory;
  message: string;
  userMessage: string;
  originalError?: Error | unknown;
  timestamp: number;
  context?: Record<string, any>;
}

/**
 * Enhanced error logging with context
 */
export const logError = (error: AppError): void => {
  const logData = {
    ...error,
    timestamp: new Date(error.timestamp).toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[KaraCoro Error]', logData);
    if (error.originalError) {
      console.error('[Original Error]', error.originalError);
    }
  }

  // TODO: Send to error tracking service (e.g., Sentry)
  // In production, you'd send this to your error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: sendToErrorTracker(logData);
  }
};

/**
 * Create standardized app error
 */
export const createError = (
  category: ErrorCategory,
  message: string,
  userMessage: string,
  originalError?: Error | unknown,
  context?: Record<string, any>
): AppError => {
  return {
    category,
    message,
    userMessage,
    originalError,
    timestamp: Date.now(),
    context,
  };
};

/**
 * Network error handling
 */
export const handleNetworkError = (error: any, context?: Record<string, any>): void => {
  let userMessage = 'Network error occurred. Please check your connection.';
  
  if (!navigator.onLine) {
    userMessage = 'You are offline. Please check your internet connection.';
  } else if (error?.message?.includes('timeout')) {
    userMessage = 'Request timed out. Please try again.';
  } else if (error?.message?.includes('Failed to fetch')) {
    userMessage = 'Failed to connect to server. Please check your connection.';
  }

  const appError = createError(
    ErrorCategory.NETWORK,
    error?.message || 'Network error',
    userMessage,
    error,
    context
  );

  logError(appError);
  toast.error(userMessage);
};

/**
 * YouTube API error handling
 */
export const handleYouTubeError = (error: any, context?: Record<string, any>): void => {
  let userMessage = 'Failed to load video. Please try another one.';
  
  const errorCode = error?.data;
  
  switch (errorCode) {
    case 2:
      userMessage = 'Invalid video ID. Please check the URL.';
      break;
    case 5:
      userMessage = 'This video cannot be played. Try a different video.';
      break;
    case 100:
      userMessage = 'Video not found or has been removed.';
      break;
    case 101:
    case 150:
      userMessage = 'Video owner has restricted playback. Try a different video.';
      break;
    default:
      if (error?.message?.includes('403')) {
        userMessage = 'Access restricted. Using alternative video sources.';
      }
  }

  const appError = createError(
    ErrorCategory.YOUTUBE_API,
    `YouTube error ${errorCode}: ${error?.message || 'Unknown'}`,
    userMessage,
    error,
    context
  );

  logError(appError);
  toast.error(userMessage, {
    description: 'You can search for another video or try again later.',
  });
};

/**
 * Socket.io error handling
 */
export const handleSocketError = (error: any, context?: Record<string, any>): void => {
  let userMessage = 'Connection issue detected.';
  
  if (error?.type === 'TransportError') {
    userMessage = 'Failed to establish connection. Retrying...';
  } else if (error?.message?.includes('timeout')) {
    userMessage = 'Connection timeout. Please refresh the page.';
  } else if (error?.message?.includes('unauthorized')) {
    userMessage = 'Authentication failed. Please rejoin the room.';
  }

  const appError = createError(
    ErrorCategory.SOCKET,
    error?.message || 'Socket error',
    userMessage,
    error,
    context
  );

  logError(appError);
  toast.error(userMessage);
};

/**
 * Validation error handling
 */
export const handleValidationError = (field: string, reason: string): void => {
  const userMessage = `Invalid ${field}: ${reason}`;
  
  const appError = createError(
    ErrorCategory.VALIDATION,
    `Validation failed for ${field}`,
    userMessage,
    undefined,
    { field, reason }
  );

  logError(appError);
  toast.error(userMessage);
};

/**
 * Permission error handling (microphone, camera, etc.)
 */
export const handlePermissionError = (permission: string, error?: any): void => {
  let userMessage = `${permission} permission denied.`;
  
  if (error?.name === 'NotAllowedError') {
    userMessage = `Please allow ${permission} access in your browser settings.`;
  } else if (error?.name === 'NotFoundError') {
    userMessage = `No ${permission} device found. Please connect one and try again.`;
  } else if (error?.name === 'NotSupportedError') {
    userMessage = `${permission} is not supported in your browser.`;
  }

  const appError = createError(
    ErrorCategory.PERMISSION,
    error?.message || `Permission denied: ${permission}`,
    userMessage,
    error,
    { permission }
  );

  logError(appError);
  toast.warning(userMessage, {
    description: 'Some features may not work without this permission.',
  });
};

/**
 * Storage error handling (localStorage, IndexedDB)
 */
export const handleStorageError = (operation: string, error: any): void => {
  let userMessage = `Failed to ${operation}. `;
  
  if (error?.name === 'QuotaExceededError') {
    userMessage += 'Storage quota exceeded. Please clear some data.';
  } else if (error?.name === 'SecurityError') {
    userMessage += 'Storage access blocked by browser settings.';
  } else {
    userMessage += 'Please try again.';
  }

  const appError = createError(
    ErrorCategory.STORAGE,
    `Storage ${operation} failed: ${error?.message}`,
    userMessage,
    error,
    { operation }
  );

  logError(appError);
  toast.error(userMessage);
};

/**
 * Generic error handler for unknown errors
 */
export const handleUnknownError = (error: any, context?: Record<string, any>): void => {
  const userMessage = 'Something went wrong. Please try again.';
  
  const appError = createError(
    ErrorCategory.UNKNOWN,
    error?.message || 'Unknown error',
    userMessage,
    error,
    context
  );

  logError(appError);
  toast.error(userMessage);
};

/**
 * Async operation wrapper with error handling
 */
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  errorHandler: (error: any) => void = handleUnknownError,
  context?: Record<string, any>
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    errorHandler(error);
    return null;
  }
};

/**
 * Retry mechanism for failed operations
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  onRetry?: (attempt: number) => void
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        if (onRetry) {
          onRetry(attempt);
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }
  }
  
  throw lastError;
};

/**
 * Circuit breaker pattern for unstable services
 */
class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private readonly threshold: number;
  private readonly timeout: number;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(threshold: number = 5, timeout: number = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      toast.error('Service temporarily unavailable. Retrying in a moment...');
    }
  }

  getState(): string {
    return this.state;
  }
}

// Export circuit breaker instances for different services
export const youtubeCircuitBreaker = new CircuitBreaker(5, 60000);
export const socketCircuitBreaker = new CircuitBreaker(3, 30000);
