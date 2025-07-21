import { pgTable, text, serial, integer, timestamp, real, boolean, date, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for persistent authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"), // Made optional for OAuth users
  name: text("name"),
  email: text("email").unique(),
  googleId: text("google_id").unique(),
  profileImageUrl: text("profile_image_url"),
  age: integer("age"),
  gender: text("gender"),
  role: text("role").default("user"),
  notificationsEnabled: boolean("notifications_enabled").default(false),
  emailNotificationsEnabled: boolean("email_notifications_enabled").default(false),
  notificationEmail: text("notification_email"), // Optional separate email for notifications
  smsNotificationsEnabled: boolean("sms_notifications_enabled").default(false),
  notificationPhone: text("notification_phone"), // Phone number for SMS notifications
  phoneVerified: boolean("phone_verified").default(false), // Phone number verification status
  phoneVerificationCode: text("phone_verification_code"), // Temporary SMS verification code
  phoneVerificationExpiry: timestamp("phone_verification_expiry"), // Code expiry time
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  // 2FA fields for admin security
  twoFactorSecret: text("two_factor_secret"), // TOTP secret key
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorBackupCodes: text("two_factor_backup_codes").array(), // Array of backup codes
  // Subscription fields - all nullable to preserve existing users
  subscriptionTier: text("subscription_tier").default("free"), // free, essential, pro
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("active"), // active, canceled, past_due, incomplete
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  trialEndDate: timestamp("trial_end_date"),
  // Admin-granted Pro access tracking
  adminGrantedPro: boolean("admin_granted_pro").default(false), // true if manually upgraded by admin
  adminGrantedDate: timestamp("admin_granted_date"), // when admin granted Pro access
  adminGrantedBy: text("admin_granted_by"), // username of admin who granted access
  // Apple In-App Purchase fields removed - iOS subscription functionality disabled
  // iOS authentication token for WebView apps
  iosAuthToken: text("ios_auth_token"), // iOS authentication token for persistent login
  iosTokenExpires: timestamp("ios_token_expires"), // iOS token expiration timestamp
  createdAt: timestamp("created_at").defaultNow(),
});

export const moodEntries = pgTable("mood_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  mood: text("mood").notNull(), // excited, happy, neutral, sad, anxious
  subMood: text("sub_mood"), // detailed emotion: energized, hopeful, content, peaceful, etc.
  intensity: integer("intensity").notNull(), // 1-10 scale
  notes: text("notes"),
  activities: text("activities").array(), // array of activity names: gym, yoga, meditation, sports, outdoors, other
  date: timestamp("date").notNull(),
  moonPhase: text("moon_phase"),
  moonIllumination: real("moon_illumination"),
});

export const moonPhases = pgTable("moon_phases", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull().unique(),
  phase: text("phase").notNull(), // new, waxing_crescent, first_quarter, waxing_gibbous, full, waning_gibbous, last_quarter, waning_crescent
  illumination: real("illumination").notNull(), // 0-100 percentage
  name: text("name").notNull(),
});

export const communityPosts = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailyJournals = pgTable("daily_journals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Table to track sent notifications and prevent duplicates across server restarts
export const notificationLog = pgTable("notification_log", {
  id: serial("id").primaryKey(),
  notificationKey: text("notification_key").notNull().unique(), // Format: "hour:minute:date"
  sentAt: timestamp("sent_at").defaultNow(),
  notificationType: text("notification_type").notNull(), // "email" or "sms"
  recipientCount: integer("recipient_count").default(0),
});



export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  age: true,
  gender: true,
  role: true,
});

export const insertMoodEntrySchema = createInsertSchema(moodEntries).pick({
  mood: true,
  subMood: true,
  intensity: true,
  notes: true,
  activities: true,
}).extend({
  date: z.string().transform(str => new Date(str)),
});

export const insertMoonPhaseSchema = createInsertSchema(moonPhases).pick({
  date: true,
  phase: true,
  illumination: true,
  name: true,
});

export const insertCommunityPostSchema = createInsertSchema(communityPosts).pick({
  content: true,
});

export const insertDailyJournalSchema = createInsertSchema(dailyJournals).pick({
  content: true,
}).extend({
  date: z.string().transform(str => new Date(str)),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type MoodEntry = typeof moodEntries.$inferSelect;
export type InsertMoodEntry = z.infer<typeof insertMoodEntrySchema>;
export type MoonPhase = typeof moonPhases.$inferSelect;
export type InsertMoonPhase = z.infer<typeof insertMoonPhaseSchema>;
export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
export type DailyJournal = typeof dailyJournals.$inferSelect;
export type InsertDailyJournal = z.infer<typeof insertDailyJournalSchema>;
