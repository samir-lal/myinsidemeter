import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Cookie, Shield, BarChart3 } from 'lucide-react';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  personalization: boolean;
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always true
    analytics: false,
    personalization: false
  });

  useEffect(() => {
    // Check if running in Capacitor (iOS/Android app) - don't show cookie banner
    const isCapacitorApp = window.location.protocol === 'capacitor:' || 
                          window.location.hostname === 'localhost' && window.navigator.userAgent.includes('CapacitorWebView') ||
                          (window as any).Capacitor;
    
    if (isCapacitorApp) {
      // For native apps, auto-accept essential cookies only
      const defaultPreferences = {
        essential: true,
        analytics: false, // No analytics tracking in native apps by default
        personalization: false
      };
      setPreferences(defaultPreferences);
      localStorage.setItem('cookie-consent', JSON.stringify(defaultPreferences));
      return; // Don't show banner for native apps
    }

    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('cookie-consent');
    if (!cookieConsent) {
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // Load saved preferences
      try {
        const saved = JSON.parse(cookieConsent);
        setPreferences(saved);
        // Set analytics cookies if consented
        if (saved.analytics) {
          enableAnalyticsCookies();
        }
      } catch (error) {
        console.error('Error parsing cookie preferences:', error);
      }
    }
  }, []);

  const enableAnalyticsCookies = () => {
    // Set analytics tracking cookies
    document.cookie = `analytics_enabled=true; max-age=${365 * 24 * 60 * 60}; path=/; secure; samesite=strict`;
    document.cookie = `user_tracking_id=${generateTrackingId()}; max-age=${365 * 24 * 60 * 60}; path=/; secure; samesite=strict`;
    
    // Initialize analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
    }
  };

  const generateTrackingId = () => {
    return 'track_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  const handleAcceptAll = () => {
    const newPreferences = {
      essential: true,
      analytics: true,
      personalization: true
    };
    
    setPreferences(newPreferences);
    localStorage.setItem('cookie-consent', JSON.stringify(newPreferences));
    
    // Enable analytics cookies
    enableAnalyticsCookies();
    
    // Set personalization cookies
    document.cookie = `personalization_enabled=true; max-age=${365 * 24 * 60 * 60}; path=/; secure; samesite=strict`;
    
    setShowBanner(false);
    setShowDetails(false);
  };

  const handleAcceptEssential = () => {
    const newPreferences = {
      essential: true,
      analytics: false,
      personalization: false
    };
    
    setPreferences(newPreferences);
    localStorage.setItem('cookie-consent', JSON.stringify(newPreferences));
    
    setShowBanner(false);
    setShowDetails(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookie-consent', JSON.stringify(preferences));
    
    if (preferences.analytics) {
      enableAnalyticsCookies();
    }
    
    if (preferences.personalization) {
      document.cookie = `personalization_enabled=true; max-age=${365 * 24 * 60 * 60}; path=/; secure; samesite=strict`;
    }
    
    setShowBanner(false);
    setShowDetails(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      <Card className="pointer-events-auto max-w-lg w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl">
        {!showDetails ? (
          // Simple Banner
          <div className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <Cookie className="text-amber-500 mt-1" size={24} />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  We use cookies on this website
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Essential cookies are used for sign-up, login, and personalization. 
                  Non-essential cookies are used for analyzing website traffic. 
                  Do you want to allow our website traffic analytics cookies?
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAcceptEssential}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={16} />
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleAcceptAll}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Accept All Cookies
              </Button>
              <Button
                variant="outline"
                onClick={handleAcceptEssential}
                className="border-gray-300 dark:border-gray-600"
              >
                Essential Only
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowDetails(true)}
                className="text-purple-600 hover:text-purple-700 dark:text-purple-400"
              >
                Customize
              </Button>
            </div>
          </div>
        ) : (
          // Detailed Settings
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cookie className="text-amber-500" size={24} />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Cookie Preferences
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={16} />
              </Button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Essential Cookies */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <Shield className="text-green-500 mt-1" size={20} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Essential Cookies
                    </h4>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      Always Active
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Required for login, authentication, and core website functionality.
                  </p>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <BarChart3 className="text-blue-500 mt-1" size={20} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Analytics Cookies
                    </h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.analytics}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          analytics: e.target.checked
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Help us understand how visitors use our website to improve your experience.
                  </p>
                </div>
              </div>

              {/* Personalization Cookies */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <Cookie className="text-purple-500 mt-1" size={20} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Personalization Cookies
                    </h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.personalization}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          personalization: e.target.checked
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Remember your preferences and provide personalized content recommendations.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleSavePreferences}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Save Preferences
              </Button>
              <Button
                variant="outline"
                onClick={handleAcceptAll}
                className="border-gray-300 dark:border-gray-600"
              >
                Accept All
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}