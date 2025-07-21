import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * iOS Token Manager - Unified token storage and retrieval for iOS authentication
 * Handles secure token storage with Capacitor Preferences and localStorage fallback
 */

// Centralized API URL resolution for iOS cross-origin requests
export const getApiUrl = (endpoint: string): string => {
  const isIOS = Capacitor.getPlatform() === 'ios'
    || Capacitor.isNativePlatform()
    || navigator.userAgent.includes('iPhone')
    || window.location.protocol.startsWith('capacitor:')
    || window.location.protocol.startsWith('insidemeter:');  // add your custom scheme here

  if (isIOS) {
    // Use production domain for iOS API calls
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://insidemeter.com'
      : 'https://insidemeter-production.up.railway.app';
    return `${baseUrl}${endpoint}`;
  }

  return endpoint;
};

const TOKEN_KEY = 'ios_token';
const TOKEN_TIMESTAMP_KEY = 'ios_token_timestamp';

// Platform detection utilities - AGGRESSIVE iOS DETECTION FOR DEBUGGING
export const isNativeIOSApp = (): boolean => {
  try {
    // Primary checks
    const capacitorPlatform = Capacitor.getPlatform() === 'ios';
    const userAgentIOS = navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad');
    const isCapacitorNative = Capacitor.isNativePlatform();
    const windowLocationProtocol = window.location.protocol === 'capacitor:' || window.location.protocol === 'insidemeter:';
    
    // ENHANCED: Check for Capacitor plugins (indicates native environment)
    const hasCapacitorPlugins = window.Capacitor?.Plugins !== undefined;
    
    // ENHANCED: Check if running in iOS WebView with remote URL but still iOS
    const isIOSWebView = userAgentIOS && (
      window.location.href.includes('replit.dev') || 
      window.location.href.includes('localhost') ||
      window.location.href.includes('capacitor://localhost') ||
      window.location.href.includes('insidemeter://localhost')
    );
    
    // CRITICAL FIX: If we see iPhone user agent + insidemeter protocol, it's definitely iOS
    const isInsideMeterIOS = userAgentIOS && window.location.href.includes('insidemeter://');
    
    // AGGRESSIVE iOS detection with multiple fallbacks
    const isIOS = capacitorPlatform || 
                  windowLocationProtocol || 
                  (userAgentIOS && isCapacitorNative) ||
                  (userAgentIOS && hasCapacitorPlugins) ||
                  isIOSWebView ||
                  isInsideMeterIOS;
    
    // Comprehensive logging for debugging
    console.log('🔍 ENHANCED PLATFORM DETECTION REPORT:');
    console.log('  Capacitor Platform:', Capacitor.getPlatform());
    console.log('  Is Capacitor Native:', isCapacitorNative);
    console.log('  User Agent:', navigator.userAgent);
    console.log('  User Agent iOS:', userAgentIOS);
    console.log('  Window Location:', window.location.href);
    console.log('  Protocol is Capacitor:', windowLocationProtocol);
    console.log('  Has Capacitor Plugins:', hasCapacitorPlugins);
    console.log('  Is iOS WebView:', isIOSWebView);
    console.log('  Is InsideMeter iOS:', isInsideMeterIOS);
    console.log('  FINAL iOS DETECTION:', isIOS);
    
    if (isIOS) {
      console.log('🍎 Platform Detection: Native iOS app CONFIRMED (using enhanced detection)');
    } else {
      console.log('🌐 Platform Detection: Web platform CONFIRMED');
    }
    
    return isIOS;
  } catch (error) {
    console.warn('🔍 Platform Detection: Error, using fallback detection', error);
    // AGGRESSIVE fallback: If error occurs and we see iOS user agent, assume iOS
    const userAgentFallback = navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad');
    console.log('🔄 Fallback iOS detection result:', userAgentFallback);
    return userAgentFallback;
  }
};

// Backwards compatibility alias
export const isIOSDevice = isNativeIOSApp;

// Token management functions - Phase 1: Platform-Specific Logic Guarding
export const setAuthToken = async (token: string): Promise<void> => {
  // ✅ Phase 1: Early exit guard for non-iOS platforms
  if (!isNativeIOSApp()) {
    console.log('🚫 Token Manager: Web platform detected - iOS tokens not needed');
    return;
  }

  const timestamp = Date.now().toString();
  
  console.log('🔐 Token Manager: Starting iOS token storage process');
  console.log('🔐 Token Manager: Token length:', token?.length || 0);
  console.log('🔐 Token Manager: Token preview:', token?.substring(0, 20) + '...');
  
  try {
    console.log('📱 Token Manager: Using Capacitor Preferences for native iOS');
    await Preferences.set({ key: TOKEN_KEY, value: token });
    await Preferences.set({ key: TOKEN_TIMESTAMP_KEY, value: timestamp });
    
    // Immediately verify storage
    const storedToken = await Preferences.get({ key: TOKEN_KEY });
    const storedTimestamp = await Preferences.get({ key: TOKEN_TIMESTAMP_KEY });
    console.log('✅ Token Manager: Token stored and verified in Capacitor Preferences');
    console.log('✅ Token Manager: Stored token length:', storedToken.value?.length || 0);
    console.log('✅ Token Manager: Stored timestamp:', storedTimestamp.value);

    // Also store in localStorage as backup for iOS
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_TIMESTAMP_KEY, timestamp);
    console.log('✅ Token Manager: iOS token also stored in localStorage backup');
  } catch (error) {
    console.error('❌ Token Manager: Failed to store iOS token', error);
    // Emergency fallback to localStorage for iOS only
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_TIMESTAMP_KEY, timestamp);
      console.log('✅ Token Manager: iOS token stored in localStorage (emergency fallback)');
    } catch (fallbackError) {
      console.error('❌ Token Manager: All iOS storage methods failed', fallbackError);
      throw new Error('Failed to store iOS authentication token');
    }
  }
};

