import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import MoodChart from "@/components/mood-chart";
import LunarCorrelationChart from "@/components/lunar-correlation-chart";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { TrendingUp, Calendar, Cloud, TrendingDown, BookOpen, BarChart3 } from "lucide-react";
import type { MoodEntry } from "@shared/schema";
import { useGuestSession } from "@/hooks/useGuestSession";
import { useAuth } from "@/hooks/useAuth";
import { useState } from 'react';

function calculateMoodScore(mood: string, intensity: number, subMood?: string | null): number {
  const moodRankings: Record<string, number> = {
    'sad': 1,
    'anxious': 2,
    'neutral': 3,
    'happy': 4,
    'excited': 5
  };
  
  const ranking = moodRankings[mood.toLowerCase()] || 3;
  let baseScore = ranking * (intensity / 10);
  
  // Sub-mood adjustments to add nuance to the calculation
  if (subMood && subMood.trim() !== '') {
    const subMoodModifiers: Record<string, number> = {
      // Positive sub-moods (boost the score slightly)
      'euphoric': 0.3, 'energetic': 0.2, 'content': 0.1, 'joyful': 0.2, 'peaceful': 0.15,
      'optimistic': 0.2, 'grateful': 0.15, 'confident': 0.2, 'inspired': 0.25, 'serene': 0.1,
      'hopeful': 0.15, 'enthusiastic': 0.2, 'accomplished': 0.2, 'loved': 0.15, 'calm': 0.1,
      
      // Negative sub-moods (reduce the score slightly)
      'overwhelmed': -0.3, 'irritated': -0.2, 'disappointed': -0.2, 'worried': -0.25, 'lonely': -0.3,
      'frustrated': -0.25, 'stressed': -0.3, 'sad': -0.2, 'angry': -0.25, 'fearful': -0.3,
      'depressed': -0.4, 'anxious': -0.25, 'exhausted': -0.2, 'rejected': -0.3, 'guilty': -0.2,
      
      // Neutral sub-moods (minimal adjustment)
      'tired': -0.1, 'focused': 0.05, 'curious': 0.05, 'thoughtful': 0.05, 'restless': -0.05
    };
    
    const modifier = subMoodModifiers[subMood.toLowerCase()] || 0;
    baseScore = Math.max(0, Math.min(5, baseScore + modifier)); // Keep within 0-5 range
  }
  
  return Math.round(baseScore * 100) / 100; // Round to 2 decimal places
}

