import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { 
  BarChart3, Calendar, TrendingUp, Brain, Target, 
  Download, Mail, Clock, PieChartIcon, Sparkles,
  Info, AlertTriangle, Star, RefreshCw
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const MOOD_COLORS = {
  excited: '#f59e0b',
  happy: '#10b981', 
  neutral: '#6b7280',
  sad: '#3b82f6',
  anxious: '#8b5cf6'
};

export default function ProFeatures() {
  const [activeTab, setActiveTab] = useState("historical");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState("30");

  // Get user's mood entries to check if they have data
  const { data: moodEntries = [] } = useQuery({
    queryKey: ["/api/mood-entries"],
  });

  const hasData = moodEntries.length > 0;
  const [birthDate, setBirthDate] = useState("");
  const { toast } = useToast();

  // Historical Report Query
  const historicalReportMutation = useMutation({
    mutationFn: async (data: { selectedActivities: string[], selectedMoods: string[], timeframe: string }) => {
      const response = await apiRequest("POST", "/api/ai/historical-report", data);
      return response;
    },
    onError: (error) => {
      toast({
        title: "Report Generation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Predictive Trends Query
  const predictiveTrendsMutation = useMutation({
    mutationFn: async (data: { birthDate?: string }) => 
      apiRequest("POST", "/api/ai/predictive-trends", data),
    onError: (error) => {
      toast({
        title: "Prediction Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // NLP Guidance Query
  const { data: nlpGuidance, isLoading: nlpLoading, refetch: refetchNLP } = useQuery({
    queryKey: ["/api/ai/nlp-guidance"],
    retry: false,
  });

  // Advanced Analytics Query
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ["/api/ai/advanced-analytics"],
    retry: false,
  });

  const handleHistoricalReport = () => {
    historicalReportMutation.mutate({
      selectedActivities,
      selectedMoods,
      timeframe: `${timeframe} days`
    });
  };

  const handlePredictiveTrends = () => {
    predictiveTrendsMutation.mutate({ birthDate: birthDate || undefined });
  };

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
        
        toast({
          title: "Data Exported",
          description: "Your mood data has been downloaded successfully."
        });
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="h-6 w-6 text-yellow-600" />
          <h2 className="text-2xl font-bold">Pro Advanced Features</h2>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Premium Analytics
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white dark:bg-gray-800 p-2 rounded-lg border shadow-sm">
          <TabsTrigger 
            value="historical" 
            className="bg-blue-100 text-blue-800 border-blue-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border-blue-500 hover:bg-blue-200 hover:text-blue-900 transition-all duration-200 font-medium px-4 py-2 rounded-md border"
          >
            Historical Reports
          </TabsTrigger>
          <TabsTrigger 
            value="predictive" 
            className="bg-purple-100 text-purple-800 border-purple-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border-purple-500 hover:bg-purple-200 hover:text-purple-900 transition-all duration-200 font-medium px-4 py-2 rounded-md border"
          >
            Predictive Trends
          </TabsTrigger>
          <TabsTrigger 
            value="nlp" 
            className="bg-green-100 text-green-800 border-green-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border-green-500 hover:bg-green-200 hover:text-green-900 transition-all duration-200 font-medium px-4 py-2 rounded-md border"
          >
            NLP Guidance
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="bg-orange-100 text-orange-800 border-orange-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border-orange-500 hover:bg-orange-200 hover:text-orange-900 transition-all duration-200 font-medium px-4 py-2 rounded-md border"
          >
            Advanced Analytics
          </TabsTrigger>
        </TabsList>

        {/* Historical Reports Tab */}
        <TabsContent value="historical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Full Historical Reports
              </CardTitle>
              <CardDescription>
                Generate comprehensive reports based on your mood and activity selections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Timeframe</Label>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="15">Last 15 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="45">Last 45 days</SelectItem>
                      <SelectItem value="60">Last 60 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                      <SelectItem value="120">Last 120 days</SelectItem>
                      <SelectItem value="180">Last 180 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Filter by Moods (Optional)</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['excited', 'happy', 'neutral', 'sad', 'anxious'].map(mood => (
                      <div key={mood} className="flex items-center space-x-2">
                        <Checkbox 
                          id={mood}
                          checked={selectedMoods.includes(mood)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMoods([...selectedMoods, mood]);
                            } else {
                              setSelectedMoods(selectedMoods.filter(m => m !== mood));
                            }
                          }}
                        />
                        <Label htmlFor={mood} className="capitalize">{mood}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Filter by Activities (Optional)</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['gym', 'yoga', 'meditation', 'sports', 'outdoors', 'other'].map(activity => (
                      <div key={activity} className="flex items-center space-x-2">
                        <Checkbox 
                          id={activity}
                          checked={selectedActivities.includes(activity)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedActivities([...selectedActivities, activity]);
                            } else {
                              setSelectedActivities(selectedActivities.filter(a => a !== activity));
                            }
                          }}
                        />
                        <Label htmlFor={activity} className="capitalize">{activity}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleHistoricalReport}
                disabled={historicalReportMutation.isPending}
                className="w-full"
              >
                {historicalReportMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-2" />
                )}
                Generate Historical Report
              </Button>

              {historicalReportMutation.data && (
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-3">Report Results ({(historicalReportMutation.data as any)?.timeframe || '7 days'})</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-sm text-blue-700 dark:text-blue-300">Activity Analysis</h5>
                        <div className="mt-2 space-y-2">
                          {((historicalReportMutation.data as any)?.activityAnalysis?.insights || []).map((insight: string, index: number) => (
                            <p key={index} className="text-sm text-gray-700 dark:text-gray-300">• {insight}</p>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-sm text-blue-700 dark:text-blue-300">Recommendations</h5>
                        <div className="mt-2 space-y-2">
                          {((historicalReportMutation.data as any)?.recommendations || []).map((rec: string, index: number) => (
                            <p key={index} className="text-sm text-gray-700 dark:text-gray-300">• {rec}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Predictive Trends Tab */}
        <TabsContent value="predictive" className="space-y-6">
          {!hasData ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Predictive Mood Trends
                </CardTitle>
                <CardDescription>
                  AI predictions based on your patterns, activities, and lunar cycles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Start tracking your moods to unlock predictive insights. Consistency helps change behavior and enables meaningful pattern analysis.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Predictive Mood Trends
                </CardTitle>
                <CardDescription>
                  AI predictions based on your patterns, activities, and lunar cycles. Consistency helps change behavior.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Better predictive mood trends can be shown if you continuously feed data for at least 40 days.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="birthDate">Birth Date (Optional - for enhanced personal insights)</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Providing your birth date enables additional guidance based on natural personal rhythms
                </p>
              </div>

              <Button 
                onClick={handlePredictiveTrends}
                disabled={predictiveTrendsMutation.isPending}
                className="w-full"
              >
                {predictiveTrendsMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TrendingUp className="h-4 w-4 mr-2" />
                )}
                Generate Predictive Analysis
              </Button>

              {predictiveTrendsMutation.data && (
                <div className="space-y-4">
                  <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3">Upcoming Mood Predictions</h4>
                      <div className="space-y-2">
                        {predictiveTrendsMutation.data.upcomingMoods.map((prediction: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded">
                            <span className="text-sm">{prediction.date}</span>
                            <span className="capitalize font-medium">{prediction.predictedMood}</span>
                            <Badge variant="outline">{Math.round(prediction.confidence * 100)}% confidence</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {predictiveTrendsMutation.data.numerologyInsights && (
                    <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
                      <CardContent className="pt-6">
                        <h4 className="font-semibold mb-3">Personal Energy Insights</h4>
                        <div className="space-y-2">
                          {predictiveTrendsMutation.data.numerologyInsights.map((insight: string, index: number) => (
                            <p key={index} className="text-sm text-gray-700 dark:text-gray-300">• {insight}</p>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {predictiveTrendsMutation.data.disclaimer}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {/* NLP Guidance Tab */}
        <TabsContent value="nlp" className="space-y-6">
          {!hasData ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  NLP-Driven Guidance
                </CardTitle>
                <CardDescription>
                  Advanced analysis of your journal entries combined with mood patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Start tracking your moods and adding journal entries to unlock AI-powered guidance. Consistency helps change behavior and provides better insights.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  NLP-Driven Guidance
                </CardTitle>
                <CardDescription>
                  Advanced analysis of your journal entries combined with mood patterns. Consistency helps change behavior.
                </CardDescription>
              </CardHeader>
              <CardContent>
              <Button 
                onClick={() => refetchNLP()}
                disabled={nlpLoading}
                className="mb-4"
              >
                {nlpLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4 mr-2" />
                )}
                Generate NLP Analysis
              </Button>

              {nlpGuidance && (
                <div className="space-y-4">
                  <Card className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3">Journal Themes</h4>
                      <div className="space-y-2">
                        {nlpGuidance.journalThemes.map((theme: string, index: number) => (
                          <p key={index} className="text-sm text-gray-700 dark:text-gray-300">• {theme}</p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3">Therapeutic Recommendations</h4>
                      <div className="space-y-2">
                        {nlpGuidance.therapeuticRecommendations.map((rec: string, index: number) => (
                          <p key={index} className="text-sm text-gray-700 dark:text-gray-300">• {rec}</p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3">Growth Areas</h4>
                      <div className="space-y-2">
                        {nlpGuidance.growthAreas.map((area: string, index: number) => (
                          <p key={index} className="text-sm text-gray-700 dark:text-gray-300">• {area}</p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {/* Advanced Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Advanced Analytics
              </CardTitle>
              <CardDescription>
                Comprehensive analytics with visual charts and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  40+ days of data provides more accurate analytics and deeper insights.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={() => refetchAnalytics()}
                disabled={analyticsLoading}
                className="mb-6"
              >
                {analyticsLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <PieChartIcon className="h-4 w-4 mr-2" />
                )}
                Generate Advanced Analytics
              </Button>

              {analytics && (
                <div className="space-y-6">
                  {/* Mood Distribution Pie Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Mood Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analytics.moodDistribution}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ mood, percentage }: any) => `${mood}: ${percentage}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="count"
                            >
                              {analytics.moodDistribution.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={MOOD_COLORS[entry.mood as keyof typeof MOOD_COLORS] || '#8884d8'} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Progress Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Progress Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{analytics.progressMetrics.totalEntries}</div>
                          <div className="text-sm text-muted-foreground">Total Entries</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{analytics.progressMetrics.daysTracked}</div>
                          <div className="text-sm text-muted-foreground">Days Tracked</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{analytics.progressMetrics.consistencyScore}%</div>
                          <div className="text-sm text-muted-foreground">Consistency</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600 capitalize">{analytics.progressMetrics.improvementTrend}</div>
                          <div className="text-sm text-muted-foreground">Trend</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Analytics Insights */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Key Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analytics.insights.map((insight: string, index: number) => (
                          <p key={index} className="text-sm text-gray-700 dark:text-gray-300">• {insight}</p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  );
}