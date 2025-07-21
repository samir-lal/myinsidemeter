import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Moon, AlertCircle, Loader2, ArrowLeft, Home } from "lucide-react";
import { setAuthToken, clearAuthToken, debugTokenState } from "@/lib/tokenManager";
import { Link, useLocation } from "wouter";

/**
 * iOS-Specific Login Component
 * Dedicated login flow for iOS users that bypasses session-based authentication
 * and implements secure token-based authentication with immediate storage
 */

export default function IOSLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  // iOS Login Mutation - Direct token-based authentication
  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      console.log('🚀 iOS Login: Starting authentication for user:', username);
      
      // Clear any existing tokens first
      await clearAuthToken();
      
      const response = await fetch('/api/ios-login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-iOS-Client': 'true' // Mark as iOS client request
        },
        body: JSON.stringify({ 
          username: username.toLowerCase().trim(), // Ensure lowercase for consistency
          password 
        }),
      });

      console.log('📡 iOS Login: Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ iOS Login: Authentication failed:', errorData);
        throw new Error(errorData || 'Login failed');
      }

      const data = await response.json();
      console.log('✅ iOS Login: Authentication successful, processing response...');
      
      // Verify we received a token
      if (!data.token) {
        console.error('❌ iOS Login: No token received in response');
        throw new Error('Invalid response: no authentication token received');
      }

      console.log('🔐 iOS Login: Token received, storing securely...');
      
      // Store token immediately using tokenManager
      await setAuthToken(data.token);
      
      // Debug token state after storage
      await debugTokenState();
      
      return data;
    },
    onSuccess: async (data) => {
      console.log('🎉 iOS Login: Login successful, redirecting to dashboard...');
      
      // Clear any login errors
      setLoginError("");
      
      // Show success message
      toast({
        title: "Welcome to InsideMeter!",
        description: "You're now logged in and ready to track your mood journey.",
      });

      // Invalidate auth queries to refresh user state
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
      
      // Navigate to home dashboard
      setLocation("/ios-home");
    },
    onError: (error: any) => {
      console.error('❌ iOS Login: Login failed:', error);
      
      const errorMessage = error.message || "Login failed. Please check your credentials.";
      setLoginError(errorMessage);
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Google OAuth for iOS - Deep link handling
  const handleGoogleLogin = () => {
    console.log('🔗 iOS Login: Initiating Google OAuth for iOS...');
    
    // For iOS, we'll redirect to Google OAuth with iOS-specific callback
    const oauthUrl = '/api/auth/google?ios=true';
    window.location.href = oauthUrl;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!username.trim() || !password) {
      setLoginError("Please enter both username and password");
      return;
    }
    
    // Clear previous errors
    setLoginError("");
    
    // Start iOS login process
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 flex items-center justify-center p-4 pt-20 pb-20">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-lg">
              <Moon className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-muted-foreground mt-2">
              Sign in to continue your mood tracking journey
            </p>
          </div>
        </div>

        {/* iOS Login Card */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">iOS Login</CardTitle>
            <CardDescription className="text-center">
              Secure authentication for your iOS device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username or Email</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username or email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  disabled={loginMutation.isPending}
                  className="transition-all duration-200"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={loginMutation.isPending}
                    className="pr-10 transition-all duration-200"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loginMutation.isPending}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Error Alert */}
              {loginError && (
                <Alert variant="destructive" className="animate-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Separator */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Google OAuth */}
            <Button
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={loginMutation.isPending}
              className="w-full"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            {/* Navigation Links */}
            <div className="text-center space-y-2 pt-4">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup" className="text-primary hover:underline font-medium">
                  Sign up here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Navigation */}
        <div className="flex justify-center space-x-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}