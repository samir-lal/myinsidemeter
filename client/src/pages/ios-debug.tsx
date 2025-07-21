import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMutation } from '@tanstack/react-query';
import { isNativeIOSApp, getApiUrl } from '@/lib/tokenManager';
import { setAuthToken } from '@/lib/tokenManager';

interface LoginFormData {
  username: string;
  password: string;
}

export default function IOSDebug() {
  const [formData, setFormData] = React.useState<LoginFormData>({
    username: 'iostest',
    password: 'test123'
  });

  const handleInputChange = (field: keyof LoginFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  // Force iOS login mode for debugging
  const forceIOSLoginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      console.log('🧪 FORCE iOS Login Test: Starting...');
      
      // FORCE use the remote API URL regardless of platform detection
      const apiUrl = `https://719020a8-14ef-4990-9271-0809740d53a3-00-6or1nqsrtxpx.picard.replit.dev/api/login`;
      
      console.log('🧪 FORCE iOS Login: Using API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'capacitor://localhost'
        },
        body: JSON.stringify({
          username: data.username.toLowerCase().trim(),
          password: data.password
        }),
        credentials: 'omit' // iOS style - no cookies
      });

      console.log('🧪 FORCE iOS Login: Response status:', response.status);
      console.log('🧪 FORCE iOS Login: Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('🧪 FORCE iOS Login: Raw response:', responseText);
      
      if (!response.ok) {
        throw new Error(`Login failed: ${response.status} ${responseText}`);
      }

      const jsonData = JSON.parse(responseText);
      console.log('🧪 FORCE iOS Login: Parsed JSON:', jsonData);
      
      if (jsonData.iosAuthToken) {
        console.log('🧪 FORCE iOS Login: Storing token:', jsonData.iosAuthToken);
        // Store the token using iOS method
        await setAuthToken(jsonData.iosAuthToken);
        console.log('🧪 FORCE iOS Login: Token stored successfully');
      }
      
      return jsonData;
    },
    onSuccess: (data) => {
      console.log('✅ FORCE iOS Login: Success!', data);
      alert(`iOS Login Success! Token: ${data.iosAuthToken?.substring(0, 20)}...`);
    },
    onError: (error) => {
      console.error('❌ FORCE iOS Login: Error:', error);
      alert(`iOS Login Error: ${error.message}`);
    }
  });

  const handleForceIOSLogin = (e: React.FormEvent) => {
    e.preventDefault();
    forceIOSLoginMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-gray-800">
            iOS Debug Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Platform Detection Status:</h3>
              <div className="text-sm space-y-1">
                <p>• Is Native iOS App: <strong>{String(isNativeIOSApp())}</strong></p>
                <p>• Window Protocol: <strong>{window.location.protocol}</strong></p>
                <p>• User Agent iOS: <strong>{String(navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad'))}</strong></p>
                <p>• API URL Would Be: <strong>{getApiUrl('/api/login')}</strong></p>
              </div>
            </div>
          </div>

          <form onSubmit={handleForceIOSLogin} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={handleInputChange('username')}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange('password')}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={forceIOSLoginMutation.isPending}
            >
              {forceIOSLoginMutation.isPending ? 'Testing iOS Login...' : 'Force iOS Login Test'}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>This forces iOS-style authentication regardless of platform detection</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}