import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export function setupOAuthRedirectHandler() {
  if (Capacitor.getPlatform() !== 'ios') return;

  App.addListener('appUrlOpen', async ({ url }) => {
    console.log('🔁 OAuth Deep Link:', url);

    if (url.startsWith('insidemeter://auth/success')) {
      try {
        const urlObj = new URL(url);
        const token = urlObj.searchParams.get('token');
        
        if (token) {
          console.log('🔐 Token extracted from URL:', token);

          // Store securely in iOS SecureStorage
          const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
          await SecureStoragePlugin.set({ key: 'auth-token', value: token });
          
          // Also store in localStorage for consistency
          localStorage.setItem('iosAuthToken', token);
          
          console.log('✅ Token saved to SecureStorage and localStorage');

          // Trigger page refresh to update auth state
          window.location.href = '/';
        } else {
          console.warn('❌ No token found in OAuth redirect URL');
        }
      } catch (error) {
        console.error('❌ Failed to process OAuth redirect:', error);
      }
    }
  });
}