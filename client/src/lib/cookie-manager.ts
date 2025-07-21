// Cookie management utilities for tracking and personalization

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  personalization: boolean;
}

export class CookieManager {
  private static instance: CookieManager;
  private preferences: CookiePreferences = {
    essential: true,
    analytics: false,
    personalization: false
  };

  private constructor() {
    this.loadPreferences();
  }

  public static getInstance(): CookieManager {
    if (!CookieManager.instance) {
      CookieManager.instance = new CookieManager();
    }
    return CookieManager.instance;
  }

  private loadPreferences(): void {
    try {
      const saved = localStorage.getItem('cookie-consent');
      if (saved) {
        this.preferences = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading cookie preferences:', error);
    }
  }

  public getPreferences(): CookiePreferences {
    return { ...this.preferences };
  }

  public updatePreferences(newPreferences: CookiePreferences): void {
    this.preferences = { ...newPreferences };
    localStorage.setItem('cookie-consent', JSON.stringify(this.preferences));
  }

  public hasConsent(type: 'analytics' | 'personalization'): boolean {
    return this.preferences[type] || false;
  }

  // Analytics tracking methods
  public trackEvent(eventName: string, properties?: Record<string, any>): void {
    if (!this.hasConsent('analytics')) return;

    // Track event with analytics service
    this.sendAnalyticsEvent('event', {
      event_name: eventName,
      ...properties,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      page_url: window.location.href,
      page_title: document.title
    });
  }

  public trackPageView(page: string): void {
    if (!this.hasConsent('analytics')) return;

    this.sendAnalyticsEvent('page_view', {
      page,
      timestamp: new Date().toISOString(),
      referrer: document.referrer,
      user_agent: navigator.userAgent
    });
  }

  public trackUserAction(action: string, context?: Record<string, any>): void {
    if (!this.hasConsent('analytics')) return;

    this.sendAnalyticsEvent('user_action', {
      action,
      context,
      timestamp: new Date().toISOString(),
      session_id: this.getSessionId()
    });
  }

  // Personalization methods
  public setPersonalizationData(key: string, value: any): void {
    if (!this.hasConsent('personalization')) return;

    try {
      const data = this.getPersonalizationData();
      data[key] = value;
      localStorage.setItem('personalization_data', JSON.stringify(data));
    } catch (error) {
      console.error('Error setting personalization data:', error);
    }
  }

  public getPersonalizationData(): Record<string, any> {
    if (!this.hasConsent('personalization')) return {};

    try {
      const data = localStorage.getItem('personalization_data');
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting personalization data:', error);
      return {};
    }
  }

  public trackMoodPattern(mood: string, intensity: number, activities: string[]): void {
    if (!this.hasConsent('analytics')) return;

    this.trackEvent('mood_logged', {
      mood,
      intensity,
      activities,
      time_of_day: new Date().getHours(),
      day_of_week: new Date().getDay()
    });

    // Store for personalization if consent given
    if (this.hasConsent('personalization')) {
      this.updateMoodPersonalization(mood, intensity, activities);
    }
  }

  public trackMoodInsight(insightType: string, data: any): void {
    if (!this.hasConsent('analytics')) return;

    this.trackEvent('mood_insight_viewed', {
      insight_type: insightType,
      data,
      user_engagement: 'viewed'
    });
  }

  public trackSubscriptionEvent(eventType: string, tier?: string): void {
    if (!this.hasConsent('analytics')) return;

    this.trackEvent('subscription_event', {
      event_type: eventType,
      subscription_tier: tier,
      timestamp: new Date().toISOString()
    });
  }

  private updateMoodPersonalization(mood: string, intensity: number, activities: string[]): void {
    const data = this.getPersonalizationData();
    
    // Track preferred moods
    if (!data.preferredMoods) data.preferredMoods = {};
    data.preferredMoods[mood] = (data.preferredMoods[mood] || 0) + 1;
    
    // Track preferred activities
    if (!data.preferredActivities) data.preferredActivities = {};
    activities.forEach(activity => {
      data.preferredActivities[activity] = (data.preferredActivities[activity] || 0) + 1;
    });
    
    // Track intensity patterns
    if (!data.intensityPatterns) data.intensityPatterns = [];
    data.intensityPatterns.push({
      intensity,
      mood,
      timestamp: new Date().toISOString(),
      hour: new Date().getHours()
    });
    
    // Keep only last 100 intensity patterns
    if (data.intensityPatterns.length > 100) {
      data.intensityPatterns = data.intensityPatterns.slice(-100);
    }
    
    this.setPersonalizationData('moodData', data);
  }

  private sendAnalyticsEvent(type: string, data: any): void {
    // Send to analytics endpoint
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        data,
        tracking_id: this.getTrackingId(),
        session_id: this.getSessionId()
      })
    }).catch(error => {
      console.error('Analytics tracking error:', error);
    });
  }

  private getTrackingId(): string {
    let trackingId = this.getCookie('user_tracking_id');
    if (!trackingId) {
      trackingId = 'track_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      this.setCookie('user_tracking_id', trackingId, 365);
    }
    return trackingId;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  private setCookie(name: string, value: string, days: number): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; secure; samesite=strict`;
  }

  // Utility methods for personalized recommendations
  public getPersonalizedRecommendations(): any {
    if (!this.hasConsent('personalization')) return null;

    const data = this.getPersonalizationData();
    const moodData = data.moodData;
    
    if (!moodData) return null;

    return {
      preferredMoods: moodData.preferredMoods,
      preferredActivities: moodData.preferredActivities,
      bestTimeToTrack: this.getBestTrackingTime(moodData.intensityPatterns),
      moodTrends: this.analyzeMoodTrends(moodData.intensityPatterns)
    };
  }

  private getBestTrackingTime(patterns: any[]): number {
    if (!patterns || patterns.length === 0) return 12; // Default to noon

    const hourCounts: Record<number, number> = {};
    patterns.forEach(pattern => {
      const hour = pattern.hour;
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return parseInt(Object.keys(hourCounts).reduce((a, b) => 
      hourCounts[parseInt(a)] > hourCounts[parseInt(b)] ? a : b
    ));
  }

  private analyzeMoodTrends(patterns: any[]): any {
    if (!patterns || patterns.length < 7) return null;

    const recent = patterns.slice(-14); // Last 14 entries
    const avgIntensity = recent.reduce((sum, p) => sum + p.intensity, 0) / recent.length;
    
    return {
      averageIntensity: Math.round(avgIntensity * 10) / 10,
      trendDirection: this.calculateTrend(recent),
      consistencyScore: this.calculateConsistency(recent)
    };
  }

  private calculateTrend(patterns: any[]): 'improving' | 'declining' | 'stable' {
    if (patterns.length < 4) return 'stable';
    
    const firstHalf = patterns.slice(0, Math.floor(patterns.length / 2));
    const secondHalf = patterns.slice(Math.floor(patterns.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, p) => sum + p.intensity, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, p) => sum + p.intensity, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    
    if (diff > 0.5) return 'improving';
    if (diff < -0.5) return 'declining';
    return 'stable';
  }

  private calculateConsistency(patterns: any[]): number {
    if (patterns.length < 2) return 1;
    
    const avg = patterns.reduce((sum, p) => sum + p.intensity, 0) / patterns.length;
    const variance = patterns.reduce((sum, p) => sum + Math.pow(p.intensity - avg, 2), 0) / patterns.length;
    
    // Convert variance to consistency score (0-1, higher is more consistent)
    return Math.max(0, 1 - (variance / 10));
  }
}

// Export singleton instance
export const cookieManager = CookieManager.getInstance();