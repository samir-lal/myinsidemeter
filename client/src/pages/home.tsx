import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import MoodSelector from "@/components/mood-selector";
import MoodChart from "@/components/mood-chart";
import LunarCorrelationChart from "@/components/lunar-correlation-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Brain, TrendingUp, Calendar, Moon, Activity, Sparkles, Crown, Lock, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useGuestSession } from "@/hooks/useGuestSession";
import { useAuth } from "@/hooks/useAuth";
import { calculateStreak } from "@/lib/mood-utils";
import { apiRequest } from "@/lib/queryClient";
import type { MoodEntry } from "@shared/schema";

export default function Home() {
  const { guestSession } = useGuestSession();
  
  // Check if user is authenticated using unified auth system
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Show loading screen for a maximum of 3 seconds, then fallback to guest mode
  const [maxLoadingReached, setMaxLoadingReached] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setMaxLoadingReached(true);
    }, 3000); // 3 second max loading time
    
    return () => clearTimeout(timer);
  }, []);
  
  // Don't get stuck in loading - show content after max loading time
  const showContent = !authLoading || maxLoadingReached;
  

  
  const { data: moodEntries = [], isLoading: moodEntriesLoading } = useQuery<MoodEntry[]>({
    queryKey: ["/api/mood-entries", isAuthenticated ? "user" : guestSession?.guestId],
    queryFn: async () => {
      if (isAuthenticated) {
        const res = await fetch("/api/mood-entries?limit=50");
        if (!res.ok) return [];
        return res.json();
      } else {
        const guestParam = guestSession?.guestId ? `&guestId=${guestSession.guestId}` : '';
        const res = await fetch(`/api/mood-entries?limit=50${guestParam}`);
        if (!res.ok) return [];
        return res.json();
      }
    },
    enabled: isAuthenticated || !!guestSession,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/mood-analytics", isAuthenticated ? "user" : guestSession?.guestId],
    queryFn: async () => {
      if (isAuthenticated) {
        const res = await fetch("/api/mood-analytics");
        if (!res.ok) return null;
        return res.json();
      } else {
        const guestParam = guestSession?.guestId ? `?guestId=${guestSession.guestId}` : '';
        const res = await fetch(`/api/mood-analytics${guestParam}`);
        if (!res.ok) return null;
        return res.json();
      }
    },
    enabled: isAuthenticated || !!guestSession,
  });

  const { data: moonPhase } = useQuery({
    queryKey: ["/api/moon/current"],
    queryFn: async () => {
      const res = await fetch("/api/moon/current");
      return res.json();
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // Subscription status check
  const { data: subscriptionStatus } = useQuery({
    queryKey: ["/api/subscription/status"],
    enabled: isAuthenticated,
    retry: false,
  });

  const isProUser = (subscriptionStatus as any)?.subscriptionTier === 'pro';

  // NLP Guidance Query
  const { data: nlpGuidance, refetch: refetchNLPGuidance, isLoading: isLoadingNLP } = useQuery({
    queryKey: ["/api/ai/nlp-guidance"],
    enabled: false // Manual trigger only
  });

  // Predictive Trends Mutation
  const predictiveTrendsMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/ai/predictive-trends", data);
    }
  });

  // Show loading state only briefly - prevent infinite loading
  if (!showContent) {
    return (
      <div className="space-y-6 animate-fade-in">
        <section className="px-4 py-6">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Loading InsideMeter...</h1>
            <div className="animate-pulse bg-gray-300 dark:bg-gray-700 h-32 rounded-lg mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Initializing your mood tracking experience...
            </p>
          </div>
        </section>
      </div>
    );
  }

  const getWeeklyMoods = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weekMoods = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = days[date.getDay()];
      
      // Find all entries for this day
      const dayEntries = moodEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.toDateString() === date.toDateString();
      });
      
      // Calculate average mood for the day
      let averageMood = null;
      let displayMood = null;
      
      if (dayEntries.length > 0) {
        const totalIntensity = dayEntries.reduce((sum, entry) => sum + entry.intensity, 0);
        averageMood = totalIntensity / dayEntries.length;
        
        // Find the most recent mood for display
        const sortedEntries = dayEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        displayMood = sortedEntries[0].mood;
      }
      
      weekMoods.push({
        day: dayName,
        mood: displayMood,
        averageMood,
        entryCount: dayEntries.length,
        isToday: i === 0
      });
    }
    
    return weekMoods;
  };

  const getMoodEmoji = (mood?: string) => {
    const moodEmojis: Record<string, string> = {
      excited: '😆',
      happy: '😊',
      neutral: '😐',
      sad: '😢',
      anxious: '😰'
    };
    return mood ? moodEmojis[mood] : '❓';
  };

  const getMoonPhaseEmoji = (phase: string) => {
    const phaseEmojis: Record<string, string> = {
      'new_moon': '🌑',
      'waxing_crescent': '🌒',
      'first_quarter': '🌓',
      'waxing_gibbous': '🌔',
      'full_moon': '🌕',
      'waning_gibbous': '🌖',
      'third_quarter': '🌗',
      '3rd_quarter': '🌗', // Handle API variant
      'waning_crescent': '🌘'
    };
    return phaseEmojis[phase] || '🌙';
  };

  const getMoonPhaseName = (phase: string) => {
    const phaseNames: Record<string, string> = {
      'new_moon': 'New Moon',
      'waxing_crescent': 'Waxing Crescent',
      'first_quarter': 'First Quarter',
      'waxing_gibbous': 'Waxing Gibbous',
      'full_moon': 'Full Moon',
      'waning_gibbous': 'Waning Gibbous',
      'third_quarter': 'Third Quarter',
      '3rd_quarter': 'Third Quarter', // Handle API variant
      'waning_crescent': 'Waning Crescent'
    };
    return phaseNames[phase] || 'Unknown Phase';
  };

  const getAverageMoodDisplay = (averageMood: number | null) => {
    if (averageMood === null) return '❓';
    return averageMood.toFixed(1);
  };

  // Generate mood trend data for chart
  const getMoodTrendData = () => {
    const moodCounts = {
      excited: 0,
      happy: 0,
      neutral: 0,
      sad: 0,
      anxious: 0
    };

    moodEntries.forEach(entry => {
      if (moodCounts.hasOwnProperty(entry.mood)) {
        moodCounts[entry.mood as keyof typeof moodCounts]++;
      }
    });

    return Object.entries(moodCounts).map(([mood, count]) => ({
      mood: mood.charAt(0).toUpperCase() + mood.slice(1),
      count,
      color: {
        excited: '#f59e0b',
        happy: '#10b981',
        neutral: '#6b7280',
        sad: '#3b82f6',
        anxious: '#8b5cf6'
      }[mood] || '#6b7280'
    }));
  };



  const getMoodColor = (mood?: string) => {
    const moodColors: Record<string, string> = {
      excited: 'bg-gradient-to-br from-yellow-400 to-orange-500',
      happy: 'bg-gradient-to-br from-green-400 to-blue-500',
      neutral: 'bg-gradient-to-br from-gray-400 to-gray-600',
      sad: 'bg-gradient-to-br from-blue-500 to-purple-600',
      anxious: 'bg-gradient-to-br from-purple-500 to-pink-600'
    };
    return mood ? moodColors[mood] : 'bg-gray-600';
  };

  const weeklyMoods = getWeeklyMoods();
  
  // Calculate weekly statistics (last 7 days)
  const getWeeklyStats = () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6); // Last 7 days including today
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEntries = moodEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekStart;
    });
    
    if (weekEntries.length === 0) {
      return {
        averageMood: 0,
        mostCommonMood: 'neutral'
      };
    }
    
    // Calculate weekly average mood using intensity scores
    const totalIntensity = weekEntries.reduce((sum, entry) => sum + entry.intensity, 0);
    const weeklyAverageMood = totalIntensity / weekEntries.length;
    
    // Calculate most common mood this week
    const moodCounts = weekEntries.reduce((acc, entry) => {
      acc[entry.mood] = (acc[entry.mood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonMood = Object.keys(moodCounts).length > 0 ? 
      Object.entries(moodCounts).reduce((a, b) => 
        moodCounts[a[0]] > moodCounts[b[0]] ? a : b
      )[0] : 'neutral';
    
    return { averageMood: weeklyAverageMood, mostCommonMood };
  };
  
  const weeklyStats = getWeeklyStats();
  const averageMood = weeklyStats.averageMood;
  const mostCommonMood = weeklyStats.mostCommonMood;

  const moodTrendData = getMoodTrendData();
  
  // Calculate streak and total entries
  const streak = calculateStreak(moodEntries);
  const totalMoodEntries = moodEntries.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Current Moon Phase */}
      <section className="px-4 py-6 pt-20">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-xl font-bold mb-4 text-white dark:text-white" style={{ color: 'white' }}>Today's Moon Phase</h1>
          <Card className="glassmorphism border-[var(--lunar)]/20 p-6">
            {moonPhase ? (
              <div className="text-center">
                <div className="text-8xl mb-3">{getMoonPhaseEmoji(moonPhase.phase)}</div>
                <div className="text-xl font-semibold text-slate-900 dark:text-white">
                  {moonPhase.name}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🌙</div>
                <p className="text-slate-600 dark:text-slate-400">Loading moon phase...</p>
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* Quick Mood Logger */}
      <section className="px-4">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-2">
            {user?.name ? `How are you feeling today, ${user.name}?` : "How are you feeling today?"}
          </h2>
          <p className="text-base text-white mb-4 font-medium">When you see clearly, you live differently.</p>
          <MoodSelector />
        </div>
      </section>

      {/* Weekly Overview */}
      <section className="px-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">This Week</h2>
            <Link href="/calendar">
              <Button variant="ghost" size="sm" className="text-purple-300 hover:text-white hover:bg-purple-500/20 transition-colors">
                View All
              </Button>
            </Link>
          </div>
          
          <Card className="glassmorphism border-purple-300/20 shadow-xl">
            <div className="p-6">
              {/* Weekly Grid with Enhanced Design */}
              <div className="grid grid-cols-7 gap-3 mb-8">
                {weeklyMoods.map((day, index) => (
                  <div key={index} className="relative group">
                    <div className="text-center">
                      <div className="text-xs font-bold text-gray-800 mb-2">{day.day}</div>
                      <div className={`
                        relative w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-300 group-hover:scale-110
                        ${day.averageMood !== null 
                          ? `${getMoodColor(day.mood || undefined)} shadow-lg hover:shadow-xl` 
                          : 'bg-gray-600/40 border-2 border-dashed border-gray-400/50'
                        }
                        ${day.isToday ? 'ring-3 ring-yellow-400/60 ring-offset-2 ring-offset-transparent animate-pulse' : ''}
                      `}>
                        {day.averageMood !== null ? (
                          <span className="text-white drop-shadow-sm">
                            {getAverageMoodDisplay(day.averageMood)}
                          </span>
                        ) : (
                          <span className="text-gray-400">?</span>
                        )}
                        
                        {/* Multiple entries indicator */}
                        {day.entryCount > 1 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md">
                            {day.entryCount}
                          </div>
                        )}
                        
                        {/* Today indicator */}
                        {day.isToday && (
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-400 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Enhanced Statistics Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-purple-600/80 to-pink-600/80 rounded-xl p-4 border border-purple-400/50 shadow-lg backdrop-blur-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-1 drop-shadow-sm">
                      {averageMood.toFixed(1)}
                    </div>
                    <div className="text-xs text-white/90 font-medium">
                      Average
                    </div>
                    <div className="text-xs text-white/70">
                      out of 10
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600/80 to-cyan-600/80 rounded-xl p-4 border border-blue-400/50 shadow-lg backdrop-blur-sm">
                  <div className="text-center">
                    <div className="text-2xl mb-1">
                      {getMoodEmoji(mostCommonMood)}
                    </div>
                    <div className="text-xs text-white/90 font-medium capitalize">
                      {mostCommonMood}
                    </div>
                    <div className="text-xs text-white/70">
                      most common
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-600/80 to-green-600/80 rounded-xl p-4 border border-emerald-400/50 shadow-lg backdrop-blur-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-1 drop-shadow-sm">
                      {calculateStreak(moodEntries)}
                    </div>
                    <div className="text-xs text-white/90 font-medium">
                      Day Streak
                    </div>
                    <div className="text-xs text-white/70">
                      consecutive
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Journal Reminder - Only for authenticated users */}
              {isAuthenticated && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-700/90 via-gray-700/90 to-slate-600/90 border border-slate-500/50 p-5 backdrop-blur-sm shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-800/20 to-gray-800/20"></div>
                  <div className="relative flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-white text-lg">✏️</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-white mb-2 drop-shadow-sm">
                        Missed a day? No worries!
                      </h4>
                      <p className="text-xs text-gray-200 mb-4 leading-relaxed">
                        Add journal entries for any previous day. Keep your emotional journey complete and meaningful.
                      </p>
                      <button 
                        onClick={() => {
                          window.location.href = '/personal-growth';
                          setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                        }}
                        className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 group"
                      >
                        <span className="mr-2 group-hover:animate-bounce">📝</span>
                        Add Past Entries
                        <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* AI-Powered Features - Show for all users but with different states */}
      {(
        <>
          {/* NLP Journal Analysis */}
          <section className="px-4">
            <div className="max-w-md mx-auto">
              <Card className="glassmorphism border-[var(--lunar)]/20">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full">
                        <Brain className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">AI Journal Analysis</CardTitle>
                        <CardDescription className="text-sm">
                          NLP-driven insights from your private entries
                        </CardDescription>
                      </div>
                    </div>
                    {isProUser && (
                      <Badge variant="default" className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                        <Crown className="h-3 w-3 mr-1" />
                        PRO
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!isAuthenticated ? (
                    <div className="text-center py-6 space-y-4">
                      <div className="p-4 bg-gradient-to-br from-emerald-50/90 to-teal-50/90 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200/50 dark:border-emerald-700/50 rounded-xl">
                        <Brain className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
                        <h3 className="font-semibold text-emerald-700 dark:text-emerald-300 mb-2">AI Journal Analysis</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Get personalized insights from your private journal entries using advanced NLP
                        </p>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-3 space-y-1">
                          <p>• Emotional pattern recognition</p>
                          <p>• Therapeutic recommendations</p>
                          <p>• Growth area identification</p>
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                          onClick={() => window.location.href = '/register'}
                        >
                          Create Account & Upgrade
                        </Button>
                      </div>
                    </div>
                  ) : !isProUser ? (
                    <div className="text-center py-6 space-y-4">
                      <div className="p-4 bg-gradient-to-br from-purple-50/90 to-pink-50/90 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200/50 dark:border-purple-700/50 rounded-xl">
                        <div className="flex items-center justify-center mb-3">
                          <Crown className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-2" />
                          <Lock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="font-semibold text-purple-700 dark:text-purple-300 mb-2">Pro Feature</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Unlock AI-powered analysis of your journal entries with therapeutic recommendations
                        </p>
                        <div className="text-xs text-purple-600 dark:text-purple-400 mb-3 space-y-1">
                          <p>✨ Advanced NLP analysis of your private journal</p>
                          <p>🧠 Personalized therapeutic insights</p>
                          <p>📈 Emotional growth recommendations</p>
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                          onClick={() => window.location.href = '/subscription'}
                        >
                          Upgrade to Pro - $1.99/month
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Button 
                        onClick={() => refetchNLPGuidance()}
                        disabled={isLoadingNLP}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                      >
                        {isLoadingNLP ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Brain className="h-4 w-4 mr-2" />
                            Analyze Journal Entries
                          </>
                        )}
                      </Button>

                      {nlpGuidance && (
                        <div className="space-y-3">
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                            <h4 className="font-medium text-sm text-emerald-700 dark:text-emerald-300 mb-2">Key Insights</h4>
                            <div className="space-y-1">
                              {(nlpGuidance as any)?.coreInsights?.slice(0, 2).map((insight: string, index: number) => (
                                <p key={index} className="text-xs text-gray-700 dark:text-gray-300">• {insight}</p>
                              ))}
                            </div>
                          </div>
                          <div className="bg-teal-50 dark:bg-teal-900/20 p-3 rounded-lg">
                            <h4 className="font-medium text-sm text-teal-700 dark:text-teal-300 mb-2">Recommendations</h4>
                            <div className="space-y-1">
                              {(nlpGuidance as any)?.therapeuticRecommendations?.slice(0, 2).map((rec: string, index: number) => (
                                <p key={index} className="text-xs text-gray-700 dark:text-gray-300">• {rec}</p>
                              ))}
                            </div>
                          </div>
                          <Link href="/pro">
                            <Button variant="outline" size="sm" className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                              View Full Analysis
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Predictive Mood Trends */}
          <section className="px-4">
            <div className="max-w-md mx-auto">
              <Card className="glassmorphism border-[var(--lunar)]/20">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-full">
                        <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Predictive Trends</CardTitle>
                        <CardDescription className="text-sm">
                          AI forecasts based on your patterns
                        </CardDescription>
                      </div>
                    </div>
                    {isProUser && (
                      <Badge variant="default" className="bg-gradient-to-r from-purple-500 to-violet-500 text-white">
                        <Crown className="h-3 w-3 mr-1" />
                        PRO
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!isAuthenticated ? (
                    <div className="text-center py-6 space-y-4">
                      <div className="p-4 bg-gradient-to-br from-purple-50/90 to-violet-50/90 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-200/50 dark:border-purple-700/50 rounded-xl">
                        <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-3" />
                        <h3 className="font-semibold text-purple-700 dark:text-purple-300 mb-2">AI Mood Predictions</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Discover patterns that hint at what's next—and what to shift.
                        </p>
                        <div className="text-xs text-purple-600 dark:text-purple-400 mb-3 space-y-1">
                          <p>• 7-day mood forecasts</p>
                          <p>• Risk factor identification</p>
                          <p>• Personalized recommendations</p>
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white"
                          onClick={() => window.location.href = '/register'}
                        >
                          Create Account & Upgrade
                        </Button>
                      </div>
                    </div>
                  ) : !isProUser ? (
                    <div className="text-center py-6 space-y-4">
                      <div className="p-4 bg-gradient-to-br from-purple-50/90 to-pink-50/90 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200/50 dark:border-purple-700/50 rounded-xl">
                        <div className="flex items-center justify-center mb-3">
                          <Crown className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-2" />
                          <Lock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="font-semibold text-purple-700 dark:text-purple-300 mb-2">Pro Feature</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Get AI-powered predictions of your future mood patterns and trends
                        </p>
                        <div className="text-xs text-purple-600 dark:text-purple-400 mb-3 space-y-1">
                          <p>🔮 7-day AI mood forecasts</p>
                          <p>⚠️ Early warning risk detection</p>
                          <p>🎯 Personalized wellness strategies</p>
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                          onClick={() => window.location.href = '/subscription'}
                        >
                          Upgrade to Pro - $1.99/month
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Button 
                        onClick={() => predictiveTrendsMutation.mutate({ timeframe: "30" })}
                        disabled={predictiveTrendsMutation.isPending}
                        className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white"
                      >
                        {predictiveTrendsMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Predictions
                          </>
                        )}
                      </Button>

                      {predictiveTrendsMutation.data && (
                        <div className="space-y-3">
                          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                            <h4 className="font-medium text-sm text-purple-700 dark:text-purple-300 mb-2">Upcoming Trends</h4>
                            <div className="space-y-1">
                              {(predictiveTrendsMutation.data as any)?.upcomingMoods?.slice(0, 3).map((trend: any, index: number) => (
                                <p key={index} className="text-xs text-gray-700 dark:text-gray-300">
                                  {new Date(trend.date).toLocaleDateString()}: {trend.predictedMood} ({trend.confidence}% confidence)
                                </p>
                              ))}
                            </div>
                          </div>
                          <div className="bg-violet-50 dark:bg-violet-900/20 p-3 rounded-lg">
                            <h4 className="font-medium text-sm text-violet-700 dark:text-violet-300 mb-2">Recommendations</h4>
                            <div className="space-y-1">
                              {(predictiveTrendsMutation.data as any)?.recommendations?.slice(0, 2).map((rec: string, index: number) => (
                                <p key={index} className="text-xs text-gray-700 dark:text-gray-300">• {rec}</p>
                              ))}
                            </div>
                          </div>
                          <Link href="/pro">
                            <Button variant="outline" size="sm" className="w-full text-purple-600 border-purple-200 hover:bg-purple-50">
                              View Full Predictions
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}

      {/* Insights */}
      <section className="px-4">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-4">Quick Insights</h2>
          
          <div className="space-y-4">
            {/* Mood Trend Chart */}
            <Card className="glassmorphism border-[var(--lunar)]/20">
              <div className="p-4 pb-0">
                <div className="flex items-center space-x-3 mb-3">
                  <TrendingUp className="text-[#8B5CF6]" size={20} />
                  <div>
                    <p className="text-sm font-medium">Mood Trend</p>
                    <p className="text-xs text-[var(--lunar)]/70">
                      Your mood intensity over time
                    </p>
                  </div>
                </div>
              </div>
              {!isAuthenticated ? (
                <div className="h-56 bg-gradient-to-br from-white/90 to-purple-50/90 dark:from-slate-900/90 dark:to-purple-950/90 border border-purple-200/50 dark:border-purple-800/50 rounded-xl p-6 text-center shadow-lg flex flex-col justify-between">
                  <div className="space-y-4 flex-1 flex flex-col justify-center">
                    <div className="flex justify-center">
                      <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full border border-purple-200/50">
                        <TrendingUp className="text-purple-600 dark:text-purple-400" size={24} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-2">Mood Intelligence Dashboard</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Track how you've been feeling—and why. Awareness is the first step to change.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => window.location.href = '/subscription'}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-4 py-2 rounded-lg text-sm transition-all duration-300 transform hover:scale-105"
                  >
                    Upgrade to Pro
                  </button>
                </div>
              ) : moodEntriesLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--lunar)]/20 border-t-[var(--lunar)]"></div>
                </div>
              ) : (
                <MoodChart entries={moodEntries} showTooltip={false} />
              )}
            </Card>




          </div>

          {/* Why Use InsideMeter Section - Compact */}
          <div className="mt-6">
            <Card className="glassmorphism border-[var(--lunar)]/20">
              <div className="p-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                    Why Use InsideMeter?
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Track. Reflect. Transform.
                  </p>
                </div>

                {/* Compact Transformation Flow */}
                <div className="flex flex-wrap justify-center gap-2 text-xs">
                  <span className="flex items-center bg-purple-100/80 dark:bg-purple-900/30 px-2 py-1 rounded-full">
                    🧠 Mood shapes behavior
                  </span>
                  <span className="text-purple-400 hidden sm:inline">→</span>
                  <span className="flex items-center bg-blue-100/80 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                    🔄 Behavior becomes pattern
                  </span>
                  <span className="text-blue-400 hidden sm:inline">→</span>
                  <span className="flex items-center bg-emerald-100/80 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                    💡 Pattern reveals choice
                  </span>
                  <span className="text-emerald-400 hidden lg:inline">→</span>
                  <span className="flex items-center bg-amber-100/80 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                    🌱 Choice creates growth
                  </span>
                  <span className="text-amber-400 hidden sm:inline">→</span>
                  <span className="flex items-center bg-indigo-100/80 dark:bg-indigo-900/30 px-2 py-1 rounded-full">
                    🌿 Growth aligns with nature
                  </span>
                  <span className="text-indigo-400 hidden sm:inline">→</span>
                  <span className="flex items-center bg-pink-100/80 dark:bg-pink-900/30 px-2 py-1 rounded-full">
                    ✨ Nature guides transformation
                  </span>
                </div>

                {/* Compact Call to Action */}
                <div className="mt-4 text-center pb-4">
                  <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                    "When you see clearly, you live differently"
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    Start your transformation journey today
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 pb-2">
                    Built with ❤️ by YogaNebula
                  </p>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </section>
      
      {/* Extra bottom padding to prevent text cutoff on iOS */}
      <div className="pb-safe-area-inset-bottom ios:pb-24"></div>
    </div>
  );
}
