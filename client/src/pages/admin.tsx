import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Users, Activity, MessageSquare, TrendingUp, Clock, Mail, User, Calendar, ShieldX, BarChart3, Crown, Settings, DollarSign, UserMinus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import Admin2FASettings from "@/components/admin-2fa-settings";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisWeek: number;
  totalMoodEntries: number;
  totalCommunityPosts: number;
  usersWithNotifications: number;
}

interface UserActivity {
  userId: number;
  username: string;
  name: string | null;
  email: string | null;
  age: number | null;
  gender: string | null;
  lastMoodEntry: Date | null;
  totalMoodEntries: number;
  totalCommunityPosts: number;
  joinedDate: Date | null;
  subscriptionTier: string;
  subscriptionStatus: string | null;
  subscriptionEndDate: Date | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  adminGrantedPro: boolean;
  adminGrantedBy: string | null;
  adminGrantedDate: Date | null;
  stripeSubscriptionType?: string;
  stripeActualStatus?: string;
  stripeCancelAtPeriodEnd?: boolean;
  stripeCurrentPeriodEnd?: Date | null;
}

interface RevenueMetrics {
  monthlyRevenue: MonthlyRevenueData[];
  totalRevenue: number;
  monthlyChurn: number;
  monthlyGrowth: number;
  activeSubscriptions: number;
  canceledSubscriptions: number;
  averageRevenuePerUser: number;
}

interface MonthlyRevenueData {
  month: string;
  revenue: number;
  newSubscriptions: number;
  churnedSubscriptions: number;
  netGrowth: number;
  essentialRevenue: number;
  proRevenue: number;
}

