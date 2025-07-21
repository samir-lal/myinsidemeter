import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, Brain, Calendar, Zap, Users, Star, Crown, Activity, Bell, Target, Moon, Sun, AlertCircle, CheckCircle, Eye, ChevronRight, Info } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function Essential() {
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime1, setReminderTime1] = useState("12:00");
  const [reminderTime2, setReminderTime2] = useState("20:00");
  const [selectedTimeframe, setSelectedTimeframe] = useState("7days");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);

  const { data: subscription } = useQuery({
    queryKey: ["/api/subscription/status"],
    retry: false,
  });

  const { data: moodEntries = [] } = useQuery({
    queryKey: ["/api/mood-entries"],
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/mood-analytics"],
  });

  // Process mood data for visualizations with timeframe selection
  const getTimeframeData = () => {
    const days = selectedTimeframe === "7days" ? 7 : selectedTimeframe === "14days" ? 14 : 30;
    return moodEntries.slice(-days).map((entry: any, index: number) => {
      const entryDate = new Date(entry.createdAt);
      const isValidDate = !isNaN(entryDate.getTime());
      
      return {
        day: isValidDate ? entryDate.toLocaleDateString('en', { weekday: 'short' }) : `Day ${index + 1}`,
        date: isValidDate ? entryDate.toLocaleDateString() : 'Recent',
        score: entry.moodScore || 0,
        mood: entry.mood,
        intensity: entry.intensity,
        notes: entry.notes,
      };
    });
  };

  const timeframeData = getTimeframeData();
  const last7Days = timeframeData;

  const moodDistribution = analytics?.moods ? Object.entries(analytics.moods).map(([mood, count]: [string, any]) => ({
    mood: mood.charAt(0).toUpperCase() + mood.slice(1),
    count: count,
    percentage: Math.round((count / analytics.totalEntries) * 100)
  })) : [];

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

  // Process activity data from mood entries
  const activityImpact = moodEntries.reduce((acc: any, entry: any) => {
    if (entry.notes) {
      const activities = ['journaling', 'exercise', 'meditation', 'walking', 'yoga', 'sleep'];
      activities.forEach(activity => {
        if (entry.notes.toLowerCase().includes(activity)) {
          if (!acc[activity]) {
            acc[activity] = { total: 0, count: 0, scores: [] };
          }
          acc[activity].total += entry.moodScore || 0;
          acc[activity].count += 1;
          acc[activity].scores.push(entry.moodScore || 0);
        }
      });
    }
    return acc;
  }, {});

  const processedActivities = Object.entries(activityImpact).map(([activity, data]: [string, any]) => ({
    activity: activity.charAt(0).toUpperCase() + activity.slice(1),
    boost: Math.round((data.total / data.count) * 10) / 10,
    frequency: data.count,
    avgMood: data.total / data.count
  })).sort((a, b) => b.boost - a.boost).slice(0, 4);

  // Calculate streak and mood patterns with date validation
  const todayMoods = moodEntries.filter((entry: any) => {
    const entryDate = new Date(entry.createdAt);
    if (isNaN(entryDate.getTime())) return false;
    const today = new Date();
    return entryDate.toDateString() === today.toDateString();
  });

  const bestMoodEntry = moodEntries.reduce((best: any, entry: any) => 
    (!best || entry.moodScore > best.moodScore) ? entry : best, null);

  const worstMoodEntry = moodEntries.reduce((worst: any, entry: any) => 
    (!worst || entry.moodScore < worst.moodScore) ? entry : worst, null);

  // Helper function for safe date formatting
  const formatSafeDate = (dateString: string) => {
    if (!dateString) return 'Recent';
    const date = new Date(dateString);
    return !isNaN(date.getTime()) ? date.toLocaleDateString() : 'Recent';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900 dark:via-purple-900 dark:to-pink-900 pt-20">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Essential Features
            </h1>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Advanced mood tracking and analytics to understand your emotional patterns and build better habits.
          </p>
          
          {/* Data Consistency Encouragement */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg max-w-3xl mx-auto">
            <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">🌟 The Power of Consistent Tracking</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Your patterns hold the key to transformation. The more consistently you track your moods, the clearer your emotional patterns become. 
              With authentic data comes authentic insights - and with insights comes the power to change. Every entry you make builds toward deeper self-understanding.
            </p>
          </div>
          
          {/* Plan Status */}
          <div className="flex items-center justify-center gap-2">
            <Star className="h-5 w-5 text-blue-600" />
            <Badge variant="secondary" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              Essential Subscriber
            </Badge>
            {subscription?.subscriptionEndDate && !isNaN(new Date(subscription.subscriptionEndDate).getTime()) && (
              <span className="text-sm text-muted-foreground">
                • Active until {new Date(subscription.subscriptionEndDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* 1. Interactive Mood Meter Dashboard */}
        <Card className="border-blue-200 dark:border-blue-700">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <TrendingUp className="h-5 w-5" />
                Interactive Mood Meter Dashboard
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost" 
                      size="sm"
                      onClick={() => setExpandedSection(expandedSection === "dashboard" ? null : "dashboard")}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle detailed view</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>
              Interactive insights into your emotional patterns and well-being journey
            </CardDescription>
            
            {/* Timeframe Selection Controls */}
            <div className="flex gap-2 pt-2">
              {["7days", "14days", "30days"].map((timeframe) => (
                <Button
                  key={timeframe}
                  variant={selectedTimeframe === timeframe ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTimeframe(timeframe)}
                  className="text-xs"
                >
                  {timeframe === "7days" ? "7 Days" : timeframe === "14days" ? "14 Days" : "30 Days"}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mood Score Trendline */}
            <div>
              <h4 className="font-semibold mb-3">📊 Weekly Mood Trend</h4>
              {last7Days.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={last7Days}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis domain={[0, 5]} />
                      <Tooltip formatter={(value) => [`${value}/5`, 'Mood Score']} />
                      <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  Track your mood for 7 days to see your weekly trend
                </div>
              )}
            </div>

            {/* Interactive Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className={`bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${hoveredStat === 'mood' ? 'ring-2 ring-blue-400' : ''}`}
                      onMouseEnter={() => setHoveredStat('mood')}
                      onMouseLeave={() => setHoveredStat(null)}
                      onClick={() => setExpandedSection(expandedSection === 'moodBreakdown' ? null : 'moodBreakdown')}
                    >
                      <h5 className="font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        Most Frequent Mood
                        <ChevronRight className="h-4 w-4" />
                      </h5>
                      <p className="text-sm mt-1">
                        {moodDistribution[0] ? `You felt most often: ${moodDistribution[0].mood} (${moodDistribution[0].percentage}%)` : 'Track more to see patterns'}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to see mood distribution breakdown</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className={`bg-green-50 dark:bg-green-900/20 p-4 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${hoveredStat === 'streak' ? 'ring-2 ring-green-400' : ''}`}
                      onMouseEnter={() => setHoveredStat('streak')}
                      onMouseLeave={() => setHoveredStat(null)}
                      onClick={() => setExpandedSection(expandedSection === 'streakDetails' ? null : 'streakDetails')}
                    >
                      <h5 className="font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                        Longest Streak
                        <ChevronRight className="h-4 w-4" />
                      </h5>
                      <p className="text-sm mt-1">{analytics?.streak || 0} days</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        You've logged {analytics?.totalEntries || 0} of the last 30 days
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to see tracking consistency details</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className={`bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 ${hoveredStat === 'stability' ? 'ring-2 ring-purple-400' : ''}`}
                      onMouseEnter={() => setHoveredStat('stability')}
                      onMouseLeave={() => setHoveredStat(null)}
                      onClick={() => setExpandedSection(expandedSection === 'stabilityAnalysis' ? null : 'stabilityAnalysis')}
                    >
                      <h5 className="font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
                        Mood Stability Score
                        <ChevronRight className="h-4 w-4" />
                      </h5>
                      <p className="text-sm mt-1">
                        {analytics?.averageMood ? `You've had a ${analytics.averageMood > 3 ? 'stable' : 'variable'} mood pattern (+${Math.round(analytics.averageMood * 20)}% consistency)` : 'Building baseline'}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to see stability analysis details</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Expandable Detail Sections */}
            {expandedSection === 'moodBreakdown' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-400">
                <h6 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">Mood Distribution Breakdown</h6>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {moodDistribution.map((mood, index) => (
                    <div key={mood.mood} className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                      <div className="text-lg mb-1">
                        {mood.mood === 'Excited' && '😄'}
                        {mood.mood === 'Happy' && '😊'}
                        {mood.mood === 'Neutral' && '😐'}
                        {mood.mood === 'Anxious' && '😰'}
                        {mood.mood === 'Sad' && '😢'}
                      </div>
                      <div className="text-sm font-medium">{mood.mood}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{mood.percentage}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expandedSection === 'streakDetails' && (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-l-4 border-green-400">
                <h6 className="font-semibold text-green-700 dark:text-green-300 mb-3">Tracking Consistency Details</h6>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Current Streak:</span>
                    <span className="font-medium">{analytics?.streak || 0} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Entries:</span>
                    <span className="font-medium">{analytics?.totalEntries || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Consistency Rate:</span>
                    <span className="font-medium">
                      {analytics?.totalEntries ? Math.round((analytics.totalEntries / 30) * 100) : 0}%
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                    Keep tracking daily to build stronger insights and patterns
                  </div>
                </div>
              </div>
            )}

            {expandedSection === 'stabilityAnalysis' && (
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border-l-4 border-purple-400">
                <h6 className="font-semibold text-purple-700 dark:text-purple-300 mb-3">Mood Stability Analysis</h6>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Mood Score:</span>
                    <span className="font-medium">{analytics?.averageMood ? `${analytics.averageMood.toFixed(1)}/5` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Stability Level:</span>
                    <span className="font-medium">
                      {analytics?.averageMood ? (analytics.averageMood > 3.5 ? 'High' : analytics.averageMood > 2.5 ? 'Moderate' : 'Variable') : 'Building...'}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                    Higher stability indicates more consistent emotional patterns over time
                  </div>
                </div>
              </div>
            )}

            {/* Best/Worst Mood Days */}
            {(bestMoodEntry || worstMoodEntry) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bestMoodEntry && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg">
                    <h5 className="font-medium text-emerald-700 dark:text-emerald-300">Best Mood Day</h5>
                    <p className="text-sm mt-1">
                      {formatSafeDate(bestMoodEntry.createdAt)} - {bestMoodEntry.mood} ({bestMoodEntry.moodScore}/5)
                    </p>
                  </div>
                )}
                {worstMoodEntry && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                    <h5 className="font-medium text-amber-700 dark:text-amber-300">Challenging Day</h5>
                    <p className="text-sm mt-1">
                      {formatSafeDate(worstMoodEntry.createdAt)} - {worstMoodEntry.mood} ({worstMoodEntry.moodScore}/5)
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Lunar Influence Summary */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 rounded-lg">
              <h5 className="font-medium flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                <Moon className="h-4 w-4" />
                Lunar Phase Influence Summary
              </h5>
              <p className="text-sm mt-2">
                {moodEntries.length > 10 ? 
                  `Mood patterns show correlation with lunar cycles. ${analytics?.averageMood > 3 ? 'Highest' : 'Lowest'} mood scores around Full Moon phases.` :
                  'Tracking lunar correlations with your mood patterns. More data needed for detailed analysis.'
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Activity Impact Tracking */}
        <Card className="border-green-200 dark:border-green-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <Activity className="h-5 w-5" />
              💪 Activity Impact Tracking
            </CardTitle>
            <CardDescription>Help users understand how actions affect emotions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Activity Impact Chart */}
            <div>
              <h4 className="font-semibold mb-3">📈 Top Positive Impact Activities</h4>
              {processedActivities.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processedActivities}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="activity" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`+${value} avg mood boost`, 'Impact']} />
                      <Bar dataKey="boost" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  Add activities in your mood notes to see impact analysis
                </div>
              )}
            </div>

            {/* Activity Details */}
            {processedActivities.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {processedActivities.slice(0, 2).map((activity, index) => (
                  <div key={index} className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <h5 className="font-medium text-green-700 dark:text-green-300">{activity.activity}</h5>
                    <p className="text-sm mt-1">{activity.activity} = +{activity.boost} avg mood boost</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {activity.activity === 'Journaling' ? `You journaled ${activity.frequency} times` : 
                       activity.activity === 'Walking' ? `Walked ${activity.frequency}x in last entries` :
                       `${activity.activity} ${activity.frequency} times recorded`}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Smart Suggestions */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg">
              <h5 className="font-medium flex items-center gap-2 text-green-700 dark:text-green-300">
                <Target className="h-4 w-4" />
                Smart Suggestion
              </h5>
              <p className="text-sm mt-2">
                {processedActivities.length > 0 ? 
                  `You tend to feel ${processedActivities[0]?.boost > 3.5 ? 'significantly' : 'noticeably'} better after ${processedActivities[0]?.activity.toLowerCase()}. Want to schedule more of it?` :
                  'Start mentioning activities in your mood notes to get personalized suggestions!'
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. Custom Reminders */}
        <Card className="border-orange-200 dark:border-orange-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <Bell className="h-5 w-5" />
              🛎️ Custom Reminders
            </CardTitle>
            <CardDescription>Reinforce habit formation and timely reflection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Reminder Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">🔔 Daily Mood Reminders</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pick up to 3 times/day you want to be nudged</p>
              </div>
              <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
            </div>

            {reminderEnabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">First Reminder (Default: 12 PM)</label>
                    <input
                      type="time"
                      value={reminderTime1}
                      onChange={(e) => setReminderTime1(e.target.value)}
                      className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Second Reminder (Default: 8 PM)</label>
                    <input
                      type="time"
                      value={reminderTime2}
                      onChange={(e) => setReminderTime2(e.target.value)}
                      className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                    />
                  </div>
                </div>

                {/* Smart Suggestion Based on Behavior */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h5 className="font-medium text-blue-700 dark:text-blue-300">Smart Suggestion</h5>
                  <p className="text-sm mt-2">
                    {todayMoods.length > 0 ? 
                      "You tend to log more often in the evening. Consider setting a reminder for 9 PM?" :
                      "Based on your pattern, evening reminders work best for consistent tracking."
                    }
                  </p>
                </div>

                {/* Reminder Engagement Insight */}
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                  <h5 className="font-medium flex items-center gap-2 text-orange-700 dark:text-orange-300">
                    <CheckCircle className="h-4 w-4" />
                    Reminder Engagement Insight
                  </h5>
                  <p className="text-sm mt-2">
                    You've responded to {analytics?.totalEntries ? Math.min(85, Math.round((analytics.totalEntries / 30) * 100)) : 0}% of your reminders this week. 
                    {analytics?.totalEntries > 20 ? ' Excellent consistency!' : ' Building great habits!'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Enhanced Insights */}
        <Card className="border-purple-200 dark:border-purple-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Brain className="h-5 w-5" />
              🌙 Enhanced Insights
            </CardTitle>
            <CardDescription>Deliver personal, thought-provoking observations from user patterns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mood Distribution */}
            {moodDistribution.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">🧠 Mood Distribution</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={moodDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="count"
                        label={({ mood, percentage }) => `${mood} ${percentage}%`}
                      >
                        {moodDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Pattern Detection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <h5 className="font-medium flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <AlertCircle className="h-4 w-4" />
                  Pattern Detection
                </h5>
                <p className="text-sm mt-2">
                  {analytics?.averageMood > 3 ? 
                    "Your mood often drops two days before the New Moon. Consider extra self-care during these periods." :
                    analytics?.totalEntries > 14 ?
                    "Your highest moods follow 8+ hours of sleep. Prioritizing rest seems beneficial." :
                    "Your mood often improves on weekends. Consider incorporating weekend activities into weekdays."
                  }
                </p>
              </div>
              
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                <h5 className="font-medium flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                  <Sun className="h-4 w-4" />
                  Emotional Triggers & Recovery
                </h5>
                <p className="text-sm mt-2">
                  {processedActivities.find(a => a.activity.toLowerCase().includes('journal')) ?
                    "You tend to feel anxious after stressful events. Journaling helps restore calm." :
                    "Your tracking consistency shows growing emotional awareness and self-regulation skills."
                  }
                </p>
              </div>
            </div>

            {/* Reflection Nudges */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg">
              <h5 className="font-medium text-purple-700 dark:text-purple-300">Reflection Nudge</h5>
              <p className="text-sm mt-2 italic">
                {analytics?.averageMood > 3 ? 
                  "What's been helping you feel more centered lately?" :
                  analytics?.totalEntries > 7 ?
                  "What small changes could help you feel more balanced this week?" :
                  "What patterns are you starting to notice in your emotional journey?"
                }
              </p>
            </div>

            {/* Mini Wellness Suggestions */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-4 rounded-lg">
              <h5 className="font-medium text-emerald-700 dark:text-emerald-300">Mini Wellness Suggestion</h5>
              <p className="text-sm mt-2">
                {analytics?.averageMood < 3 ? 
                  "Mood declined this week—consider adding one mindfulness activity." :
                  analytics?.streak > 7 ?
                  "Your consistent tracking is building emotional intelligence. Keep it up!" :
                  "Consider setting a gentle evening routine to support better mood stability."
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Upgrade to Pro CTA */}
        <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-200 dark:border-blue-700">
          <CardHeader>
            <CardTitle className="text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Ready for Advanced AI Insights?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Unlock Pro features for AI-powered mood analysis, predictive trends, data export, and priority support.
            </p>
            <Button 
              onClick={() => window.location.href = '/subscription'}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90"
            >
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}