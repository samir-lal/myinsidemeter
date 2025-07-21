// App v2.3.0 - Navigation labels: Meter & Journal
import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
// Hotjar removed for iOS compatibility
import Navigation from "@/components/navigation-fixed";
import { CookieConsent } from "@/components/cookie-consent";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import Home from "@/pages/home";
import Charts from "@/pages/charts";
import Calendar from "@/pages/calendar";
import Subscription from "@/pages/subscription";

import SubscriptionCheckout from "@/pages/subscription-checkout";


import Pro from "@/pages/pro";
import Meter from "@/pages/meter";
import Profile from "@/pages/profile";

import Admin from "@/pages/admin";
import Monitoring from "@/pages/monitoring";
import PersonalGrowth from "@/pages/personal-growth";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ResetPassword from "@/pages/reset-password";
import ForgotPassword from "@/pages/forgot-password";
import NotFound from "@/pages/not-found";
import IOSAuthSuccess from "@/pages/ios-auth-success";
import IOSLogin from "@/pages/ios-login";
import IOSDebug from "@/pages/ios-debug";
// iOS-specific pages
import IOSHome from "@/pages/ios-home";
import IOSJournal from "@/pages/ios-journal";
import IOSProfile from "@/pages/ios-profile";
import ProtectedRoute from "@/components/protected-route";
import { setupOAuthRedirectHandler } from "@/lib/oauth-handler";
import { isNativeIOSApp } from "@/lib/tokenManager";

// Smart component that serves iOS-specific pages for native iOS app
function IOSAwareComponent({ iosComponent, webComponent }: { iosComponent: React.ComponentType, webComponent: React.ComponentType }) {
  const IOSComponent = iosComponent;
  const WebComponent = webComponent;
  
  if (isNativeIOSApp()) {
    return <IOSComponent />;
  }
  return <WebComponent />;
}

function Router() {
  // Track page views when routes change
  useAnalytics();
  
  // Setup OAuth deep link handler for iOS
  useEffect(() => {
    setupOAuthRedirectHandler();
  }, []);

  // Check for Google OAuth token in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token && urlParams.get('auth') === 'google_success') {
      // Authenticate with token
      fetch('/api/auth/token-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Clear URL parameters and refresh
          window.history.replaceState({}, document.title, window.location.pathname);
          queryClient.invalidateQueries();
          window.location.reload();
        } else {
          console.error('Token authentication failed:', data.error);
        }
      })
      .catch(error => {
        console.error('Token authentication error:', error);
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[var(--space)] text-[var(--lunar)] pt-safe-area-inset-top ios:pt-12 pb-safe-area-inset-bottom ios:pb-6">
      <Navigation />
      <div className="pt-16 pb-20">
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/ios-login" component={IOSLogin} />
          <Route path="/ios-debug" component={IOSDebug} />
          <Route path="/ios-auth-success" component={IOSAuthSuccess} />
          <Route path="/register" component={Register} />
          <Route path="/">
            <IOSAwareComponent iosComponent={IOSHome} webComponent={Home} />
          </Route>
          <Route path="/charts">
            <ProtectedRoute>
              <Charts />
            </ProtectedRoute>
          </Route>
          <Route path="/calendar">
            <ProtectedRoute>
              <Calendar />
            </ProtectedRoute>
          </Route>
          <Route path="/subscription" component={Subscription} />

          <Route path="/subscription-checkout">
            <ProtectedRoute>
              <SubscriptionCheckout />
            </ProtectedRoute>
          </Route>


          <Route path="/pro">
            <ProtectedRoute>
              <Pro />
            </ProtectedRoute>
          </Route>
          <Route path="/meter" component={Meter} />
          <Route path="/community">
            {() => {
              window.location.href = "/meter";
              return null;
            }}
          </Route>
          <Route path="/personal-growth">
            {() => {
              if (isNativeIOSApp()) {
                // Redirect iOS users to home since Journal tab is removed
                window.location.href = "/";
                return null;
              }
              return (
                <ProtectedRoute>
                  <PersonalGrowth />
                </ProtectedRoute>
              );
            }}
          </Route>
          <Route path="/profile">
            <IOSAwareComponent 
              iosComponent={IOSProfile} 
              webComponent={() => (
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              )} 
            />
          </Route>

          <Route path="/admin">
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          </Route>
          <Route path="/monitoring">
            <ProtectedRoute>
              <Monitoring />
            </ProtectedRoute>
          </Route>
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/auth/ios-success" component={IOSAuthSuccess} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <CookieConsent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
