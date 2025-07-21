// Hotjar tracking integration
declare global {
  interface Window {
    hj: (event: string, ...args: any[]) => void;
    _hjSettings: {
      hjid: number;
      hjsv: number;
    };
  }
}

export const initHotjar = () => {
  const siteId = import.meta.env.VITE_HOTJAR_SITE_ID;

  if (!siteId) {
    console.warn('Hotjar Site ID not provided. User behavior tracking disabled.');
    return;
  }

  // Initialize Hotjar tracking code
  (function(h: any, o: any, t: any, j: any, a?: any, r?: any) {
    h.hj = h.hj || function(...args: any[]) { (h.hj.q = h.hj.q || []).push(args); };
    h._hjSettings = { hjid: parseInt(siteId), hjsv: 6 };
    a = o.getElementsByTagName('head')[0];
    r = o.createElement('script');
    r.async = 1;
    r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
    a.appendChild(r);
  })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');
};

// Track custom events for better funnel analysis
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.hj) {
    window.hj('event', eventName);
    if (properties) {
      window.hj('identify', null, properties);
    }
  }
};

// Track user interactions
export const trackPageView = (pageName: string) => {
  if (typeof window !== 'undefined' && window.hj) {
    window.hj('vpv', pageName);
  }
};

// Track conversion events
export const trackConversion = (conversionType: string, value?: string | number) => {
  if (typeof window !== 'undefined' && window.hj) {
    window.hj('event', `conversion_${conversionType}`);
    if (value) {
      window.hj('identify', null, { [`${conversionType}_value`]: value });
    }
  }
};

// Track user authentication status
export const trackUserStatus = (isAuthenticated: boolean, subscriptionTier?: string) => {
  if (typeof window !== 'undefined' && window.hj) {
    window.hj('identify', null, {
      user_authenticated: isAuthenticated,
      subscription_tier: subscriptionTier || 'guest'
    });
  }
};

// Track mood entry completion (key conversion event)
export const trackMoodEntry = (mood: string, hasNotes: boolean) => {
  trackEvent('mood_logged', {
    mood_type: mood,
    has_private_notes: hasNotes,
    page: 'home'
  });
};

// Track subscription events
export const trackSubscriptionEvent = (eventType: 'viewed' | 'upgraded' | 'cancelled', tier?: string) => {
  trackEvent(`subscription_${eventType}`, {
    tier: tier
  });
};

// Track navigation patterns
export const trackNavigation = (fromPage: string, toPage: string) => {
  trackEvent('navigation', {
    from_page: fromPage,
    to_page: toPage
  });
};