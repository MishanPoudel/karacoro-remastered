/**
 * Analytics and Performance Monitoring
 */

import { CONFIG, ENV_CONFIG } from './config';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
}

class Analytics {
  private events: AnalyticsEvent[] = [];
  private metrics: PerformanceMetric[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializePerformanceMonitoring();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Track user events
  track(name: string, properties?: Record<string, any>) {
    if (!ENV_CONFIG.FEATURES.ANALYTICS) return;

    const event: AnalyticsEvent = {
      name,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown'
      },
      timestamp: new Date()
    };

    this.events.push(event);

    // In production, send to analytics service
    if (CONFIG.IS_PRODUCTION) {
      this.sendToAnalyticsService(event);
    } else {
      console.log('📊 Analytics Event:', event);
    }
  }

  // Track performance metrics
  trackPerformance(name: string, value: number, unit: string = 'ms') {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date()
    };

    this.metrics.push(metric);

    if (CONFIG.IS_PRODUCTION) {
      this.sendPerformanceMetric(metric);
    } else {
      console.log('⚡ Performance Metric:', metric);
    }
  }

  // Track page views
  trackPageView(page: string, properties?: Record<string, any>) {
    this.track('page_view', {
      page,
      ...properties
    });
  }

  // Track errors
  trackError(error: Error, context?: Record<string, any>) {
    this.track('error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context
    });
  }

  // Track user interactions
  trackInteraction(action: string, element: string, properties?: Record<string, any>) {
    this.track('user_interaction', {
      action,
      element,
      ...properties
    });
  }

  // Track karaoke-specific events
  trackKaraokeEvent(event: string, properties?: Record<string, any>) {
    this.track(`karaoke_${event}`, properties);
  }

  private initializePerformanceMonitoring() {
    if (typeof window === 'undefined') return;

    // Track page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          this.trackPerformance('page_load_time', navigation.loadEventEnd - navigation.fetchStart);
          this.trackPerformance('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart);
          this.trackPerformance('first_paint', navigation.responseEnd - navigation.fetchStart);
        }
      }, 0);
    });

    // Track Core Web Vitals
    this.trackWebVitals();
  }

  private trackWebVitals() {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint (LCP)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.trackPerformance('lcp', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry: any) => {
        this.trackPerformance('fid', entry.processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      this.trackPerformance('cls', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  }

  private async sendToAnalyticsService(event: AnalyticsEvent) {
    try {
      // Replace with your analytics service endpoint
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Failed to send analytics event:', error);
    }
  }

  private async sendPerformanceMetric(metric: PerformanceMetric) {
    try {
      // Replace with your performance monitoring service endpoint
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metric),
      });
    } catch (error) {
      console.error('Failed to send performance metric:', error);
    }
  }

  // Get analytics summary
  getSummary() {
    return {
      sessionId: this.sessionId,
      eventsCount: this.events.length,
      metricsCount: this.metrics.length,
      recentEvents: this.events.slice(-10),
      recentMetrics: this.metrics.slice(-10)
    };
  }
}

// Create singleton instance
export const analytics = new Analytics();

// Convenience functions
export const trackEvent = (name: string, properties?: Record<string, any>) => {
  analytics.track(name, properties);
};

export const trackPageView = (page: string, properties?: Record<string, any>) => {
  analytics.trackPageView(page, properties);
};

export const trackError = (error: Error, context?: Record<string, any>) => {
  analytics.trackError(error, context);
};

export const trackKaraokeEvent = (event: string, properties?: Record<string, any>) => {
  analytics.trackKaraokeEvent(event, properties);
};

export const trackPerformance = (name: string, value: number, unit?: string) => {
  analytics.trackPerformance(name, value, unit);
};