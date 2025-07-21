import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Star, Download, Zap, Brain, Shield, Crown, Database, Sparkles, TrendingUp, BarChart3, Mail, Clock } from "lucide-react";
import ProFeaturesEnhanced from "@/components/pro-features-enhanced";

export default function Pro() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('ai-insights');
  const [selectedTimeframe, setSelectedTimeframe] = useState("30days");
  const [, setLocation] = useLocation();
  
  const { data: subscription } = useQuery({
    queryKey: ["/api/subscription/status"],
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/mood-analytics", selectedTimeframe],
    queryFn: async () => {
      const days = selectedTimeframe === "7days" ? 7 : selectedTimeframe === "14days" ? 14 : 30;
      const response = await fetch(`/api/mood-analytics?days=${days}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      
      // Transform moodDistribution from object to array format expected by frontend
      const moodDistributionArray = Object.entries(data.moodDistribution || {})
        .map(([mood, count]: [string, any]) => ({
          mood,
          count,
          percentage: data.totalEntries > 0 ? (count / data.totalEntries) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count);
      
      return {
        ...data,
        moodDistribution: moodDistributionArray
      };
    }
  });

  const { data: moodEntries } = useQuery({
    queryKey: ["/api/mood-entries", selectedTimeframe],
    queryFn: async () => {
      const days = selectedTimeframe === "7days" ? 7 : selectedTimeframe === "14days" ? 14 : 30;
      const response = await fetch(`/api/mood-entries?days=${days}`);
      if (!response.ok) throw new Error('Failed to fetch mood entries');
      return response.json();
    }
  });



  const handleDataExport = async () => {
    try {
      const response = await fetch('/api/export/mood-data', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mood-data-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 dark:from-yellow-900 dark:via-orange-900 dark:to-red-900 pt-20">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Star className="h-8 w-8 text-yellow-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              Pro Features
            </h1>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            You have access to the complete Pro experience! Leverage advanced analytics, AI insights, and premium tools.
          </p>
          
          {/* Plan Status */}
          <div className="flex items-center justify-center gap-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            <Badge variant="default" className="bg-gradient-to-r from-yellow-600 to-orange-600">
              Pro Subscriber
            </Badge>
            {subscription?.subscriptionEndDate && !isNaN(new Date(subscription.subscriptionEndDate).getTime()) && (
              <span className="text-sm text-muted-foreground">
                • Active until {new Date(subscription.subscriptionEndDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* AI-Powered Advanced Features */}
        <ProFeaturesEnhanced 
          analytics={analytics} 
          moodEntries={moodEntries}
        />

        {/* Combined Pro Features Dashboard - Essential + Advanced */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Interactive Mood Dashboard
            </CardTitle>
            <CardDescription>
              Complete mood tracking with timeframe controls and detailed analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Timeframe Selection */}
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  variant={selectedTimeframe === "7days" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTimeframe("7days")}
                >
                  7 Days
                </Button>
                <Button
                  variant={selectedTimeframe === "14days" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTimeframe("14days")}
                >
                  14 Days
                </Button>
                <Button
                  variant={selectedTimeframe === "30days" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTimeframe("30days")}
                >
                  30 Days
                </Button>
              </div>

              {/* Interactive Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105"
                  onClick={() => setExpandedSection(expandedSection === 'moodBreakdown' ? null : 'moodBreakdown')}
                >
                  <h5 className="font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    Most Frequent Mood
                    <Brain className="h-4 w-4" />
                  </h5>
                  <p className="text-sm mt-1">
                    {analytics?.moodDistribution && analytics.moodDistribution.length > 0 
                      ? `${analytics.moodDistribution[0].mood.charAt(0).toUpperCase() + analytics.moodDistribution[0].mood.slice(1)} (${Math.round(analytics.moodDistribution[0].percentage)}%)`
                      : 'Track more to see patterns'}
                  </p>

                </div>

                <div 
                  className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105"
                  onClick={() => setExpandedSection(expandedSection === 'streakDetails' ? null : 'streakDetails')}
                >
                  <h5 className="font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                    Tracking Streak
                    <TrendingUp className="h-4 w-4" />
                  </h5>

                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {analytics?.totalEntries || 0} total entries in timeframe
                  </p>
                </div>

                <div 
                  className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105"
                  onClick={() => setExpandedSection(expandedSection === 'stabilityAnalysis' ? null : 'stabilityAnalysis')}
                >
                  <h5 className="font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
                    Mood Stability
                    <BarChart3 className="h-4 w-4" />
                  </h5>
                  <p className="text-sm mt-1">
                    {analytics?.totalEntries ? 
                      (analytics.totalEntries >= 20 ? 'High consistency' : 
                       analytics.totalEntries >= 10 ? 'Good consistency' : 'Building baseline')
                      : 'Building baseline'}
                  </p>
                </div>
              </div>

              {/* Expandable Detail Sections */}
              {expandedSection === 'moodBreakdown' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-400">
                  <h6 className="font-semibold text-blue-700 dark:text-blue-300 mb-3">Mood Distribution Analysis</h6>
                  <div className="text-sm space-y-2">
                    {analytics?.moodDistribution && analytics.moodDistribution.length > 0 ? (
                      analytics.moodDistribution.slice(0, 3).map((mood: any, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span className="capitalize">{mood.mood}:</span> 
                          <span className="font-medium">{Math.round(mood.percentage)}%</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-600 dark:text-gray-400">Track more moods to see distribution patterns</div>
                    )}
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      AI insights help identify patterns in your emotional states
                    </div>
                  </div>
                </div>
              )}

              {expandedSection === 'streakDetails' && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-l-4 border-green-400">
                  <h6 className="font-semibold text-green-700 dark:text-green-300 mb-3">Tracking Consistency</h6>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Consecutive Days:</span>
                      <span className="font-medium">
                        {(() => {
                          if (!moodEntries || moodEntries.length === 0) return '0';
                          
                          const today = new Date();
                          const sortedEntries = [...moodEntries].sort((a, b) => 
                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                          );
                          
                          let streak = 0;
                          let checkDate = new Date(today);
                          
                          for (let i = 0; i < 30; i++) {
                            const dayStart = new Date(checkDate);
                            dayStart.setHours(0, 0, 0, 0);
                            const dayEnd = new Date(checkDate);
                            dayEnd.setHours(23, 59, 59, 999);
                            
                            const hasEntryThisDay = sortedEntries.some(entry => {
                              const entryDate = new Date(entry.createdAt);
                              return entryDate >= dayStart && entryDate <= dayEnd;
                            });
                            
                            if (hasEntryThisDay) {
                              streak++;
                            } else if (i > 0) {
                              break;
                            }
                            
                            checkDate.setDate(checkDate.getDate() - 1);
                          }
                          
                          return streak;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Entries:</span>
                      <span className="font-medium">{analytics?.totalEntries || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Consistency Rate:</span>
                      <span className="font-medium">
                        {analytics?.totalEntries ? Math.min(100, Math.round((analytics.totalEntries / 30) * 100)) : 0}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      Regular tracking enables better AI predictions and insights
                    </div>
                  </div>
                </div>
              )}

              {expandedSection === 'stabilityAnalysis' && (
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border-l-4 border-purple-400">
                  <h6 className="font-semibold text-purple-700 dark:text-purple-300 mb-3">Stability Analysis</h6>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Stability Score:</span>
                      <span className="font-medium">
                        {analytics?.averageMood ? `${(analytics.averageMood * 2).toFixed(1)}/10` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Emotional Range:</span>
                      <span className="font-medium">
                        {analytics?.moodDistribution && analytics.moodDistribution.length >= 3 ? 'Varied' :
                         analytics?.moodDistribution && analytics.moodDistribution.length >= 2 ? 'Moderate' : 
                         analytics?.totalEntries >= 5 ? 'Focused' : 'Building'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      {analytics?.totalEntries >= 10 ? 
                        'AI analysis shows your emotional regulation patterns' :
                        'Track more entries for detailed stability analysis'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Consistency Encouragement */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-xl border-2 border-purple-200/50 dark:border-purple-700/50 shadow-lg backdrop-blur-sm">
          <div className="text-center space-y-3">
            <h3 className="text-xl font-bold text-purple-700 dark:text-purple-300 flex items-center justify-center gap-2">
              💎 Consistency Unlocks Transformation
            </h3>
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed max-w-4xl mx-auto">
              For predictions and correlations to work effectively, we need the power of your patterns. The more consistently you track your moods, 
              the more accurate our AI insights become. Your authentic data creates authentic breakthroughs - patterns reveal themselves, 
              and with that clarity comes the power to change. Every day you track is a step toward deeper emotional mastery.
            </p>
          </div>
        </div>



        {/* Interactive Pro Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Your Pro Analytics Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div 
                className="text-center p-4 rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
                onClick={() => setExpandedSection(expandedSection === 'unlimitedEntries' ? null : 'unlimitedEntries')}
              >
                <div className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">{analytics?.totalEntries || 0}</div>
                <div className="text-sm text-muted-foreground">Total Entries</div>
                <div className="text-xs text-green-600 mt-1">Unlimited Pro access</div>
              </div>
              <div 
                className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
                onClick={() => setExpandedSection(expandedSection === 'aiInsights' ? null : 'aiInsights')}
              >
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">✓</div>
                <div className="text-sm text-muted-foreground">AI Insights</div>
                <div className="text-xs text-green-600 mt-1">Advanced patterns</div>
              </div>
              <div 
                className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
                onClick={handleDataExport}
              >
                <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">CSV</div>
                <div className="text-sm text-muted-foreground">Data Export</div>
                <div className="text-xs text-green-600 mt-1">Download now</div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <div 
                    className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
                  >
                    <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">24/7</div>
                    <div className="text-sm text-muted-foreground">Priority Support</div>
                    <div className="text-xs text-green-600 mt-1">Contact now</div>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <Shield className="h-5 w-5 text-purple-600" />
                      Priority Support
                    </DialogTitle>
                    <DialogDescription className="text-slate-600 dark:text-slate-400">
                      Get dedicated support for your Pro subscription
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-purple-600" />
                        <span className="font-medium text-purple-800 dark:text-purple-200">24/7 Availability</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Our Pro support team is available around the clock to help with your wellness journey.
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800 dark:text-blue-200">Contact Information</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                        Email us for priority support:
                      </p>
                      <div className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-500" />
                          <span className="font-medium text-slate-800 dark:text-slate-200">contact@yoganebula.com</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-slate-600 dark:text-slate-400 text-center">
                      Include "PRO: INSIDEMETER" in your subject line for faster response
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Expandable Sections */}
            {expandedSection === 'unlimitedEntries' && (
              <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border-l-4 border-yellow-400">
                <h6 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-2">Unlimited Entry Benefits</h6>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Current Month Entries:</span>
                    <span className="font-medium">{analytics?.totalEntries || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Daily Tracking:</span>
                    <span className="font-medium">{analytics?.totalEntries ? Math.round(analytics.totalEntries / 30 * 10) / 10 : 0}/day</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Pro users can track unlimited moods per day with no restrictions
                  </div>
                </div>
              </div>
            )}

            {expandedSection === 'aiInsights' && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border-l-4 border-blue-400">
                <h6 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">AI-Powered Analysis</h6>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Pattern Recognition: Advanced mood correlation detection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Predictive Trends: Future mood forecasting with confidence scores</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    <span>NLP Guidance: Journal analysis with therapeutic recommendations</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Access the Pro Advanced Features section above for full AI analysis
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pro Tools Section */}
        <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-200 dark:border-yellow-700">
          <CardHeader>
            <CardTitle className="text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Pro Tools & Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button 
                onClick={handleDataExport}
                className="h-16 flex-col gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <Download className="h-5 w-5" />
                Export Data
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/charts'}
                className="h-16 flex-col gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                <Brain className="h-5 w-5" />
                AI Analytics
              </Button>
              
              <Button 
                onClick={() => setLocation('/profile')}
                className="h-16 flex-col gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                <Shield className="h-5 w-5" />
                Account Settings
              </Button>
            </div>
          </CardContent>
        </Card>



        {/* Pro Features Guide */}
        <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-emerald-200 dark:border-emerald-700">
          <CardHeader>
            <CardTitle className="text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Your Pro Features Guide
              <div className="text-sm font-normal bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                Transform Your Life
              </div>
            </CardTitle>
            <CardDescription className="text-emerald-600 dark:text-emerald-400">
              Master these powerful tools to understand yourself deeply and create lasting positive change
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* NLP Tab Explanation */}
            <div 
              className="p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-700 cursor-pointer hover:shadow-md transition-all"
              onClick={() => setActiveTab('nlp')}
            >
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-600 mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <h4 className="font-semibold text-emerald-700 dark:text-emerald-300 mb-2">NLP - Journal Analysis & Guidance</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    AI analyzes your private journal entries to uncover emotional themes, growth patterns, and therapeutic insights you might miss on your own.
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Use this to: Discover unconscious patterns • Get personalized therapeutic recommendations • Track emotional progress over time
                  </p>
                </div>
              </div>
            </div>

            {/* Trends Tab Explanation */}
            <div 
              className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 cursor-pointer hover:shadow-md transition-all"
              onClick={() => setActiveTab('trends')}
            >
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Trends - Predictive Mood Forecasting</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    Predict future emotional states based on your patterns, lunar cycles, and personal energy rhythms to prepare and plan better days ahead.
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    Use this to: Anticipate challenging periods • Plan self-care during vulnerable times • Schedule important decisions during peak emotional states
                  </p>
                </div>
              </div>
            </div>

            {/* Analytics Tab Explanation */}
            <div 
              className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 cursor-pointer hover:shadow-md transition-all"
              onClick={() => setActiveTab('analytics')}
            >
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-purple-600 mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-2">Analytics - Deep Statistical Insights</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    View comprehensive charts, mood distributions, and correlation analysis to understand what activities, times, and conditions impact your emotional wellness.
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                    Use this to: Identify mood triggers • Optimize daily routines • Make data-driven lifestyle improvements • Track progress over time
                  </p>
                </div>
              </div>
            </div>

            {/* About Me Tab Explanation */}
            <div 
              className="p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 cursor-pointer hover:shadow-md transition-all"
              onClick={() => setActiveTab('about-me')}
            >
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-600 mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-700 dark:text-amber-300 mb-2">About Me - Personal Transformation Report</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    Generate comprehensive reports about your emotional journey, revealing who you are becoming and what your data reveals about your authentic self.
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Use this to: Gain self-awareness • Celebrate emotional growth • Share insights with therapists • Create personal development plans
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 p-4 rounded-lg border-l-4 border-blue-400">
              <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                "When you understand your emotional patterns, you gain the power to shape your responses, improve your relationships, and design a life aligned with your authentic self."
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 text-center">
                Built with ❤️ by YogaNebula
              </p>
            </div>

          </CardContent>
        </Card>



        {/* Quick Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20" 
                onClick={() => window.location.href = '/charts'}>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Brain className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium">AI Analytics</span>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20" 
                onClick={handleDataExport}>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Download className="h-8 w-8 text-green-600 mb-2" />
              <span className="text-sm font-medium">Export Data</span>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20" 
                onClick={() => window.location.href = '/personal-growth'}>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Sparkles className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium">Growth Journal</span>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20" 
                onClick={() => window.location.href = '/meter'}>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Shield className="h-8 w-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium">Premium Tools</span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}