export const getAuthToken = async (): Promise<string | null> => {
  // ✅ Phase 1: Early exit guard for non-iOS platforms
  if (!isNativeIOSApp()) {
    console.log('🚫 Token Manager: Web platform detected - no iOS token needed');
    return null;
  }

  console.log('🔍 Token Manager: Starting iOS token retrieval');
  
  try {
    let token: string | null = null;
    
    console.log('📱 Token Manager: Retrieving from Capacitor Preferences (native iOS)');
    // Try Capacitor Preferences first
    const result = await Preferences.get({ key: TOKEN_KEY });
    token = result.value;
    console.log('📱 Token Manager: Capacitor Preferences result:', token ? `${token.substring(0, 20)}...` : 'null');
    
    if (token) {
      console.log('✅ Token Manager: iOS token retrieved from Capacitor Preferences');
      return token;
    }
    
    // Fallback to localStorage for iOS
    token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      console.log('✅ Token Manager: iOS token retrieved from localStorage backup');
      return token;
    }
    
    console.log('ℹ️ Token Manager: No iOS token found in storage');
    return null;
  } catch (error) {
    console.error('❌ Token Manager: Failed to retrieve iOS token', error);
    return null;
  }
};

export const getTokenTimestamp = async (): Promise<number | null> => {
  // ✅ Phase 1: Early exit guard for non-iOS platforms
  if (!isNativeIOSApp()) {
    return null;
  }

  try {
    let timestamp: string | null = null;
    
    const result = await Preferences.get({ key: TOKEN_TIMESTAMP_KEY });
    timestamp = result.value;
    
    if (!timestamp) {
      timestamp = localStorage.getItem(TOKEN_TIMESTAMP_KEY);
    }
    
    if (timestamp) {
      return parseInt(timestamp, 10);
    }
    
    return null;
  } catch (error) {
    console.error('❌ Token Manager: Failed to retrieve iOS token timestamp', error);
    return null;
  }
};

/**
 * Clears iOS authentication token from secure storage and fallback localStorage.
 * Use this during logout from iOS native apps.
 */
export const clearAuthToken = async () => {
  try {
    console.log('🧹 Clearing iOS auth token from Preferences...');
    await Preferences.remove({ key: TOKEN_KEY });
    await Preferences.remove({ key: TOKEN_TIMESTAMP_KEY });

    console.log('🧹 Removing fallback token from localStorage...');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_TIMESTAMP_KEY);

    console.log('✅ iOS token cleared successfully');
  } catch (err) {
    console.error('❌ Failed to clear iOS auth token:', err);
    throw err;
  }
};

/**
 * Universal logout utility - handles both iOS and web platforms
 */
export const performLogout = async (): Promise<{ platform: 'ios' | 'web' }> => {
  if (isNativeIOSApp()) {
    await clearAuthToken();
    return { platform: 'ios' };
  } else {
    await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include',
    });
    return { platform: 'web' };
  }
};

export const isTokenExpired = async (maxAgeHours: number = 24): Promise<boolean> => {
  // ✅ Phase 1: Early exit guard for non-iOS platforms
  if (!isNativeIOSApp()) {
    return true; // Web platform doesn't use tokens
  }

  try {
    const timestamp = await getTokenTimestamp();
    if (!timestamp) return true;
    
    const now = Date.now();
    const ageInHours = (now - timestamp) / (1000 * 60 * 60);
    
    const expired = ageInHours > maxAgeHours;
    console.log(`🕐 Token Manager: iOS token age ${ageInHours.toFixed(1)}h, expired: ${expired}`);
    
    return expired;
  } catch (error) {
    console.error('❌ Token Manager: Failed to check iOS token expiry', error);
    return true; // Assume expired on error
  }
};

// Debug utility
export const debugTokenState = async (): Promise<void> => {
  console.log('🔍 Token Manager Debug State:');
  console.log('  - Platform:', Capacitor.getPlatform());
  console.log('  - Is Native:', Capacitor.isNativePlatform());
  console.log('  - Is iOS Device:', isIOSDevice());
  console.log('  - Is Native iOS App:', isNativeIOSApp());
  
  const token = await getAuthToken();
  const timestamp = await getTokenTimestamp();
  const expired = await isTokenExpired();
  
  console.log('  - Has Token:', !!token);
  console.log('  - Token Preview:', token ? `${token.substring(0, 10)}...` : 'null');
  console.log('  - Token Timestamp:', timestamp);
  console.log('  - Is Expired:', expired);
};