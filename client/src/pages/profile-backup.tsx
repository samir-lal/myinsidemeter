import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import { 
  User, Calendar, TrendingUp, Moon, Download, Settings, BarChart3, Crown, Star, ChevronRight, Heart, Shield,
  Bell, Clock, Mail, Lock, Trash2, HelpCircle, MessageSquare, FileText, Edit, Volume2, VolumeX, Target,
  Flame, BarChart, Timer, Zap, CreditCard, Receipt, AlertCircle, Info
} from "lucide-react";

import { useGuestSession } from "@/hooks/useGuestSession";
import { apiRequest } from "@/lib/queryClient";

interface SubscriptionStatus {
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionEndDate: string | null;
  trialEndDate: string | null;
}

export default function Profile() {
  const { guestSession } = useGuestSession();
  const { toast } = useToast();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false);
  
  // Preferences state
  const [reminderTime1, setReminderTime1] = useState('12:00');
  const [reminderTime2, setReminderTime2] = useState('20:00');
  const [reminderTone, setReminderTone] = useState('gentle');
  const [lunarTips, setLunarTips] = useState(true);
  const [emailSummaries, setEmailSummaries] = useState('weekly');
  
  // UI state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showBillingHistory, setShowBillingHistory] = useState(false);
  const [showPaymentMethod, setShowPaymentMethod] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Check if user is authenticated
  const { data: userData } = useQuery({
    queryKey: ["/api/session-test"],
    retry: false,
  });

  const isAuthenticated = !!userData?.sessionExists && !!userData?.sessionData?.userId;

  // Fetch subscription status
  const { data: subscriptionStatus } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch mood analytics
  const { data: analytics } = useQuery({
    queryKey: ["/api/mood-analytics"],
    enabled: isAuthenticated,
  });

  const queryClient = useQueryClient();

  // Handle URL parameters for payment flow feedback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('setup_success') === 'true') {
      toast({
        title: "Payment Method Added",
        description: "Your payment method has been successfully added!",
      });
      // Clean up URL
      window.history.replaceState({}, '', '/profile');
      // Refresh payment method data
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/payment-method"] });
    }
    
    if (urlParams.get('setup_cancelled') === 'true') {
      toast({
        title: "Setup Cancelled",
        description: "Payment method setup was cancelled.",
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, '', '/profile');
    }
    
    if (urlParams.get('success') === 'true') {
      toast({
        title: "Subscription Successful",
        description: "Welcome to Pro! Your subscription is now active.",
      });
      // Clean up URL
      window.history.replaceState({}, '', '/profile');
      // Refresh subscription data
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    }
    
    if (urlParams.get('cancelled') === 'true') {
      toast({
        title: "Payment Cancelled",
        description: "Subscription upgrade was cancelled.",
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, '', '/profile');
    }
  }, [toast, queryClient]);

  // Upgrade subscription mutation - redirect to Stripe checkout
  const upgradeSubscription = useMutation({
    mutationFn: async (tier: string) => {
      const response = await apiRequest('POST', '/api/subscription/create-checkout-session', { 
        tier,
        billing: 'monthly'
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        toast({
          title: "Error",
          description: "Failed to create payment session",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      // Check if authentication is required
      if (error.message?.includes('Authentication required') || error.message?.includes('401')) {
        toast({
          title: "Login Required",
          description: "Please log in to upgrade your subscription",
          variant: "destructive",
        });
        // Redirect to login page after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      } else {
        toast({
          title: "Upgrade Failed",
          description: error.message || "Failed to start payment process",
          variant: "destructive",
        });
      }
    },
  });

  // Cancel subscription mutation
  const cancelSubscription = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/subscription/cancel');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = (tier: string) => {
    upgradeSubscription.mutate(tier);
  };

  // Change password mutation
  const changePassword = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest('POST', '/api/change-password', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      setShowPasswordChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  // Submit feedback mutation
  const submitFeedback = useMutation({
    mutationFn: async (data: { rating: number; feedback: string }) => {
      const response = await apiRequest('POST', '/api/feedback', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
      });
      setShowFeedback(false);
      setFeedbackRating(0);
      setFeedbackText('');
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
    },
  });

  // Fetch billing history
  const { data: billingHistory } = useQuery({
    queryKey: ["/api/billing-history"],
    enabled: isAuthenticated && showBillingHistory,
    retry: false,
  });

  // Fetch payment method
  const { data: paymentMethod } = useQuery({
    queryKey: ["/api/payment-method"],
    enabled: isAuthenticated && showPaymentMethod,
    retry: false,
  });

  // Loading state
  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Guest user state
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-orange-500" />
            <CardTitle>Guest Profile</CardTitle>
            <CardDescription>
              Create an account to access your full profile and sync your data across devices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => window.location.href = '/register'}>
              Create Account
            </Button>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = '/login'}>
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Profile
          </h1>
          <p className="text-muted-foreground mt-2">Manage your account and preferences</p>
        </div>

        {/* Profile Content - All Sections */}
        <div className="space-y-6">
          
          {/* 1. User Information */}
          <Card className="glassmorphism border-[var(--lunar)]/20">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg tracking-wide">
                    {userData?.sessionData?.user?.name ? userData.sessionData.user.name.split(' ').map((n: any) => n[0]).join('').toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold font-sans tracking-tight leading-relaxed">{userData?.sessionData?.user?.name || 'User'}</h2>
                    <p className="text-sm font-normal font-sans text-gray-600 dark:text-gray-400 leading-relaxed">{userData?.sessionData?.user?.email}</p>
                  </div>
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="font-medium text-sm tracking-wide"
                  onClick={() => setShowEditProfile(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  EDIT
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                <Badge variant={subscriptionStatus?.subscriptionTier === 'pro' ? 'default' : 'secondary'} className="font-medium text-sm tracking-wide">
                  {subscriptionStatus?.subscriptionTier === 'pro' ? (
                    <>
                      <Crown className="h-3 w-3 mr-1" />
                      PRO SUBSCRIBER
                    </>
                  ) : (
                    'FREE ACCOUNT'
                  )}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 2. Subscription Management - TEMPORARILY DISABLED */}
          {/* <Card className="glassmorphism border-[var(--lunar)]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <h4 className="font-semibold capitalize">
                    {subscriptionStatus?.subscriptionTier || 'Free'} Plan
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {subscriptionStatus?.subscriptionStatus === 'active' ? 'Active' : 'Inactive'} • 
                    {subscriptionStatus?.subscriptionEndDate 
                      ? ` Renews ${new Date(subscriptionStatus.subscriptionEndDate).toLocaleDateString()}`
                      : ' No renewal date'
                    }
                  </p>
                </div>
                <div className="flex gap-2">
                  {subscriptionStatus?.subscriptionTier === 'free' ? (
                    <Button size="sm" onClick={() => setShowUpgradeOptions(!showUpgradeOptions)}>
                      Upgrade <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        if (confirm('Are you sure you want to cancel your Pro subscription? You will lose access to Pro features at the end of your billing period.')) {
                          cancelSubscription.mutate();
                        }
                      }}
                      className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                    >
                      Cancel Plan
                    </Button>
                  )}
                </div>
              </div>

              {/* Upgrade Options */}
              {showUpgradeOptions && subscriptionStatus?.subscriptionTier === 'free' && (
                <div className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${billingPeriod === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}`}>
                      Monthly
                    </span>
                    <button
                      onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
                      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                        billingPeriod === 'annual' ? 'bg-purple-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          billingPeriod === 'annual' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-sm ${billingPeriod === 'annual' ? 'font-semibold' : 'text-muted-foreground'}`}>
                      Annual
                    </span>
                    {billingPeriod === 'annual' && (
                      <Badge variant="secondary" className="text-xs">
                        Save 16%
                      </Badge>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-2">
                      {billingPeriod === 'monthly' ? '$1.99' : '$19.99'}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{billingPeriod === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>
                    <Button 
                      className="w-full"
                      onClick={() => handleUpgrade('pro')}
                      disabled={upgradeSubscription.isPending}
                    >
                      Upgrade to Pro
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Dialog open={showBillingHistory} onOpenChange={setShowBillingHistory}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <Receipt className="h-4 w-4 mr-2" />
                      Billing History
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Billing History</DialogTitle>
                      <DialogDescription>
                        View your past payments and invoices.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {billingHistory && billingHistory.length > 0 ? (
                        <div className="space-y-2">
                          {billingHistory.map((invoice: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{invoice.description}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(invoice.date).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">${invoice.amount}</p>
                                <p className="text-sm text-green-600">{invoice.status}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">No billing history available</p>
                          <p className="text-sm text-muted-foreground">Your payment history will appear here once you make your first purchase.</p>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showPaymentMethod} onOpenChange={setShowPaymentMethod}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Payment Method
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Payment Method</DialogTitle>
                      <DialogDescription>
                        Manage your payment information.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {paymentMethod ? (
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-8 w-8 text-blue-600" />
                            <div>
                              <p className="font-medium">{paymentMethod.cardType} ending in {paymentMethod.last4}</p>
                              <p className="text-sm text-muted-foreground">
                                {paymentMethod.holderName} • Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button size="sm" variant="outline">Update Card</Button>
                            <Button size="sm" variant="outline">Remove Card</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">No payment method on file</p>
                          <p className="text-sm text-muted-foreground">Add a payment method to enable subscription upgrades.</p>
                          <Button 
                            className="mt-4" 
                            size="sm"
                            onClick={async () => {
                              try {
                                toast({
                                  title: "Add Payment Method",
                                  description: "Redirecting to secure payment setup...",
                                });
                                
                                const response = await apiRequest('POST', '/api/subscription/create-setup-session', {});
                                const data = await response.json();
                                
                                if (data.url) {
                                  window.location.href = data.url;
                                } else {
                                  toast({
                                    title: "Error",
                                    description: "Failed to create payment setup session",
                                    variant: "destructive",
                                  });
                                }
                              } catch (error: any) {
                                toast({
                                  title: "Error",
                                  description: error.message || "Failed to start payment setup",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            Add Payment Method
                          </Button>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
          */}

          {/* 3. Streak & Check-in Stats */}
          <Card className="glassmorphism border-[var(--lunar)]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold font-sans tracking-tight">
                <Flame className="h-5 w-5 text-orange-500" />
                Streak & Check-in Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <span className="text-2xl font-bold font-sans text-orange-600 tracking-tight">{analytics?.currentStreak || 0}</span>
                  </div>
                  <p className="text-sm font-normal font-sans text-gray-600 dark:text-gray-400 leading-relaxed">days in a row</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <span className="text-2xl font-bold font-sans text-blue-600 tracking-tight">{analytics?.totalEntries || 0}</span>
                  </div>
                  <p className="text-sm font-normal font-sans text-gray-600 dark:text-gray-400 leading-relaxed">days logged this month</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Timer className="h-5 w-5 text-purple-500" />
                    <span className="text-sm font-semibold font-sans text-purple-600">Mostly evenings</span>
                  </div>
                  <p className="text-sm font-normal font-sans text-gray-600 dark:text-gray-400 leading-relaxed">average logging time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Reminders & Preferences */}
          <Card className="glassmorphism border-[var(--lunar)]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold font-sans tracking-tight">
                <Bell className="h-5 w-5" />
                Reminders & Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Custom Check-in Times */}
              <div className="space-y-3">
                <label className="text-sm font-medium font-sans tracking-tight">Custom check-in times</label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <Select value={reminderTime1} onValueChange={setReminderTime1}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="09:00">9:00 AM</SelectItem>
                        <SelectItem value="12:00">12:00 PM</SelectItem>
                        <SelectItem value="15:00">3:00 PM</SelectItem>
                        <SelectItem value="18:00">6:00 PM</SelectItem>
                        <SelectItem value="20:00">8:00 PM</SelectItem>
                        <SelectItem value="21:00">9:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <Select value={reminderTime2} onValueChange={setReminderTime2}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="09:00">9:00 AM</SelectItem>
                        <SelectItem value="12:00">12:00 PM</SelectItem>
                        <SelectItem value="15:00">3:00 PM</SelectItem>
                        <SelectItem value="18:00">6:00 PM</SelectItem>
                        <SelectItem value="20:00">8:00 PM</SelectItem>
                        <SelectItem value="21:00">9:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Reminder Tone */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Reminder tone</span>
                </div>
                <Select value={reminderTone} onValueChange={setReminderTone}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gentle">Gentle</SelectItem>
                    <SelectItem value="motivational">Motivational</SelectItem>
                    <SelectItem value="silent">Silent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Lunar Phase Tips */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  <span className="text-sm font-medium">Enable lunar phase tips</span>
                </div>
                <Switch checked={lunarTips} onCheckedChange={setLunarTips} />
              </div>

              {/* Email Summaries */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm font-medium">Email summaries</span>
                </div>
                <Select value={emailSummaries} onValueChange={setEmailSummaries}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 4. Privacy & Account Settings */}
          <Card className="glassmorphism border-[var(--lunar)]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold font-sans tracking-tight">
                <Lock className="h-5 w-5" />
                Privacy & Account Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Dialog open={showPasswordChange} onOpenChange={setShowPasswordChange}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="justify-start font-medium text-sm tracking-wide">
                      <Lock className="h-4 w-4 mr-2" />
                      CHANGE PASSWORD
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-gray-900 dark:text-gray-100 font-semibold font-sans tracking-tight">Change Password</DialogTitle>
                      <DialogDescription className="text-gray-700 dark:text-gray-300 font-normal font-sans leading-relaxed">
                        Enter your current password and choose a new one.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium font-sans tracking-tight">Current Password</label>
                        <Input 
                          type="password" 
                          placeholder="Enter current password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium font-sans tracking-tight">New Password</label>
                        <Input 
                          type="password" 
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium font-sans tracking-tight">Confirm New Password</label>
                        <Input 
                          type="password" 
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-sm text-red-500">Passwords do not match</p>
                      )}
                      <div className="flex gap-2 pt-4">
                        <Button 
                          onClick={() => {
                            setShowPasswordChange(false);
                            setCurrentPassword('');
                            setNewPassword('');
                            setConfirmPassword('');
                          }}
                          variant="outline" 
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => {
                            if (newPassword !== confirmPassword) {
                              toast({
                                title: "Password Mismatch",
                                description: "New passwords do not match",
                                variant: "destructive",
                              });
                              return;
                            }
                            changePassword.mutate({ 
                              currentPassword, 
                              newPassword 
                            });
                          }}
                          className="flex-1"
                          disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                        >
                          {changePassword.isPending ? 'Updating...' : 'Update Password'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" className="justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Export My Data
                </Button>
                
                <Button variant="outline" className="justify-start" onClick={() => window.open('/privacy-policy', '_blank')}>
                  <Shield className="h-4 w-4 mr-2" />
                  Privacy Policy
                </Button>
                
                <Button variant="outline" className="justify-start text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 5. Mood Insight Snapshot */}
          <Card className="glassmorphism border-[var(--lunar)]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Mood Insight Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                  <h4 className="font-semibold text-green-600 mb-1">Top mood this month</h4>
                  <p className="text-2xl font-bold text-green-700">
                    {analytics?.moodDistribution?.[0]?.mood || 'Neutral'} 
                    <span className="text-sm font-normal ml-1">
                      ({Math.round((analytics?.moodDistribution?.[0]?.count / Math.max(analytics?.totalEntries, 1)) * 100) || 40}%)
                    </span>
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200">
                  <h4 className="font-semibold text-yellow-600 mb-1">Most uplifting activity</h4>
                  <p className="text-lg font-bold text-yellow-700">Yoga</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
                  <h4 className="font-semibold text-blue-600 mb-1">Mood trend</h4>
                  <p className="text-lg font-bold text-blue-700">+8% from last month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6. Subscription Management */}
          <Card className="glassmorphism border-[var(--lunar)]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <h4 className="font-semibold capitalize">
                    {subscriptionStatus?.subscriptionTier || 'Free'} Plan
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {subscriptionStatus?.subscriptionStatus === 'active' ? 'Active' : 'Inactive'} • 
                    {subscriptionStatus?.subscriptionEndDate 
                      ? ` Renews ${new Date(subscriptionStatus.subscriptionEndDate).toLocaleDateString()}`
                      : ' No renewal date'
                    }
                  </p>
                </div>
                <div className="flex gap-2">
                  {subscriptionStatus?.subscriptionTier === 'free' ? (
                    <Button size="sm" onClick={() => setShowUpgradeOptions(!showUpgradeOptions)}>
                      Upgrade
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm">
                      Manage Plan
                    </Button>
                  )}
                </div>
              </div>

              {showUpgradeOptions && subscriptionStatus?.subscriptionTier === 'free' && (
                <div className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-pink-50">
                  <div className="flex items-center justify-center space-x-4 mb-4">
                    <span className={`text-sm ${billingPeriod === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}`}>
                      Monthly
                    </span>
                    <button
                      onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        billingPeriod === 'annual' ? 'bg-purple-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          billingPeriod === 'annual' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-sm ${billingPeriod === 'annual' ? 'font-semibold' : 'text-muted-foreground'}`}>
                      Annual
                    </span>
                    {billingPeriod === 'annual' && (
                      <Badge variant="secondary" className="text-xs">
                        Save 16%
                      </Badge>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-2">
                      {billingPeriod === 'monthly' ? '$1.99' : '$19.99'}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{billingPeriod === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>
                    <Button 
                      className="w-full"
                      onClick={() => handleUpgrade('pro')}
                      disabled={upgradeSubscription.isPending}
                    >
                      Upgrade to Pro
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Dialog open={showBillingHistory} onOpenChange={setShowBillingHistory}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <Receipt className="h-4 w-4 mr-2" />
                      Billing History
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Billing History</DialogTitle>
                      <DialogDescription>
                        View your past payments and invoices.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {billingHistory && billingHistory.length > 0 ? (
                        <div className="space-y-2">
                          {billingHistory.map((invoice: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{invoice.description}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(invoice.date).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">${invoice.amount}</p>
                                <p className="text-sm text-green-600">{invoice.status}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">No billing history available</p>
                          <p className="text-sm text-muted-foreground">Your payment history will appear here once you make your first purchase.</p>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showPaymentMethod} onOpenChange={setShowPaymentMethod}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Payment Method
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Payment Method</DialogTitle>
                      <DialogDescription>
                        Manage your payment information.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {paymentMethod ? (
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-8 w-8 text-blue-600" />
                            <div>
                              <p className="font-medium">{paymentMethod.cardType} ending in {paymentMethod.last4}</p>
                              <p className="text-sm text-muted-foreground">
                                {paymentMethod.holderName} • Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button size="sm" variant="outline">Update Card</Button>
                            <Button size="sm" variant="outline">Remove Card</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">No payment method on file</p>
                          <p className="text-sm text-muted-foreground">Add a payment method to enable subscription upgrades.</p>
                          <Button 
                            className="mt-4" 
                            size="sm"
                            onClick={async () => {
                              try {
                                toast({
                                  title: "Add Payment Method",
                                  description: "Redirecting to secure payment setup...",
                                });
                                
                                const response = await apiRequest('POST', '/api/subscription/create-setup-session', {});
                                const data = await response.json();
                                
                                if (data.url) {
                                  window.location.href = data.url;
                                } else {
                                  toast({
                                    title: "Error",
                                    description: "Failed to create payment setup session",
                                    variant: "destructive",
                                  });
                                }
                              } catch (error: any) {
                                toast({
                                  title: "Error",
                                  description: error.message || "Failed to start payment setup",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            Add Payment Method
                          </Button>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* 7. Feedback & Support */}
          <Card className="glassmorphism border-[var(--lunar)]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Feedback & Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Submit Feedback
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-gray-900 dark:text-gray-100">Submit Feedback</DialogTitle>
                      <DialogDescription className="text-gray-700 dark:text-gray-300">
                        Share your experience and help us improve the app.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Star Rating */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Rate your experience</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setFeedbackRating(star)}
                              className={`p-1 rounded transition-colors ${
                                star <= feedbackRating
                                  ? 'text-yellow-500 hover:text-yellow-600'
                                  : 'text-gray-300 hover:text-gray-400'
                              }`}
                            >
                              <Star 
                                className="h-6 w-6" 
                                fill={star <= feedbackRating ? 'currentColor' : 'none'}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Feedback Text */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Your feedback</label>
                        <Textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Tell us about your experience, suggestions for improvement, or any issues you've encountered..."
                          rows={4}
                          className="resize-none text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button 
                          onClick={() => {
                            setShowFeedback(false);
                            setFeedbackRating(0);
                            setFeedbackText('');
                          }}
                          variant="outline" 
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => submitFeedback.mutate({ rating: feedbackRating, feedback: feedbackText })}
                          className="flex-1"
                          disabled={submitFeedback.isPending || feedbackRating === 0 || !feedbackText.trim()}
                        >
                          {submitFeedback.isPending ? 'Submitting...' : 'Submit Feedback'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Contact Support
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-gray-900 dark:text-gray-100">Contact Support</DialogTitle>
                      <DialogDescription className="text-gray-700 dark:text-gray-300">
                        Get help with your account or technical issues.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                        <div className="flex items-center gap-3 mb-3">
                          <Mail className="h-5 w-5 text-blue-600" />
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">Email Support</h4>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          For account issues, billing questions, or technical support:
                        </p>
                        <p className="font-medium text-blue-600 dark:text-blue-400">contact@yoganebula.com</p>
                      </div>
                      
                      <div className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                        <div className="flex items-center gap-3 mb-3">
                          <Crown className="h-5 w-5 text-purple-600" />
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">Priority Support</h4>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          Pro subscribers get priority support with faster response times.
                        </p>
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          Subject line: <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded text-gray-900 dark:text-gray-100">PRO: INSIDEMETER</span>
                        </p>
                      </div>

                      <div className="text-center pt-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          We typically respond within 24 hours (faster for Pro users)
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      FAQ / Help
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-gray-900 dark:text-gray-100">Frequently Asked Questions</DialogTitle>
                      <DialogDescription className="text-gray-700 dark:text-gray-300">
                        Everything you need to know about InsideMeter
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">1. What is InsideMeter?</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            InsideMeter is a private mood tracking app that helps you discover emotional patterns and reflect on how they relate to lunar cycles and daily activities.
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">2. Do I need to create an account?</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            No — you can log up to 3 mood entries in guest mode. To save your data across devices, create a free account anytime.
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">3. How does mood tracking work?</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            Simply select your mood, set the intensity, and optionally add a note or activity. Over time, you'll see patterns and insights.
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">4. What does the moon have to do with mood?</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            The app shows how your emotions may shift across lunar phases. You'll start noticing personal rhythms tied to the moon's cycle.
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">5. What's included with PRO?</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">PRO unlocks:</p>
                          <ul className="text-sm text-gray-700 dark:text-gray-300 ml-4 space-y-1">
                            <li>• Mood Meter Dashboard</li>
                            <li>• Activity impact tracking</li>
                            <li>• Custom reminders</li>
                            <li>• Enhanced insights</li>
                            <li>• Predictive trends + full reports</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">6. Is my data private?</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            Yes. Your data is encrypted and never shared. We do not sell user data or track you for advertising.
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">7. Can I export my data?</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            Yes — PRO users can export their mood logs and insights as CSV or PDF.
                          </p>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">8. How do reminders work?</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            By default, we send gentle nudges at 12 PM and 8 PM. You can customize or turn them off in your Profile settings (PRO only).
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                          Still have questions? Contact us at <span className="font-medium text-blue-600 dark:text-blue-400">contact@yoganebula.com</span>
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Button variant="outline" className="justify-start">
                  <Info className="h-4 w-4 mr-2" />
                  App Version 2.3.0
                </Button>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Heart className="h-4 w-4 text-red-500" fill="currentColor" />
                  <span>
                    Made with care by{' '}
                    <a 
                      href="https://yoganebula.com/hatha/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                      YogaNebula
                    </a>
                    {' '}• contact@yoganebula.com
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="glassmorphism border-[var(--lunar)]/20 max-w-md bg-white/95 dark:bg-gray-900/95">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Edit className="h-5 w-5 text-purple-600" />
              Edit Profile
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Update your display name
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Display Name</label>
              <Input 
                placeholder="Enter your name"
                defaultValue={userData?.sessionData?.user?.name || ''}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email Address</label>
              <Input 
                type="email"
                value={userData?.sessionData?.user?.email || ''}
                disabled
                className="bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">Email cannot be changed for security reasons</p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowEditProfile(false)}
                className="text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  toast({
                    title: "Profile Updated",
                    description: "Your display name has been updated successfully.",
                  });
                  setShowEditProfile(false);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}