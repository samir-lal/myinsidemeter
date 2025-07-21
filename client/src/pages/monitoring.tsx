import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Activity, Users, TrendingUp, Clock, Database, Cpu, MemoryStick, Timer } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";

// Type definitions for API responses
interface SystemMetrics {
  totalUsers: number;
  activeUsersToday: number;
  activeUsersThisWeek: number;
  activeUsersThisMonth: number;
  totalMoodEntries: number;
  moodEntriesToday: number;
  moodEntriesThisWeek: number;
  moodEntriesThisMonth: number;
  totalJournalEntries: number;
  totalCommunityPosts: number;
  avgMoodEntriesPerUser: number;
  userRetentionRate: number;
  topMoodTypes: Array<{ mood: string; count: number; percentage: number }>;
  userGrowthData: Array<{ date: string; newUsers: number; totalUsers: number }>;
  engagementMetrics: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    avgSessionTime: number;
  };
}

interface PerformanceMetrics {
  apiResponseTimes: Array<{ endpoint: string; avgResponseTime: number; requestCount: number }>;
  errorRates: Array<{ endpoint: string; errorCount: number; totalRequests: number; errorRate: number }>;
  systemHealth: {
    databaseConnections: number;
    memoryUsage: number;
    cpuUsage: number;
    uptime: number;
  };
}

interface EngagementData {
  userId: number;
  username: string;
  lastActive: Date | null;
  moodEntriesCount: number;
  journalEntriesCount: number;
  communityPostsCount: number;
  accountAge: number;
  engagementScore: number;
}

interface BusinessMetrics {
  conversionRate: number;
  guestToUserConversion: number;
  averageTimeToConversion: number;
  churnRate: number;
  retentionByWeek: Array<{ week: number; retentionRate: number }>;
  featureUsage: {
    moodTracking: number;
    journaling: number;
    community: number;
    charts: number;
  };
}

const COLORS = ['#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#3B82F6'];

export default function Monitoring() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      setLocation('/');
    }
  }, [user, authLoading, setLocation]);

  const { data: systemMetrics, isLoading: systemLoading } = useQuery<SystemMetrics>({
    queryKey: ['/api/admin/monitoring/system'],
    enabled: !!user && user.role === 'admin'
  });

  const { data: performanceMetrics, isLoading: performanceLoading } = useQuery<PerformanceMetrics>({
    queryKey: ['/api/admin/monitoring/performance'],
    enabled: !!user && user.role === 'admin'
  });

  const { data: engagementData, isLoading: engagementLoading } = useQuery<EngagementData[]>({
    queryKey: ['/api/admin/monitoring/engagement'],
    enabled: !!user && user.role === 'admin'
  });

  const { data: businessMetrics, isLoading: businessLoading } = useQuery<BusinessMetrics>({
    queryKey: ['/api/admin/monitoring/business'],
    enabled: !!user && user.role === 'admin'
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900 dark:to-pink-900">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              System Monitoring
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Real-time insights into usage, performance, and business metrics
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            Admin Only
          </Badge>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="engagement">User Engagement</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="business">Business Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* System Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(systemMetrics as any)?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {(systemMetrics as any)?.activeUsersThisMonth || 0} active this month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
                  <Activity className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemMetrics?.activeUsersToday || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {systemMetrics?.activeUsersThisWeek || 0} weekly active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Mood Entries</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemMetrics?.totalMoodEntries || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {systemMetrics?.moodEntriesToday || 0} today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
                  <Clock className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemMetrics?.userRetentionRate || 0}%</div>
                  <p className="text-xs text-muted-foreground">
                    Monthly retention
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* User Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>User Growth (Last 30 Days)</CardTitle>
                <CardDescription>New registrations and total user count over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={systemMetrics?.userGrowthData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="totalUsers" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="newUsers" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Mood Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Mood Distribution</CardTitle>
                  <CardDescription>Most common moods logged by users</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={systemMetrics?.topMoodTypes || []}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label={({ mood, percentage }) => `${mood} (${percentage}%)`}
                      >
                        {(systemMetrics?.topMoodTypes || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Current server performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MemoryStick className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Memory Usage</span>
                    </div>
                    <span className="text-sm font-medium">{performanceMetrics?.systemHealth?.memoryUsage || 0} MB</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4 text-green-500" />
                      <span className="text-sm">DB Connections</span>
                    </div>
                    <span className="text-sm font-medium">{performanceMetrics?.systemHealth?.databaseConnections || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Timer className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">Uptime</span>
                    </div>
                    <span className="text-sm font-medium">
                      {formatUptime(performanceMetrics?.systemHealth?.uptime || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Engagement Overview</CardTitle>
                <CardDescription>Detailed breakdown of user activity and engagement scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {engagementLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Username</th>
                            <th className="text-left p-2">Account Age</th>
                            <th className="text-left p-2">Mood Entries</th>
                            <th className="text-left p-2">Journal Entries</th>
                            <th className="text-left p-2">Community Posts</th>
                            <th className="text-left p-2">Engagement Score</th>
                            <th className="text-left p-2">Last Active</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(engagementData || []).map((user: any) => (
                            <tr key={user.userId} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                              <td className="p-2 font-medium">{user.username}</td>
                              <td className="p-2">{user.accountAge} days</td>
                              <td className="p-2">{user.moodEntriesCount}</td>
                              <td className="p-2">{user.journalEntriesCount}</td>
                              <td className="p-2">{user.communityPostsCount}</td>
                              <td className="p-2">
                                <Badge variant={user.engagementScore > 20 ? "default" : user.engagementScore > 10 ? "secondary" : "outline"}>
                                  {user.engagementScore}
                                </Badge>
                              </td>
                              <td className="p-2 text-sm text-muted-foreground">
                                {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Resources</CardTitle>
                  <CardDescription>Current server resource utilization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Memory Usage</span>
                      <span>{performanceMetrics?.systemHealth?.memoryUsage || 0} MB</span>
                    </div>
                    <Progress value={Math.min((performanceMetrics?.systemHealth?.memoryUsage || 0) / 10, 100)} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Database Connections</span>
                      <span>{performanceMetrics?.systemHealth?.databaseConnections || 0}</span>
                    </div>
                    <Progress value={(performanceMetrics?.systemHealth?.databaseConnections || 0) * 10} />
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Server uptime: {formatUptime(performanceMetrics?.systemHealth?.uptime || 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>API Performance</CardTitle>
                  <CardDescription>Response times and error rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      API monitoring will be available when request logging is implemented
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="business" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">User Conversion Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{businessMetrics?.conversionRate || 0}%</div>
                  <p className="text-xs text-muted-foreground">
                    Users who logged moods
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Feature Adoption</CardTitle>
                  <Activity className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Mood Tracking</span>
                      <span>{businessMetrics?.featureUsage?.moodTracking || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Journaling</span>
                      <span>{businessMetrics?.featureUsage?.journaling || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Community</span>
                      <span>{businessMetrics?.featureUsage?.community || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Weekly Retention</CardTitle>
                  <Clock className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={60}>
                    <BarChart data={businessMetrics?.retentionByWeek || []}>
                      <Bar dataKey="retentionRate" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Retention Breakdown</CardTitle>
                <CardDescription>User retention rates over the past 4 weeks</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={businessMetrics?.retentionByWeek || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}%`, 'Retention Rate']} />
                    <Line type="monotone" dataKey="retentionRate" stroke="#8B5CF6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}