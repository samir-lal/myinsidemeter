import { useState } from 'react';
import * as React from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { isNativeIOSApp, setAuthToken } from '@/lib/tokenManager';
import { Moon, User, Lock, Sparkles } from 'lucide-react';

interface LoginFormData {
  username: string;
  password: string;
}

export default function IOSLogin() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: ''
  });
  const { toast } = useToast();

  // Debug platform detection on component mount
  React.useEffect(() => {
    console.log('📱 iOS Login Component Mounted');
    console.log('📱 Platform Detection Check:', isNativeIOSApp());
    
    // Send platform debug info to backend using centralized API helper
    import('@/lib/tokenManager').then(({ getApiUrl }) => {
      const debugApiUrl = getApiUrl('/api/debug/platform-detection');
      
      fetch(debugApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: 'ios-login',
          isNativeIOS: isNativeIOSApp(),
          userAgent: navigator.userAgent,
          location: window.location.href,
          protocol: window.location.protocol,
          apiUrlUsed: debugApiUrl,
          timestamp: new Date().toISOString()
        })
      }).catch(e => console.warn('Debug request failed:', e));
    });
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      console.log('📱 iOS Login: Starting authentication...');
      console.log('📱 iOS Login: Platform detection:', isNativeIOSApp());
      console.log('📱 iOS Login: Request data:', { username: data.username, passwordLength: data.password.length });
      
      // Robust error handling for JSON parsing issues
      let responseText: string;
      
      // Use centralized API URL helper for iOS cross-origin requests
      const { getApiUrl } = await import('@/lib/tokenManager');
      const apiUrl = getApiUrl('/api/login');
      
      console.log('📱 iOS Login: Using API URL:', apiUrl);
      console.log('📱 iOS Login: Window protocol:', window.location.protocol);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: data.username.toLowerCase().trim(),
          password: data.password
        }),
        credentials: 'omit' // iOS doesn't use cookies
      });

      console.log('📱 iOS Login: Response status:', response.status);
      console.log('📱 iOS Login: Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ iOS Login: Response not ok:', {
          status: response.status,
          statusText: response.statusText,
          responseBody: errorText
        });
        
        let errorMessage = 'Login failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || `Login failed with status ${response.status}`;
        } catch (parseError) {
          errorMessage = errorText || `Login failed with status ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }

      responseText = await response.text();
      console.log('📱 iOS Login: Raw response text:', responseText);
      console.log('📱 iOS Login: Response text length:', responseText.length);
      console.log('📱 iOS Login: Response first 100 chars:', responseText.substring(0, 100));
      
      // Enhanced JSON parsing with comprehensive error handling
      if (!responseText || responseText.trim() === '') {
        console.error('❌ iOS Login: Empty response received');
        throw new Error('Empty response from server');
      }
      
      try {
        const jsonData = JSON.parse(responseText);
        console.log('✅ iOS Login: JSON parsed successfully:', jsonData);
        
        // Validate expected response structure
        if (typeof jsonData !== 'object' || jsonData === null) {
          throw new Error('Response is not a valid object');
        }
        
        return jsonData;
      } catch (parseError: any) {
        console.error('❌ iOS Login: JSON parsing failed:', {
          error: parseError.message,
          name: parseError.name,
          line: parseError.line,
          column: parseError.column,
          responseText: responseText,
          responseLength: responseText.length
        });
        
        // Check for common issues
        if (responseText.includes('<!DOCTYPE html>')) {
          throw new Error('Server returned HTML instead of JSON - possible routing error');
        }
        
        if (responseText.includes('502 Bad Gateway') || responseText.includes('503 Service Unavailable')) {
          throw new Error('Server temporarily unavailable - please try again');
        }
        
        if (parseError.message.includes('line') && parseError.message.includes('column')) {
            throw new Error(`JSON parsing error at line ${parseError.line || 0}, column ${parseError.column || 0}. Server response may be corrupted.`);
        }
        
        throw new Error(`Invalid JSON response: ${parseError.message}. Response: ${responseText.substring(0, 200)}...`);
      }
    },
    onSuccess: async (data) => {
      console.log('✅ iOS Login: Authentication successful', data);
      
      // Check if the response has the iOS token
      const iosToken = data.iosAuthToken;
      if (!iosToken) {
        console.error('❌ iOS Login: No iOS token received from server');
        toast({
          title: "Authentication Error",
          description: "No authentication token received",
          variant: "destructive"
        });
        return;
      }
      
      console.log('✅ iOS Login: Token received:', iosToken.substring(0, 20) + '...');
      
      try {
        // Use the tokenManager for consistent token storage
        await setAuthToken(iosToken);
        console.log('✅ iOS Login: Token stored in localStorage backup');
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${data.user.username}!`
        });
        
        // Trigger navigation refresh
        console.log('🔄 iOS Login: Triggering navigation auth refresh...');
        window.dispatchEvent(new CustomEvent('ios-auth-success'));
        
        // Redirect to dashboard
        console.log('🏠 iOS Login: Redirecting to dashboard...');
        setLocation('/');
        
      } catch (error) {
        console.error('❌ iOS Login: Token storage failed:', error);
        toast({
          title: "Warning",
          description: "Login successful but token storage failed",
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      console.error('❌ iOS Login: Authentication failed:', error);
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please enter both username and password",
        variant: "destructive"
      });
      return;
    }
    loginMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof LoginFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
      
      <Card className="w-full max-w-md relative z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-purple-200/50 shadow-2xl">
        <CardHeader className="text-center pb-2">
          {/* App Logo */}
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Moon className="h-8 w-8 text-white" />
          </div>
          
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            InsideMeter
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-300 mt-2">
            Welcome back to your mood journey
          </CardDescription>
          
          {/* Account Creation Notice */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">New to InsideMeter?</p>
                <p>Create your account at <span className="font-semibold">insidemeter.com</span> first. This iOS app is for quick mood entry - view detailed insights and analytics on the web.</p>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username/Email Field */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <Input
                type="text"
                placeholder="Username or Email"
                value={formData.username}
                onChange={handleInputChange('username')}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                className="pl-10 h-12 border-slate-200 focus:border-purple-400 focus:ring-purple-400/20 rounded-xl"
              />
            </div>
            
            {/* Password Field */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <Input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange('password')}
                autoComplete="current-password"
                className="pl-10 h-12 border-slate-200 focus:border-purple-400 focus:ring-purple-400/20 rounded-xl"
              />
            </div>
            
            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loginMutation.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Signing In...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Sign In
                </>
              )}
            </Button>
          </form>
          
          {/* Footer */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>iOS Native App</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}