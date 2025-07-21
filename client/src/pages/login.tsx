import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Moon, LogIn, Key, UserPlus, Heart, Sparkles, ArrowLeft, Home, Sun } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import Navigation from "@/components/navigation-fixed";
import { useAuth } from "@/hooks/useAuth";
import { isNativeIOSApp } from "@/lib/tokenManager";
import { trackEvent } from "@/lib/analytics";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { refreshAuth } = useAuth();

  // Phase 2: Redirect ONLY native iOS app users to dedicated iOS login
  // Mobile Safari users stay on web login
  useEffect(() => {
    if (isNativeIOSApp()) {
      console.log('📱 Web Login: Native iOS app detected, redirecting to iOS login');
      setLocation("/ios-login");
    }
  }, [setLocation]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string; twoFactorToken?: string }) => {
      const response = await apiRequest("POST", "/api/login", credentials);
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setUserId(data.userId);
        return;
      }

      // Track successful login event
      trackEvent('login', 'authentication', 'success');
      
      // Refresh auth status after successful login
      refreshAuth();
      setLocation('/');
    },
    onError: (error) => {
      console.error('Login error:', error);
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        throw new Error("Password reset failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setShowForgotPassword(false);
      setResetEmail("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 Web Login Debug - Starting login attempt');
    console.log('🔍 User Agent:', navigator.userAgent);
    console.log('🔍 Username:', username);
    console.log('🔍 Password Length:', password.length);
    console.log('🔍 Mutation Status - isPending:', loginMutation.isPending);
    loginMutation.mutate({ username: username.toLowerCase(), password });
  };

  const handleTwoFactorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username: username.toLowerCase(), password, twoFactorToken });
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    forgotPasswordMutation.mutate(resetEmail);
  };

  return (
    <>
      {/* Top Navigation for iOS with proper spacing */}
      <nav className="glassmorphism fixed top-0 left-0 right-0 z-50 px-4 py-4 pt-safe-area-inset-top ios:pt-20">
        <div className="max-w-md mx-auto flex items-center justify-between min-h-[44px] ios:min-h-[60px]">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white/90 hover:bg-transparent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-2">
              <Sun className="text-yellow-400" size={20} />
              <span className="font-semibold text-lg text-white">InsideMeter</span>
            </div>
            <div className="text-xs text-white/70 ios:text-sm">Track. Reflect. Transform.</div>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white/90 hover:bg-transparent">
              <Home className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </nav>

      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 pt-28 ios:pt-36 pb-32 ios:pb-40">
        <div className="w-full max-w-md lg:max-w-lg">
        {/* Welcoming Header - Compact for iOS */}
        <div className="text-center mb-6 ios:mb-4 space-y-3 ios:space-y-2">
          <div className="flex items-center justify-center space-x-3 mb-3 ios:mb-2">
            <div className="text-3xl ios:text-2xl animate-pulse">🌙</div>
            <h1 className="text-2xl ios:text-xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              InsideMeter
            </h1>
          </div>
          
          <div className="space-y-2 ios:space-y-1">
            <h2 className="text-lg ios:text-base sm:text-xl font-semibold text-gray-700 dark:text-gray-200">
              Welcome back to your journey
            </h2>
            <div className="flex items-center justify-center gap-2">
              <Heart className="h-3 w-3 ios:h-3 ios:w-3 text-pink-500" />
              <p className="text-sm ios:text-xs sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                When you see clearly, you live differently
              </p>
              <Sparkles className="h-3 w-3 ios:h-3 ios:w-3 text-purple-500" />
            </div>
            <p className="text-xs ios:text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Continue tracking your patterns and discovering your inner wisdom
            </p>
          </div>
        </div>

        <Card className="glassmorphism border-purple-200/50 dark:border-purple-700/50 shadow-xl backdrop-blur-sm">
          <CardHeader className="text-center space-y-3 pb-6">
            <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Sign In to Your Account
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Ready to reflect and transform? Let's continue your mindful journey.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-5 ios:space-y-4">
            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="resetEmail" className="text-gray-700 dark:text-gray-300 font-medium">
                    Email Address
                  </Label>
                  <input
                    id="resetEmail"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    data-intentional="true"
                    className="w-full h-12 px-4 py-3 bg-white/90 backdrop-blur-sm border-2 border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 hover:border-gray-400 shadow-sm dark:bg-gray-800/90 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-400"
                  />
                </div>
                
                {forgotPasswordMutation.error && (
                  <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700">
                    <AlertDescription className="text-red-700 dark:text-red-300">
                      Password reset failed. Please try again.
                    </AlertDescription>
                  </Alert>
                )}

                {forgotPasswordMutation.isSuccess && (
                  <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
                    <AlertDescription className="text-green-700 dark:text-green-300">
                      Password reset instructions have been sent to your email.
                      {forgotPasswordMutation.data?.resetInfo && (
                        <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs">
                          <strong>Demo Info:</strong> {forgotPasswordMutation.data.resetInfo}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    type="submit" 
                    className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium shadow-lg transition-all"
                    disabled={forgotPasswordMutation.isPending}
                  >
                    {forgotPasswordMutation.isPending ? (
                      "Sending..."
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        Reset Password
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    className="flex-1 h-12 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Back to Login
                  </Button>
                </div>
              </form>
            ) : requiresTwoFactor ? (
              <form onSubmit={handleTwoFactorSubmit} className="space-y-6">
                <div className="text-center mb-4">
                  <div className="text-amber-500 text-sm mb-2 flex items-center justify-center gap-2">
                    <Key className="h-4 w-4" />
                    Admin Security Required
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="twoFactorToken" className="text-gray-700 dark:text-gray-300 font-medium">
                    Authentication Code
                  </Label>
                  <Input
                    id="twoFactorToken"
                    type="text"
                    value={twoFactorToken}
                    onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-12 bg-white/80 dark:bg-gray-800/80 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-center text-lg tracking-widest focus:border-purple-500 focus:ring-purple-500/20"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    You can also use a backup code if you don't have access to your authenticator app
                  </p>
                </div>
                
                {loginMutation.error && (
                  <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700">
                    <AlertDescription className="text-red-700 dark:text-red-300">
                      Invalid authentication code. Please try again.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    type="submit" 
                    className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium shadow-lg"
                    disabled={loginMutation.isPending || twoFactorToken.length !== 6}
                  >
                    {loginMutation.isPending ? (
                      "Verifying..."
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        Verify & Login
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    className="h-12 px-6 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => {
                      setRequiresTwoFactor(false);
                      setTwoFactorToken("");
                      setUserId(null);
                    }}
                  >
                    Back
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 ios:space-y-4">
                <div className="space-y-3 ios:space-y-2">
                  <div>
                    <Label htmlFor="username" className="text-slate-700 dark:text-slate-200 font-medium flex items-center gap-2 text-sm">
                      <span>👤</span> Username or Email
                    </Label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username or email"
                      required
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      data-intentional="true"
                      className="w-full h-11 ios:h-10 px-4 py-2 ios:py-2 bg-white/90 backdrop-blur-sm border-2 border-purple-200 rounded-lg text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 hover:border-purple-300 shadow-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="password" className="text-slate-700 dark:text-slate-200 font-medium flex items-center gap-2 text-sm">
                      <span>🔒</span> Password
                    </Label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      data-intentional="true"
                      className="w-full h-11 ios:h-10 px-4 py-2 ios:py-2 bg-white/90 backdrop-blur-sm border-2 border-purple-200 rounded-lg text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 hover:border-purple-300 shadow-sm"
                    />
                  </div>
                </div>
                
                {loginMutation.error && (
                  <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700">
                    <AlertDescription className="text-red-700 dark:text-red-300">
                      Invalid username or password. Please try again.
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-11 ios:h-10 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium shadow-lg transition-all transform hover:scale-[1.02] text-sm ios:text-sm"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Signing in...
                    </div>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In to Your Journey
                    </>
                  )}
                </Button>

                {/* Google Sign-In Button */}
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full h-11 ios:h-10 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-red-400 transition-all text-sm ios:text-sm"
                  onClick={() => {
                    // Detect if running in iOS app (Capacitor)
                    const isIOSApp = window.navigator.userAgent.includes('Capacitor') || 
                                   window.navigator.userAgent.includes('InsideMeter') ||
                                   (window as any).Capacitor?.isNativePlatform();
                    
                    const googleAuthUrl = isIOSApp ? '/auth/google?ios=true' : '/auth/google';
                    console.log('🔍 Google OAuth - iOS app detected:', isIOSApp, 'URL:', googleAuthUrl);
                    
                    window.location.href = googleAuthUrl;
                  }}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
                
                <div className="space-y-4">
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 p-0 h-auto text-sm transition-colors"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Forgot your password?
                    </Button>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
                    <span className="px-4 text-gray-500 dark:text-gray-400 text-sm">or</span>
                    <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  
                  <Link href="/register">
                    <Button 
                      type="button"
                      variant="outline"
                      className="w-full h-11 ios:h-10 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-purple-400 transition-all text-sm ios:text-sm"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create New Account
                    </Button>
                  </Link>
                </div>
                
                {/* Encouraging Footer Message - Compact for iOS */}
                <div className="text-center pt-3 ios:pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs ios:text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Every login is a step toward deeper self-understanding ✨
                  </p>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
      
      {/* Bottom Navigation - Login Page */}
      <div className="fixed bottom-0 left-0 right-0 z-50 glassmorphism pb-safe-area-inset-bottom ios:pb-12">
        <div className="max-w-md mx-auto px-4 py-2">
          <div className="flex justify-around items-center min-h-[44px] ios:min-h-[60px]">
            <Link href="/">
              <div className="flex flex-col items-center space-y-1 p-2 rounded-lg hover:bg-white/10 transition-colors">
                <Home className="w-5 h-5 text-white/70" />
                <span className="text-xs text-white/70 font-medium">Home</span>
              </div>
            </Link>
            <Link href="/register">
              <div className="flex flex-col items-center space-y-1 p-2 rounded-lg hover:bg-white/10 transition-colors">
                <UserPlus className="w-5 h-5 text-white/70" />
                <span className="text-xs text-white/70 font-medium">Sign Up</span>
              </div>
            </Link>
            <div className="flex flex-col items-center space-y-1 p-2 rounded-lg bg-blue-500/20">
              <LogIn className="w-5 h-5 text-blue-400" />
              <span className="text-xs text-blue-400 font-medium">Login</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}