export default function Admin() {
  const [updatingUser, setUpdatingUser] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: activity, isLoading: activityLoading, error: activityError } = useQuery<UserActivity[]>({
    queryKey: ["/api/admin/activity"],
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { data: revenueMetrics, isLoading: revenueLoading, error: revenueError } = useQuery<RevenueMetrics>({
    queryKey: ["/api/admin/revenue-metrics"],
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Mutation for updating user subscription
  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ userId, tier }: { userId: number; tier: string }) => {
      return await apiRequest("POST", "/api/admin/update-subscription", { userId, tier });
    },
    onSuccess: (_, { userId, tier }) => {
      toast({
        title: "Subscription Updated",
        description: `User subscription changed to ${tier.toUpperCase()}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/revenue-metrics"] });
      setUpdatingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update subscription",
        variant: "destructive",
      });
      setUpdatingUser(null);
    },
  });

  const handleSubscriptionUpdate = (userId: number, newTier: string) => {
    setUpdatingUser(userId);
    updateSubscriptionMutation.mutate({ userId, tier: newTier });
  };

  // Check for authorization errors and session timeouts
  const isUnauthorized = statsError?.message?.includes('403') || activityError?.message?.includes('403') ||
                         statsError?.message?.includes('Admin access required') || activityError?.message?.includes('Admin access required') ||
                         statsError?.message?.includes('401') || activityError?.message?.includes('401') ||
                         statsError?.message?.includes('Authentication required') || activityError?.message?.includes('Authentication required');

  if (isUnauthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Card className="bg-slate-800/50 border-slate-700 max-w-md">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <ShieldX className="h-12 w-12 text-red-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Access Denied</h3>
                    <p className="text-slate-300">You don't have permission to access the admin dashboard.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (statsLoading || activityLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading admin dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  const getActivityBadge = (lastMoodEntry: Date | null) => {
    if (!lastMoodEntry) return <Badge variant="outline">Never</Badge>;
    
    const daysSince = Math.floor((new Date().getTime() - new Date(lastMoodEntry).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince === 0) return <Badge className="bg-green-600">Today</Badge>;
    if (daysSince <= 7) return <Badge className="bg-blue-600">{daysSince}d ago</Badge>;
    if (daysSince <= 30) return <Badge variant="secondary">{daysSince}d ago</Badge>;
    return <Badge variant="outline">{daysSince}d ago</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white pt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-slate-300">Manage users and monitor application statistics</p>
          </div>
          <Link href="/monitoring">
            <Button className="bg-purple-600 hover:bg-purple-700">
              <BarChart3 className="h-4 w-4 mr-2" />
              System Monitoring
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">Overview</TabsTrigger>
            <TabsTrigger value="subscriptions" className="data-[state=active]:bg-purple-600">Subscriptions</TabsTrigger>
            <TabsTrigger value="revenue" className="data-[state=active]:bg-purple-600">Revenue Analytics</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-purple-600">User Management</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Active Users</CardTitle>
                  <Activity className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.activeUsers || 0}</div>
                  <p className="text-xs text-slate-400">Last 30 days</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">New This Week</CardTitle>
                  <TrendingUp className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.newUsersThisWeek || 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Mood Entries</CardTitle>
                  <Activity className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.totalMoodEntries || 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Community Posts</CardTitle>
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.totalCommunityPosts || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Admin Security Settings */}
            <div className="mb-8">
              <Admin2FASettings />
            </div>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-6">
            {activityLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading subscription data...</div>
              </div>
            ) : activityError ? (
              <Alert className="bg-red-900/20 border-red-700">
                <AlertDescription className="text-red-200">
                  Failed to load subscription data. Please try again.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Subscription Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-slate-300">Pro Users</CardTitle>
                      <Crown className="h-4 w-4 text-yellow-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">
                        {activity?.filter(user => user.subscriptionTier === 'pro').length || 0}
                      </div>
                      <p className="text-xs text-slate-400">Active Pro subscriptions</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-slate-300">Admin Granted</CardTitle>
                      <Settings className="h-4 w-4 text-green-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">
                        {activity?.filter(user => user.adminGrantedPro).length || 0}
                      </div>
                      <p className="text-xs text-slate-400">Free Pro upgrades</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-slate-300">Paid Subscriptions</CardTitle>
                      <DollarSign className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">
                        {activity?.filter(user => user.subscriptionTier === 'pro' && user.stripeSubscriptionId && !user.adminGrantedPro).length || 0}
                      </div>
                      <p className="text-xs text-slate-400">Paying customers</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-slate-300">Yearly Subscriptions</CardTitle>
                      <Calendar className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">
                        {activity?.filter(user => user.stripeSubscriptionType === 'yearly').length || 0}
                      </div>
                      <p className="text-xs text-slate-400">Annual subscribers</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Subscription Details Table */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Crown className="h-5 w-5 mr-2 text-yellow-400" />
                      Subscription Management
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Detailed subscription information for all users
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700">
                            <TableHead className="text-slate-300">User</TableHead>
                            <TableHead className="text-slate-300">Subscription</TableHead>
                            <TableHead className="text-slate-300">Status</TableHead>
                            <TableHead className="text-slate-300">Type</TableHead>
                            <TableHead className="text-slate-300">End Date</TableHead>
                            <TableHead className="text-slate-300">Admin Grant</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activity?.map((user) => (
                            <TableRow key={user.userId} className="border-slate-700">
                              <TableCell className="text-white">
                                <div>
                                  <div className="font-medium">{user.name || user.username}</div>
                                  <div className="text-sm text-slate-400">{user.email}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  className={user.subscriptionTier === 'pro' ? "bg-yellow-600 text-yellow-100" : "bg-gray-600 text-gray-100"}
                                >
                                  {user.subscriptionTier.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={user.subscriptionStatus === 'active' ? "default" : "secondary"}
                                  className={user.subscriptionStatus === 'active' ? "bg-green-600" : ""}
                                >
                                  {user.subscriptionStatus || 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-300">
                                {user.adminGrantedPro ? (
                                  <span className="text-green-400 flex items-center">
                                    <Settings className="h-3 w-3 mr-1" />
                                    Admin Grant
                                  </span>
                                ) : user.stripeSubscriptionType === 'yearly' ? (
                                  <span className="text-purple-400 flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Yearly
                                  </span>
                                ) : user.stripeSubscriptionType === 'monthly' ? (
                                  <span className="text-blue-400 flex items-center">
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    Monthly
                                  </span>
                                ) : (
                                  <span className="text-gray-400">Free</span>
                                )}
                              </TableCell>
                              <TableCell className="text-slate-300">
                                {user.stripeCurrentPeriodEnd ? (
                                  <div className="text-sm">
                                    <div>{format(new Date(user.stripeCurrentPeriodEnd), 'MMM dd, yyyy')}</div>
                                    {user.stripeCancelAtPeriodEnd && (
                                      <div className="text-yellow-400 text-xs">Will not renew</div>
                                    )}
                                  </div>
                                ) : user.subscriptionEndDate ? (
                                  <span className="text-sm">
                                    {format(new Date(user.subscriptionEndDate), 'MMM dd, yyyy')}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">No end date</span>
                                )}
                              </TableCell>
                              <TableCell className="text-slate-300">
                                {user.adminGrantedPro && (
                                  <div className="text-sm">
                                    <div className="text-green-400">By: {user.adminGrantedBy || 'Unknown'}</div>
                                    {user.adminGrantedDate && (
                                      <div className="text-gray-400">
                                        {format(new Date(user.adminGrantedDate), 'MMM dd, yyyy')}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            {revenueLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading revenue analytics...</div>
              </div>
            ) : revenueError ? (
              <Alert className="bg-red-900/20 border-red-700">
                <AlertDescription className="text-red-200">
                  Failed to load revenue data. Please try again.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Revenue Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-slate-300">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-green-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">
                        ${(revenueMetrics?.totalRevenue || 0).toFixed(2)}
                      </div>
                      <p className="text-xs text-slate-400">All time</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-slate-300">Active Subscriptions</CardTitle>
                      <Users className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{revenueMetrics?.activeSubscriptions || 0}</div>
                      <p className="text-xs text-slate-400">Currently paying</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-slate-300">Monthly Churn</CardTitle>
                      <UserMinus className="h-4 w-4 text-red-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">
                        {(revenueMetrics?.monthlyChurn || 0).toFixed(1)}%
                      </div>
                      <p className="text-xs text-slate-400">Subscription cancellations</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-slate-300">Monthly Growth</CardTitle>
                      {(revenueMetrics?.monthlyGrowth || 0) >= 0 ? (
                        <ArrowUpRight className="h-4 w-4 text-green-400" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-400" />
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">
                        {(revenueMetrics?.monthlyGrowth || 0) >= 0 ? '+' : ''}
                        {(revenueMetrics?.monthlyGrowth || 0).toFixed(1)}%
                      </div>
                      <p className="text-xs text-slate-400">Subscription growth</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Monthly Revenue Chart */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Monthly Revenue Trend</CardTitle>
                    <CardDescription className="text-slate-300">
                      Track revenue performance over the last 12 months
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={revenueMetrics?.monthlyRevenue || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="month" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '6px',
                            color: '#F9FAFB'
                          }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Subscription Growth Chart */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Subscription Growth Analysis</CardTitle>
                    <CardDescription className="text-slate-300">
                      New subscriptions vs churned subscriptions by month
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={revenueMetrics?.monthlyRevenue || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="month" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '6px',
                            color: '#F9FAFB'
                          }} 
                        />
                        <Bar dataKey="newSubscriptions" fill="#3B82F6" name="New Subscriptions" />
                        <Bar dataKey="churnedSubscriptions" fill="#EF4444" name="Churned Subscriptions" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* Most Active Users */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Crown className="h-5 w-5 mr-2 text-yellow-500" />
                  Most Active Users
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Top users by engagement and activity levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activity
                    ?.filter(user => user.totalMoodEntries > 0 || user.totalCommunityPosts > 0)
                    .sort((a, b) => {
                      const scoreA = (a.totalMoodEntries * 2) + (a.totalCommunityPosts * 3);
                      const scoreB = (b.totalMoodEntries * 2) + (b.totalCommunityPosts * 3);
                      return scoreB - scoreA;
                    })
                    .slice(0, 6)
                    .map((user, index) => {
                      const engagementScore = (user.totalMoodEntries * 2) + (user.totalCommunityPosts * 3);
                      const daysSinceLastActivity = user.lastMoodEntry 
                        ? Math.floor((new Date().getTime() - new Date(user.lastMoodEntry).getTime()) / (1000 * 60 * 60 * 24))
                        : null;
                      
                      return (
                        <div key={user.userId} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              {index === 0 && <Crown className="h-4 w-4 text-yellow-500" />}
                              {index === 1 && <Crown className="h-4 w-4 text-gray-400" />}
                              {index === 2 && <Crown className="h-4 w-4 text-amber-600" />}
                              <span className="font-medium text-white">{user.username}</span>
                            </div>
                            <Badge 
                              className={
                                user.subscriptionTier === 'pro' 
                                  ? "bg-purple-600 text-white" 
                                  : "bg-slate-600 text-slate-200"
                              }
                            >
                              {user.subscriptionTier === 'pro' ? 'PRO' : 'FREE'}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="text-sm text-slate-300">
                              <span className="font-medium">{user.name || 'No name'}</span>
                            </div>
                            
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400">Mood Entries:</span>
                              <span className="text-white font-medium">{user.totalMoodEntries}</span>
                            </div>
                            
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400">Community Posts:</span>
                              <span className="text-white font-medium">{user.totalCommunityPosts}</span>
                            </div>
                            
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400">Engagement Score:</span>
                              <span className="text-yellow-400 font-medium">{engagementScore}</span>
                            </div>
                            
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400">Last Active:</span>
                              <span className="text-slate-300">
                                {daysSinceLastActivity === null 
                                  ? 'Never' 
                                  : daysSinceLastActivity === 0 
                                    ? 'Today' 
                                    : `${daysSinceLastActivity}d ago`
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
                
                {(!activity || activity.filter(u => u.totalMoodEntries > 0 || u.totalCommunityPosts > 0).length === 0) && (
                  <div className="text-center py-8 text-slate-400">
                    No active users found. Users will appear here once they start logging moods or creating posts.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User Activity Table */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">User Management</CardTitle>
                <CardDescription className="text-slate-300">
                  View user demographics, activity, and engagement metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-300">Username</TableHead>
                        <TableHead className="text-slate-300">Full Name</TableHead>
                        <TableHead className="text-slate-300">Email</TableHead>
                        <TableHead className="text-slate-300">Subscription</TableHead>
                        <TableHead className="text-slate-300">Age</TableHead>
                        <TableHead className="text-slate-300">Gender</TableHead>
                        <TableHead className="text-slate-300">Last Activity</TableHead>
                        <TableHead className="text-slate-300">Mood Entries</TableHead>
                        <TableHead className="text-slate-300">Posts</TableHead>
                        <TableHead className="text-slate-300">Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activity?.map((user) => (
                        <TableRow key={user.userId} className="border-slate-700">
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-slate-400" />
                              <div className="font-medium text-white">{user.username}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-slate-300">
                              {user.name || <span className="text-slate-500 italic">Not provided</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.email ? (
                              <div className="flex items-center space-x-1">
                                <Mail className="h-3 w-3 text-slate-400" />
                                <span className="text-sm text-slate-300">{user.email}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">Not provided</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Select
                                value={user.subscriptionTier}
                                onValueChange={(value) => handleSubscriptionUpdate(user.userId, value)}
                                disabled={updatingUser === user.userId}
                              >
                                <SelectTrigger className="w-24 h-8 bg-slate-700 border-slate-600 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">
                                    <div className="flex items-center space-x-1">
                                      <span>Free</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="pro">
                                    <div className="flex items-center space-x-1">
                                      <Crown className="h-3 w-3 text-yellow-500" />
                                      <span>Pro</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              {updatingUser === user.userId && (
                                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-slate-300">
                              {user.age ? user.age : <span className="text-slate-500 italic">Not provided</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-slate-300 capitalize">
                              {user.gender ? user.gender : <span className="text-slate-500 italic">Not provided</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getActivityBadge(user.lastMoodEntry)}
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="text-white font-medium">{user.totalMoodEntries}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="text-white font-medium">{user.totalCommunityPosts}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.joinedDate ? (
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                <span className="text-sm text-slate-300">
                                  {format(new Date(user.joinedDate), "MMM d, yyyy")}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">Unknown</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}