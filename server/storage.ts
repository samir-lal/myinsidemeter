import { 
  users, 
  moodEntries, 
  moonPhases, 
  communityPosts,
  dailyJournals,
  type User, 
  type InsertUser, 
  type MoodEntry, 
  type InsertMoodEntry,
  type MoonPhase,
  type InsertMoonPhase,
  type CommunityPost,
  type InsertCommunityPost,
  type DailyJournal,
  type InsertDailyJournal
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, lt, gt, desc, count, countDistinct, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  createUser(user: InsertUser): Promise<User>;
  createUserFromGoogle(googleData: { googleId: string; email: string; name: string; profileImageUrl?: string }): Promise<User>;
  updateUserGoogleInfo(id: number, googleData: { googleId: string; profileImageUrl?: string }): Promise<User>;
  
  // Mood entry operations
  createMoodEntry(entry: InsertMoodEntry & { userId: number, moonPhase?: string, moonIllumination?: number }): Promise<MoodEntry>;
  getMoodEntriesByUser(userId: number, limit?: number): Promise<MoodEntry[]>;
  getMoodEntriesByDateRange(userId: number, startDate: Date, endDate: Date): Promise<MoodEntry[]>;
  getMoodEntryById(id: number): Promise<MoodEntry | undefined>;
  updateMoodEntry(id: number, entry: Partial<InsertMoodEntry & { moonPhase?: string, moonIllumination?: number }>): Promise<MoodEntry>;
  deleteMoodEntry(id: number): Promise<void>;
  
  // Moon phase operations
  getMoonPhaseByDate(date: Date): Promise<MoonPhase | undefined>;
  createMoonPhase(moonPhase: InsertMoonPhase): Promise<MoonPhase>;
  upsertMoonPhase(moonPhase: InsertMoonPhase): Promise<MoonPhase>;
  deleteMoonPhaseByDate(date: Date): Promise<void>;
  
  // Community operations
  getCommunityPosts(limit?: number): Promise<(CommunityPost & { username: string })[]>;
  createCommunityPost(post: InsertCommunityPost & { userId: number }): Promise<CommunityPost>;
  likeCommunityPost(postId: number): Promise<void>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersThisWeek: number;
    totalMoodEntries: number;
    totalCommunityPosts: number;
    usersWithNotifications: number;
  }>;
  getUserActivity(): Promise<Array<{
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
  }>>;
  
  getRevenueMetrics(): Promise<{
    monthlyRevenue: Array<{
      month: string;
      revenue: number;
      newSubscriptions: number;
      churnedSubscriptions: number;
      netGrowth: number;
      essentialRevenue: number;
      proRevenue: number;
    }>;
    totalRevenue: number;
    monthlyChurn: number;
    monthlyGrowth: number;
    activeSubscriptions: number;
    canceledSubscriptions: number;
    averageRevenuePerUser: number;
  }>;
  
  // Guest to user conversion
  transferGuestEntries(guestId: string, newUserId: number): Promise<void>;
  
  // Notification operations
  getUsersWithNotifications(): Promise<User[]>;
  getUsersWithEmailNotifications(): Promise<User[]>;
  getUsersWithSmsNotifications(): Promise<User[]>;
  updateNotificationPreference(userId: number, enabled: boolean): Promise<void>;
  updateUserNotificationSettings(userId: number, settings: {
    emailNotificationsEnabled?: boolean;
    notificationEmail?: string | null;
  }): Promise<void>;
  updateUserSmsSettings(userId: number, settings: {
    smsNotificationsEnabled?: boolean;
    notificationPhone?: string | null;
    phoneVerified?: boolean;
    phoneVerificationCode?: string | null;
    phoneVerificationExpiry?: Date | null;
  }): Promise<void>;
  updateUserPhoneVerification(userId: number, settings: {
    phoneVerificationCode?: string | null;
    phoneVerificationExpiry?: Date | null;
  }): Promise<void>;
  
  // Password operations
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createPasswordResetToken(userId: number, token: string, expiry: Date): Promise<void>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearPasswordResetToken(userId: number): Promise<void>;
  
  // 2FA operations
  update2FASettings(userId: number, settings: {
    twoFactorSecret?: string | null;
    twoFactorEnabled?: boolean;
    twoFactorBackupCodes?: string[] | null;
  }): Promise<void>;
  
  // Daily journal operations
  getDailyJournal(userId: number, date: string): Promise<DailyJournal | undefined>;
  getAllDailyJournals(userId: number): Promise<DailyJournal[]>;
  createOrUpdateDailyJournal(userId: number, date: string, content: string): Promise<DailyJournal>;
  
  // Subscription operations
  updateUserSubscription(userId: number, data: {
    subscriptionTier?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
    trialEndDate?: Date;
  }): Promise<User>;
  getUserSubscriptionDetails(userId: number): Promise<{
    subscriptionTier: string | null;
    subscriptionStatus: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    subscriptionEndDate: Date | null;
    trialEndDate: Date | null;
  } | undefined>;
  
  // Monitoring and analytics operations
  getSystemMetrics(): Promise<{
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
  }>;
  
  getPerformanceMetrics(): Promise<{
    apiResponseTimes: Array<{ endpoint: string; avgResponseTime: number; requestCount: number }>;
    errorRates: Array<{ endpoint: string; errorCount: number; totalRequests: number; errorRate: number }>;
    systemHealth: {
      databaseConnections: number;
      memoryUsage: number;
      cpuUsage: number;
      uptime: number;
    };
  }>;
  
  getUserEngagementData(): Promise<Array<{
    userId: number;
    username: string;
    lastActive: Date | null;
    moodEntriesCount: number;
    journalEntriesCount: number;
    communityPostsCount: number;
    accountAge: number;
    engagementScore: number;
  }>>;
  
  getBusinessMetrics(): Promise<{
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
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${username})`);
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${email})`);
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async createUserFromGoogle(googleData: { googleId: string; email: string; name: string; profileImageUrl?: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        username: googleData.email.split('@')[0] + '_google_' + Date.now(),
        email: googleData.email,
        name: googleData.name,
        googleId: googleData.googleId,
        profileImageUrl: googleData.profileImageUrl,
        password: null, // No password for OAuth users
        role: 'user'
      })
      .returning();
    return user;
  }

  async updateUserGoogleInfo(id: number, googleData: { googleId: string; profileImageUrl?: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        googleId: googleData.googleId,
        profileImageUrl: googleData.profileImageUrl
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }



  async createMoodEntry(entry: InsertMoodEntry & { userId: number, moonPhase?: string, moonIllumination?: number }): Promise<MoodEntry> {
    const [moodEntry] = await db
      .insert(moodEntries)
      .values({
        userId: entry.userId,
        mood: entry.mood,
        subMood: entry.subMood || null,
        intensity: entry.intensity,
        notes: entry.notes || null,
        activities: entry.activities || null,
        date: entry.date,
        moonPhase: entry.moonPhase || null,
        moonIllumination: entry.moonIllumination || null
      })
      .returning();
    return moodEntry;
  }

  async getMoodEntriesByUser(userId: number, limit = 50): Promise<MoodEntry[]> {
    const entries = await db
      .select()
      .from(moodEntries)
      .where(eq(moodEntries.userId, userId))
      .orderBy(desc(moodEntries.date))
      .limit(limit);
    return entries;
  }

  async getMoodEntriesByDateRange(userId: number, startDate: Date, endDate: Date): Promise<MoodEntry[]> {
    const entries = await db
      .select()
      .from(moodEntries)
      .where(
        and(
          eq(moodEntries.userId, userId),
          gte(moodEntries.date, startDate),
          lte(moodEntries.date, endDate)
        )
      )
      .orderBy(moodEntries.date);
    return entries;
  }

  async getMoodEntryById(id: number): Promise<MoodEntry | undefined> {
    const [entry] = await db
      .select()
      .from(moodEntries)
      .where(eq(moodEntries.id, id));
    return entry || undefined;
  }

  async updateMoodEntry(id: number, entry: Partial<InsertMoodEntry & { moonPhase?: string, moonIllumination?: number }>): Promise<MoodEntry> {
    const [updatedEntry] = await db
      .update(moodEntries)
      .set({
        mood: entry.mood,
        subMood: entry.subMood,
        intensity: entry.intensity,
        notes: entry.notes,
        activities: entry.activities,
        date: entry.date,
        moonPhase: entry.moonPhase,
        moonIllumination: entry.moonIllumination
      })
      .where(eq(moodEntries.id, id))
      .returning();
    return updatedEntry;
  }

  async deleteMoodEntry(id: number): Promise<void> {
    await db
      .delete(moodEntries)
      .where(eq(moodEntries.id, id));
  }

  async getMoonPhaseByDate(date: Date): Promise<MoonPhase | undefined> {
    const dateString = date.toISOString().split('T')[0];
    const startOfDay = new Date(dateString + 'T00:00:00.000Z');
    const endOfDay = new Date(dateString + 'T23:59:59.999Z');
    
    const [moonPhase] = await db
      .select()
      .from(moonPhases)
      .where(
        and(
          gte(moonPhases.date, startOfDay),
          lte(moonPhases.date, endOfDay)
        )
      )
      .limit(1);
    return moonPhase || undefined;
  }

  async createMoonPhase(moonPhase: InsertMoonPhase): Promise<MoonPhase> {
    const [phase] = await db
      .insert(moonPhases)
      .values(moonPhase)
      .returning();
    return phase;
  }

  async upsertMoonPhase(moonPhase: InsertMoonPhase): Promise<MoonPhase> {
    const [phase] = await db
      .insert(moonPhases)
      .values(moonPhase)
      .onConflictDoUpdate({
        target: moonPhases.date,
        set: {
          phase: moonPhase.phase,
          illumination: moonPhase.illumination,
          name: moonPhase.name
        }
      })
      .returning();
    return phase;
  }

  async deleteMoonPhaseByDate(date: Date): Promise<void> {
    const dateString = date.toISOString().split('T')[0];
    const startOfDay = new Date(dateString + 'T00:00:00.000Z');
    const endOfDay = new Date(dateString + 'T23:59:59.999Z');
    
    await db
      .delete(moonPhases)
      .where(
        and(
          gte(moonPhases.date, startOfDay),
          lte(moonPhases.date, endOfDay)
        )
      );
  }

  async getCommunityPosts(limit = 10): Promise<(CommunityPost & { username: string })[]> {
    const posts = await db
      .select({
        id: communityPosts.id,
        userId: communityPosts.userId,
        content: communityPosts.content,
        likes: communityPosts.likes,
        comments: communityPosts.comments,
        createdAt: communityPosts.createdAt,
        username: users.username
      })
      .from(communityPosts)
      .leftJoin(users, eq(communityPosts.userId, users.id))
      .orderBy(desc(communityPosts.createdAt))
      .limit(limit);
    
    return posts.map(post => ({
      ...post,
      username: post.username || 'Unknown User'
    }));
  }

  async createCommunityPost(post: InsertCommunityPost & { userId: number }): Promise<CommunityPost> {
    const [communityPost] = await db
      .insert(communityPosts)
      .values({
        userId: post.userId,
        content: post.content,
        likes: 0,
        comments: 0,
        createdAt: new Date()
      })
      .returning();
    return communityPost;
  }

  async likeCommunityPost(postId: number): Promise<void> {
    // First get the current likes count
    const [post] = await db
      .select({ likes: communityPosts.likes })
      .from(communityPosts)
      .where(eq(communityPosts.id, postId));
    
    if (post) {
      await db
        .update(communityPosts)
        .set({ likes: (post.likes || 0) + 1 })
        .where(eq(communityPosts.id, postId));
    }
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.id);
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersThisWeek: number;
    totalMoodEntries: number;
    totalCommunityPosts: number;
    usersWithNotifications: number;
  }> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    // Count total users
    const totalUsersResult = await db
      .select({ count: count() })
      .from(users);
    const totalUsers = Number(totalUsersResult[0]?.count || 0);

    // Count users active in last 30 days (unique users with mood entries in last month)
    const activeUsersResult = await db
      .select({ count: countDistinct(moodEntries.userId) })
      .from(moodEntries)
      .where(gte(moodEntries.date, oneMonthAgo));
    const activeUsers = Number(activeUsersResult[0]?.count || 0);

    // Count new users this week
    const newUsersResult = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, oneWeekAgo));
    const newUsersThisWeek = Number(newUsersResult[0]?.count || 0);

    // Count total mood entries
    const totalMoodEntriesResult = await db
      .select({ count: count() })
      .from(moodEntries);
    const totalMoodEntries = Number(totalMoodEntriesResult[0]?.count || 0);

    // Count total community posts
    const totalCommunityPostsResult = await db
      .select({ count: count() })
      .from(communityPosts);
    const totalCommunityPosts = Number(totalCommunityPostsResult[0]?.count || 0);

    // Count users with notifications enabled
    const usersWithNotificationsResult = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.notificationsEnabled, true));
    const usersWithNotifications = Number(usersWithNotificationsResult[0]?.count || 0);

    return {
      totalUsers,
      activeUsers,
      newUsersThisWeek,
      totalMoodEntries,
      totalCommunityPosts,
      usersWithNotifications
    };
  }

  async getUserActivity(): Promise<Array<{
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
  }>> {
    const allUsers = await db.select().from(users);
    
    const userActivity = [];
    for (const user of allUsers) {
      // Get last mood entry
      const lastMoodResult = await db
        .select({ date: moodEntries.date })
        .from(moodEntries)
        .where(eq(moodEntries.userId, user.id))
        .orderBy(desc(moodEntries.date))
        .limit(1);
      
      // Count mood entries
      const moodCountResult = await db
        .select({ count: count() })
        .from(moodEntries)
        .where(eq(moodEntries.userId, user.id));
      
      // Count community posts
      const postCountResult = await db
        .select({ count: count() })
        .from(communityPosts)
        .where(eq(communityPosts.userId, user.id));
      
      userActivity.push({
        userId: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        lastMoodEntry: lastMoodResult[0]?.date || null,
        totalMoodEntries: Number(moodCountResult[0]?.count || 0),
        totalCommunityPosts: Number(postCountResult[0]?.count || 0),
        joinedDate: user.createdAt,
        subscriptionTier: user.subscriptionTier || 'free',
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate,
        stripeSubscriptionId: user.stripeSubscriptionId,
        stripeCustomerId: user.stripeCustomerId,
        adminGrantedPro: user.adminGrantedPro || false,
        adminGrantedBy: user.adminGrantedBy,
        adminGrantedDate: user.adminGrantedDate
      });
    }
    
    return userActivity.sort((a, b) => {
      if (!a.lastMoodEntry) return 1;
      if (!b.lastMoodEntry) return -1;
      return new Date(b.lastMoodEntry).getTime() - new Date(a.lastMoodEntry).getTime();
    });
  }

  async transferGuestEntries(guestId: string, newUserId: number): Promise<void> {
    // Convert guest ID to negative user ID for database query
    const guestUserId = -Math.abs(guestId.split('').reduce((a, b) => a + b.charCodeAt(0), 0));
    
    // Update all mood entries from guest user to new user
    await db
      .update(moodEntries)
      .set({ userId: newUserId })
      .where(eq(moodEntries.userId, guestUserId));
    
    // Update any community posts from guest user to new user
    await db
      .update(communityPosts)
      .set({ userId: newUserId })
      .where(eq(communityPosts.userId, guestUserId));
  }

  async getUsersWithNotifications(): Promise<User[]> {
    return await db.select()
      .from(users)
      .where(eq(users.notificationsEnabled, true));
  }

  async getUsersWithEmailNotifications(): Promise<User[]> {
    return await db.select()
      .from(users)
      .where(eq(users.emailNotificationsEnabled, true));
  }

  async getUsersWithSmsNotifications(): Promise<User[]> {
    return await db.select()
      .from(users)
      .where(eq(users.smsNotificationsEnabled, true));
  }

  async updateNotificationPreference(userId: number, enabled: boolean): Promise<void> {
    await db.update(users)
      .set({ notificationsEnabled: enabled })
      .where(eq(users.id, userId));
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  async createPasswordResetToken(userId: number, token: string, expiry: Date): Promise<void> {
    await db.update(users)
      .set({ 
        resetToken: token,
        resetTokenExpiry: expiry
      })
      .where(eq(users.id, userId));
  }

  async createLoginToken(userId: number, token: string, expiry: Date): Promise<void> {
    await db.update(users)
      .set({ 
        resetToken: token,
        resetTokenExpiry: expiry
      })
      .where(eq(users.id, userId));
  }

  async validateLoginToken(token: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.resetToken, token),
          gt(users.resetTokenExpiry, new Date())
        )
      );

    if (!user) {
      return null;
    }

    // Clear the token after use
    await db
      .update(users)
      .set({ 
        resetToken: null,
        resetTokenExpiry: null
      })
      .where(eq(users.id, user.id));

    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users)
      .where(eq(users.resetToken, token));
    return user || undefined;
  }

  async clearPasswordResetToken(userId: number): Promise<void> {
    await db.update(users)
      .set({ 
        resetToken: null,
        resetTokenExpiry: null
      })
      .where(eq(users.id, userId));
  }

  async getDailyJournal(userId: number, date: string): Promise<DailyJournal | undefined> {
    const [journal] = await db
      .select()
      .from(dailyJournals)
      .where(and(eq(dailyJournals.userId, userId), eq(dailyJournals.date, date)));
    return journal;
  }

  async getAllDailyJournals(userId: number): Promise<DailyJournal[]> {
    const journals = await db
      .select()
      .from(dailyJournals)
      .where(eq(dailyJournals.userId, userId))
      .orderBy(dailyJournals.date);
    return journals;
  }

  async createOrUpdateDailyJournal(userId: number, date: string, content: string): Promise<DailyJournal> {
    const existing = await this.getDailyJournal(userId, date);
    
    if (existing) {
      const [updated] = await db
        .update(dailyJournals)
        .set({ content, updatedAt: new Date() })
        .where(and(eq(dailyJournals.userId, userId), eq(dailyJournals.date, date)))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(dailyJournals)
        .values({ userId, date, content })
        .returning();
      return created;
    }
  }

  async getSystemMetrics(): Promise<{
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
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total users
    const totalUsersResult = await db.select({ count: sql<number>`count(*)` }).from(users);
    const totalUsers = totalUsersResult[0].count;

    // Active users (users who logged moods)
    const activeUsersToday = await db
      .select({ count: sql<number>`count(distinct user_id)` })
      .from(moodEntries)
      .where(gte(moodEntries.date, today));

    const activeUsersThisWeek = await db
      .select({ count: sql<number>`count(distinct user_id)` })
      .from(moodEntries)
      .where(gte(moodEntries.date, weekAgo));

    const activeUsersThisMonth = await db
      .select({ count: sql<number>`count(distinct user_id)` })
      .from(moodEntries)
      .where(gte(moodEntries.date, monthAgo));

    // Mood entries
    const totalMoodEntriesResult = await db.select({ count: sql<number>`count(*)` }).from(moodEntries);
    const totalMoodEntries = totalMoodEntriesResult[0].count;

    const moodEntriesToday = await db
      .select({ count: sql<number>`count(*)` })
      .from(moodEntries)
      .where(gte(moodEntries.date, today));

    const moodEntriesThisWeek = await db
      .select({ count: sql<number>`count(*)` })
      .from(moodEntries)
      .where(gte(moodEntries.date, weekAgo));

    const moodEntriesThisMonth = await db
      .select({ count: sql<number>`count(*)` })
      .from(moodEntries)
      .where(gte(moodEntries.date, monthAgo));

    // Journal and community posts
    const totalJournalEntriesResult = await db.select({ count: sql<number>`count(*)` }).from(dailyJournals);
    const totalJournalEntries = totalJournalEntriesResult[0].count;

    const totalCommunityPostsResult = await db.select({ count: sql<number>`count(*)` }).from(communityPosts);
    const totalCommunityPosts = totalCommunityPostsResult[0].count;

    // Average mood entries per user
    const avgMoodEntriesPerUser = totalUsers > 0 ? Math.round((totalMoodEntries / totalUsers) * 100) / 100 : 0;

    // User retention rate (users active this month / total users)
    const userRetentionRate = totalUsers > 0 ? Math.round((activeUsersThisMonth[0].count / totalUsers) * 100) : 0;

    // Top mood types
    const topMoodTypesResult = await db
      .select({
        mood: moodEntries.mood,
        count: sql<number>`count(*)`
      })
      .from(moodEntries)
      .groupBy(moodEntries.mood)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    const topMoodTypes = topMoodTypesResult.map(item => ({
      mood: item.mood,
      count: item.count,
      percentage: totalMoodEntries > 0 ? Math.round((item.count / totalMoodEntries) * 100) : 0
    }));

    // User growth data (last 30 days)
    const userGrowthData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      const newUsersResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(gte(users.createdAt, startOfDay), lt(users.createdAt, endOfDay)));
      
      const totalUsersUpToDateResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(lte(users.createdAt, endOfDay));
      
      userGrowthData.push({
        date: dateStr,
        newUsers: newUsersResult[0].count,
        totalUsers: totalUsersUpToDateResult[0].count
      });
    }

    return {
      totalUsers,
      activeUsersToday: activeUsersToday[0].count,
      activeUsersThisWeek: activeUsersThisWeek[0].count,
      activeUsersThisMonth: activeUsersThisMonth[0].count,
      totalMoodEntries,
      moodEntriesToday: moodEntriesToday[0].count,
      moodEntriesThisWeek: moodEntriesThisWeek[0].count,
      moodEntriesThisMonth: moodEntriesThisMonth[0].count,
      totalJournalEntries,
      totalCommunityPosts,
      avgMoodEntriesPerUser,
      userRetentionRate,
      topMoodTypes,
      userGrowthData,
      engagementMetrics: {
        dailyActiveUsers: activeUsersToday[0].count,
        weeklyActiveUsers: activeUsersThisWeek[0].count,
        monthlyActiveUsers: activeUsersThisMonth[0].count,
        avgSessionTime: 0 // Would need session tracking to calculate
      }
    };
  }

  async getPerformanceMetrics(): Promise<{
    apiResponseTimes: Array<{ endpoint: string; avgResponseTime: number; requestCount: number }>;
    errorRates: Array<{ endpoint: string; errorCount: number; totalRequests: number; errorRate: number }>;
    systemHealth: {
      databaseConnections: number;
      memoryUsage: number;
      cpuUsage: number;
      uptime: number;
    };
  }> {
    // For now, return basic system health metrics
    const systemHealth = {
      databaseConnections: 1, // Current active connection
      memoryUsage: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100, // MB
      cpuUsage: 0, // Would need process monitoring
      uptime: Math.round(process.uptime()) // seconds
    };

    return {
      apiResponseTimes: [], // Would need request logging middleware
      errorRates: [], // Would need error tracking middleware
      systemHealth
    };
  }

  async getUserEngagementData(): Promise<Array<{
    userId: number;
    username: string;
    lastActive: Date | null;
    moodEntriesCount: number;
    journalEntriesCount: number;
    communityPostsCount: number;
    accountAge: number;
    engagementScore: number;
  }>> {
    const engagementData = await db
      .select({
        userId: users.id,
        username: users.username,
        createdAt: users.createdAt,
        moodEntriesCount: sql<number>`count(distinct ${moodEntries.id})`,
        journalEntriesCount: sql<number>`count(distinct ${dailyJournals.id})`,
        communityPostsCount: sql<number>`count(distinct ${communityPosts.id})`,
        lastMoodEntry: sql<Date>`max(${moodEntries.date})`
      })
      .from(users)
      .leftJoin(moodEntries, eq(users.id, moodEntries.userId))
      .leftJoin(dailyJournals, eq(users.id, dailyJournals.userId))
      .leftJoin(communityPosts, eq(users.id, communityPosts.userId))
      .groupBy(users.id, users.username, users.createdAt)
      .orderBy(desc(sql`count(distinct ${moodEntries.id})`));

    const now = new Date();
    
    return engagementData.map(user => {
      const accountAge = user.createdAt ? Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      const engagementScore = (user.moodEntriesCount * 3) + (user.journalEntriesCount * 2) + (user.communityPostsCount * 1);
      
      return {
        userId: user.userId,
        username: user.username,
        lastActive: user.lastMoodEntry,
        moodEntriesCount: user.moodEntriesCount,
        journalEntriesCount: user.journalEntriesCount,
        communityPostsCount: user.communityPostsCount,
        accountAge,
        engagementScore
      };
    });
  }

  async getBusinessMetrics(): Promise<{
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
  }> {
    const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
    const usersWithMoodEntries = await db
      .select({ count: sql<number>`count(distinct user_id)` })
      .from(moodEntries);
    
    const usersWithJournalEntries = await db
      .select({ count: sql<number>`count(distinct user_id)` })
      .from(dailyJournals);
    
    const usersWithCommunityPosts = await db
      .select({ count: sql<number>`count(distinct user_id)` })
      .from(communityPosts);

    const conversionRate = totalUsers[0].count > 0 ? 
      Math.round((usersWithMoodEntries[0].count / totalUsers[0].count) * 100) : 0;

    // Calculate retention by week
    const retentionByWeek = [];
    const now = new Date();
    
    for (let week = 1; week <= 4; week++) {
      const weekStart = new Date(now.getTime() - week * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - (week - 1) * 7 * 24 * 60 * 60 * 1000);
      
      const activeUsersThisWeek = await db
        .select({ count: sql<number>`count(distinct user_id)` })
        .from(moodEntries)
        .where(and(gte(moodEntries.date, weekStart), lt(moodEntries.date, weekEnd)));
      
      const retentionRate = totalUsers[0].count > 0 ? 
        Math.round((activeUsersThisWeek[0].count / totalUsers[0].count) * 100) : 0;
      
      retentionByWeek.push({ week, retentionRate });
    }

    return {
      conversionRate,
      guestToUserConversion: 0, // Would need guest session tracking
      averageTimeToConversion: 0, // Would need conversion timestamp tracking
      churnRate: 0, // Would need more historical data
      retentionByWeek,
      featureUsage: {
        moodTracking: usersWithMoodEntries[0].count,
        journaling: usersWithJournalEntries[0].count,
        community: usersWithCommunityPosts[0].count,
        charts: usersWithMoodEntries[0].count // Assume users with mood entries use charts
      }
    };
  }

  async updateUserSubscription(userId: number, data: {
    subscriptionTier?: string;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    subscriptionStatus?: string;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date | null;
    trialEndDate?: Date | null;
    adminGrantedPro?: boolean;
    adminGrantedDate?: Date | null;
    adminGrantedBy?: string | null;
  }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        subscriptionTier: data.subscriptionTier,
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        subscriptionStatus: data.subscriptionStatus,
        subscriptionStartDate: data.subscriptionStartDate,
        subscriptionEndDate: data.subscriptionEndDate,
        trialEndDate: data.trialEndDate,
        adminGrantedPro: data.adminGrantedPro,
        adminGrantedDate: data.adminGrantedDate,
        adminGrantedBy: data.adminGrantedBy
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserSubscriptionDetails(userId: number): Promise<{
    subscriptionTier: string | null;
    subscriptionStatus: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    subscriptionEndDate: Date | null;
    trialEndDate: Date | null;
    adminGrantedPro: boolean | null;
    adminGrantedDate: Date | null;
    adminGrantedBy: string | null;
  } | undefined> {
    const [user] = await db
      .select({
        subscriptionTier: users.subscriptionTier,
        subscriptionStatus: users.subscriptionStatus,
        stripeCustomerId: users.stripeCustomerId,
        stripeSubscriptionId: users.stripeSubscriptionId,
        subscriptionEndDate: users.subscriptionEndDate,
        trialEndDate: users.trialEndDate,
        adminGrantedPro: users.adminGrantedPro,
        adminGrantedDate: users.adminGrantedDate,
        adminGrantedBy: users.adminGrantedBy
      })
      .from(users)
      .where(eq(users.id, userId));
    
    return user || undefined;
  }

  // 2FA Methods for Admin Security
  async setupTwoFactor(userId: number, secret: string, backupCodes: string[]): Promise<void> {
    await db
      .update(users)
      .set({
        twoFactorSecret: secret,
        twoFactorBackupCodes: backupCodes,
        twoFactorEnabled: true,
      })
      .where(eq(users.id, userId));
  }

  async disableTwoFactor(userId: number): Promise<void> {
    await db
      .update(users)
      .set({
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
        twoFactorEnabled: false,
      })
      .where(eq(users.id, userId));
  }

  async updateBackupCodes(userId: number, backupCodes: string[]): Promise<void> {
    await db
      .update(users)
      .set({
        twoFactorBackupCodes: backupCodes,
      })
      .where(eq(users.id, userId));
  }

  async update2FASettings(userId: number, settings: {
    twoFactorSecret?: string | null;
    twoFactorEnabled?: boolean;
    twoFactorBackupCodes?: string[] | null;
  }): Promise<void> {
    await db
      .update(users)
      .set(settings)
      .where(eq(users.id, userId));
  }

  async updateUserNotificationSettings(userId: number, settings: {
    emailNotificationsEnabled?: boolean;
    notificationEmail?: string | null;
  }): Promise<void> {
    await db
      .update(users)
      .set(settings)
      .where(eq(users.id, userId));
  }

  async updateUserSmsSettings(userId: number, settings: {
    smsNotificationsEnabled?: boolean;
    notificationPhone?: string | null;
    phoneVerified?: boolean;
    phoneVerificationCode?: string | null;
    phoneVerificationExpiry?: Date | null;
  }): Promise<void> {
    await db
      .update(users)
      .set(settings)
      .where(eq(users.id, userId));
  }

  async updateUserPhoneVerification(userId: number, settings: {
    phoneVerificationCode?: string | null;
    phoneVerificationExpiry?: Date | null;
  }): Promise<void> {
    await db
      .update(users)
      .set(settings)
      .where(eq(users.id, userId));
  }

  async getRevenueMetrics(): Promise<{
    monthlyRevenue: Array<{
      month: string;
      revenue: number;
      newSubscriptions: number;
      churnedSubscriptions: number;
      netGrowth: number;
      essentialRevenue: number;
      proRevenue: number;
    }>;
    totalRevenue: number;
    monthlyChurn: number;
    monthlyGrowth: number;
    activeSubscriptions: number;
    canceledSubscriptions: number;
    averageRevenuePerUser: number;
  }> {
    // Calculate monthly revenue data for the last 12 months
    const monthlyRevenue = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthName = month.toLocaleString('default', { month: 'short', year: 'numeric' });
      
      // Count subscriptions created in this month
      const [newSubscriptionsResult] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.subscriptionTier, 'pro'),
            gte(users.subscriptionStartDate, month),
            lt(users.subscriptionStartDate, nextMonth)
          )
        );
      
      // Count subscriptions that ended in this month (churned)
      const [churnedSubscriptionsResult] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.subscriptionStatus, 'canceled'),
            gte(users.subscriptionEndDate, month),
            lt(users.subscriptionEndDate, nextMonth)
          )
        );
      
      const newSubscriptions = newSubscriptionsResult?.count || 0;
      const churnedSubscriptions = churnedSubscriptionsResult?.count || 0;
      const netGrowth = newSubscriptions - churnedSubscriptions;
      
      // Calculate revenue (assuming $1.99/month for pro subscriptions)
      const proRevenue = newSubscriptions * 1.99;
      const essentialRevenue = 0; // Only pro tier currently
      const totalRevenue = proRevenue + essentialRevenue;
      
      monthlyRevenue.push({
        month: monthName,
        revenue: totalRevenue,
        newSubscriptions,
        churnedSubscriptions,
        netGrowth,
        essentialRevenue,
        proRevenue,
      });
    }
    
    // Calculate total revenue
    const totalRevenue = monthlyRevenue.reduce((sum, month) => sum + month.revenue, 0);
    
    // Count active subscriptions
    const [activeSubscriptionsResult] = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          eq(users.subscriptionTier, 'pro'),
          eq(users.subscriptionStatus, 'active')
        )
      );
    
    // Count canceled subscriptions
    const [canceledSubscriptionsResult] = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          eq(users.subscriptionTier, 'pro'),
          eq(users.subscriptionStatus, 'canceled')
        )
      );
    
    const activeSubscriptions = activeSubscriptionsResult?.count || 0;
    const canceledSubscriptions = canceledSubscriptionsResult?.count || 0;
    
    // Calculate churn rate (canceled / total subscriptions)
    const totalSubscriptions = activeSubscriptions + canceledSubscriptions;
    const monthlyChurn = totalSubscriptions > 0 ? (canceledSubscriptions / totalSubscriptions) * 100 : 0;
    
    // Calculate growth rate based on last two months
    const lastMonth = monthlyRevenue[monthlyRevenue.length - 1];
    const secondLastMonth = monthlyRevenue[monthlyRevenue.length - 2];
    const monthlyGrowth = secondLastMonth?.newSubscriptions > 0 
      ? ((lastMonth.newSubscriptions - secondLastMonth.newSubscriptions) / secondLastMonth.newSubscriptions) * 100 
      : 0;
    
    // Calculate average revenue per user
    const averageRevenuePerUser = activeSubscriptions > 0 ? totalRevenue / activeSubscriptions : 0;
    
    return {
      monthlyRevenue,
      totalRevenue,
      monthlyChurn,
      monthlyGrowth,
      activeSubscriptions,
      canceledSubscriptions,
      averageRevenuePerUser,
    };
  }
}

export const storage = new DatabaseStorage();
