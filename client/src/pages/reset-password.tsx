import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Moon, Check, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [token, setToken] = useState("");
  const { toast } = useToast();

  // Extract token from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    if (resetToken) {
      setToken(resetToken);
    }
  }, []);

  // Verify token validity
  const { data: tokenData, isLoading: isVerifying, error: tokenError } = useQuery({
    queryKey: ['/api/verify-reset-token', token],
    queryFn: async () => {
      if (!token) return null;
      const response = await fetch(`/api/verify-reset-token/${token}`);
      if (!response.ok) {
        throw new Error('Token verification failed');
      }
      return response.json();
    },
    enabled: !!token,
    retry: false,
  }) as { data?: { valid: boolean; email?: string; username?: string }, isLoading: boolean, error: any };

  // Reset password mutation
  const resetMutation = useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      const response = await apiRequest('POST', '/api/reset-password', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Reset Successful",
        description: "Your password has been updated. You can now log in with your new password.",
      });
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Password Reset Failed",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    resetMutation.mutate({ token, newPassword });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center px-4">
        <Card className="bg-slate-800/50 border-slate-700 w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <X className="text-red-400" size={24} />
              <CardTitle className="text-2xl">Invalid Link</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-slate-300 mb-4">
              This password reset link is invalid or missing the required token.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center px-4">
        <Card className="bg-slate-800/50 border-slate-700 w-full max-w-md">
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-slate-300">Verifying reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenError || (tokenData && !tokenData.valid)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center px-4">
        <Card className="bg-slate-800/50 border-slate-700 w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <X className="text-red-400" size={24} />
              <CardTitle className="text-2xl">Link Expired</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-slate-300 mb-4">
              This password reset link has expired or is invalid. Please request a new one.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Request New Reset Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resetMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center px-4">
        <Card className="bg-slate-800/50 border-slate-700 w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Check className="text-green-400" size={24} />
              <CardTitle className="text-2xl">Password Reset Complete</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-slate-300 mb-4">
              Your password has been successfully reset. You will be redirected to the login page shortly.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center px-4">
      <Card className="bg-slate-800/50 border-slate-700 w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Moon className="text-[var(--moon)]" size={24} />
            <CardTitle className="text-2xl">Reset Password</CardTitle>
          </div>
          <CardDescription className="text-slate-300">
            Enter your new password for {tokenData?.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-slate-300">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
                placeholder="Enter new password (min 6 characters)"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
                placeholder="Confirm your new password"
                required
              />
            </div>

            {resetMutation.error && (
              <Alert className="bg-red-900/20 border-red-700">
                <AlertDescription className="text-red-300">
                  {(resetMutation.error as any)?.message || "Failed to reset password. Please try again."}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white" 
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? "Resetting Password..." : "Reset Password"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-slate-400 hover:text-slate-200"
              >
                Back to Login
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}