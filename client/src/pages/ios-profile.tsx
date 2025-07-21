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
  Flame, BarChart, Timer, Zap, CreditCard, Receipt, AlertCircle, Info, Users, UserPlus, Sparkles, Brain
} from "lucide-react";

import { useGuestSession } from "@/hooks/useGuestSession";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { User2FASettings } from "@/components/user-2fa-settings";
import { Capacitor } from '@capacitor/core';
import { useLocation } from "wouter";


interface SubscriptionStatus {
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionEndDate: string | null;
  trialEndDate: string | null;
}

export default function IOSProfile() {
  const { guestSession } = useGuestSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  

  
  // UI state
  const [showFeedback, setShowFeedback] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showContactSupport, setShowContactSupport] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');

  // Use the same auth approach as meter page
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  
  // Navigation hook for programmatic navigation
  const [, setLocation] = useLocation();
  
  // iOS detection - hide subscription management for iOS
  const [isIOS, setIsIOS] = useState(false);
  
  useEffect(() => {
    const platform = Capacitor.getPlatform();
    const isIPhoneUserAgent = /iPhone|iPad|iPod/.test(navigator.userAgent);
    setIsIOS(platform === 'ios' || isIPhoneUserAgent);
  }, []);

  // Fetch subscription status for badge display
  const { data: subscriptionStatus } = useQuery({
    queryKey: ["/api/subscription/status"],
    enabled: !!isAuthenticated,
    retry: false,
  });

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



  // Subscription sync mutation removed for iOS

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

  // Subscription management mutations removed for iOS



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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 p-6 pt-20 flex items-center justify-center">
        <Card className="max-w-md mx-auto p-8 text-center bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-2 border-purple-200/70 dark:border-purple-600/40 shadow-2xl">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg mb-6">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          
          {/* Headline */}
          <h2 className="text-2xl font-bold text-purple-800 dark:text-purple-200 mb-3">
            Account Required
          </h2>
          
          {/* Elevator Pitch */}
          <p className="text-purple-700 dark:text-purple-300 mb-6 leading-relaxed">
            <span className="font-medium">New here?</span> Create your account at <span className="font-semibold">insidemeter.com</span> first to start tracking your emotional journey.
            <br /><br />
            <span className="text-sm text-purple-600 dark:text-purple-400">
              Your iOS app is the perfect pocket companion for quick mood entries on the go.
            </span>
          </p>
          
          {/* Sign In Button */}
          <Button 
            onClick={() => setLocation("/ios-login")}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Sign In
          </Button>
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
          <p className="text-gray-600 dark:text-gray-300 mt-2">Manage your account and preferences</p>
        </div>

        {/* Profile Content - All Sections */}
        <div className="space-y-6">
          
          {/* 1. User Information */}
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
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
                {/* Hide Edit button for iOS users */}
                {!isIOS && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="font-medium text-sm tracking-wide"
                    onClick={() => setShowEditProfile(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    EDIT
                  </Button>
                )}
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

          {/* 2. Streak & Check-in Stats */}
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
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



          {/* 4. Two Factor Authentication - Hidden for iOS */}
          {!isIOS && (
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold font-sans tracking-tight">
                  <Shield className="h-5 w-5" />
                  Two Factor Authentication
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Add an extra layer of security to your account with 2FA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <User2FASettings />
              </CardContent>
            </Card>
          )}

          {/* 5. Data & Analytics Summary */}
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold font-sans tracking-tight">
                <BarChart3 className="h-5 w-5" />
                Your Analytics Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
                  <TrendingUp className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                  <div className="text-xl font-bold text-blue-600">{analytics?.totalEntries || 0}</div>
                  <div className="text-sm text-gray-600">Total Entries</div>
                </div>
                
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                  <Moon className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <div className="text-xl font-bold text-green-600">
                    {analytics?.moonCorrelation ? Math.round(analytics.moonCorrelation * 100) : 0}%
                  </div>
                  <div className="text-sm text-gray-600">Moon Sync</div>
                </div>
                
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                  <Calendar className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                  <div className="text-xl font-bold text-purple-600">
                    {analytics?.averageMood ? analytics.averageMood.toFixed(1) : '0.0'}
                  </div>
                  <div className="text-sm text-gray-600">Avg Mood</div>
                </div>
                
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200">
                  <Star className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                  <div className="text-xl font-bold text-orange-600">
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
                  </div>
                  <div className="text-sm text-gray-600">Day Streak</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6. Feedback & Support */}
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold font-sans tracking-tight">
                <MessageSquare className="h-5 w-5" />
                Feedback & Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <Star className="h-4 w-4 mr-2" />
                      Leave Feedback
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Share Your Feedback</DialogTitle>
                      <DialogDescription>
                        Help us improve InsideMeter with your thoughts and suggestions.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Rating</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setFeedbackRating(star)}
                              className={`text-2xl ${
                                star <= feedbackRating ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                            >
                              ⭐
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Your Feedback</label>
                        <Textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Tell us what you think..."
                          rows={4}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            if (feedbackRating === 0) {
                              toast({
                                title: "Please rate your experience",
                                description: "Select at least one star to proceed.",
                                variant: "destructive",
                              });
                              return;
                            }
                            submitFeedback.mutate({ rating: feedbackRating, feedback: feedbackText });
                          }}
                          disabled={submitFeedback.isPending}
                          className="flex-1"
                        >
                          Submit Feedback
                        </Button>
                        <Button variant="outline" onClick={() => setShowFeedback(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showContactSupport} onOpenChange={setShowContactSupport}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Contact Support
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Contact Support</DialogTitle>
                      <DialogDescription>
                        Need help? Get in touch with our support team.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="text-center py-6">
                        <Mail className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Email Support</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          Send us an email and we'll get back to you within 24 hours.
                        </p>
                        <Button 
                          className="w-full"
                          onClick={() => window.open('mailto:support@insidemeter.com?subject=Support Request&body=Hello InsideMeter Support Team,%0D%0A%0D%0APlease describe your issue or question here:%0D%0A%0D%0A', '_blank')}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Email Support
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* iOS Web Experience Invitation Section */}
          {isIOS && (
            <Card className="glassmorphism border-0 bg-gradient-to-br from-indigo-600/90 via-purple-600/90 to-pink-600/90 shadow-xl overflow-hidden relative">
              {/* Decorative background elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
              
              <CardHeader className="relative z-10 pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-white/20 to-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                      <span className="text-2xl">📱</span>
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-white tracking-tight">
                        Your Pocket Companion
                      </CardTitle>
                      <CardDescription className="text-white/80 text-sm">
                        Perfect for daily check-ins on the go
                      </CardDescription>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white/90" />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="relative z-10 space-y-6">
                {/* Hero Section */}
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-2 backdrop-blur-sm border border-white/20">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="text-white text-sm font-medium">Quick & Consistent Tracking</span>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white leading-tight">
                    Unlock Your Full
                    <br />
                    <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                      Emotional Journey
                    </span>
                  </h3>
                  
                  <p className="text-white/90 text-sm leading-relaxed max-w-sm mx-auto">
                    While this app keeps you consistent, our web platform reveals the deeper patterns and insights hidden in your data.
                  </p>
                </div>
                
                {/* Feature Grid */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold text-sm">Advanced Analytics</div>
                      <div className="text-white/70 text-xs">Interactive charts & trends</div>
                    </div>
                    <div className="text-white/60">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Moon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold text-sm">Lunar Insights</div>
                      <div className="text-white/70 text-xs">Moon phase correlations</div>
                    </div>
                    <div className="text-white/60">
                      <Calendar className="h-4 w-4" />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold text-sm">AI-Powered Insights</div>
                      <div className="text-white/70 text-xs">Personalized guidance</div>
                    </div>
                    <div className="text-white/60">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  </div>
                </div>
                
                {/* CTA Button */}
                <div className="pt-2">
                  <Button 
                    className="w-full bg-white hover:bg-gray-50 text-gray-900 font-bold py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border-0 relative overflow-hidden group"
                    onClick={() => window.open('https://insidemeter.com', '_blank')}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/20 to-orange-200/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    <div className="relative flex items-center justify-center gap-3">
                      <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">🌐</span>
                      </div>
                      <span>Explore Full Web Experience</span>
                      <div className="w-2 h-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full"></div>
                    </div>
                  </Button>
                </div>
                
                {/* Bottom tagline */}
                <div className="text-center pt-2">
                  <p className="text-white/60 text-xs">
                    Your pocket companion • Deep insights on web
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}