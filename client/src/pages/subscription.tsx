import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Crown, Star, Moon, Sparkles, TrendingUp, Lock, Crosshair, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent } from "@/lib/analytics";

export default function Subscription() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch current subscription status only if authenticated
  const { data: subscriptionStatus } = useQuery({
    queryKey: ["/api/subscription/status"],
    enabled: isAuthenticated,
    retry: false,
  });

  const isPro = subscriptionStatus?.subscriptionTier === 'pro' || user?.role === 'admin';

  // Upgrade subscription mutation
  const upgradeSubscription = useMutation({
    mutationFn: async ({ tier, billing }: { tier: string; billing: string }) => {
      const response = await apiRequest('POST', '/api/subscription/create-checkout-session', { 
        tier,
        billing
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        // Track subscription conversion event
        trackEvent('subscription_initiated', 'conversion', 'stripe_checkout');
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
      toast({
        title: "Upgrade Failed",
        description: error.message || "Failed to start payment process",
        variant: "destructive",
      });
    },
  });

  // Handle URL parameters for Stripe success/cancel
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('success') === 'true') {
      // Track successful subscription completion
      trackEvent('subscription_completed', 'conversion', 'stripe_success');
      
      toast({
        title: "Subscription Successful!",
        description: "Welcome to Pro! Your subscription is now active.",
      });
      window.history.replaceState({}, '', '/subscription');
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    }
    
    if (urlParams.get('cancelled') === 'true') {
      toast({
        title: "Payment Cancelled",
        description: "Subscription upgrade was cancelled.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/subscription');
    }
  }, [toast, queryClient]);

  const handleUpgrade = (billing: string) => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    upgradeSubscription.mutate({ tier: 'pro', billing });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 via-purple-900 to-indigo-900 pt-20 pb-16">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
            Choose Your Plan
          </h1>
          <p className="text-base sm:text-lg text-purple-200 max-w-2xl mx-auto px-2">
            Transform your emotional wellness journey with our comprehensive mood tracking platform
          </p>
        </div>

        {/* Current Pro Status */}
        {isAuthenticated && isPro && (
          <div className="max-w-4xl mx-auto mb-8">
            <Alert className="bg-emerald-600/20 border-emerald-400">
              <Crown className="h-4 w-4 text-emerald-400" />
              <AlertDescription className="text-emerald-300">
                <strong>You're a Pro subscriber!</strong> You have access to all premium features.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-12 sm:mb-16">
          {/* Left Column - Pricing Cards */}
          <div className="space-y-4 lg:space-y-6 order-2 lg:order-1">
            {/* Free Plan */}
            <Card className="bg-gray-800/50 border-gray-700 text-white">
              <CardHeader className="text-left pb-4">
                <CardTitle className="text-xl text-white">Free</CardTitle>
                <div className="text-3xl font-bold">
                  <span className="text-white">$0</span>
                  <span className="text-lg text-gray-400 font-normal">/month</span>
                </div>
                <div className="text-sm text-gray-400">
                  or $0/year
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">Daily mood tracking</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">Private journal entries</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">Basic mood insights</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">Moon phase correlation</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">7-day mood history</span>
                  </li>
                </ul>
                
                <Button 
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                  disabled={true}
                >
                  Current Plan
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="bg-gray-800/50 border-purple-500 text-white relative">
              <div className="absolute -top-3 left-4">
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1">
                  ⭐ Most Popular
                </Badge>
              </div>
              
              <CardHeader className="text-left pb-4 pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <CardTitle className="text-xl text-white">Pro</CardTitle>
                </div>
                <div className="text-3xl font-bold">
                  <span className="text-white">$1.99</span>
                  <span className="text-lg text-gray-400 font-normal">/month</span>
                </div>
                <div className="text-sm text-gray-400">
                  or $19.99/year (Save 17%)
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">Interactive mood meter dashboard</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">Activity impact tracking & suggestions</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">NLP-driven journal analysis & guidance</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">Advanced mood analytics & trends</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">AI-powered insights & recommendations</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">+4 more features</span>
                  </li>
                </ul>

                <div className="space-y-2 pt-2">
                  <Button
                    onClick={() => handleUpgrade('monthly')}
                    disabled={isPro || upgradeSubscription.isPending}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-2"
                  >
                    {upgradeSubscription.isPending ? "Processing..." : "$1.99/month"}
                  </Button>

                  <Button
                    onClick={() => handleUpgrade('annual')}
                    disabled={isPro || upgradeSubscription.isPending}
                    className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-2"
                  >
                    {upgradeSubscription.isPending ? "Processing..." : "$19.99/year (Save 17%)"}
                  </Button>
                </div>

                <div className="text-center pt-2">
                  <p className="text-xs text-gray-400">
                    Built with ❤️ by YogaNebula
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Track. Reflect. Transform */}
          <div className="space-y-6 lg:space-y-8 order-1 lg:order-2">
            {/* Moon Icon */}
            <div className="text-center">
              <Moon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-yellow-400 mb-4" />
            </div>

            {/* Track. Reflect. Transform Section */}
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Track. Reflect. Transform.</h2>
              <p className="text-purple-200 mb-6 sm:mb-8 px-2">
                Discover the connection between lunar cycles and your emotional patterns
              </p>

              {/* Feature Cards */}
              <div className="space-y-4">
                <Card className="bg-gray-800/30 border-gray-600 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mt-0.5 flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-white mb-1">AI-Powered Insights</h4>
                      <p className="text-sm text-gray-300">
                        Get personalized recommendations and pattern analysis powered by advanced AI
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="bg-gray-800/30 border-gray-600 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mt-0.5 flex-shrink-0">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-white mb-1">Advanced Analytics</h4>
                      <p className="text-sm text-gray-300">
                        Visualize your emotional journey with detailed charts and correlation analysis
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="bg-gray-800/30 border-gray-600 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center mt-0.5 flex-shrink-0">
                      <Lock className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-white mb-1">Privacy First</h4>
                      <p className="text-sm text-gray-300">
                        Your data is encrypted and secure. Only you have access to your personal insights
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="bg-gray-800/30 border-gray-600 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center mt-0.5 flex-shrink-0">
                      <Crosshair className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-white mb-1">Goal Tracking</h4>
                      <p className="text-sm text-gray-300">
                        Set wellness goals and track your progress with personalized recommendations
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 sm:gap-8 text-center mt-6 sm:mt-8">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">10K+</div>
                  <div className="text-xs sm:text-sm text-gray-400">Active Users</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">500K+</div>
                  <div className="text-xs sm:text-sm text-gray-400">Mood Entries</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Start Your Journey Today Section */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 px-4">
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Start Your Journey Today</h3>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-6 text-sm text-purple-200">
            <span className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              No hidden fees
            </span>
            <span className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              Cancel anytime
            </span>
            <span className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              30-day money back
            </span>
          </div>
        </div>

        {/* Who Benefits from InsideMeter Section */}
        <div className="max-w-6xl mx-auto px-4">
          <Card className="bg-white/95 backdrop-blur-sm border-0 p-4 sm:p-6 lg:p-8">
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Who Benefits from InsideMeter?</h3>
              <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base px-2">
                Professional practitioners and individuals from all walks of life rely on InsideMeter for meaningful emotional insights and transformation
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* Therapists & Counselors */}
              <Card className="bg-red-50 border-red-100 p-4 lg:p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-red-600 text-lg">🧠</span>
                  </div>
                  <h4 className="font-bold text-gray-900">Therapists & Counselors</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Recommend to clients for daily mood tracking between sessions</li>
                  <li>• Helps track emotional progress, triggers, and breakthroughs</li>
                  <li>• Journal & mood trends can aid therapy discussions</li>
                </ul>
              </Card>

              {/* Life Coaches & Mindfulness Instructors */}
              <Card className="bg-orange-50 border-orange-100 p-4 lg:p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-orange-600 text-lg">🏠</span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm lg:text-base">Life Coaches & Mindfulness Instructors</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Use patterns to guide self-awareness practices</li>
                  <li>• Reinforces coaching goals with reflective data</li>
                </ul>
              </Card>

              {/* Psychiatrists & Mental Health Professionals */}
              <Card className="bg-blue-50 border-blue-100 p-4 lg:p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 text-lg">⚗️</span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm lg:text-base">Psychiatrists & Mental Health Professionals</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Observe mood fluctuations & medication impact</li>
                  <li>• Track mood intensity and behavior shifts over time</li>
                </ul>
              </Card>

              {/* Parents & Teenagers */}
              <Card className="bg-green-50 border-green-100 p-4 lg:p-6">
                <div className="flex items-start mb-4">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                    <span className="text-green-600 text-sm lg:text-lg">👨‍👩‍👧‍👦</span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm lg:text-base">Parents & Teenagers</h4>
                </div>
                <ul className="text-xs lg:text-sm text-gray-600 space-y-1 lg:space-y-2">
                  <li>• Build emotional vocabulary and self-awareness in teens</li>
                  <li>• Helps parents support emotional health without invading privacy</li>
                </ul>
              </Card>

              {/* People Recovering from Addiction or Trauma */}
              <Card className="bg-pink-50 border-pink-100 p-4 lg:p-6">
                <div className="flex items-start mb-4">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-pink-100 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                    <span className="text-pink-600 text-sm lg:text-lg">❤️</span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm lg:text-base">People Recovering from Addiction or Trauma</h4>
                </div>
                <ul className="text-xs lg:text-sm text-gray-600 space-y-1 lg:space-y-2">
                  <li>• Identify emotional dips or cravings linked to routines</li>
                  <li>• Use guided journaling as a healing outlet</li>
                </ul>
              </Card>

              {/* People with Mood Disorders */}
              <Card className="bg-indigo-50 border-indigo-100 p-4 lg:p-6">
                <div className="flex items-start mb-4">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                    <span className="text-indigo-600 text-sm lg:text-lg">📧</span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm lg:text-base">People with Mood Disorders</h4>
                </div>
                <ul className="text-xs lg:text-sm text-gray-600 space-y-1 lg:space-y-2">
                  <li>• Visualize patterns and get early warnings</li>
                  <li>• Can use trend analysis as part of condition management</li>
                </ul>
              </Card>

              {/* Masters of Their Destiny */}
              <Card className="bg-yellow-50 border-yellow-100 p-4 lg:p-6">
                <div className="flex items-start mb-4">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                    <span className="text-yellow-600 text-sm lg:text-lg">⚡</span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm lg:text-base">Masters of Their Destiny</h4>
                </div>
                <ul className="text-xs lg:text-sm text-gray-600 space-y-1 lg:space-y-2">
                  <li>• Track emotional rhythms to understand internal drivers</li>
                  <li>• Make informed choices instead of reactive ones</li>
                  <li>• Build intentional routines that align with clarity and purpose</li>
                </ul>
              </Card>

              {/* People Committed to Personal Transformation */}
              <Card className="bg-teal-50 border-teal-100 p-4 lg:p-6">
                <div className="flex items-start mb-4">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-teal-100 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                    <span className="text-teal-600 text-sm lg:text-lg">⚙️</span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm lg:text-base">People Committed to Personal Transformation</h4>
                </div>
                <ul className="text-xs lg:text-sm text-gray-600 space-y-1 lg:space-y-2">
                  <li>• Use mood journaling to witness the mind in action</li>
                  <li>• Replace self-sabotaging loops with empowered responses</li>
                  <li>• Let patterns reveal the path to change</li>
                </ul>
              </Card>

              {/* Seekers & Conscious Explorers */}
              <Card className="bg-purple-50 border-purple-100 p-4 lg:p-6">
                <div className="flex items-start mb-4">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                    <span className="text-purple-600 text-sm lg:text-lg">🌙</span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm lg:text-base">Seekers & Conscious Explorers</h4>
                </div>
                <ul className="text-xs lg:text-sm text-gray-600 space-y-1 lg:space-y-2">
                  <li>• Reflect on how lunar energy might affect focus, emotions, and energy</li>
                  <li>• Use insights to plan, pause, or push forward with rhythm, not resistance</li>
                </ul>
              </Card>

              {/* Spiritual Practitioners */}
              <Card className="bg-amber-50 border-amber-100 p-4 lg:p-6">
                <div className="flex items-start mb-4">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-amber-100 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                    <span className="text-amber-600 text-sm lg:text-lg">🔔</span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm lg:text-base">Spiritual Practitioners</h4>
                </div>
                <ul className="text-xs lg:text-sm text-gray-600 space-y-1 lg:space-y-2">
                  <li>• Align practice with emotional awareness</li>
                  <li>• Use mood reflection as a mirror to deepen inner work</li>
                </ul>
              </Card>

              {/* High Performers & Entrepreneurs */}
              <Card className="bg-red-50 border-red-100 p-4 lg:p-6">
                <div className="flex items-start mb-4">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-red-100 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                    <span className="text-red-600 text-sm lg:text-lg">🚀</span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm lg:text-base">High Performers & Entrepreneurs</h4>
                </div>
                <ul className="text-xs lg:text-sm text-gray-600 space-y-1 lg:space-y-2">
                  <li>• Spot emotional habits that affect decision-making or productivity</li>
                  <li>• Align energy with critical work phases (launches, strategy, sales)</li>
                  <li>• Stay grounded while pushing limits</li>
                </ul>
              </Card>

              {/* People at a Crossroads */}
              <Card className="bg-emerald-50 border-emerald-100 p-4 lg:p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-emerald-600 text-lg">🏆</span>
                  </div>
                  <h4 className="font-bold text-gray-900">People at a Crossroads</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• (Life Transitions, Burnout, Healing)</li>
                  <li>• A non-judgmental space to reflect and recalibrate</li>
                  <li>• Clarity through emotional pattern discovery</li>
                  <li>• A sense of agency and rhythm during uncertain times</li>
                </ul>
              </Card>
            </div>

            <div className="text-center mt-8 text-sm text-gray-500 italic">
              "Track your internal climate so external storms don't define you."
            </div>
          </Card>
        </div>

        {/* About InsideMeter Section */}
        <div className="max-w-6xl mx-auto mt-12 sm:mt-16">
          <Card className="bg-white/95 backdrop-blur-sm border-0 p-4 sm:p-6 lg:p-8">
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <span className="text-white text-xl sm:text-2xl">💜</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">About InsideMeter</h3>
            </div>

            {/* Built with Love by YogaNebula */}
            <Card className="bg-gray-50 border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="text-center">
                <h4 className="font-bold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Built with ❤️ by YogaNebula</h4>
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                  InsideMeter is a mindful technology initiative created by YogaNebula, a Classical Hatha Yoga studio. We combine ancient wisdom with modern insights to help you understand your emotional patterns and create gentle, lasting transformation.
                </p>
              </div>
            </Card>

            {/* Footer Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <a href="/privacy" className="bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors text-center block">
                🔒 Privacy Policy
              </a>
              <a href="/consent" className="bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors text-center block">
                ✓ Consent & Cookies
              </a>
              <a href="/marketing" className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors text-center block">
                📋 About Our Mission
              </a>
              <a href="/support" className="bg-green-100 hover:bg-green-200 text-green-700 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors text-center block">
                💬 Support & Help
              </a>
            </div>

            {/* Global Reach */}
            <Card className="bg-blue-50 border-blue-100 p-4 sm:p-6">
              <div className="text-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <span className="text-blue-600 text-base sm:text-lg">🌍</span>
                </div>
                <h4 className="font-bold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Global Reach</h4>
                <p className="text-gray-600 text-xs sm:text-sm">
                  YogaNebula offers transformative experiences in New York • New Jersey • South America • Europe
                </p>
              </div>
            </Card>
          </Card>
        </div>
      </div>
    </div>
  );
}