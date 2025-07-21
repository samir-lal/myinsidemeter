import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Lightbulb, Target, TrendingUp, RefreshCw, Sparkles, Moon, Heart } from "lucide-react";
import { useState } from "react";

interface AIInsights {
  patterns: string[];
  recommendations: string[];
  moodTrends: string;
  lunarCorrelations: string;
  emotionalWellness: string;
  actionItems: string[];
}

interface WeeklyReport {
  summary: string;
  highlights: string[];
  improvements: string[];
  nextWeekFocus: string[];
}

export default function AIInsights() {
  const [activeTab, setActiveTab] = useState<'insights' | 'weekly'>('insights');

  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useQuery({
    queryKey: ["/api/ai/insights"],
    retry: false,
  });

  const { data: weeklyReport, isLoading: weeklyLoading, refetch: refetchWeekly } = useQuery({
    queryKey: ["/api/ai/weekly-report"],
    retry: false,
  });

  const handleRefresh = () => {
    if (activeTab === 'insights') {
      refetchInsights();
    } else {
      refetchWeekly();
    }
  };

  const aiInsights = insights as AIInsights;
  const report = weeklyReport as WeeklyReport;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold">AI-Powered Insights</h2>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            Powered by ChatGPT
          </Badge>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={insightsLoading || weeklyLoading}
          size="sm"
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${(insightsLoading || weeklyLoading) ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <Button
          variant={activeTab === 'insights' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('insights')}
          className="flex-1"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Deep Analysis
        </Button>
        <Button
          variant={activeTab === 'weekly' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('weekly')}
          className="flex-1"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Weekly Report
        </Button>
      </div>

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          {insightsLoading ? (
            <div className="text-center py-8">
              <Brain className="h-8 w-8 animate-pulse text-purple-600 mx-auto mb-2" />
              <p className="text-muted-foreground">AI is analyzing your mood patterns...</p>
            </div>
          ) : aiInsights ? (
            <>
              {/* Emotional Wellness Overview */}
              <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    <Heart className="h-5 w-5" />
                    Emotional Wellness Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {aiInsights.emotionalWellness}
                  </p>
                </CardContent>
              </Card>

              {/* Mood Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Mood Trends Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {aiInsights.moodTrends}
                  </p>
                </CardContent>
              </Card>

              {/* Lunar Correlations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Moon className="h-5 w-5 text-indigo-600" />
                    Lunar Phase Correlations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {aiInsights.lunarCorrelations}
                  </p>
                </CardContent>
              </Card>

              {/* Patterns Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-green-600" />
                      Identified Patterns
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {aiInsights.patterns.map((pattern, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-600 mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{pattern}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-orange-600" />
                      AI Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {aiInsights.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-orange-600 mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{rec}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Action Items */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Target className="h-5 w-5" />
                    Recommended Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3">
                    {aiInsights.actionItems.map((action, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">
                            {index + 1}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{action}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  AI insights will appear here once you have enough mood data to analyze.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Weekly Report Tab */}
      {activeTab === 'weekly' && (
        <div className="space-y-6">
          {weeklyLoading ? (
            <div className="text-center py-8">
              <TrendingUp className="h-8 w-8 animate-pulse text-blue-600 mx-auto mb-2" />
              <p className="text-muted-foreground">Generating your weekly wellness report...</p>
            </div>
          ) : report ? (
            <>
              {/* Weekly Summary */}
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200">
                <CardHeader>
                  <CardTitle className="text-green-700 dark:text-green-300">
                    This Week's Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                    {report.summary}
                  </p>
                </CardContent>
              </Card>

              {/* Highlights and Improvements Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                      <Sparkles className="h-5 w-5" />
                      Week Highlights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {report.highlights.map((highlight, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-yellow-600 mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{highlight}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <TrendingUp className="h-5 w-5" />
                      Growth Areas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {report.improvements.map((improvement, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-600 mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{improvement}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Next Week Focus */}
              <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    <Target className="h-5 w-5" />
                    Next Week's Focus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.nextWeekFocus.map((focus, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                        <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                          <span className="text-xs font-semibold text-purple-600 dark:text-purple-300">
                            {index + 1}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{focus}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Weekly reports will be available after you track your mood for a few days.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}