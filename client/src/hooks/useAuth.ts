import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuthToken, clearAuthToken, isNativeIOSApp, isTokenExpired } from '@/lib/tokenManager';
import { apiRequest } from '@/lib/queryClient';

export function useAuth() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ✅ Phase 2: Restructured useAuth Hook with Strict Platform Separation
  const initializeAuth = async () => {
    console.log('🔐 useAuth: Starting authentication initialization');
    
    if (isNativeIOSApp()) {
      // iOS-only token-based authentication
      console.log('🍎 useAuth: iOS device detected, using token-based auth');
      try {
        const token = await getAuthToken();
        console.log('📱 useAuth: Retrieved iOS token:', token ? `${token.substring(0, 20)}...` : 'null');
        
        if (token) {
          console.log('📱 useAuth: iOS token found, validating...');
          
          // Check if token is expired
          const expired = await isTokenExpired();
          console.log('⏰ useAuth: Token expired check:', expired);
          
          if (expired) {
            console.log('⏰ useAuth: iOS token expired, clearing...');
            await clearAuthToken();
            setUser(null);
            setIsAuthenticated(false);
            setLoading(false);
            return;
          }
          
          // Validate token with server
          try {
            console.log('🌐 useAuth: Making API request to validate token...');
            const response = await apiRequest('GET', '/api/auth/status');
            console.log('🌐 useAuth: API response status:', response.status);
            
            if (!response.ok) {
              console.error('❌ useAuth: Bad response status:', response.status, response.statusText);
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const responseText = await response.text();
            console.log('🌐 useAuth: Raw response text:', responseText);
            
            let responseData;
            try {
              responseData = JSON.parse(responseText);
              console.log('🌐 useAuth: Parsed response data:', responseData);
            } catch (parseError) {
              console.error('❌ useAuth: Failed to parse JSON response:', parseError);
              throw new Error('Invalid JSON response from server');
            }
            
            if (responseData.isAuthenticated && responseData.user) {
              console.log('✅ useAuth: iOS token valid, user authenticated:', responseData.user.name || responseData.user.username);
              setUser(responseData.user);
              setIsAuthenticated(true);
            } else {
              console.log('❌ useAuth: Server response indicates not authenticated');
              console.log('❌ useAuth: isAuthenticated:', responseData.isAuthenticated);
              console.log('❌ useAuth: user:', responseData.user);
              await clearAuthToken();
              setUser(null);
              setIsAuthenticated(false);
            }
          } catch (err) {
            console.error('❌ useAuth: iOS token validation failed:', err);
            console.error('❌ useAuth: Error details:', err.message);
            await clearAuthToken();
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          console.log('📱 useAuth: No iOS token found - user needs to log in');
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('❌ useAuth: iOS auth initialization error:', error);
        setUser(null);
        setIsAuthenticated(false);
      }
      
      setLoading(false);
    } else {
      // Web platform - session-based authentication only
      console.log('🌐 useAuth: Web platform detected, using session-based auth');
      // For web, let the useQuery handle everything, don't interfere
      setLoading(false);
    }
  };

  // ✅ Phase 2: Web session-based authentication query (ONLY for web users)
  const { data: webAuthData, isLoading: webLoading } = useQuery({
    queryKey: ["/api/auth/status"],
    queryFn: async () => {
      console.log('🌐 useAuth: Making web session auth request');
      const response = await fetch("/api/auth/status", {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🌐 useAuth: Web session auth response:', data);
      return data;
    },
    retry: 1,
    retryDelay: 500,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchInterval: false,
    refetchOnReconnect: false,
    enabled: !isNativeIOSApp(), // ONLY run for web users
    placeholderData: { isAuthenticated: false, user: null }, // Prevent flickering
  });

  // ✅ Phase 2: iOS-only initialization on mount
  useEffect(() => {
    if (isNativeIOSApp()) {
      initializeAuth();
    }
    // Web platform uses useQuery automatically, no manual initialization needed
  }, []);

  // ✅ Phase 2: Listen for iOS auth success events to refresh state
  useEffect(() => {
    const handleAuthSuccess = () => {
      console.log('🔄 useAuth: iOS auth success event received, refreshing...');
      if (isNativeIOSApp()) {
        initializeAuth(); // Re-run iOS authentication check
      } else {
        // For web, invalidate the query to force refresh
        queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      }
    };

    window.addEventListener('ios-auth-success', handleAuthSuccess);
    return () => window.removeEventListener('ios-auth-success', handleAuthSuccess);
  }, [queryClient]);

  // ✅ Phase 2: Web-only auth state updates with reduced flickering
  useEffect(() => {
    if (!isNativeIOSApp() && webAuthData !== undefined) {
      console.log('🌐 useAuth: Updating web auth state from session data');
      setUser(webAuthData.user);
      setIsAuthenticated(webAuthData.isAuthenticated || false);
      // Only show loading on initial load, not on every update
      if (webLoading && !user && !isAuthenticated) {
        setLoading(webLoading);
      } else {
        setLoading(false);
      }
    }
  }, [webAuthData, webLoading]);

  // ✅ Phase 2: Platform-separated logout function
  const logout = async () => {
    console.log('🚪 useAuth: Starting logout');
    
    if (isNativeIOSApp()) {
      console.log('🍎 useAuth: iOS logout - clearing token');
      await clearAuthToken();
      setUser(null);
      setIsAuthenticated(false);
      // Navigate to iOS login screen
      window.location.href = '/ios-login';
    } else {
      console.log('🌐 useAuth: Web logout - clearing session');
      try {
        const response = await fetch('/api/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Logout failed');
        }
        
        // Clear web auth state
        setUser(null);
        setIsAuthenticated(false);
        
        // Clear any stored tokens
        if (typeof window !== 'undefined') {
          localStorage.removeItem('guestSession');
          localStorage.removeItem('iosAuthToken');
          localStorage.removeItem('ios_token');
        }
        
        console.log('🌐 useAuth: Web logout successful');
        window.location.href = '/';
      } catch (error) {
        console.error('❌ useAuth: Web logout error:', error);
        // Even if logout API fails, clear local state
        setUser(null);
        setIsAuthenticated(false);
        queryClient.clear();
        window.location.href = '/';
      }
    }
  };

  // ✅ Phase 2: Platform-separated refresh function
  const refreshAuth = async () => {
    console.log('🔄 useAuth: Refreshing authentication state');
    
    if (isNativeIOSApp()) {
      await initializeAuth();
    } else {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading: isNativeIOSApp() ? loading : webLoading,
    logout,
    refreshAuth,
    initializeAuth // Exposed for login success callbacks
  };
}