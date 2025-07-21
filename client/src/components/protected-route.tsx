import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Shield } from "lucide-react";
import { Link } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export default function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // If authentication is not required, render children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--space)] via-[var(--deep-space)] to-[var(--cosmos)] p-6">
        <div className="max-w-md mx-auto pt-20">
          <div className="animate-pulse bg-gray-300 dark:bg-gray-700 h-32 rounded-lg"></div>
        </div>
      </div>
    );
  }

  // Show authentication prompt for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-slate-950 dark:via-purple-950 dark:to-slate-900 p-6 flex items-center justify-center">
        <div className="max-w-md w-full">
          <Card className="relative overflow-hidden bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-0 shadow-2xl">
            {/* Decorative background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-blue-500/5 dark:from-purple-400/10 dark:via-pink-400/10 dark:to-blue-400/10" />
            
            {/* Content */}
            <div className="relative p-8 text-center">
              {/* Enhanced shield icon with glow effect */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-xl opacity-20 animate-pulse" />
                <div className="relative bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center">
                  <Shield className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                </div>
              </div>

              {/* Enhanced title with gradient */}
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-3">
                Account Required
              </h2>
              
              {/* Better description */}
              <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Your emotions tell a story. Create a free account to see the pattern, shift the rhythm, and own the narrative.
              </p>

              {/* Enhanced buttons with better styling */}
              <div className="space-y-4">
                <Link href="/register">
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
                    <UserPlus className="w-5 h-5 mr-3" />
                    Create Free Account
                  </Button>
                </Link>
                
                <Link href="/login">
                  <Button variant="outline" className="w-full border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium py-6 text-lg rounded-xl transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-600">
                    Already have an account? Sign In
                  </Button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-center space-x-6 text-sm text-slate-500 dark:text-slate-400">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Secure</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span>Private</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    <span>Free</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // User is authenticated, render protected content
  return <>{children}</>;
}