export default function Charts() {
  const { guestSession } = useGuestSession();
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  
  // Use the same auth approach as meter page
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  // Check subscription status - handle all three user states
  const { data: subscriptionData } = useQuery({
    queryKey: ["/api/subscription/status"],
    retry: false,
    enabled: isAuthenticated,
  });
  
  // Enhanced Pro detection for authenticated users including admin override
  const isProUser = isAuthenticated && (
    (subscriptionData as any)?.subscriptionTier === 'pro' || 
    user?.role === 'admin'
  );
  
  const { data: moodEntries = [] } = useQuery<MoodEntry[]>({
    queryKey: ["/api/mood-entries", isAuthenticated ? "user" : guestSession?.guestId],
    queryFn: async () => {
      if (isAuthenticated) {
        const res = await fetch("/api/mood-entries?limit=40");
        if (!res.ok) return [];
        return res.json();
      } else {
        const guestParam = guestSession?.guestId ? `&guestId=${guestSession.guestId}` : '';
        const res = await fetch(`/api/mood-entries?limit=40${guestParam}`);
        if (!res.ok) return [];
        return res.json();
      }
    },
    enabled: isAuthenticated || !!guestSession,
  });

  const { data: analytics } = useQuery({
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

  // Journal analytics data
  const { data: journalAnalytics } = useQuery({
    queryKey: ["/api/journal-analytics", isAuthenticated ? "user" : guestSession?.guestId],
    queryFn: async () => {
      if (isAuthenticated) {
        const res = await fetch("/api/journal-analytics");
        if (!res.ok) return null;
        return res.json();
      } else {
        const guestParam = guestSession?.guestId ? `?guestId=${guestSession.guestId}` : '';
        const res = await fetch(`/api/journal-analytics${guestParam}`);
        if (!res.ok) return null;
        return res.json();
      }
    },
    enabled: isAuthenticated || !!guestSession,
  });



  const getMoodPhaseCorrelation = () => {
    if (!analytics?.moodsByPhase) return [];
    
    return Object.entries(analytics.moodsByPhase).map(([phase, data]: [string, any]) => ({
      phase: phase.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      average: (data.totalMoodScore / data.count).toFixed(1),
      count: data.count
    }));
  };

  const phaseCorrelations = getMoodPhaseCorrelation();

  // Generate mood intensity heatmap data
  const generateHeatmapData = () => {
    if (!moodEntries.length) return [];
    
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    return last30Days.map(date => {
      const dayEntries = moodEntries.filter(entry => {
        const entryDate = new Date(entry.date).toISOString().split('T')[0];
        return entryDate === date;
      });
      
      let avgIntensity = 0;
      if (dayEntries.length > 0) {
        avgIntensity = dayEntries.reduce((sum, entry) => sum + entry.intensity, 0) / dayEntries.length;
      }
      
      // Check if any entries have journal content
      const hasJournal = dayEntries.some(entry => entry.notes && entry.notes.trim().length > 0);
      
      return {
        date,
        intensity: avgIntensity,
        count: dayEntries.length,
        hasJournal,
        dayOfWeek: new Date(date).getDay(),
        weekOfMonth: Math.floor((new Date(date).getDate() - 1) / 7)
      };
    });
  };

  const heatmapData = generateHeatmapData();

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-6 pt-20 space-y-4 sm:space-y-6 animate-fade-in min-h-screen bg-gradient-to-br from-[var(--background)] to-[var(--lunar-accent)]/5">
      <div className="max-w-4xl mx-auto">


        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 bg-clip-text text-transparent" style={{
              backgroundImage: 'linear-gradient(to right, #9333ea, #a855f7, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Mood Analytics
            </span>
          </h1>
          <p className="text-sm sm:text-lg text-gray-700 dark:text-gray-300 font-medium">Track your emotional patterns over time</p>
        </div>

        {/* Why Use InsideMeter - Top Message */}
        <Card className="glassmorphism border-[var(--lunar)]/20 p-3 sm:p-4 mb-6 sm:mb-8 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20">
          <div className="text-center">
            <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 sm:mb-3">
              🌟 Why Use InsideMeter?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm max-w-4xl mx-auto">
              <div className="flex items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/50 dark:bg-slate-800/50 rounded-md">
                <span className="text-base sm:text-lg flex-shrink-0 mt-0.5 sm:mt-0">🧠</span>
                <span className="text-slate-700 dark:text-slate-300 text-left leading-relaxed">
                  <strong className="text-purple-700 dark:text-purple-300">Mood shapes behavior.</strong> Track what drives your actions.
                </span>
              </div>
              <div className="flex items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/50 dark:bg-slate-800/50 rounded-md">
                <span className="text-base sm:text-lg flex-shrink-0 mt-0.5 sm:mt-0">🔁</span>
                <span className="text-slate-700 dark:text-slate-300 text-left leading-relaxed">
                  <strong className="text-pink-700 dark:text-pink-300">Behavior becomes pattern.</strong> Awareness enables change.
                </span>
              </div>
              <div className="flex items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/50 dark:bg-slate-800/50 rounded-md">
                <span className="text-base sm:text-lg flex-shrink-0 mt-0.5 sm:mt-0">🧺</span>
                <span className="text-slate-700 dark:text-slate-300 text-left leading-relaxed">
                  <strong className="text-indigo-700 dark:text-indigo-300">Pattern reveals choice.</strong> You decide your response.
                </span>
              </div>
              <div className="flex items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/50 dark:bg-slate-800/50 rounded-md">
                <span className="text-base sm:text-lg flex-shrink-0 mt-0.5 sm:mt-0">✨</span>
                <span className="text-slate-700 dark:text-slate-300 text-left leading-relaxed">
                  <strong className="text-green-700 dark:text-green-300">Choice creates growth.</strong> Small shifts compound daily.
                </span>
              </div>
              <div className="flex items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/50 dark:bg-slate-800/50 rounded-md">
                <span className="text-base sm:text-lg flex-shrink-0 mt-0.5 sm:mt-0">🌙</span>
                <span className="text-slate-700 dark:text-slate-300 text-left leading-relaxed">
                  <strong className="text-blue-700 dark:text-blue-300">Growth aligns with nature.</strong> Honor your cycles.
                </span>
              </div>
              <div className="flex items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/50 dark:bg-slate-800/50 rounded-md">
                <span className="text-base sm:text-lg flex-shrink-0 mt-0.5 sm:mt-0">🌟</span>
                <span className="text-slate-700 dark:text-slate-300 text-left leading-relaxed">
                  <strong className="text-purple-700 dark:text-purple-300">Nature guides transformation.</strong> You become who you track.
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Premium Features Unlock for Free Users */}
        {!isProUser && !authLoading && (
          <Card className="glassmorphism border-[var(--lunar)]/20 p-4 sm:p-6 mb-6 sm:mb-8 bg-gradient-to-br from-purple-600/10 via-pink-600/10 to-blue-600/10 dark:from-purple-600/20 dark:via-pink-600/20 dark:to-blue-600/20">
            <div className="text-center">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4 sm:mb-6">
                <span className="text-white text-lg sm:text-2xl">✨</span>
              </div>
              
              {/* Header */}
              <h3 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-3">
                <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                  Unlock Your Inside Meter
                </span>
              </h3>
              
              {/* Subtitle */}
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 max-w-md mx-auto">
                Discover powerful insights with subscription access
              </p>
              
              {/* Features Grid */}
              <div className="mb-6 sm:mb-8">
                <h4 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 sm:mb-6">
                  Premium Features Include:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto">
                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
                      Mood Trend
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm sm:text-base">🌙</span>
                    </div>
                    <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
                      Moon Phase Correlation
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-pink-500 to-red-500 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
                      Mood Intensity Heatmap
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <Cloud className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
                      Emotional Cloud
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                      <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
                      Sentiment Overtime
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
                      Mood Distribution
                    </span>
                  </div>
                </div>
              </div>
              
              {/* CTA Button */}
              <button
                onClick={() => window.location.href = '/subscription'}
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 text-white font-semibold rounded-full transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500/30"
              >
                <span className="text-sm sm:text-base">👑</span>
                <span className="text-sm sm:text-base">Unlocks with Subscription</span>
              </button>
            </div>
          </Card>
        )}

        {/* No Data State */}
        {moodEntries.length === 0 && (
          <Card className="glassmorphism border-[var(--lunar)]/20 p-8 text-center">
            <div className="text-6xl mb-4">🌙</div>
            <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">Start Your Mood Journey</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Begin tracking your daily moods to unlock powerful insights about your emotional patterns and their connection to lunar cycles.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <div className="text-2xl mb-2">📊</div>
                <h4 className="font-medium text-slate-900 dark:text-white">Trend Analysis</h4>
                <p className="text-slate-600 dark:text-slate-400">See how your moods change over time</p>
              </div>
              <div className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <div className="text-2xl mb-2">🌙</div>
                <h4 className="font-medium text-slate-900 dark:text-white">Moon Correlation</h4>
                <p className="text-slate-600 dark:text-slate-400">Discover lunar pattern connections</p>
              </div>
              <div className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <div className="text-2xl mb-2">💾</div>
                <h4 className="font-medium text-slate-900 dark:text-white">Data Export</h4>
                <p className="text-slate-600 dark:text-slate-400">Download your complete mood history</p>
              </div>
            </div>
          </Card>
        )}

        {/* Charts - Only show when data exists */}
        {moodEntries.length > 0 && (
          <>
            {/* Mood Trend Chart */}
            <Card className="glassmorphism border-[var(--lunar)]/20 p-4 sm:p-6 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center text-slate-900 dark:text-white">
                <TrendingUp className="mr-2 text-[var(--lunar-accent)]" size={18} />
                <span className="hidden sm:inline">Mood Trend (Last 40 Days)</span>
                <span className="sm:hidden">Mood Trend</span>
              </h3>
              <MoodChart entries={moodEntries} showActivityIndicators={true} />

              {/* Educational Guide for Mood Trends */}
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">📈</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1 sm:mb-2">How to Use Your Mood Trends</h4>
                    <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                      <p><strong>Identify Patterns:</strong> Look for consistent ups and downs. Do you feel better on certain days or times?</p>
                      <p><strong>Consider Sub-Moods:</strong> Your detailed emotions (like "energetic" or "peaceful") add valuable depth to main moods.</p>
                      <p><strong>Track Progress:</strong> Notice if your overall trend is improving, stable, or declining over time periods.</p>
                      <p><strong>Plan Strategically:</strong> Schedule important activities during your naturally higher-energy periods for better outcomes.</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Moon Phase Correlation */}
            <Card className="glassmorphism border-[var(--lunar)]/20 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Moon Phase Correlation</h3>
              <div className="mb-4">
                <LunarCorrelationChart entries={moodEntries.map(entry => ({
                  ...entry,
                  moodScore: calculateMoodScore(entry.mood, entry.intensity)
                }))} />
              </div>
              {phaseCorrelations.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Average Mood by Phase</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {phaseCorrelations.map((item, index) => (
                      <div key={index} className="text-center">
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">{item.phase}</div>
                        <div className="text-2xl font-bold text-[var(--moon)]">{item.average}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">{item.count} entries</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Educational Guide for Lunar Correlation */}
              <div className="mt-6 p-4 bg-gradient-to-r from-amber-50/70 to-yellow-50/70 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">🌙</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">Understanding Lunar Influence</h4>
                    <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                      <p><strong>Look for Patterns:</strong> Notice if certain moon phases coincide with better or challenging moods.</p>
                      <p><strong>Sub-Mood Awareness:</strong> Your detailed emotions may shift more subtly with lunar cycles than main moods.</p>
                      <p><strong>Personal Rhythm:</strong> Everyone's connection to lunar cycles is unique - focus on your own patterns.</p>
                      <p><strong>Plan Ahead:</strong> Use your personal lunar insights to prepare for naturally challenging or energizing periods.</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Mood Intensity Heatmap - Pro Only */}
            <Card className="glassmorphism border-[var(--lunar)]/20 p-4 sm:p-6 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center text-slate-900 dark:text-white">
                <Calendar className="mr-2 text-[var(--lunar-accent)]" size={18} />
                <span className="hidden sm:inline">Mood Intensity Heatmap (Last 30 Days)</span>
                <span className="sm:hidden">Intensity Heatmap</span>
              </h3>
              
              {/* Explanatory Content */}
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200/30 dark:border-purple-700/30">
                <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-2 text-sm sm:text-base">Understanding Your Intensity Patterns</h4>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-3">
                  This heatmap reveals your emotional intensity patterns across the past 30 days. Each color represents your average mood intensity for that day.
                </p>
                
                {/* Color Code Legend */}
                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800 to-gray-800 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                  <h5 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 text-xs sm:text-sm">Color Code Guide:</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 sm:gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-200 dark:bg-blue-900 rounded border"></div>
                      <span className="text-slate-600 dark:text-slate-400">Low (0-2)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-200 dark:bg-green-900 rounded border"></div>
                      <span className="text-slate-600 dark:text-slate-400">Mild (2-4)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-200 dark:bg-yellow-900 rounded border"></div>
                      <span className="text-slate-600 dark:text-slate-400">Medium (4-6)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-200 dark:bg-orange-900 rounded border"></div>
                      <span className="text-slate-600 dark:text-slate-400">High (6-8)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-200 dark:bg-red-900 rounded border"></div>
                      <span className="text-slate-600 dark:text-slate-400">Peak (8-10)</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">❤️</span>
                    <span>Red hearts show days you wrote in your private journal - see how reflection connects to your emotional patterns</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">🎯</span>
                    <span>Look for weekly patterns, emotional triggers, and optimal timing for important decisions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">📊</span>
                    <span>Hover over any square for detailed intensity, entry count, and journal status</span>
                  </div>
                </div>
              </div>
              {isProUser ? (
                heatmapData.length > 0 ? (
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-xs font-medium text-slate-600 dark:text-slate-400 p-1 sm:p-2">
                        <span className="hidden sm:inline">{day}</span>
                        <span className="sm:hidden">{day.charAt(0)}</span>
                      </div>
                    ))}
                    {heatmapData.map((day, index) => {
                      const intensityColor = day.intensity === 0 ? 'bg-gray-100 dark:bg-gray-800' :
                        day.intensity <= 3 ? 'bg-blue-200 dark:bg-blue-900' :
                        day.intensity <= 6 ? 'bg-yellow-200 dark:bg-yellow-900' :
                        day.intensity <= 8 ? 'bg-orange-200 dark:bg-orange-900' :
                        'bg-red-200 dark:bg-red-900';
                      
                      const tooltipText = `${new Date(day.date).toLocaleDateString('en-US', { 
                        month: 'short', day: 'numeric' 
                      })}: ${day.count > 0 ? `${day.intensity.toFixed(1)} intensity, ${day.count} entries` : 'No entries'}${day.hasJournal ? ', Journal entry ❤️' : ''}`;
                      
                      return (
                        <div
                          key={index}
                          className={`aspect-square rounded text-xs font-medium flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 relative ${intensityColor}`}
                          onMouseEnter={() => setHoveredDay(index)}
                          onMouseLeave={() => setHoveredDay(null)}
                        >
                          {day.hasJournal && (
                            <span className="text-red-500 dark:text-red-400 text-[10px] leading-none">❤️</span>
                          )}
                          
                          {/* Custom Tooltip */}
                          {hoveredDay === index && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-30 pointer-events-none">
                              <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/30 dark:border-gray-700/30 p-3 rounded-xl shadow-2xl min-w-max">
                                <div className="text-center">
                                  <div className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                                    {new Date(day.date).toLocaleDateString('en-US', { 
                                      month: 'short', day: 'numeric' 
                                    })}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    {day.count > 0 ? (
                                      <>
                                        <div>Intensity: {day.intensity.toFixed(1)}/10</div>
                                        <div>{day.count} {day.count === 1 ? 'entry' : 'entries'}</div>
                                        {day.hasJournal && <div className="flex items-center justify-center gap-1 mt-1"><span>❤️</span> Journal entry</div>}
                                      </>
                                    ) : (
                                      <div>No entries</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📅</div>
                      <p>No mood data for heatmap yet.</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="h-64 bg-gradient-to-br from-white/90 to-purple-50/90 dark:from-slate-900/90 dark:to-purple-950/90 border border-purple-200/50 dark:border-purple-800/50 rounded-xl p-8 text-center shadow-lg flex flex-col justify-center items-center">
                  <div className="space-y-4 max-w-xs mx-auto">
                    <div className="flex justify-center">
                      <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full border border-purple-200/50">
                        <Calendar className="text-purple-600 dark:text-purple-400" size={24} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-2">Pro Feature</h3>
                      <p className="text-slate-600 dark:text-slate-300 text-sm">
                        Unlock the Mood Intensity Heatmap with Pro subscription
                      </p>
                    </div>
                    <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-4 py-2 rounded-lg text-sm transition-all duration-300 transform hover:scale-105">
                      Upgrade to Pro
                    </button>
                  </div>
                </div>
              )}
            </Card>

            {/* Journal Analytics Section */}
            {journalAnalytics && journalAnalytics.totalEntries > 0 && (
              <>
                {/* Emotion Cloud from Journal - Pro Only */}
                <Card className="glassmorphism border-[var(--lunar)]/20 p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-slate-900 dark:text-white">
                    <Cloud className="mr-2 text-[var(--lunar-accent)]" size={20} />
                    Emotion Cloud from Journal
                  </h3>
                  {isProUser ? (
                    journalAnalytics.emotionCloud.length > 0 ? (
                      <div className="space-y-6">
                        {/* Main Emotion Cloud */}
                        <div className="flex flex-wrap gap-3 justify-center p-6 bg-gradient-to-br from-slate-50/80 to-blue-50/80 dark:from-slate-800/50 dark:to-blue-900/50 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                          {journalAnalytics.emotionCloud.map((word: any, index: number) => {
                            const sizeClass = word.count > 5 ? 'text-2xl' : word.count > 3 ? 'text-xl' : word.count > 2 ? 'text-lg' : 'text-base';
                            const colorClass = word.sentiment === 'positive' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' :
                              word.sentiment === 'negative' ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30' :
                              'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50';
                            
                            return (
                              <span
                                key={index}
                                className={`font-semibold ${sizeClass} ${colorClass} px-3 py-1 rounded-full hover:scale-110 transition-all duration-200 cursor-pointer shadow-sm border border-white/50 dark:border-slate-700/50`}
                                title={`"${word.word}" appeared ${word.count} times with ${word.sentiment} sentiment`}
                              >
                                {word.word}
                              </span>
                            );
                          })}
                        </div>

                        {/* Emotion Analytics Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-emerald-600 dark:text-emerald-400">😊</span>
                              <h4 className="font-semibold text-emerald-800 dark:text-emerald-300">Positive Words</h4>
                            </div>
                            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                              {journalAnalytics.emotionCloud.filter((w: any) => w.sentiment === 'positive').length}
                            </p>
                            <p className="text-sm text-emerald-600 dark:text-emerald-400">
                              {Math.round((journalAnalytics.emotionCloud.filter((w: any) => w.sentiment === 'positive').length / journalAnalytics.emotionCloud.length) * 100)}% of emotional vocabulary
                            </p>
                          </div>
                          
                          <div className="bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 p-4 rounded-lg border border-rose-200/50 dark:border-rose-800/50">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-rose-600 dark:text-rose-400">😔</span>
                              <h4 className="font-semibold text-rose-800 dark:text-rose-300">Challenging Words</h4>
                            </div>
                            <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">
                              {journalAnalytics.emotionCloud.filter((w: any) => w.sentiment === 'negative').length}
                            </p>
                            <p className="text-sm text-rose-600 dark:text-rose-400">
                              {Math.round((journalAnalytics.emotionCloud.filter((w: any) => w.sentiment === 'negative').length / journalAnalytics.emotionCloud.length) * 100)}% of emotional vocabulary
                            </p>
                          </div>
                          
                          <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-800/50 dark:to-gray-800/50 p-4 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-slate-600 dark:text-slate-400">🤔</span>
                              <h4 className="font-semibold text-slate-800 dark:text-slate-300">Neutral Words</h4>
                            </div>
                            <p className="text-2xl font-bold text-slate-700 dark:text-slate-400">
                              {journalAnalytics.emotionCloud.filter((w: any) => w.sentiment === 'neutral').length}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {Math.round((journalAnalytics.emotionCloud.filter((w: any) => w.sentiment === 'neutral').length / journalAnalytics.emotionCloud.length) * 100)}% of emotional vocabulary
                            </p>
                          </div>
                        </div>

                        {/* Emotional Insights */}
                        <div className="bg-gradient-to-br from-purple-50/80 to-pink-50/80 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                          <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-3 flex items-center gap-2">
                            <span>🧠</span>
                            Emotional Pattern Insights
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-start gap-2">
                              <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                              <span className="text-slate-700 dark:text-slate-300">
                                Most frequent emotion: <strong className="text-purple-700 dark:text-purple-300">{journalAnalytics.emotionCloud[0]?.word}</strong> (mentioned {journalAnalytics.emotionCloud[0]?.count} times)
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                              <span className="text-slate-700 dark:text-slate-300">
                                Total emotional expressions: <strong className="text-purple-700 dark:text-purple-300">{journalAnalytics.emotionCloud.reduce((sum: number, word: any) => sum + word.count, 0)}</strong> across {journalAnalytics?.totalEntries || 0} entries
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                              <span className="text-slate-700 dark:text-slate-300">
                                Emotional vocabulary richness: <strong className="text-purple-700 dark:text-purple-300">{journalAnalytics.emotionCloud.length}</strong> unique emotional expressions
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                              <span className="text-slate-700 dark:text-slate-300">
                                Emotional awareness growing through <strong className="text-purple-700 dark:text-purple-300">reflective journaling</strong>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-32 flex items-center justify-center text-gray-500 dark:text-gray-400">
                        <div className="text-center">
                          <div className="text-4xl mb-2">☁️</div>
                          <p>Start journaling to see your emotion cloud.</p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="h-48 bg-gradient-to-br from-white/90 to-purple-50/90 dark:from-slate-900/90 dark:to-purple-950/90 border border-purple-200/50 dark:border-purple-800/50 rounded-xl p-6 text-center shadow-lg flex flex-col justify-center items-center">
                      <div className="space-y-4 max-w-xs mx-auto">
                        <div className="flex justify-center">
                          <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full border border-purple-200/50">
                            <Cloud className="text-purple-600 dark:text-purple-400" size={24} />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-2">Pro Feature</h3>
                          <p className="text-slate-600 dark:text-slate-300 text-sm">
                            Unlock Emotion Cloud analytics with Pro subscription
                          </p>
                        </div>
                        <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-4 py-2 rounded-lg text-sm transition-all duration-300 transform hover:scale-105">
                          Upgrade to Pro
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Educational Guide for Emotion Cloud - Only show for Pro users */}
                  {isProUser && journalAnalytics.emotionCloud.length > 0 && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-purple-50/70 to-pink-50/70 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">☁️</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">Reading Your Emotion Cloud</h4>
                          <div className="text-xs text-purple-800 dark:text-purple-200 space-y-1">
                            <p><strong>Size Matters:</strong> Larger words represent emotions you express more frequently in your journal.</p>
                            <p><strong>Color Coding:</strong> Green = positive emotions, Red = challenging emotions, Gray = neutral states.</p>
                            <p><strong>Sub-Mood Integration:</strong> Your detailed sub-moods (like "energetic" or "peaceful") are included alongside journal words.</p>
                            <p><strong>Pattern Recognition:</strong> Notice which emotional words dominate to understand your inner dialogue and growth areas.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Sentiment Over Time - Pro Only */}
                <Card className="glassmorphism border-[var(--lunar)]/20 p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-slate-900 dark:text-white">
                    <TrendingUp className="mr-2 text-[var(--lunar-accent)]" size={20} />
                    Sentiment Over Time
                  </h3>
                  
                  {/* Explanatory Content for Sentiment Over Time */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200/30 dark:border-blue-700/30">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Understanding Your Emotional Journey</h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                      This chart tracks the emotional tone of your journal entries over time, revealing your natural resilience patterns and emotional processing cycles.
                    </p>
                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">📈</span>
                        <span>Upward trends show periods of emotional growth and positive processing</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">📉</span>
                        <span>Downward dips are normal - they often precede breakthroughs and deeper insights</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">🎯</span>
                        <span>Look for: recovery speed after difficult periods, seasonal patterns, and what helps you bounce back</span>
                      </div>
                    </div>
                  </div>
                  {isProUser ? (
                    journalAnalytics.sentimentOverTime.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={journalAnalytics.sentimentOverTime}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="date" 
                              stroke="#6b7280"
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => new Date(value).toLocaleDateString()}
                            />
                            <YAxis 
                              domain={[-1, 1]}
                              stroke="#6b7280"
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => value === 1 ? 'Positive' : value === -1 ? 'Negative' : 'Neutral'}
                            />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/30 dark:border-gray-700/30 p-4 rounded-2xl shadow-2xl">
                                      <div className="font-semibold text-gray-800 dark:text-gray-200">
                                        {new Date(label).toLocaleDateString()}
                                      </div>
                                      <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                        Sentiment: {data.sentiment}
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="score" 
                              stroke="#8b5cf6" 
                              strokeWidth={3}
                              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                        <div className="text-center">
                          <div className="text-4xl mb-2">📈</div>
                          <p>Add journal entries to track sentiment trends.</p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="h-64 bg-gradient-to-br from-white/90 to-purple-50/90 dark:from-slate-900/90 dark:to-purple-950/90 border border-purple-200/50 dark:border-purple-800/50 rounded-xl p-8 text-center shadow-lg flex flex-col justify-center items-center">
                      <div className="space-y-4 max-w-xs mx-auto">
                        <div className="flex justify-center">
                          <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full border border-purple-200/50">
                            <TrendingUp className="text-purple-600 dark:text-purple-400" size={24} />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-2">Pro Feature</h3>
                          <p className="text-slate-600 dark:text-slate-300 text-sm">
                            Unlock Sentiment Over Time analytics with Pro subscription
                          </p>
                        </div>
                        <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-4 py-2 rounded-lg text-sm transition-all duration-300 transform hover:scale-105">
                          Upgrade to Pro
                        </button>
                      </div>
                    </div>
                  )}
                </Card>


              </>
            )}

            {/* Interactive Mood Distribution Pie Chart - Pro Only */}
            <Card className="glassmorphism border-[var(--lunar)]/20 p-6">
              <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Mood Distribution</h3>
              
              {/* Explanatory Content for Mood Distribution */}
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200/30 dark:border-green-700/30">
                <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">Understanding Your Emotional Baseline</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                  This breakdown reveals your emotional patterns and natural tendencies. Understanding your baseline helps you recognize when you're thriving versus when you might need extra support.
                </p>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">🎯</span>
                    <span>Higher positive percentages indicate strong emotional resilience and effective coping strategies</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">⚖️</span>
                    <span>Balanced distribution is healthy - all emotions serve important purposes in your growth</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">🔄</span>
                    <span>Track changes over time: What shifts your emotional patterns? What practices help you thrive?</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">💡</span>
                    <span>Use insights for: scheduling important decisions during high-energy periods, planning self-care during challenging times</span>
                  </div>
                </div>
              </div>
              {isProUser ? (
                analytics?.moodDistribution ? (
                  <div className="space-y-6">
                    {/* Mood Word Cloud Visualization */}
                    <div className="relative h-80 bg-gradient-to-br from-slate-50/50 to-blue-50/50 dark:from-slate-800/50 dark:to-blue-900/50 rounded-2xl p-6 border border-slate-200/30 dark:border-slate-700/30 overflow-hidden">
                      <div className="relative h-full flex items-center justify-center">
                        <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-4 p-4">
                          {Object.entries(analytics.moodDistribution).map(([mood, count], index) => {
                            const moodEmojis: Record<string, string> = {
                              excited: '😆',
                              happy: '😊',
                              neutral: '😐',
                              sad: '😢',
                              anxious: '😰'
                            };
                            const moodColors: Record<string, string> = {
                              excited: '#F59E0B',
                              happy: '#10B981',
                              neutral: '#6B7280',
                              sad: '#3B82F6',
                              anxious: '#8B5CF6'
                            };
                            const totalEntries = Object.values(analytics.moodDistribution).reduce((sum: number, c) => sum + (c as number), 0);
                            const percentage = (((count as number) / totalEntries) * 100);
                            const fontSize = Math.max(1.2, Math.min(4, percentage / 10)); // Scale font size based on percentage
                            const opacity = Math.max(0.6, Math.min(1, percentage / 50)); // Scale opacity based on frequency
                            
                            return (
                              <div
                                key={mood}
                                className={`relative group cursor-pointer transition-all duration-300 hover:scale-110 ${
                                  activeSegment === index.toString() ? 'scale-110 z-10' : ''
                                }`}
                                style={{
                                  fontSize: `${fontSize}rem`,
                                  color: moodColors[mood],
                                  opacity: opacity,
                                  transform: `rotate(${Math.random() * 20 - 10}deg)`,
                                  margin: `${Math.random() * 20}px`
                                }}
                                onMouseEnter={() => setActiveSegment(index.toString())}
                                onMouseLeave={() => setActiveSegment(null)}
                              >
                                <div className="flex items-center gap-2 p-2 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/40 dark:border-slate-700/40 shadow-lg group-hover:shadow-xl transition-all duration-300">
                                  <span className="text-2xl" style={{ fontSize: `${fontSize * 1.2}rem` }}>
                                    {moodEmojis[mood]}
                                  </span>
                                  <div className="text-center">
                                    <div className="font-bold capitalize" style={{ fontSize: `${fontSize * 0.8}rem` }}>
                                      {mood}
                                    </div>
                                    <div className="text-xs opacity-75">
                                      {count} ({percentage.toFixed(1)}%)
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Hover tooltip */}
                                {activeSegment === index.toString() && (
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-20">
                                    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/30 dark:border-gray-700/30 p-3 rounded-xl shadow-2xl">
                                      <div className="text-center">
                                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 capitalize">
                                          {mood} Mood
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                          {count} entries • {percentage.toFixed(1)}% of total
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Background decorative elements */}
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute top-4 left-4 w-2 h-2 bg-purple-300/30 rounded-full animate-pulse"></div>
                          <div className="absolute top-1/3 right-6 w-3 h-3 bg-blue-300/30 rounded-full animate-pulse delay-1000"></div>
                          <div className="absolute bottom-6 left-1/4 w-2 h-2 bg-green-300/30 rounded-full animate-pulse delay-500"></div>
                          <div className="absolute bottom-1/4 right-1/3 w-2 h-2 bg-yellow-300/30 rounded-full animate-pulse delay-700"></div>
                        </div>
                      </div>
                    </div>

                    {/* Summary Statistics */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {Object.entries(analytics.moodDistribution).map(([mood, count]) => {
                        const moodEmojis: Record<string, string> = {
                          excited: '😆',
                          happy: '😊', 
                          neutral: '😐',
                          sad: '😢',
                          anxious: '😰'
                        };
                        const moodColors: Record<string, string> = {
                          excited: '#F59E0B',
                          happy: '#10B981',
                          neutral: '#6B7280',
                          sad: '#3B82F6', 
                          anxious: '#8B5CF6'
                        };
                        const totalEntries = Object.values(analytics.moodDistribution).reduce((sum: number, c) => sum + (c as number), 0);
                        const percentage = (((count as number) / totalEntries) * 100).toFixed(1);
                        
                        return (
                          <div key={mood} className="text-center p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-white/40 dark:border-slate-700/40 backdrop-blur-sm">
                            <div className="text-2xl mb-1">{moodEmojis[mood]}</div>
                            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 capitalize mb-1">{mood}</div>
                            <div className="text-sm font-bold" style={{ color: moodColors[mood] }}>
                              {percentage}%
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-500">
                              {count} entries
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📊</div>
                      <p>No mood data available yet.</p>
                      <p className="text-sm">Start tracking to see your patterns!</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="h-64 bg-gradient-to-br from-white/90 to-purple-50/90 dark:from-slate-900/90 dark:to-purple-950/90 border border-purple-200/50 dark:border-purple-800/50 rounded-xl p-8 text-center shadow-lg flex flex-col justify-center items-center">
                  <div className="space-y-4 max-w-xs mx-auto">
                    <div className="flex justify-center">
                      <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full border border-purple-200/50">
                        <BarChart3 className="text-purple-600 dark:text-purple-400" size={24} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-2">Pro Feature</h3>
                      <p className="text-slate-600 dark:text-slate-300 text-sm">
                        Unlock Mood Distribution analytics with Pro subscription
                      </p>
                    </div>
                    <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-4 py-2 rounded-lg text-sm transition-all duration-300 transform hover:scale-105">
                      Upgrade to Pro
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </>
        )}

        {/* YogaNebula Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-white dark:text-slate-200 font-medium">
            Built with ❤️ by YogaNebula
          </p>
        </div>

      </div>
    </div>
  );
}