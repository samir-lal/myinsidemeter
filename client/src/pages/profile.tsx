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
  Mail, Lock, Trash2, HelpCircle, MessageSquare, FileText, Edit, Target,
  Flame, BarChart, Timer, Zap, CreditCard, Receipt, AlertCircle, Info, Users
} from "lucide-react";

import { useGuestSession } from "@/hooks/useGuestSession";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { apiRequest } from "@/lib/queryClient";
import { User2FASettings } from "@/components/user-2fa-settings";
import { Capacitor } from '@capacitor/core';




export default function Profile() {
  const { guestSession } = useGuestSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  

  
  // UI state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showContactSupport, setShowContactSupport] = useState(false);
  
  // Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');

  // Use the same auth approach as meter page
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  
  // iOS detection - hide subscription management for iOS
  const [isIOS, setIsIOS] = useState(false);
  
  useEffect(() => {
    const platform = Capacitor.getPlatform();
    const isIPhoneUserAgent = /iPhone|iPad|iPod/.test(navigator.userAgent);
    setIsIOS(platform === 'ios' || isIPhoneUserAgent);
  }, []);

  // Get real-time subscription status using Stripe as source of truth
  const { 
    isProUser, 
    source: subscriptionSource, 
    stripeStatus, 
    accessReason, 
    periodEnd, 
    cancelAtPeriodEnd,
    adminGrantedBy,
    adminGrantedDate,
    isLoading: subscriptionLoading 
  } = useSubscriptionStatus();

  // Fetch analytics data
  const { data: analytics } = useQuery({
    queryKey: ["/api/mood-analytics"],
    enabled: !!isAuthenticated,
    retry: false,
  });

  // Fetch mood entries for streak calculation
  const { data: moodEntries } = useQuery({
    queryKey: ["/api/mood-entries"],
    enabled: !!isAuthenticated,
    retry: false,
  });

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

  // Sync subscription mutation
  const syncSubscription = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/subscription/sync');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Subscription Synced",
        description: data.message || "Subscription status updated successfully",
      });
      // Refresh subscription status
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync subscription status",
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

  // Subscription management mutations
  const cancelSubscription = useMutation({
    mutationFn: async () => {
      console.log('🔄 Starting cancellation request...');
      console.log('🔍 Current user:', user?.id, user?.email);
      console.log('🔍 Authentication status:', isAuthenticated);
      
      const response = await apiRequest('POST', '/api/subscription/cancel', {});
      console.log('🔄 Cancellation response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Cancellation failed:', response.status, errorText);
        throw new Error(`Cancellation failed: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Cancellation successful:', data);
      toast({
        title: "Subscription Cancelled",
        description: data.message,
      });
      // Immediately refresh subscription status without page reload
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    },
    onError: (error: any) => {
      console.error('❌ Cancellation error:', error);
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });



  // Handle authentication loading state
  if (authLoading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle session authentication
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-orange-500" />
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to access your profile and sync your data across devices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => window.location.href = '/login'}>
              Log In
            </Button>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = '/register'}>
              Create Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pt-20 space-y-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Profile
          </h1>
          <p className="text-white mt-2">Manage your account and preferences</p>
        </div>

        {/* Profile Content - All Sections */}
        <div className="space-y-6">
          
          {/* 1. User Information */}
          <Card className="glassmorphism border-[var(--lunar)]/20">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg tracking-wide">
                    {user?.name ? user.name.split(' ').map((n: any) => n[0]).join('').toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold font-sans tracking-tight leading-relaxed">{user?.name || 'User'}</h2>
                    <p className="text-sm font-normal font-sans text-gray-600 dark:text-gray-400 leading-relaxed">{user?.email}</p>
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
                <Badge variant={isProUser ? 'default' : 'secondary'} className="font-medium text-sm tracking-wide">
                  {isProUser ? (
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

          {/* 2. Streak & Check-in Stats */}
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
                    <span className="text-2xl font-bold font-sans text-orange-600 tracking-tight">
                      {moodEntries && moodEntries.length > 0 ? (() => {
                        // Calculate consecutive days streak
                        const sortedEntries = [...moodEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        let streak = 0;
                        let currentDate = new Date();
                        currentDate.setHours(0, 0, 0, 0);
                        
                        for (let i = 0; i < sortedEntries.length; i++) {
                          const entryDate = new Date(sortedEntries[i].date);
                          entryDate.setHours(0, 0, 0, 0);
                          
                          const diffDays = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
                          
                          if (diffDays === streak) {
                            streak++;
                            currentDate.setDate(currentDate.getDate() - 1);
                          } else {
                            break;
                          }
                        }
                        return streak;
                      })() : 0}
                    </span>
                  </div>
                  <p className="text-sm font-medium font-sans text-orange-700 tracking-wide">Current Streak</p>
                  <p className="text-xs font-normal font-sans text-orange-600 mt-1 leading-relaxed">Days in a row</p>
                </div>
                
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <BarChart className="h-5 w-5 text-purple-500" />
                    <span className="text-2xl font-bold font-sans text-purple-600 tracking-tight">{analytics?.totalEntries || 0}</span>
                  </div>
                  <p className="text-sm font-medium font-sans text-purple-700 tracking-wide">Total Check-ins</p>
                  <p className="text-xs font-normal font-sans text-purple-600 mt-1 leading-relaxed">Your journey so far</p>
                </div>
                
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold font-sans text-green-600 tracking-tight">
                      {moodEntries && moodEntries.length > 0 ? (() => {
                        // Calculate unique days with entries in last 30 days (matching heatmap logic)
                        const last30Days = Array.from({ length: 30 }, (_, i) => {
                          const date = new Date();
                          date.setDate(date.getDate() - (29 - i));
                          return date.toISOString().split('T')[0];
                        });
                        
                        const daysWithEntries = last30Days.filter(date => {
                          return moodEntries.some(entry => {
                            const entryDate = new Date(entry.date).toISOString().split('T')[0];
                            return entryDate === date;
                          });
                        }).length;
                        
                        return Math.round((daysWithEntries / 30) * 100);
                      })() : 0}%
                    </span>
                  </div>
                  <p className="text-sm font-medium font-sans text-green-700 tracking-wide">Consistency</p>
                  <p className="text-xs font-normal font-sans text-green-600 mt-1 leading-relaxed">Last 30 days</p>
                </div>
              </div>
              
              <div className="text-center text-sm font-normal font-sans text-gray-600 dark:text-gray-400 leading-relaxed">
                Building awareness through consistent reflection helps you recognize patterns and make positive changes.
              </div>
            </CardContent>
          </Card>

          {/* 3. Privacy & Account Settings */}
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
                    <Button variant="outline" className="justify-start">
                      <Lock className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Update your password to keep your account secure.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input 
                        type="password" 
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                      <Input 
                        type="password" 
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <Input 
                        type="password" 
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <Button 
                        className="w-full"
                        onClick={() => {
                          if (newPassword !== confirmPassword) {
                            toast({
                              title: "Password Mismatch",
                              description: "New passwords don't match",
                              variant: "destructive",
                            });
                            return;
                          }
                          changePassword.mutate({
                            currentPassword,
                            newPassword
                          });
                        }}
                        disabled={changePassword.isPending}
                      >
                        {changePassword.isPending ? 'Updating...' : 'Update Password'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" className="justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Button variant="outline" className="justify-start" onClick={() => window.open('/privacy-policy', '_blank')}>
                  <Shield className="h-4 w-4 mr-2" />
                  Privacy Policy
                </Button>
                
                <Button variant="outline" className="justify-start text-red-600 hover:text-red-700 border-red-200 hover:border-red-300">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 5. Mood Insight Snapshot */}
          <Card className="glassmorphism border-[var(--lunar)]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold font-sans tracking-tight">
                <BarChart3 className="h-5 w-5" />
                Mood Insight Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
                  <div className="text-xl font-bold font-sans text-blue-600 tracking-tight">
                    {analytics?.moodDistribution ? (() => {
                      // Find the most common mood from the distribution
                      const moods = analytics.moodDistribution;
                      const maxMood = Object.entries(moods).reduce((max, [mood, count]) => 
                        count > max.count ? { mood, count } : max, 
                        { mood: '', count: 0 }
                      );
                      const percentage = Math.round((maxMood.count / (analytics?.totalEntries || 1)) * 100);
                      return `${maxMood.mood.charAt(0).toUpperCase() + maxMood.mood.slice(1)} (${percentage}%)`;
                    })() : 'No data'}
                  </div>
                  <p className="text-sm font-medium font-sans text-blue-700 tracking-wide">Most Common Mood</p>
                  <p className="text-xs font-normal font-sans text-blue-600 mt-1 leading-relaxed">Your frequent state</p>
                </div>
                
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                  <div className="text-xl font-bold font-sans text-green-600 tracking-tight">
                    {moodEntries && moodEntries.length > 0 ? (() => {
                      // Analyze activities from mood entries to find most uplifting
                      const activityCounts = {};
                      const activityMoodScores = {};
                      
                      moodEntries.forEach((entry: any) => {
                        if (entry.activities && entry.activities.length > 0) {
                          entry.activities.forEach((activity: string) => {
                            if (!activityCounts[activity]) {
                              activityCounts[activity] = 0;
                              activityMoodScores[activity] = 0;
                            }
                            activityCounts[activity]++;
                            activityMoodScores[activity] += entry.moodScore || (entry.intensity || 5);
                          });
                        }
                      });
                      
                      // Find activity with highest average mood score
                      let bestActivity = 'Journaling';
                      let bestScore = 0;
                      
                      Object.keys(activityCounts).forEach(activity => {
                        const avgScore = activityMoodScores[activity] / activityCounts[activity];
                        if (avgScore > bestScore && activityCounts[activity] >= 2) {
                          bestScore = avgScore;
                          bestActivity = activity.charAt(0).toUpperCase() + activity.slice(1);
                        }
                      });
                      
                      return bestActivity;
                    })() : 'Reflection'}
                  </div>
                  <p className="text-sm font-medium font-sans text-green-700 tracking-wide">Most Uplifting Activity</p>
                  <p className="text-xs font-normal font-sans text-green-600 mt-1 leading-relaxed">Boosts your mood</p>
                </div>
                
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200">
                  <div className="text-xl font-bold font-sans text-amber-600 tracking-tight">
                    {analytics?.averageMood ? (() => {
                      const trend = analytics.averageMood >= 3 ? '📈 Positive' : 
                                   analytics.averageMood >= 2 ? '📊 Steady' : '📉 Growing';
                      return trend;
                    })() : '📊 Building'}
                  </div>
                  <p className="text-sm font-medium font-sans text-amber-700 tracking-wide">Overall Trend</p>
                  <p className="text-xs font-normal font-sans text-amber-600 mt-1 leading-relaxed">Your journey</p>
                </div>
              </div>
              
              <div className="text-center text-sm font-normal font-sans text-gray-600 dark:text-gray-400 leading-relaxed">
                Your patterns show growth in self-awareness and emotional intelligence.
              </div>
            </CardContent>
          </Card>

          {/* 6. Subscription Management - Hidden for iOS */}
          {!isIOS && (
            <Card className="glassmorphism border-[var(--lunar)]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold font-sans tracking-tight">
                <CreditCard className="h-5 w-5" />
                Subscription Management
              </CardTitle>
              <CardDescription className="font-normal font-sans text-gray-600 dark:text-gray-400 leading-relaxed">
                Manage your subscription plan and billing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {isProUser ? (
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="font-medium text-purple-700 dark:text-purple-300">Pro Plan</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          Active
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-700 dark:text-gray-300">Free Plan</span>
                        <Badge variant="outline" className="border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300">
                          Current
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  {isProUser ? (
                    cancelAtPeriodEnd ? (
                      // Cancelled Pro subscription - show rejoin option
                      <div className="space-y-2">
                        <div className="text-sm text-amber-600 dark:text-amber-400">
                          <span className="font-medium">Status:</span> Cancelled - Access ends {periodEnd ? new Date(periodEnd).toLocaleDateString() : 'soon'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          You still have access to Pro features until the end of your billing period.
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button 
                            size="sm" 
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                            onClick={() => {
                              // Redirect to subscription page to rejoin
                              window.location.href = '/subscription';
                            }}
                          >
                            Rejoin Pro
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Active Pro subscription
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Features:</span> AI insights, Advanced analytics, Historical reports, Unlimited exports
                        </div>
                        
                        {/* Check for admin-granted Pro access */}
                        {subscriptionSource === 'admin' ? (
                          <div className="bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 p-3 rounded-md">
                            <div className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-1">
                              ✨ Complimentary Pro Access
                            </div>
                            <div className="text-xs text-emerald-700 dark:text-emerald-400">
                              Granted by {adminGrantedBy || 'admin'} on{' '}
                              {adminGrantedDate 
                                ? new Date(adminGrantedDate).toLocaleDateString()
                                : 'recent date'
                              }
                            </div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                              <span className="line-through opacity-60">Regular price: $1.99/month</span>
                              <span className="ml-2 font-medium">Your price: FREE</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Billing:</span> $1.99/month
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => syncSubscription.mutate()}
                            disabled={syncSubscription.isPending}
                            className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300 dark:text-blue-400 dark:border-blue-600"
                          >
                            {syncSubscription.isPending ? "Syncing..." : "Sync Status"}
                          </Button>
                          
                          {/* Only show cancel button for paid subscriptions, not admin-granted */}
                          {subscriptionSource !== 'admin' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                if (confirm('Are you sure you want to cancel your Pro subscription? You will lose access to Pro features at the end of your billing period.')) {
                                  cancelSubscription.mutate();
                                }
                              }}
                              disabled={cancelSubscription.isPending}
                              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 dark:text-red-400 dark:border-red-600"
                            >
                              {cancelSubscription.isPending ? "Cancelling..." : "Cancel Plan"}
                            </Button>
                          )}
                          
                          {/* Show contact admin button for admin-granted access */}
                          {subscriptionSource === 'admin' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                window.location.href = 'mailto:contact@yoganebula.com?subject=Admin-Granted Pro Access Question&body=Hello, I have a question about my complimentary Pro access.';
                              }}
                              className="text-purple-600 hover:text-purple-700 border-purple-200 hover:border-purple-300 dark:text-purple-400 dark:border-purple-600"
                            >
                              Contact Admin
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Current Features:</span> Basic mood tracking, 7-day history, Simple insights
                      </div>
                      <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 p-3 rounded-md">
                        <div className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-2">
                          Upgrade to Pro for:
                        </div>
                        <div className="text-xs text-purple-700 dark:text-purple-400 space-y-1">
                          <div>• AI-powered mood insights & recommendations</div>
                          <div>• Advanced analytics & trend analysis</div>
                          <div>• Full historical reports (30/90/180+ days)</div>
                          <div>• Unlimited data export (CSV/PDF)</div>
                          <div>• NLP-driven journal analysis</div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => syncSubscription.mutate()}
                          disabled={syncSubscription.isPending}
                          className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300 dark:text-blue-400 dark:border-blue-600"
                        >
                          {syncSubscription.isPending ? "Syncing..." : "Check Status"}
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white flex-1"
                          onClick={() => {
                            // Redirect to subscription page
                            window.location.href = '/subscription';
                          }}
                        >
                          Upgrade to Pro - $1.99/month
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* iOS-Only Section: Web Experience Invitation */}
          {isIOS && (
            <Card className="glassmorphism border-[var(--lunar)]/20 bg-gradient-to-br from-blue-50/80 via-indigo-50/70 to-purple-50/80 dark:from-blue-900/20 dark:via-indigo-900/15 dark:to-purple-900/20">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold font-sans tracking-tight">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">📱</span>
                    </div>
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Your Pocket Companion</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white/60 dark:bg-gray-800/30 backdrop-blur-sm rounded-xl p-5 border border-blue-200/50 dark:border-blue-700/30">
                  <div className="space-y-4">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                      This app is your <span className="text-blue-600 dark:text-blue-400 font-semibold">pocket-sized mood companion</span> — built for quick check-ins and effortless tracking on the go.
                    </p>
                    
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-100/80 to-blue-100/80 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg border border-purple-200/50 dark:border-purple-700/30">
                      <div className="text-2xl">🌐</div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          But to <span className="text-purple-600 dark:text-purple-400 font-semibold">truly reflect, uncover patterns, and unlock powerful insights</span> — head over to our full web experience.
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="text-center p-3 bg-gradient-to-br from-green-100/80 to-emerald-100/80 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg border border-green-200/50 dark:border-green-700/30">
                        <div className="text-xl mb-1">📱</div>
                        <p className="text-xs font-medium text-green-700 dark:text-green-300">Track Here</p>
                        <p className="text-xs text-green-600 dark:text-green-400">Quick & Easy</p>
                      </div>
                      <div className="text-center p-3 bg-gradient-to-br from-amber-100/80 to-orange-100/80 dark:from-amber-900/30 dark:to-orange-900/30 rounded-lg border border-amber-200/50 dark:border-amber-700/30">
                        <div className="text-xl mb-1">💻</div>
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Reflect There</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">Deep Insights</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-400/20 dark:to-purple-400/20 rounded-xl p-4 border border-indigo-200/30 dark:border-indigo-600/30">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">✨</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Think of the app as your <span className="text-indigo-600 dark:text-indigo-400 font-semibold">consistency tool</span> — because only when you track, can you reflect and transform.
                      </p>
                      <div className="flex items-center justify-center">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full text-xs font-medium shadow-lg">
                          Log here, reflect there — your emotional growth journey starts with one tap
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center pt-2">
                  <Button 
                    onClick={() => {
                      window.open('https://insidemeter.com', '_blank');
                    }}
                    className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <span className="mr-2">🌐</span>
                    Explore Full Web Experience
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 7. Two-Factor Authentication - Hidden for iOS */}
          {!isIOS && <User2FASettings />}

          {/* 8. Who Benefits from InsideMeter? */}
          <Card className="glassmorphism border-[var(--lunar)]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold font-sans tracking-tight">
                <Users className="h-5 w-5 text-purple-600" />
                Who Benefits from InsideMeter?
              </CardTitle>
              <CardDescription className="font-normal font-sans text-gray-600 dark:text-gray-400 leading-relaxed">
                Discover how professionals and individuals use InsideMeter for meaningful emotional insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Healthcare Professionals */}
                <div className="bg-gradient-to-br from-purple-50/90 to-purple-100/80 dark:from-purple-900/30 dark:to-purple-800/20 backdrop-blur-sm rounded-xl p-4 border border-purple-200/50 dark:border-purple-700/50 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mb-3">
                    <div className="text-2xl mb-2">🧠</div>
                    <h4 className="text-base font-semibold text-slate-800 dark:text-gray-200 mb-2">Therapists & Counselors</h4>
                  </div>
                  <ul className="space-y-1 text-slate-600 dark:text-gray-400 text-xs">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Recommend to clients for daily mood tracking between sessions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Helps track emotional progress, triggers, and breakthroughs</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-indigo-50/90 to-indigo-100/80 dark:from-indigo-900/30 dark:to-indigo-800/20 backdrop-blur-sm rounded-xl p-4 border border-indigo-200/50 dark:border-indigo-700/50 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mb-3">
                    <div className="text-2xl mb-2">🏫</div>
                    <h4 className="text-base font-semibold text-slate-800 dark:text-gray-200 mb-2">Life Coaches & Mindfulness Instructors</h4>
                  </div>
                  <ul className="space-y-1 text-slate-600 dark:text-gray-400 text-xs">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Use patterns to guide self-awareness practices</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Reinforces coaching goals with reflective data</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-blue-50/90 to-blue-100/80 dark:from-blue-900/30 dark:to-blue-800/20 backdrop-blur-sm rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/50 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mb-3">
                    <div className="text-2xl mb-2">🩺</div>
                    <h4 className="text-base font-semibold text-slate-800 dark:text-gray-200 mb-2">Psychiatrists & Mental Health Professionals</h4>
                  </div>
                  <ul className="space-y-1 text-slate-600 dark:text-gray-400 text-xs">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Observe mood fluctuations & medication impact</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Track mood intensity and behavior shifts over time</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-green-50/90 to-green-100/80 dark:from-green-900/30 dark:to-green-800/20 backdrop-blur-sm rounded-xl p-4 border border-green-200/50 dark:border-green-700/50 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mb-3">
                    <div className="text-2xl mb-2">👨‍👩‍👧‍👦</div>
                    <h4 className="text-base font-semibold text-slate-800 dark:text-gray-200 mb-2">Parents & Teenagers</h4>
                  </div>
                  <ul className="space-y-1 text-slate-600 dark:text-gray-400 text-xs">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Build emotional vocabulary and self-awareness in teens</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Helps parents support emotional health without invading privacy</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-rose-50/90 to-rose-100/80 dark:from-rose-900/30 dark:to-rose-800/20 backdrop-blur-sm rounded-xl p-4 border border-rose-200/50 dark:border-rose-700/50 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mb-3">
                    <div className="text-2xl mb-2">💔</div>
                    <h4 className="text-base font-semibold text-slate-800 dark:text-gray-200 mb-2">People Recovering from Addiction or Trauma</h4>
                  </div>
                  <ul className="space-y-1 text-slate-600 dark:text-gray-400 text-xs">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Identify emotional dips or cravings linked to routines</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Use guided journaling as a healing outlet</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-orange-50/90 to-orange-100/80 dark:from-orange-900/30 dark:to-orange-800/20 backdrop-blur-sm rounded-xl p-4 border border-orange-200/50 dark:border-orange-700/50 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mb-3">
                    <div className="text-2xl mb-2">🔁</div>
                    <h4 className="text-base font-semibold text-slate-800 dark:text-gray-200 mb-2">People with Mood Disorders</h4>
                  </div>
                  <ul className="space-y-1 text-slate-600 dark:text-gray-400 text-xs">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Visualize patterns and get early warnings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Can use trend analysis as part of condition management</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-amber-50/90 to-amber-100/80 dark:from-amber-900/30 dark:to-amber-800/20 backdrop-blur-sm rounded-xl p-4 border border-amber-200/50 dark:border-amber-700/50 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mb-3">
                    <div className="text-2xl mb-2">🧭</div>
                    <h4 className="text-base font-semibold text-slate-800 dark:text-gray-200 mb-2">Masters of Their Destiny</h4>
                  </div>
                  <ul className="space-y-1 text-slate-600 dark:text-gray-400 text-xs">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Track emotional rhythms to understand internal drivers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Make informed choices instead of reactive ones</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-teal-50/90 to-teal-100/80 dark:from-teal-900/30 dark:to-teal-800/20 backdrop-blur-sm rounded-xl p-4 border border-teal-200/50 dark:border-teal-700/50 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mb-3">
                    <div className="text-2xl mb-2">🔄</div>
                    <h4 className="text-base font-semibold text-slate-800 dark:text-gray-200 mb-2">People Committed to Personal Transformation</h4>
                  </div>
                  <ul className="space-y-1 text-slate-600 dark:text-gray-400 text-xs">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-teal-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Use mood journaling to witness the mind in action</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-teal-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Replace self-sabotaging loops with empowered responses</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-pink-50/90 to-pink-100/80 dark:from-pink-900/30 dark:to-pink-800/20 backdrop-blur-sm rounded-xl p-4 border border-pink-200/50 dark:border-pink-700/50 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mb-3">
                    <div className="text-2xl mb-2">🌙</div>
                    <h4 className="text-base font-semibold text-slate-800 dark:text-gray-200 mb-2">Seekers & Conscious Explorers</h4>
                  </div>
                  <ul className="space-y-1 text-slate-600 dark:text-gray-400 text-xs">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-pink-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Reflect on how lunar energy might affect focus, emotions, and energy</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-pink-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Use insights to plan, pause, or push forward with rhythm</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-violet-50/90 to-violet-100/80 dark:from-violet-900/30 dark:to-violet-800/20 backdrop-blur-sm rounded-xl p-4 border border-violet-200/50 dark:border-violet-700/50 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mb-3">
                    <div className="text-2xl mb-2">🧘‍♀️</div>
                    <h4 className="text-base font-semibold text-slate-800 dark:text-gray-200 mb-2">Spiritual Practitioners</h4>
                  </div>
                  <ul className="space-y-1 text-slate-600 dark:text-gray-400 text-xs">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Align practice with emotional awareness</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Use mood reflection as a mirror to deepen inner work</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-cyan-50/90 to-cyan-100/80 dark:from-cyan-900/30 dark:to-cyan-800/20 backdrop-blur-sm rounded-xl p-4 border border-cyan-200/50 dark:border-cyan-700/50 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mb-3">
                    <div className="text-2xl mb-2">🚀</div>
                    <h4 className="text-base font-semibold text-slate-800 dark:text-gray-200 mb-2">High Performers & Entrepreneurs</h4>
                  </div>
                  <ul className="space-y-1 text-slate-600 dark:text-gray-400 text-xs">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-cyan-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Spot emotional dips that affect decision-making</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-cyan-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span>Stay grounded while pushing limits</span>
                    </li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-cyan-200/30 dark:border-cyan-700/30">
                    <p className="text-xs italic text-slate-500 dark:text-gray-500">"Track your internal climate"</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 8. About Inside Meter */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center justify-center gap-2">
              <Heart className="h-6 w-6 text-purple-600" fill="currentColor" />
              About InsideMeter
            </h2>
          </div>

          <div className="space-y-4 mb-8">
            {/* First Card - About YogaNebula */}
            <Card className="bg-gradient-to-br from-purple-50/90 via-pink-50/80 to-blue-50/70 dark:from-purple-900/20 dark:via-pink-900/15 dark:to-blue-900/20 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-lg">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <p className="text-lg font-semibold text-purple-700 dark:text-purple-400 flex items-center justify-center gap-2">
                    Built with ❤️ by YogaNebula
                  </p>
                  
                  <div className="w-16 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto rounded-full"></div>
                  
                  <p className="text-slate-700 dark:text-gray-300 leading-relaxed text-base">
                    InsideMeter is a mindful technology initiative created by YogaNebula, a Classical Hatha Yoga studio. 
                    We combine ancient wisdom with modern insights to help you understand your emotional patterns and 
                    create gentle, lasting transformation.
                  </p>
                  
                  {/* Links Section */}
                  <div className="mt-6 pt-4 border-t border-purple-200/50 dark:border-purple-700/50">
                    <div className="grid grid-cols-2 gap-3">
                      <a 
                        href="/privacy" 
                        className="flex items-center gap-2 p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg hover:bg-white/80 dark:hover:bg-slate-700/60 transition-colors duration-200 group"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Privacy Policy</span>
                      </a>
                      
                      <a 
                        href="/consent" 
                        className="flex items-center gap-2 p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg hover:bg-white/80 dark:hover:bg-slate-700/60 transition-colors duration-200 group"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Consent & Cookies</span>
                      </a>
                      
                      <a 
                        href="/marketing" 
                        className="flex items-center gap-2 p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg hover:bg-white/80 dark:hover:bg-slate-700/60 transition-colors duration-200 group"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">About Our Mission</span>
                      </a>
                      
                      <a 
                        href="/support" 
                        className="flex items-center gap-2 p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg hover:bg-white/80 dark:hover:bg-slate-700/60 transition-colors duration-200 group"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 11-9.75 9.75 9.75 9.75 0 019.75-9.75z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Support & Help</span>
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Second Card - Global Reach */}
            <Card className="bg-gradient-to-br from-purple-50/90 via-pink-50/80 to-blue-50/70 dark:from-purple-900/20 dark:via-pink-900/15 dark:to-blue-900/20 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-lg">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-gray-200">Global Reach</h3>
                  <p className="text-slate-600 dark:text-gray-400 leading-relaxed">
                    YogaNebula offers transformative experiences in New York • New Jersey • South America • Europe
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 9. Feedback & Support */}
          <Card className="glassmorphism border-[var(--lunar)]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold font-sans tracking-tight">
                <MessageSquare className="h-5 w-5" />
                Feedback & Support
              </CardTitle>
              <CardDescription className="font-normal font-sans text-gray-600 dark:text-gray-400 leading-relaxed">
                Help us improve and get support when you need it
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <Star className="h-4 w-4 mr-2" />
                      Rate & Review
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Share Your Feedback</DialogTitle>
                      <DialogDescription className="text-gray-700 dark:text-gray-300">
                        Your thoughts help us create a better experience for everyone
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium font-sans tracking-wide text-gray-800 dark:text-gray-200">Rate your experience</label>
                        <div className="flex gap-1 mt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setFeedbackRating(star)}
                              className={`w-8 h-8 rounded ${
                                star <= feedbackRating 
                                  ? 'text-yellow-500' 
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                            >
                              <Star className="w-6 h-6 fill-current" />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium font-sans tracking-wide text-gray-800 dark:text-gray-200">Tell us more</label>
                        <Textarea 
                          placeholder="What's working well? What could be improved? We'd love to hear your thoughts..."
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          className="mt-2 min-h-[100px] text-gray-800 dark:text-gray-200"
                        />
                      </div>
                      <Button 
                        className="w-full"
                        onClick={() => {
                          if (feedbackRating === 0) {
                            toast({
                              title: "Rating Required",
                              description: "Please select a star rating",
                              variant: "destructive",
                            });
                            return;
                          }
                          if (!feedbackText.trim()) {
                            toast({
                              title: "Feedback Required",
                              description: "Please share your thoughts",
                              variant: "destructive",
                            });
                            return;
                          }
                          submitFeedback.mutate({
                            rating: feedbackRating,
                            feedback: feedbackText
                          });
                        }}
                        disabled={submitFeedback.isPending}
                      >
                        {submitFeedback.isPending ? 'Submitting...' : 'Submit Feedback'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showContactSupport} onOpenChange={setShowContactSupport}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <Mail className="h-4 w-4 mr-2" />
                      Contact Support
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Contact Support</DialogTitle>
                      <DialogDescription className="text-gray-700 dark:text-gray-300">
                        Get help with your account or technical issues
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <h4 className="font-medium font-sans text-gray-800 dark:text-gray-200 tracking-wide">Email Support</h4>
                        <p className="text-sm font-normal font-sans text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">
                          Send us an email at <span className="font-medium text-gray-800 dark:text-gray-200">contact@yoganebula.com</span>
                        </p>
                        <p className="text-xs font-normal font-sans text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                          We typically respond within 24 hours
                        </p>
                        {isProUser && (
                          <div className="mt-3 p-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded">
                            <p className="text-xs font-medium font-sans text-purple-700 dark:text-purple-300 tracking-wide">
                              💎 Priority Support: Use subject line "PRO: INSIDEMETER" for faster response
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showFAQ} onOpenChange={setShowFAQ}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <HelpCircle className="h-4 w-4 mr-2" />
                      FAQ / Help
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900 border-2 border-purple-200 dark:border-purple-800">
                    <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
                      <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                        <HelpCircle className="h-6 w-6 mr-3 text-purple-600 dark:text-purple-400" />
                        Frequently Asked Questions
                      </DialogTitle>
                      <DialogDescription className="text-gray-600 dark:text-gray-400 text-base">
                        Everything you need to know about InsideMeter
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 pt-4">
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-5 border border-purple-100 dark:border-slate-700">
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                          <span className="bg-purple-500 text-white text-sm rounded-full h-6 w-6 flex items-center justify-center mr-3 font-bold">1</span>
                          What is InsideMeter?
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          InsideMeter is a mood tracking app that helps you understand your emotional patterns and their connection to lunar cycles. Track daily moods, journal thoughts, and gain insights into your mental wellness journey.
                        </p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-5 border border-blue-100 dark:border-slate-700">
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                          <span className="bg-blue-500 text-white text-sm rounded-full h-6 w-6 flex items-center justify-center mr-3 font-bold">2</span>
                          What's the difference between guest and account modes?
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          Guest mode lets you try the app with limited features and local storage. Creating an account unlocks full features, cloud sync, advanced analytics, and access across all your devices.
                        </p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-5 border border-green-100 dark:border-slate-700">
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                          <span className="bg-green-500 text-white text-sm rounded-full h-6 w-6 flex items-center justify-center mr-3 font-bold">3</span>
                          How do I track my mood?
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          Use the mood selector on the home page to choose your current emotional state (excited, happy, neutral, sad, anxious), adjust the intensity, and optionally add private journal notes about activities, thoughts, or triggers.
                        </p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-5 border border-amber-100 dark:border-slate-700">
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                          <span className="bg-amber-500 text-white text-sm rounded-full h-6 w-6 flex items-center justify-center mr-3 font-bold">4</span>
                          What is the lunar correlation feature?
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          We track moon phases alongside your mood entries to help you discover potential patterns. Many people report feeling different during various lunar phases, and our app helps you explore these connections in your own data.
                        </p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-5 border border-rose-100 dark:border-slate-700">
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                          <span className="bg-rose-500 text-white text-sm rounded-full h-6 w-6 flex items-center justify-center mr-3 font-bold">5</span>
                          What features are included in PRO?
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 bg-rose-500 rounded-full"></div>
                            <span className="text-gray-700 dark:text-gray-300">Interactive mood meter dashboard</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 bg-rose-500 rounded-full"></div>
                            <span className="text-gray-700 dark:text-gray-300">Activity impact tracking & suggestions</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 bg-rose-500 rounded-full"></div>
                            <span className="text-gray-700 dark:text-gray-300">AI-powered insights & recommendations</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 bg-rose-500 rounded-full"></div>
                            <span className="text-gray-700 dark:text-gray-300">Full historical reports (30/90/180+ days)</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 bg-rose-500 rounded-full"></div>
                            <span className="text-gray-700 dark:text-gray-300">NLP-driven journal analysis & guidance</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 bg-rose-500 rounded-full"></div>
                            <span className="text-gray-700 dark:text-gray-300">Predictive mood forecasting</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 bg-rose-500 rounded-full"></div>
                            <span className="text-gray-700 dark:text-gray-300">Advanced analytics & trends</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 bg-rose-500 rounded-full"></div>
                            <span className="text-gray-700 dark:text-gray-300">Unlimited data export</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-5 border border-teal-100 dark:border-slate-700">
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                          <span className="bg-teal-500 text-white text-sm rounded-full h-6 w-6 flex items-center justify-center mr-3 font-bold">6</span>
                          Is my data private and secure?
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          Yes, your privacy is our priority. All mood entries and journal notes are encrypted and stored securely. We never share personal data with third parties. You can export or delete your data anytime.
                        </p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-5 border border-indigo-100 dark:border-slate-700">
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                          <span className="bg-indigo-500 text-white text-sm rounded-full h-6 w-6 flex items-center justify-center mr-3 font-bold">7</span>
                          Can I export my data?
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          Yes, free users can export basic data, while PRO subscribers get unlimited exports in CSV and PDF formats with detailed analytics and visualizations.
                        </p>
                      </div>
                      
                      <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-slate-800 dark:to-slate-800 rounded-xl p-5 border border-orange-100 dark:border-slate-700">
                        <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                          <span className="bg-orange-500 text-white text-sm rounded-full h-6 w-6 flex items-center justify-center mr-3 font-bold">8</span>
                          How do reminders work?
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          Set up gentle notifications to remind you to check in with your mood. Choose times that work for your schedule and select notification tones that feel supportive rather than intrusive.
                        </p>
                      </div>
                      
                      <div className="pt-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center mb-2">
                          <HelpCircle className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" />
                          <span className="font-semibold text-gray-900 dark:text-gray-100">Need More Help?</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Contact us at <span className="font-bold text-purple-600 dark:text-purple-400">contact@yoganebula.com</span>
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm font-normal font-sans text-gray-600 dark:text-gray-400 leading-relaxed">
                  Built with ❤️ by YogaNebula
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Edit Profile Dialog */}
          <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Profile</DialogTitle>
                <DialogDescription>
                  Update your personal information
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input 
                  placeholder="Full name"
                  defaultValue={user?.name || ''}
                />
                <Input 
                  type="email"
                  placeholder="Email address"
                  defaultValue={user?.email || ''}
                />
                <Button className="w-full">
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}