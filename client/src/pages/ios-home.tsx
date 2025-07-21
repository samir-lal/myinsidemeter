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

export default function IOSHome() {
  const { guestSession } = useGuestSession();
  
  // Check if user is authenticated using unified auth system
  const { user, isAuthenticated, isLoading: authLoading, refreshAuth } = useAuth();
  
  // Add manual refresh trigger for iOS authentication debugging
  useEffect(() => {
    if (refreshAuth) {
      refreshAuth();
    }
  }, []);
  
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
      try {
        console.log('🔍 iOS Home: Fetching mood entries, isAuthenticated:', isAuthenticated);
        if (isAuthenticated) {
          const result = await apiRequest("GET", "/api/mood-entries?limit=50");
          console.log('🔍 iOS Home: Mood entries result:', result?.length || 0, 'entries');
          return Array.isArray(result) ? result : [];
        } else {
          console.log('🔍 iOS Home: Fetching guest mood entries');
          const guestParam = guestSession?.guestId ? `&guestId=${guestSession.guestId}` : '';
          const result = await apiRequest("GET", `/api/mood-entries?limit=50${guestParam}`);
          console.log('🔍 iOS Home: Guest mood entries result:', result?.length || 0, 'entries');
          return Array.isArray(result) ? result : [];
        }
      } catch (error) {
        console.error('❌ iOS Home: Failed to fetch mood entries:', error);
        return [];
      }
    },
    enabled: true, // Always enabled to help with debugging
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/mood-analytics", isAuthenticated ? "user" : guestSession?.guestId],
    queryFn: async () => {
      try {
        console.log('🔍 iOS Home: Fetching analytics, isAuthenticated:', isAuthenticated);
        if (isAuthenticated) {
          const result = await apiRequest("GET", "/api/mood-analytics");
          console.log('🔍 iOS Home: Analytics result:', result);
          return result;
        } else {
          console.log('🔍 iOS Home: Fetching guest analytics');
          const guestParam = guestSession?.guestId ? `?guestId=${guestSession.guestId}` : '';
          const result = await apiRequest("GET", `/api/mood-analytics${guestParam}`);
          console.log('🔍 iOS Home: Guest analytics result:', result);
          return result;
        }
      } catch (error) {
        console.error('❌ iOS Home: Failed to fetch analytics:', error);
        return null;
      }
    },
    enabled: true, // Always enabled to help with debugging
  });

  const { data: moonPhase } = useQuery({
    queryKey: ["/api/moon/current"],
    queryFn: async () => {
      try {
        return await apiRequest("GET", "/api/moon/current");
      } catch (error) {
        console.error('Failed to fetch moon phase:', error);
        return null;
      }
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

      {/* Account Prompt for Unauthenticated Users */}
      {!isAuthenticated && (
        <section className="px-4">
          <div className="max-w-md mx-auto">
            <Card className="bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200/60 dark:border-slate-600/40 shadow-lg">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-white">💾</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                  Ready to Save Your Journey?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Sign in or create an account on web to preserve your emotional insights and unlock deeper self-awareness.
                </p>
              </div>
            </Card>
          </div>
        </section>
      )}

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



      {/* Your Emotional Companion Section */}
      <section className="px-4">
        <div className="max-w-md mx-auto">
          <div className="mt-6">
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
              <div className="p-8">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">💭</span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-3">
                    Your Emotional Companion
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    This is your safe space to blurt out feelings, track patterns, and discover the beautiful complexity of your inner world.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-lg">🌊</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-800">Express Freely</div>
                      <div className="text-xs text-slate-500 mt-1">No judgment, just authentic you</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-lg">🔍</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-800">Learn Yourself</div>
                      <div className="text-xs text-slate-500 mt-1">Patterns reveal your emotional rhythm</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-lg">🌱</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-800">Grow Together</div>
                      <div className="text-xs text-slate-500 mt-1">Your companion for emotional wellness</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-xs text-slate-400 italic">
                    "Every feeling matters. Every entry counts."
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Use InsideMeter Section - Compact */}
      <section className="px-4">
        <div className="max-w-md mx-auto">
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

    </div>
  );
}