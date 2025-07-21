import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, BarChart3, CreditCard, Users, User, Sun, Settings, LogOut, LogIn, Bell, BookOpen, Shield, Activity, UserCircle, DoorClosed, Zap, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import NotificationSettings from "./notification-settings-clean";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Capacitor } from '@capacitor/core';

export default function Navigation() {
  const [location, setLocation] = useLocation();

  const [notificationOpen, setNotificationOpen] = useState(false);
  const queryClient = useQueryClient();

  // Check if notifications are enabled (use same key as useNotifications hook)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Use the same auth hook as other components for consistency
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Combined useEffect for all event listeners to maintain stable hook order
  useEffect(() => {
    // Initialize notification status
    const checkNotificationStatus = () => {
      return typeof window !== 'undefined' && localStorage.getItem('moodRemindersEnabled') === 'true';
    };
    setNotificationsEnabled(checkNotificationStatus());
    
    // Event handlers
    const handleAuthChange = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
    };
    
    const handleStorageChange = () => {
      const notificationStatus = typeof window !== 'undefined' && localStorage.getItem('moodRemindersEnabled') === 'true';
      setNotificationsEnabled(notificationStatus);
    };
    
    // Add listeners
    window.addEventListener('ios-auth-success', handleAuthChange);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('ios-auth-success', handleAuthChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [queryClient]);

  // Get real-time subscription status using Stripe as source of truth
  const { isProUser, isLoading: subscriptionLoading } = useSubscriptionStatus();
  
  // ✅ Universal logout using tokenManager utility
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { performLogout } = await import('@/lib/tokenManager');
      return await performLogout();
    },
    onSuccess: (data) => {
      queryClient.clear();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('guestSession');
        localStorage.removeItem('iosAuthToken');
        localStorage.removeItem('ios_token');
      }
      
      // Platform-specific redirect
      if (data.platform === 'ios') {
        window.location.href = "/ios-login";
      } else {
        window.location.href = "/";
      }
    },
  });
  
  const isAdmin = user?.role === 'admin';
  const isGuest = !isAuthenticated;
  
  // Simple iOS detection
  const [isIOS, setIsIOS] = useState(false);
  
  useEffect(() => {
    const detectIOS = () => {
      const platform = Capacitor.getPlatform();
      const isIPhoneUserAgent = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const detectedIOS = platform === 'ios' || isIPhoneUserAgent;
      setIsIOS(detectedIOS);
    };
    
    detectIOS();
  }, []);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show login page content for login route
  if (location === "/login") {
    return null;
  }

  // Dynamic navigation based on subscription tier and platform
  const getNavItems = () => {
    let baseItems = [
      { path: "/", icon: Home, label: "Home" },
      { path: "/charts", icon: BarChart3, label: "Charts" },
      { path: "/meter", icon: Activity, label: "Meter" },
      { path: "/personal-growth", icon: BookOpen, label: "Journal" },
      { path: "/profile", icon: User, label: "Profile" },
    ];

    // For iOS users, show only Home and Profile tabs
    if (isIOS) {
      baseItems = baseItems.filter(item => 
        item.path === "/" || item.path === "/profile"
      );
    }

    // Admin sees all tabs (except for iOS restrictions)
    if (isAdmin) {
      const adminTabs = [
        { path: "/pro", icon: Star, label: "Pro" },
      ];
      
      // Add subscription tab for non-iOS users only
      if (!isIOS) {
        adminTabs.unshift({ path: "/subscription", icon: CreditCard, label: "Subscription" });
      }
      
      return [
        ...baseItems,
        ...adminTabs,
      ];
    }

    // Subscription-based tab visibility (only Free and Pro tiers)
    if (isProUser) {
      return [
        ...baseItems,
        { path: "/pro", icon: Star, label: "Pro" },
      ];
    } else {
      // Free users see subscription tab (except on iOS)
      const subscriptionTabs = [];
      if (!isIOS) {
        subscriptionTabs.push({ path: "/subscription", icon: CreditCard, label: "Subscription" });
      }
      
      return [
        ...baseItems,
        ...subscriptionTabs,
      ];
    }
  };

  const navItems = getNavItems();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const handleNavClick = (path: string) => {
    // Scroll to top when navigating to a new tab
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setLocation(path);
  };

  return (
    <>
      {/* Top Navigation */}
      <nav className="glassmorphism fixed top-0 left-0 right-0 z-50 px-6 py-4 pt-safe-area-inset-top ios:pt-18">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center space-x-8 min-h-[50px] ios:min-h-[60px] mt-2">
            {/* Logo and Tagline - Left aligned but centered in overall layout */}
            <Link href="/">
              <div className="flex flex-col items-center hover:opacity-80 transition-opacity">
                <div className="flex items-center space-x-2.5">
                  <Sun className="text-yellow-400" size={20} />
                  <span className="font-bold text-lg text-white tracking-wide">InsideMeter</span>
                </div>
                <div className="text-xs text-white/80 mt-0.5 font-medium tracking-wide">Track. Reflect. Transform.</div>
              </div>
            </Link>

            {/* Authentication Status Badge - Center */}
            {!isAuthenticated && (
              <div className="flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-400/30 text-orange-300 shadow-sm">
                <Shield className="w-4 h-4 mr-2" />
                <span>Guest</span>
              </div>
            )}
            
            {/* Notification Bell for authenticated users - Center */}
            {isAuthenticated && (
              <Dialog open={notificationOpen} onOpenChange={setNotificationOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative p-3 hover:bg-white/10 rounded-full transition-colors">
                    <Bell className={`w-5 h-5 ${notificationsEnabled ? 'text-yellow-400' : 'text-white/70'}`} />
                    {notificationsEnabled && (
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-yellow-400 rounded-full border border-slate-800"></div>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Notification Settings</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      onClick={() => setNotificationOpen(false)}
                    >
                      ✕
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 pt-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                    <NotificationSettings />
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Action Buttons - Right aligned but centered in overall layout */}
            {isAuthenticated ? (
              <Button
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                variant="ghost"
                size="sm"
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors border border-white/20"
              >
                {logoutMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Logging out</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </div>
                )}
              </Button>
            ) : (
              <Link href="/login">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 text-white font-medium rounded-lg transition-all border border-blue-400/30 shadow-sm"
                >
                  <div className="flex items-center space-x-2">
                    <LogIn className="w-4 h-4" />
                    <span>Login</span>
                  </div>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 glassmorphism pb-safe-area-inset-bottom ios:pb-6">
        <div className="max-w-md mx-auto px-4 py-1">
          <div className="flex justify-around items-center min-h-[36px] ios:min-h-[44px]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isProTab = item.path === '/pro';
              return (
                <div
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`flex flex-col items-center space-y-0.5 p-1.5 rounded-lg cursor-pointer ${
                    isActive(item.path) 
                      ? 'text-orange-500 dark:text-orange-400' 
                      : 'text-[var(--lunar)]/70'
                  }`}
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation',
                    WebkitUserSelect: 'none',
                    userSelect: 'none'
                  }}
                >
                  {isProTab ? (
                    <Star 
                      size={16} 
                      fill="rgb(234, 179, 8)" 
                      className="text-yellow-500" 
                    />
                  ) : (
                    <Icon size={16} />
                  )}
                  <span className="text-[11px]">{item.label}</span>
                </div>
              );
            })}
            
            {/* Admin Panel */}
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavClick("/admin")}
                className={`flex flex-col items-center space-y-0.5 hover:bg-transparent hover:text-[var(--lunar)]/70 ${
                  isActive("/admin") 
                    ? 'text-[var(--moon)] bg-[var(--moon-accent)]' 
                    : 'text-[var(--lunar)]/70'
                }`}
                style={{ 
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                  WebkitUserSelect: 'none',
                  userSelect: 'none'
                }}
              >
                <Shield size={16} />
                <span className="text-[11px]">Admin</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}