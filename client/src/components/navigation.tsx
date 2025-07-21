import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, BarChart3, Calendar, Users, User, Moon, Plus, Settings, LogOut, LogIn, Bell, BookOpen, Shield, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MoodSelector from "./mood-selector";
import NotificationSettings from "./notification-settings-clean";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

interface UserData {
  user: {
    id: number;
    username: string;
    name: string | null;
    email: string | null;
    role: string;
  };
}

export default function Navigation() {
  const [location, setLocation] = useLocation();
  const [quickMoodOpen, setQuickMoodOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const queryClient = useQueryClient();

  // Check if notifications are enabled (use same key as useNotifications hook)
  const notificationsEnabled = typeof window !== 'undefined' && localStorage.getItem('moodRemindersEnabled') === 'true';
  
  const { user, isLoading, isAuthenticated } = useAuth();
  
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/logout", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include', // Include session cookies
      });
      if (!response.ok) throw new Error("Logout failed");
      return response.json();
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      // Clear guest session if exists
      if (typeof window !== 'undefined') {
        localStorage.removeItem('guestSession');
      }
      // Force page reload to clear any remaining state
      window.location.href = "/";
    },
  });
  
  const isAdmin = user?.role === 'admin';
  const isGuest = !isAuthenticated;

  // Show login page content for login route
  if (location === "/login") {
    return null;
  }

  // Navigation configuration - Meter tab and Journal tab
  const navigationConfig = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/charts", icon: BarChart3, label: "Charts" },
    { path: "/calendar", icon: Calendar, label: "Calendar" },
    { path: "/meter", icon: Activity, label: "Meter" },
    { path: "/personal-growth", icon: BookOpen, label: "Journal" },
    { path: "/profile", icon: User, label: "Profile" },
  ];
  
  const navItems = navigationConfig;

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  // Show simplified navigation for guest users
  if (!isAuthenticated && !isLoading) {
    return (
      <>
        {/* Top Navigation */}
        <nav className="glassmorphism fixed top-0 left-0 right-0 z-50 px-4 py-3">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <Link href="/">
              <div className="flex items-center space-x-2">
                <Moon className="text-[var(--moon)]" size={20} />
                <span className="font-semibold text-lg">My Inside Meter: Lunar Mood (Beta)</span>
              </div>
            </Link>
            <div className="flex items-center space-x-4">
              {/* Authentication Status Indicator */}
              <div className="flex items-center space-x-2 px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-400">
                <Shield className="w-3 h-3" />
                <span>Guest</span>
              </div>
              
              <Dialog open={notificationOpen} onOpenChange={setNotificationOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`relative ${
                      notificationsEnabled
                        ? 'text-yellow-400 hover:text-yellow-300 bg-yellow-400/10 hover:bg-yellow-400/20'
                        : 'text-[var(--lunar)]/70 hover:text-[var(--lunar)] hover:bg-[var(--lunar-accent)]/10'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setNotificationOpen(!notificationOpen);
                    }}
                  >
                    <Bell size={16} />
                    {notificationsEnabled && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"></div>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="glassmorphism border-[var(--lunar)]/20 max-w-md">
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-4">Notification Settings</h3>
                    <NotificationSettings />
                  </div>
                </DialogContent>
              </Dialog>
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[var(--lunar)]/70 hover:text-[var(--lunar)] hover:bg-[var(--lunar-accent)]/10"
                >
                  <LogIn size={16} />
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Bottom Navigation for Guests */}
        <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/95 via-slate-800/90 to-slate-800/80 backdrop-blur-md border-t border-white/10 z-50">
          <div className="max-w-md mx-auto px-4">
            <div className="flex items-center justify-between py-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <Link key={item.path} href={item.path}>
                    <div className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                      active 
                        ? 'bg-white/15 text-white shadow-lg shadow-purple-500/20' 
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}>
                      <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                      <span className={`text-xs font-medium ${active ? 'text-white' : 'text-slate-400'}`}>
                        {item.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Floating Action Button for Guests */}
        <Dialog open={quickMoodOpen} onOpenChange={setQuickMoodOpen}>
          <DialogTrigger asChild>
            <Button
              className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-full shadow-xl shadow-purple-500/30 text-white z-40 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-purple-500/40"
            >
              <Plus size={22} strokeWidth={2.5} />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-w-md text-gray-900 dark:text-gray-100">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Quick Mood Entry</h3>
              <MoodSelector onSuccess={() => setQuickMoodOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const adminItems = [
    { path: "/admin", icon: Settings, label: "Admin" },
  ];

  return (
    <>
      {/* Top Navigation */}
      <nav className="glassmorphism fixed top-0 left-0 right-0 z-50 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center space-x-2">
              <Moon className="text-[var(--moon)]" size={20} />
              <span className="font-semibold text-lg">My Inside Meter: Lunar Mood (Beta)</span>
            </div>
          </Link>
          <div className="flex items-center space-x-4">
            {isAdmin && (
              <Link href="/admin">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[var(--lunar)]/70 hover:text-[var(--lunar)] hover:bg-[var(--lunar-accent)]/10"
                >
                  <Settings size={16} />
                </Button>
              </Link>
            )}
            <Dialog open={notificationOpen} onOpenChange={setNotificationOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`relative ${
                    notificationsEnabled
                      ? 'text-yellow-400 hover:text-yellow-300 bg-yellow-400/10 hover:bg-yellow-400/20'
                      : 'text-[var(--lunar)]/70 hover:text-[var(--lunar)] hover:bg-[var(--lunar-accent)]/10'
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Bell clicked, opening dialog");
                    setNotificationOpen(!notificationOpen);
                  }}
                >
                  <Bell size={16} />
                  {notificationsEnabled && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"></div>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="glassmorphism border-[var(--lunar)]/20 max-w-md max-h-[85vh] overflow-y-auto">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Notification Settings</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                      onClick={() => setNotificationOpen(false)}
                    >
                      ✕
                    </Button>
                  </div>
                  <NotificationSettings />
                </div>
              </DialogContent>
            </Dialog>
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-red-100 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 hover:border-red-400/50 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-red-500/25 min-h-[44px] touch-manipulation"
              style={{ 
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation'
              }}
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">{logoutMutation.isPending ? 'Logging out...' : 'Logout'}</span>
            </button>
            <Link href="/profile">
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 rounded-full bg-[var(--lunar-accent)] flex items-center justify-center text-white hover:bg-[var(--lunar-accent)]/80"
              >
                <User size={14} />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/95 via-slate-800/90 to-slate-800/80 backdrop-blur-md border-t border-white/10 z-50">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link key={item.path} href={item.path}>
                  <div className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                    active 
                      ? 'bg-white/15 text-white shadow-lg shadow-purple-500/20' 
                      : 'text-slate-300 hover:text-slate-200 hover:bg-white/5'
                  }`}>
                    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                    <span className={`text-xs font-medium ${active ? 'text-white' : 'text-slate-400'}`}>
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}
            {isAdmin && (
              <Link href="/admin">
                <div className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                  isActive("/admin")
                    ? 'bg-white/15 text-white shadow-lg shadow-purple-500/20' 
                    : 'text-slate-300 hover:text-slate-200 hover:bg-white/5'
                }`}>
                  <Shield size={20} strokeWidth={isActive("/admin") ? 2.5 : 2} />
                  <span className={`text-xs font-medium ${isActive("/admin") ? 'text-white' : 'text-slate-400'}`}>
                    Admin
                  </span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Floating Action Button */}
      <Dialog open={quickMoodOpen} onOpenChange={setQuickMoodOpen}>
        <DialogTrigger asChild>
          <Button
            className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-full shadow-xl shadow-purple-500/30 text-white z-40 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-purple-500/40"
          >
            <Plus size={22} strokeWidth={2.5} />
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 max-w-md text-gray-900 dark:text-gray-100">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Quick Mood Entry</h3>
            <MoodSelector onSuccess={() => setQuickMoodOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
