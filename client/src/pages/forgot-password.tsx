import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Moon, Mail, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('POST', '/api/password-reset-request', { email });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reset Link Sent",
        description: "If an account with that email exists, we've sent a password reset link.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Request Failed",
        description: error.message || "Failed to send reset link. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    if (!email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    forgotPasswordMutation.mutate(email);
  };

  if (forgotPasswordMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center px-4">
        <Card className="bg-slate-800/50 border-slate-700 w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Mail className="text-green-400" size={24} />
              <CardTitle className="text-2xl">Check Your Email</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-slate-300">
              We've sent password reset instructions to <strong>{email}</strong> if an account with that email exists.
            </p>
            
            <div className="bg-slate-700/30 p-4 rounded-lg text-sm text-slate-300">
              <p className="font-medium mb-2">What to do next:</p>
              <ul className="text-left space-y-1">
                <li>• Check your email inbox</li>
                <li>• Look for an email from LunarMood</li>
                <li>• Click the reset link in the email</li>
                <li>• Check your spam folder if needed</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Button onClick={() => navigate('/login')} className="w-full">
                Return to Login
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setEmail("");
                  forgotPasswordMutation.reset();
                }} 
                className="w-full"
              >
                Try Different Email
              </Button>
            </div>
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
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email Address</Label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                autoComplete="email"
                data-intentional="true"
                style={{
                  display: 'block !important',
                  width: '100% !important',
                  height: '48px !important',
                  padding: '12px 16px !important',
                  margin: '4px 0 !important',
                  backgroundColor: 'rgba(51, 65, 85, 0.7) !important',
                  border: '2px solid #64748b !important',
                  borderRadius: '8px !important',
                  color: '#ffffff !important',
                  fontSize: '16px !important',
                  lineHeight: '1.5 !important',
                  outline: 'none !important',
                  boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.2) !important',
                  opacity: '1 !important',
                  visibility: 'visible !important',
                  zIndex: '10 !important'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#8b5cf6';
                  e.target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.2), 0 0 0 3px rgba(139, 92, 246, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#64748b';
                  e.target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.2)';
                }}
              />
            </div>

            {forgotPasswordMutation.error && (
              <Alert className="bg-red-900/20 border-red-700">
                <AlertDescription className="text-red-300">
                  {(forgotPasswordMutation.error as any)?.message || "Failed to send reset link. Please try again."}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={forgotPasswordMutation.isPending}
            >
              {forgotPasswordMutation.isPending ? "Sending Reset Link..." : "Send Reset Link"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-slate-400 hover:text-slate-200 flex items-center justify-center space-x-1"
              >
                <ArrowLeft size={16} />
                <span>Back to Login</span>
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}