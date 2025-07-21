import { QueryClient } from "@tanstack/react-query";
import { getAuthToken, isNativeIOSApp, getApiUrl } from '@/lib/tokenManager';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey, signal }: { queryKey: any[], signal?: AbortSignal }) => {
        const url = queryKey[0];
        
        // ✅ Phase 3: Query Client Header Logic - Only inject iOS headers for native iOS
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        
        if (isNativeIOSApp()) {
          try {
            const token = await getAuthToken();
            if (token) {
              headers['X-iOS-Auth-Token'] = token;
              console.log('🔐 Query: Added iOS auth token for:', url);
            }
          } catch (error) {
            console.warn('⚠️ Query: Failed to get iOS auth token:', error);
          }
        } else {
          console.log('🌐 Query: Web platform - using session credentials for:', url);
        }
        
        const apiUrl = getApiUrl(url);
        console.log('🔗 Query: Resolved API URL:', apiUrl);
        
        const res = await fetch(apiUrl, {
          signal,
          headers,
          credentials: isNativeIOSApp() ? 'omit' : 'include', // iOS uses tokens, web uses cookies
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error(`401: Authentication required. Unauthorized`);
          }
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        
        return res.json();
      },
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      staleTime: 30 * 1000, // 30 seconds
    },
  },
});

export const apiRequest = async (method: string, url: string, data?: unknown) => {
  // ✅ Phase 3: API Request Header Logic - Strict Platform Separation
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  // Only inject iOS auth token if running on native iOS app
  if (isNativeIOSApp()) {
    try {
      const token = await getAuthToken();
      if (token) {
        headers['X-iOS-Auth-Token'] = token;
        console.log('🔐 API Request: Adding iOS auth token to request');
        console.log('🔐 API Request: Token length:', token.length);
        console.log('🔐 API Request: Token preview:', token.substring(0, 20) + '...');
        console.log('🔐 API Request: Request URL:', url);
      } else {
        console.log('🔐 API Request: No iOS token available for request to:', url);
      }
    } catch (error) {
      console.warn('⚠️ API Request: Failed to get iOS auth token:', error);
    }
  } else {
    console.log('🌐 API Request: Web platform - using session credentials for:', url);
  }

  const apiUrl = getApiUrl(url);
  console.log('🔗 API Request: Resolved API URL:', apiUrl);
  console.log('🔗 API Request: Credentials mode:', isNativeIOSApp() ? 'omit (iOS)' : 'include (web)');
  console.log('🔗 API Request: Headers:', JSON.stringify(headers, null, 2));
  
  const res = await fetch(apiUrl, {
    method,
    headers,
    credentials: isNativeIOSApp() ? 'omit' : 'include', // iOS uses tokens, web uses cookies
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error(`401: Authentication required. Unauthorized`);
    }
    
    const errorText = await res.text();
    throw new Error(`${res.status}: ${errorText || res.statusText}`);
  }

  return res;
};
