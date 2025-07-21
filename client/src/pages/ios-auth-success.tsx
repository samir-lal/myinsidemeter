import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, Loader2, Smartphone, Globe } from 'lucide-react';
import { setAuthToken, isNativeIOSApp } from '@/lib/tokenManager';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Phase 5: iOS OAuth Success Handler
 * Handles deep-link returns from Google OAuth with token processing
 * URL format: insidemeter://auth/success?token=<token>&userId=<id>
 * Or web format: /ios-auth-success?token=<token>&userId=<id>
 */

export default function IOSAuthSuccessPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { initializeAuth } = useAuth();
  const queryClient = useQueryClient();
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    console.log('🔗 iOS Auth Success: Page loaded, processing OAuth callback');
    
    const processOAuthCallback = async () => {
      try {
        // Parse URL parameters from either deep-link or web URL
        const url = new URL(window.location.href);
        const token = url.searchParams.get('token');
        const userId = url.searchParams.get('userId');
        
        console.log('🔍 iOS Auth Success: Parsing URL parameters', { 
          hasToken: !!token, 
          userId, 
          fullURL: window.location.href 
        });

        if (!token) {
          console.error('❌ iOS Auth Success: No token found in URL parameters');
          setStatus('error');
          setMessage('OAuth failed - no authentication token received');
          
          toast({
            title: "Authentication Failed",
            description: "No authentication token received from Google",
            variant: "destructive",
          });
          
          // Redirect to login after delay
          setTimeout(() => {
            setLocation('/ios-login');
          }, 3000);
          return;
        }

        console.log('🔐 iOS Auth Success: Token found, storing securely...');
        setMessage('Storing authentication credentials...');

        // Phase 5: Store token securely using tokenManager
        await setAuthToken(token);
        console.log('✅ iOS Auth Success: Token stored successfully');

        setMessage('Refreshing authentication state...');

        // Phase 5: Force UI sync after OAuth success
        console.log('🔄 iOS Auth Success: Starting force UI sync');
        
        // Step 1: Invalidate all queries
        await queryClient.invalidateQueries();
        console.log('✅ iOS Auth Success: Queries invalidated');
        
        // Step 2: Force auth state refresh
        await initializeAuth();
        console.log('✅ iOS Auth Success: Auth state refreshed');

        setStatus('success');
        setMessage('Google authentication successful!');
        
        toast({
          title: "Welcome to InsideMeter!",
          description: "Google authentication completed successfully",
        });

        // Navigate to home after brief success display
        setTimeout(() => {
          setLocation('/');
        }, 2000);

      } catch (error) {
        console.error('❌ iOS Auth Success: Token processing failed:', error);
        setStatus('error');
        setMessage('Failed to process authentication token');
        
        toast({
          title: "Authentication Error",
          description: "Failed to process Google authentication",
          variant: "destructive",
        });
        
        // Redirect to login after delay
        setTimeout(() => {
          setLocation('/ios-login');
        }, 3000);
      }
    };

    processOAuthCallback();
  }, [setLocation, toast, initializeAuth, queryClient]);

  // Redirect non-iOS users to regular login
  useEffect(() => {
    if (!isNativeIOSApp()) {
      console.log('🌐 iOS Auth Success: Non-iOS device detected, redirecting to web');
      setLocation('/login');
    }
  }, [setLocation]);

  const handleReturnToApp = () => {
    console.log('📱 iOS Auth Success: Manual return to app triggered');
    setLocation('/');
  };

  const handleRetryLogin = () => {
    console.log('🔄 iOS Auth Success: Retry login triggered');
    setLocation('/ios-login');
  };

  if (!isNativeIOSApp()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Redirecting...</h2>
          <p className="text-muted-foreground">Taking you to the web login page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 flex items-center justify-center p-4 pt-20 pb-20">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
            <Globe className="w-8 h-8 text-white" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Google OAuth
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Processing your authentication
            </p>
          </div>
        </div>

        {/* Status Card */}
        <Card className="shadow-xl border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              {status === 'processing' && (
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              )}
              {status === 'success' && (
                <CheckCircle className="w-12 h-12 text-green-500" />
              )}
              {status === 'error' && (
                <AlertCircle className="w-12 h-12 text-red-500" />
              )}
            </div>
            
            <CardTitle className="text-xl">
              {status === 'processing' && 'Processing...'}
              {status === 'success' && 'Success!'}
              {status === 'error' && 'Authentication Failed'}
            </CardTitle>
            
            <CardDescription className="text-center">
              {message}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {status === 'success' && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  You will be automatically redirected to the app in a moment.
                </AlertDescription>
              </Alert>
            )}

            {status === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please try logging in again or contact support if the problem persists.
                </AlertDescription>
              </Alert>
            )}

            {/* Manual Navigation Buttons */}
            <div className="flex flex-col gap-3 pt-4">
              {status === 'success' && (
                <Button 
                  onClick={handleReturnToApp}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Return to App
                </Button>
              )}
              
              {status === 'error' && (
                <Button 
                  onClick={handleRetryLogin}
                  variant="outline"
                  className="w-full"
                >
                  Try Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions for Deep-Link */}
        {status === 'success' && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                  Authentication Complete
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  If the app doesn't open automatically, tap "Return to App" above or manually switch back to InsideMeter.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}