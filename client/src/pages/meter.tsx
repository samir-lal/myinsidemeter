import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { 
  Gauge, 
  Crown, 
  TrendingUp, 
  Calendar, 
  Activity, 
  Zap, 
  Target,
  Lock,
  Sparkles,
  BarChart3,
  Users,
  Smile,
  Frown,
  Meh
} from "lucide-react";

export default function Meter() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [selectedTimeframe, setSelectedTimeframe] = useState("7days");

  const { data: subscription } = useQuery({
    queryKey: ["/api/subscription/status"],
    enabled: isAuthenticated,
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/mood-analytics"],
    enabled: isAuthenticated,
  });

  const { data: moodEntries } = useQuery({
    queryKey: ["/api/mood-entries"],
    enabled: isAuthenticated,
  });

  // Check if user is Pro subscriber or admin
  const isProUser = (subscription as any)?.subscriptionTier === 'pro' || (user as any)?.role === 'admin';

  // Calculate real data for visualizations
  const calculateMoodScore = (mood: string, intensity: number, subMood?: string | null) => {
    const moodRankings = { sad: 1, anxious: 2, neutral: 3, happy: 4, excited: 5 };
    let baseScore = (moodRankings[mood as keyof typeof moodRankings] || 3) * (intensity / 10);
    
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
  };

  const calculateCurrentStreak = () => {
    if (!moodEntries || !Array.isArray(moodEntries) || moodEntries.length === 0) return 0;
    
    // Group entries by date to handle multiple entries per day
    const entriesByDate = new Map<string, any[]>();
    (moodEntries as any[]).forEach((entry: any) => {
      const dateKey = new Date(entry.date).toDateString();
      if (!entriesByDate.has(dateKey)) {
        entriesByDate.set(dateKey, []);
      }
      entriesByDate.get(dateKey)!.push(entry);
    });

    // Sort unique dates in descending order
    const sortedDates = Array.from(entriesByDate.keys())
      .map(dateStr => new Date(dateStr))
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 0;
    let expectedDate = new Date();
    expectedDate.setHours(0, 0, 0, 0);

    for (const entryDate of sortedDates) {
      entryDate.setHours(0, 0, 0, 0);
      
      if (entryDate.getTime() === expectedDate.getTime()) {
        streak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else if (entryDate.getTime() < expectedDate.getTime()) {
        // Gap found, streak broken
        break;
      }
    }

    return streak;
  };

  const getRecentEntries = () => {
    if (!moodEntries || !Array.isArray(moodEntries)) return [];
    const days = selectedTimeframe === "7days" ? 7 : selectedTimeframe === "30days" ? 30 : 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return moodEntries
      .filter(entry => new Date(entry.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const recentEntries = getRecentEntries();
  
  // Calculate overall average mood from ALL entries, not just recent ones
  const overallAverageMood = (moodEntries && Array.isArray(moodEntries) && moodEntries.length > 0)
    ? moodEntries.reduce((sum, entry) => sum + calculateMoodScore(entry.mood, entry.intensity, entry.subMood), 0) / moodEntries.length
    : 0;
  
  // Calculate timeframe-specific average for trend analysis
  const timeframeAverageMood = recentEntries.length > 0 
    ? recentEntries.reduce((sum, entry) => sum + calculateMoodScore(entry.mood, entry.intensity, entry.subMood), 0) / recentEntries.length
    : 0;

  const getMoodDistribution = () => {
    if (!moodEntries || !Array.isArray(moodEntries) || moodEntries.length === 0) return { positive: 0, neutral: 0, challenging: 0 };
    
    const distribution = (moodEntries as any[]).reduce((acc, entry) => {
      const score = calculateMoodScore(entry.mood, entry.intensity, entry.subMood);
      // Fixed ranges based on actual mood types, not just score thresholds
      if (entry.mood === 'excited' || entry.mood === 'happy') {
        acc.positive++;
      } else if (entry.mood === 'neutral') {
        acc.neutral++;
      } else if (entry.mood === 'sad' || entry.mood === 'anxious') {
        acc.challenging++;
      }
      return acc;
    }, { positive: 0, neutral: 0, challenging: 0 });

    const total = moodEntries.length;
    return {
      positive: Math.round((distribution.positive / total) * 100),
      neutral: Math.round((distribution.neutral / total) * 100),
      challenging: Math.round((distribution.challenging / total) * 100)
    };
  };

  const getActivityInsights = () => {
    if (!recentEntries || recentEntries.length === 0) return [];
    
    // Group entries by activity tags and calculate average mood for each activity
    const activityGroups = recentEntries
      .filter((entry: any) => entry.activities && Array.isArray(entry.activities) && entry.activities.length > 0)
      .reduce((acc: any, entry: any) => {
        // Each entry can have multiple activities, process each one
        entry.activities.forEach((activity: string) => {
          if (!acc[activity]) {
            acc[activity] = { scores: [], count: 0, latestDate: entry.date };
          }
          acc[activity].scores.push(calculateMoodScore(entry.mood, entry.intensity));
          acc[activity].count++;
          // Keep track of the latest date for this activity
          if (new Date(entry.date) > new Date(acc[activity].latestDate)) {
            acc[activity].latestDate = entry.date;
          }
        });
        return acc;
      }, {} as Record<string, { scores: number[]; count: number; latestDate: string }>);

    // Convert to array and calculate averages, sorted by average mood (highest impact first)
    return Object.entries(activityGroups)
      .map(([activity, data]: [string, any]) => ({
        activity: activity.charAt(0).toUpperCase() + activity.slice(1), // Capitalize first letter
        mood: Number((data.scores.reduce((sum: number, score: number) => sum + score, 0) / data.scores.length).toFixed(1)),
        count: data.count,
        date: new Date(data.latestDate).toLocaleDateString()
      }))
      .sort((a, b) => b.mood - a.mood) // Sort by mood score (highest first)
      .slice(0, 5); // Top 5 activities
  };

  const moodDistribution = getMoodDistribution();
  const activityInsights = getActivityInsights();

  const CircularMeter = ({ value, max = 10, label }: { value: number; max?: number; label: string }) => {
    const percentage = (value / max) * 100;
    const circumference = 2 * Math.PI * 45; // radius = 45
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative w-32 h-32 mx-auto">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-slate-200 dark:text-slate-700"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="url(#gradient)"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{Math.round(value)}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
        </div>
      </div>
    );
  };

  const WaveMeter = ({ values }: { values: number[] }) => {
    const maxValue = Math.max(...values);
    const normalizedValues = values.map(v => (v / maxValue) * 100);

    return (
      <div className="relative h-24 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-end justify-around p-2">
          {normalizedValues.map((value, index) => (
            <div
              key={index}
              className="bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-sm transition-all duration-1000 ease-out"
              style={{ 
                height: `${value}%`, 
                width: '8px',
                animationDelay: `${index * 100}ms`
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  // Show different content based on authentication and subscription status
  if (authLoading) {
    return (
      <div className="px-4 py-6 pt-20 space-y-6 animate-fade-in">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isProUser) {
    return (
      <div className="px-4 py-6 pt-20 space-y-6 animate-fade-in">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-200/50">
                <Activity className="text-purple-600 dark:text-purple-400" size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-purple-600">
                  <span className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 bg-clip-text text-transparent" style={{
                    backgroundImage: 'linear-gradient(to right, #9333ea, #a855f7, #ec4899)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    Inside Meter
                  </span>
                </h1>
                <p className="text-white">Deep insights into your patterns</p>
              </div>
            </div>
            <Badge variant="outline" className="border-purple-300 text-purple-700 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-900/20 px-3 py-1">
              <Crown size={14} className="mr-1" />
              Premium Feature
            </Badge>
          </div>

          {/* Subscription Required Card */}
          <Card className="glassmorphism border-purple-200/50 dark:border-purple-800/50 bg-gradient-to-br from-white/90 to-purple-50/90 dark:from-slate-900/90 dark:to-purple-950/90 p-8 text-center mb-6 shadow-xl">
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full border border-purple-200/50 shadow-lg">
                  <Sparkles className="text-purple-600 dark:text-purple-400" size={32} />
                </div>
              </div>
              
              <div>
                <h2 className="text-3xl font-bold mb-3 text-purple-600">
                  <span className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 bg-clip-text text-transparent" style={{
                    backgroundImage: 'linear-gradient(to right, #9333ea, #a855f7, #ec4899)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    Unlock Your Inside Meter
                  </span>
                </h2>
                <p className="text-slate-600 dark:text-slate-300 text-lg mb-6">
                  Discover powerful insights with subscription access
                </p>
              </div>

              <div className="bg-gradient-to-r from-purple-50/80 to-pink-50/80 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl p-6 border border-purple-100 dark:border-purple-800">
                <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Premium Features Include:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                    <Calendar className="text-purple-500" size={18} />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Weekly & Monthly Highlights</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                    <TrendingUp className="text-pink-500" size={18} />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Intense Days Analysis</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                    <Activity className="text-blue-500" size={18} />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Activity Correlation</span>
                  </div>
                </div>
              </div>

              <Button 
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Crown size={18} className="mr-2" />
                Unlocks with Subscription
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Pro User Dashboard with Real Data
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900 px-4 pb-6 pt-20 space-y-6 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-10 gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-200/30 dark:border-purple-700/30 shadow-lg">
              <Activity className="text-purple-600 dark:text-purple-400" size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 bg-clip-text text-transparent" style={{
                  backgroundImage: 'linear-gradient(to right, #9333ea, #a855f7, #ec4899)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Inside Meter
                </span>
              </h1>
              <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">Your personal emotional insights</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-36 h-11 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-medium text-black dark:text-white bg-white dark:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectItem value="7days" className="text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">7 Days</SelectItem>
                <SelectItem value="30days" className="text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">30 Days</SelectItem>
                <SelectItem value="90days" className="text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="border-purple-300 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 px-4 py-2 text-sm font-semibold rounded-full">
              <Crown size={16} className="mr-1.5" />
              Pro Active
            </Badge>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white/90 to-green-50/90 dark:from-slate-800/90 dark:to-green-950/30 p-8 text-center rounded-2xl">
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl mr-3">
                <Target className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Average Mood</h3>
            </div>
            <CircularMeter value={overallAverageMood} max={5} label="Mood Score" />
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-4 font-medium">
              Based on {(moodEntries && Array.isArray(moodEntries)) ? moodEntries.length : 0} entries
            </p>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-white/90 to-blue-50/90 dark:from-slate-800/90 dark:to-blue-950/30 p-8 text-center rounded-2xl">
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl mr-3">
                <BarChart3 className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Consistency</h3>
            </div>
            <CircularMeter 
              value={calculateCurrentStreak()} 
              max={Math.max(30, calculateCurrentStreak() || 1)} 
              label="Day Streak" 
            />
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-4 font-medium">
              Current tracking streak
            </p>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-white/90 to-orange-50/90 dark:from-slate-800/90 dark:to-orange-950/30 p-8 text-center rounded-2xl">
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl mr-3">
                <Activity className="text-orange-600 dark:text-orange-400" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Total Entries</h3>
            </div>
            <CircularMeter 
              value={(analytics as any)?.totalEntries || 0} 
              max={Math.max(50, (analytics as any)?.totalEntries || 1)} 
              label="Entries" 
            />
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-4 font-medium">
              All time tracking
            </p>
          </Card>
        </div>

        {/* Consistency Information */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white/95 to-indigo-50/80 dark:from-slate-800/95 dark:to-indigo-950/20 rounded-2xl overflow-hidden mb-8">
          <CardHeader className="pb-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/20 dark:to-purple-900/20">
            <CardTitle className="flex items-center text-lg font-bold">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg mr-3">
                <Target className="text-indigo-600 dark:text-indigo-400" size={20} />
              </div>
              Understanding Consistency
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="bg-white/70 dark:bg-slate-700/30 rounded-xl p-4">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong>Consistency measures consecutive days</strong> of mood tracking. It resets to zero if you skip even one day, encouraging daily self-reflection rather than sporadic logging. This metric helps build the habit of regular emotional check-ins, which is essential for recognizing patterns and developing greater self-awareness.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mood Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white/95 to-green-50/80 dark:from-slate-800/95 dark:to-green-950/20 rounded-2xl overflow-hidden">
            <CardHeader className="pb-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-900/20 dark:to-emerald-900/20">
              <CardTitle className="flex items-center text-xl font-bold">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                  <Smile className="text-green-600 dark:text-green-400" size={24} />
                </div>
                Mood Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-white/70 dark:bg-slate-700/30 rounded-xl">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                      <Smile className="text-green-600 dark:text-green-400" size={18} />
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Positive</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-24 h-3 bg-slate-200 dark:bg-slate-600 rounded-full mr-3">
                      <div 
                        className="h-3 bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-1000"
                        style={{ width: `${moodDistribution.positive}%` }}
                      />
                    </div>
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-200 min-w-[3rem]">{moodDistribution.positive}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/70 dark:bg-slate-700/30 rounded-xl">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mr-3">
                      <Meh className="text-yellow-600 dark:text-yellow-400" size={18} />
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Neutral</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-24 h-3 bg-slate-200 dark:bg-slate-600 rounded-full mr-3">
                      <div 
                        className="h-3 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full transition-all duration-1000"
                        style={{ width: `${moodDistribution.neutral}%` }}
                      />
                    </div>
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-200 min-w-[3rem]">{moodDistribution.neutral}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/70 dark:bg-slate-700/30 rounded-xl">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg mr-3">
                      <Frown className="text-red-600 dark:text-red-400" size={18} />
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Challenging</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-24 h-3 bg-slate-200 dark:bg-slate-600 rounded-full mr-3">
                      <div 
                        className="h-3 bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-1000"
                        style={{ width: `${moodDistribution.challenging}%` }}
                      />
                    </div>
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-200 min-w-[3rem]">{moodDistribution.challenging}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-white/95 to-blue-50/80 dark:from-slate-800/95 dark:to-blue-950/20 rounded-2xl overflow-hidden">
            <CardHeader className="pb-6 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-900/20 dark:to-indigo-900/20">
              <CardTitle className="flex items-center text-xl font-bold">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                  <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
                Recent Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {recentEntries.length > 0 ? (
                <div className="space-y-6">
                  <div className="bg-white/70 dark:bg-slate-700/30 rounded-xl p-4">
                    <WaveMeter values={recentEntries.slice(-7).map(entry => calculateMoodScore(entry.mood, entry.intensity))} />
                  </div>
                  <div className="flex justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                    {recentEntries.slice(-7).map((entry, index) => (
                      <span key={index} className="text-center">
                        {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                    ))}
                  </div>
                  <p className="text-center text-slate-600 dark:text-slate-400 font-medium">
                    Last 7 days mood pattern
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <TrendingUp className="text-blue-600 dark:text-blue-400" size={28} />
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-medium">
                    Track more moods to see your trend pattern
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mood Distribution & Recent Trends Information */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white/95 to-amber-50/80 dark:from-slate-800/95 dark:to-amber-950/20 rounded-2xl overflow-hidden mb-8">
          <CardHeader className="pb-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-900/20 dark:to-orange-900/20">
            <CardTitle className="flex items-center text-lg font-bold">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg mr-3">
                <TrendingUp className="text-amber-600 dark:text-amber-400" size={20} />
              </div>
              Understanding Your Patterns
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="bg-white/70 dark:bg-slate-700/30 rounded-xl p-4">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Mood Distribution</h4>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                  Shows the percentage breakdown of your emotional states over time. This reveals your emotional baseline - whether you tend toward positive, neutral, or challenging states. Understanding your distribution helps identify if you're generally optimistic, resilient during difficult periods, or need extra support.
                </p>
              </div>
              <div className="bg-white/70 dark:bg-slate-700/30 rounded-xl p-4">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Recent Trends</h4>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                  The wave pattern shows your mood fluctuations over the past week. Look for patterns: Are you consistent? Do you have emotional cycles? Are there specific days that tend to be better or worse? This visualization helps you recognize triggers and develop strategies for emotional stability.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Insights */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white/95 to-purple-50/80 dark:from-slate-800/95 dark:to-purple-950/20 rounded-2xl overflow-hidden mb-12">
          <CardHeader className="pb-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-900/20 dark:to-pink-900/20">
            <CardTitle className="flex items-center text-xl font-bold">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3">
                <Activity className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              Activity & Mood Correlation
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {activityInsights.length > 0 ? (
              <div className="space-y-4">
                {activityInsights.map((insight, index) => (
                  <div key={index} className="flex items-center justify-between p-6 bg-white/80 dark:bg-slate-700/40 rounded-xl border border-purple-100/50 dark:border-purple-800/30 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-base mb-1">{insight.activity}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                        {insight.count} {insight.count === 1 ? 'entry' : 'entries'} • Last: {insight.date}
                      </p>
                    </div>
                    <div className="flex items-center ml-6">
                      <div className="w-32 h-4 bg-slate-200 dark:bg-slate-600 rounded-full mr-4">
                        <div 
                          className="h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000 shadow-sm"
                          style={{ width: `${(insight.mood / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-lg font-bold text-slate-800 dark:text-slate-200 min-w-[4rem] text-right">
                        {insight.mood.toFixed(1)}/5
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <Activity className="text-purple-600 dark:text-purple-400" size={32} />
                </div>
                <p className="text-slate-600 dark:text-slate-300 font-medium text-lg">
                  Select activities with your mood entries to see correlations
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                  Track which activities boost your mood (gym, yoga, meditation, etc.)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity & Mood Correlation Information */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white/95 to-emerald-50/80 dark:from-slate-800/95 dark:to-emerald-950/20 rounded-2xl overflow-hidden mb-8">
          <CardHeader className="pb-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-900/20 dark:to-teal-900/20">
            <CardTitle className="flex items-center text-lg font-bold">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg mr-3">
                <Activity className="text-emerald-600 dark:text-emerald-400" size={20} />
              </div>
              Activity & Mood Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="bg-white/70 dark:bg-slate-700/30 rounded-xl p-4">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                This section reveals which activities most positively impact your mood. By tracking activities like gym, yoga, meditation, or outdoor time alongside your emotional state, you can identify your personal mood boosters. Use these insights to intentionally schedule more of what lifts your spirits and fewer activities that drain your energy.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Insights Summary */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white/95 to-indigo-50/80 dark:from-slate-800/95 dark:to-indigo-950/20 rounded-2xl overflow-hidden">
          <CardHeader className="pb-6 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/20 dark:to-purple-900/20">
            <CardTitle className="flex items-center text-xl font-bold">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg mr-3">
                <Sparkles className="text-indigo-600 dark:text-indigo-400" size={24} />
              </div>
              Your Insights Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-indigo-700 dark:text-indigo-300 mb-4">Key Patterns</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-white/70 dark:bg-slate-700/30 rounded-xl">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full flex-shrink-0"></div>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Average mood: <strong className="text-indigo-600 dark:text-indigo-400">{Math.round(timeframeAverageMood)}/5</strong> over {selectedTimeframe.replace('days', ' days')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-white/70 dark:bg-slate-700/30 rounded-xl">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full flex-shrink-0"></div>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Most frequent: <strong className="text-indigo-600 dark:text-indigo-400">
                        {moodDistribution.positive >= moodDistribution.neutral && moodDistribution.positive >= moodDistribution.challenging ? 'Positive' :
                         moodDistribution.neutral >= moodDistribution.challenging ? 'Neutral' : 'Challenging'} 
                      </strong> moods
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-white/70 dark:bg-slate-700/30 rounded-xl">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full flex-shrink-0"></div>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Tracking consistency: <strong className="text-indigo-600 dark:text-indigo-400">{(analytics as any)?.streak || 0} day streak</strong>
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-green-700 dark:text-green-300 mb-4">Growth Opportunities</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-white/70 dark:bg-slate-700/30 rounded-xl">
                    <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span className="font-medium text-slate-800 dark:text-slate-200">Continue daily tracking for deeper insights</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-white/70 dark:bg-slate-700/30 rounded-xl">
                    <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span className="font-medium text-slate-800 dark:text-slate-200">Add detailed notes to identify activity patterns</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-white/70 dark:bg-slate-700/30 rounded-xl">
                    <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span className="font-medium text-slate-800 dark:text-slate-200">Review trends weekly for self-awareness</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* YogaNebula Footer */}
        <div className="mt-12 pt-8 text-center border-t border-slate-300 dark:border-slate-600">
          <p className="text-slate-800 dark:text-slate-200 text-sm font-medium">
            Built with ❤️ by YogaNebula
          </p>
        </div>
      </div>
    </div>
  );
}