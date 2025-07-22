import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertMoodEntrySchema, insertCommunityPostSchema } from "@shared/schema";
import { z } from "zod";
import { createHash } from "crypto";
import { sendWelcomeEmail, sendPasswordResetEmail, sendProSubscriptionThankYouEmail, sendSubscriptionCancellationEmail, sendProUpgradeEmail } from "./email";
import { sendMoodReminders, sendTestNotifications } from "./notifications";
import { sendEmail } from "./email";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import Stripe from "stripe";
import { generateMoodInsights, generateWeeklyReport, analyzeMoodPattern, generateHistoricalReport, generatePredictiveTrends, generateNLPGuidance, generateAdvancedAnalytics } from "./ai-insights";
import { generateTwoFactorSecret, generateQRCodeDataUrl, verifyTwoFactorToken, removeUsedBackupCode, generateNewBackupCodes, hasLowBackupCodes } from "./two-factor-auth";
import { setupAuth } from "./auth";
import passport from "passport";
import { iosAuthMiddleware, optionalIOSAuthMiddleware, generateIOSAuthToken } from "./middleware/iosAuth.js";
import { fileURLToPath } from 'url';

// Helper functions for 2FA
async function setupTwoFactor(username: string, issuer: string) {
  const setup = generateTwoFactorSecret(username);
  const qrCodeDataUrl = await generateQRCodeDataUrl(setup.qrCodeUrl);
  
  return {
    secret: setup.secret,
    qrCodeDataUrl,
    backupCodes: setup.backupCodes
  };
}

function generateBackupCodes(): string[] {
  return generateNewBackupCodes();
}

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-05-28.basil",
});

// Helper function to generate secure guest user ID
function generateGuestUserId(guestId: string | string[] | any): number {
  const id = Array.isArray(guestId) ? guestId[0] : String(guestId);
  const hash = createHash('sha256').update(id).digest('hex');
  // Use only 6 hex chars to stay within 32-bit integer range
  const hashValue = parseInt(hash.substring(0, 6), 16);
  // Return negative value in safe range (-16777215 to -1)
  return -Math.abs(hashValue % 16777215) - 1;
}

// Mood ranking system for trend calculations
const MOOD_RANKINGS: Record<string, number> = {
  sad: 1,
  anxious: 2,
  neutral: 3,
  happy: 4,
  excited: 5
};

function calculateMoodScore(mood: string, intensity: number, subMood?: string | null): number {
  const ranking = MOOD_RANKINGS[mood.toLowerCase()] || 3; // Default to neutral if unknown
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

// Enhanced authentication middleware with iOS support
async function isAuthenticated(req: any, res: any, next: any) {
  console.log("🔍 isAuthenticated Debug:");
  console.log("  - Session exists:", !!req.session);
  console.log("  - Session userId:", req.session?.userId);
  console.log("  - Session user:", req.session?.user?.id);
  console.log("  - Passport user:", req.user?.id);
  console.log("  - iOS auth header:", !!req.headers['x-ios-auth']);
  
  try {
    // Priority 1: Check session-based authentication (most common for web)
    const sessionUserId = req.session?.userId || req.session?.user?.id;
    if (sessionUserId) {
      console.log("✅ Session authentication confirmed, userId:", sessionUserId);
      
      // Ensure req.user is populated for consistency
      if (!req.user) {
        try {
          const user = await storage.getUser(sessionUserId);
          if (user) {
            req.user = user;
          }
        } catch (error) {
          console.error("Failed to load user from storage:", error);
        }
      }
      
      return next();
    }

    // Priority 2: Check Passport user (Google OAuth)
    if (req.user?.id) {
      console.log("✅ Passport authentication confirmed, userId:", req.user.id);
      
      // Sync session for OAuth users if session exists but no userId
      if (req.session && !req.session.userId) {
        req.session.userId = req.user.id;
        req.session.user = {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role || 'user'
        };
      }
      
      return next();
    }

    // Priority 3: Check iOS authentication
    const iosAuthHeader = req.headers['x-ios-auth'] || req.headers['x-ios-auth-token'];
    if (iosAuthHeader) {
      try {
        const [userIdStr, timestampStr, hash] = iosAuthHeader.split(':');
        if (userIdStr && timestampStr && hash) {
          const userId = parseInt(userIdStr);
          const timestamp = parseInt(timestampStr);
          
          // Verify hash
          const tokenData = `${userId}:${timestamp}`;
          const { createHmac } = await import('crypto');
          const expectedHash = createHmac('sha256', process.env.SESSION_SECRET || 'fallback')
            .update(tokenData).digest('hex');
          
          if (hash === expectedHash) {
            const user = await storage.getUser(userId);
            if (user && user.iosAuthToken === iosAuthHeader) {
              console.log("✅ iOS authentication successful:", userId);
              req.user = user;
              return next();
            }
          }
        }
      } catch (iosError) {
        console.error('iOS auth verification failed:', iosError);
      }
    }

    // Priority 4: Try Passport session deserialization as last resort
    if (req.session?.passport?.user && !req.user) {
      try {
        const user = await storage.getUser(req.session.passport.user);
        if (user) {
          console.log("✅ Passport deserialization successful:", user.id);
          req.user = user;
          
          // Sync session
          req.session.userId = user.id;
          req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            role: user.role || 'user'
          };
          
          return next();
        }
      } catch (error) {
        console.error("Passport deserialization failed:", error);
      }
    }

    console.log("❌ No valid authentication found");
    return res.status(401).json({ message: "Not authenticated" });
    
  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    return res.status(500).json({ message: "Authentication check failed" });
  }
}



export async function registerRoutes(app: Express): Promise<Server> {
  // Static file serving handled by server/index.ts serveStatic() function

  // Serve support page (early placement to avoid conflicts)
  app.get('/support', (req, res) => {
    try {
      const filePath = path.join(process.cwd(), 'support.html');
      console.log('📄 Serving support page from:', filePath);
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('❌ Error serving support page:', err);
          res.status(404).send('Support page not found');
        } else {
          console.log('✅ Support page served successfully');
        }
      });
    } catch (error) {
      console.error('❌ Support page route error:', error);
      res.status(500).send('Internal server error');
    }
  });

  // iOS auth success route - serves the React app which will handle the auth token
  app.get('/auth/ios-success', (req, res) => {
    try {
      console.log('📱 iOS auth success route called with params:', req.query);
      // This will serve the main React app, which will handle the iOS auth success page
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const distPath = path.resolve(__dirname, "public");
      res.sendFile(path.resolve(distPath, "index.html"));
    } catch (error) {
      console.error('❌ iOS auth success route error:', error);
      res.status(500).send('Internal server error');
    }
  });

  app.get('/marketing', (req, res) => {
    try {
      const filePath = path.join(process.cwd(), 'marketing.html');
      console.log('📄 Serving marketing page from:', filePath);
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('❌ Error serving marketing page:', err);
          res.status(404).send('Marketing page not found');
        } else {
          console.log('✅ Marketing page served successfully');
        }
      });
    } catch (error) {
      console.error('❌ Marketing page route error:', error);
      res.status(500).send('Internal server error');
    }
  });

  app.get('/consent', (req, res) => {
    try {
      const filePath = path.join(process.cwd(), 'consent.html');
      console.log('📄 Serving consent page from:', filePath);
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('❌ Error serving consent page:', err);
          res.status(404).send('Consent page not found');
        } else {
          console.log('✅ Consent page served successfully');
        }
      });
    } catch (error) {
      console.error('❌ Consent page route error:', error);
      res.status(500).send('Internal server error');
    }
  });

  app.get('/license', (req, res) => {
    try {
      const filePath = path.join(process.cwd(), 'license.html');
      console.log('📄 Serving license page from:', filePath);
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('❌ Error serving license page:', err);
          res.status(404).send('License page not found');
        } else {
          console.log('✅ License page served successfully');
        }
      });
    } catch (error) {
      console.error('❌ License page route error:', error);
      res.status(500).send('Internal server error');
    }
  });

  app.get('/privacy', (req, res) => {
    try {
      const filePath = path.join(process.cwd(), 'privacy.html');
      console.log('📄 Serving privacy policy from:', filePath);
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('❌ Error serving privacy policy:', err);
          res.status(404).send('Privacy policy not found');
        } else {
          console.log('✅ Privacy policy served successfully');
        }
      });
    } catch (error) {
      console.error('❌ Privacy policy route error:', error);
      res.status(500).send('Internal server error');
    }
  });

  // Ensure API routes are handled before any middleware that might interfere
  console.log("🔧 Registering API routes...");
  
  // Setup integrated authentication with Google OAuth
  setupAuth(app);
  

  // ===== iOS-SPECIFIC AUTHENTICATION ENDPOINTS =====
  // iOS Login - Returns JSON with auth token (separate from web login)
  app.post("/api/ios/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        console.log('🔒 iOS login: Missing username or password');
        return res.status(400).json({ 
          success: false, 
          message: 'Username and password are required' 
        });
      }
      
      console.log('🔒 iOS login attempt for:', username);
      
      // Get user by username or email
      const user = await storage.getUserByUsername(username) || await storage.getUserByEmail(username);
      
      if (!user) {
        console.log('🔒 iOS login: User not found:', username);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid username or password' 
        });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.log('🔒 iOS login: Invalid password for user:', user.username);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid username or password' 
        });
      }
      
      // Generate iOS auth token
      const authToken = generateIOSAuthToken(user.id);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      // Store token in database
      await storage.updateUser(user.id, {
        iosAuthToken: authToken,
        iosTokenExpires: expiresAt
      });
      
      console.log('✅ iOS login successful for user:', user.username, 'ID:', user.id);
      
      res.json({
        success: true,
        message: 'Login successful',
        token: authToken,
        expiresAt: expiresAt.toISOString(),
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          subscriptionTier: user.subscriptionTier,
          profileImageUrl: user.profileImageUrl
        }
      });
    } catch (error) {
      console.error('🔒 iOS login error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Login failed. Please try again.' 
      });
    }
  });

  // iOS Register - Creates account and returns auth token
  app.post("/api/ios/register", async (req, res) => {
    try {
      const { username, email, password, name } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Username, email, and password are required' 
        });
      }
      
      console.log('🔒 iOS register attempt for:', username, email);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username) || await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ 
          success: false, 
          message: 'Username or email already exists' 
        });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Create user
      const newUser = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        name: name || null,
        subscriptionTier: 'free',
        role: 'user'
      });
      
      // Generate iOS auth token
      const authToken = generateIOSAuthToken(newUser.id);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      // Store token in database
      await storage.updateUser(newUser.id, {
        iosAuthToken: authToken,
        iosTokenExpires: expiresAt
      });
      
      console.log('✅ iOS registration successful for user:', newUser.username, 'ID:', newUser.id);
      
      res.json({
        success: true,
        message: 'Account created successfully',
        token: authToken,
        expiresAt: expiresAt.toISOString(),
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          name: newUser.name,
          subscriptionTier: newUser.subscriptionTier,
          profileImageUrl: newUser.profileImageUrl
        }
      });
    } catch (error) {
      console.error('🔒 iOS register error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Registration failed. Please try again.' 
      });
    }
  });

  // iOS Auth Status - Check if token is valid and return user data
  app.get("/api/ios/auth/status", iosAuthMiddleware, async (req, res) => {
    try {
      const user = req.iosUser;
      
      res.json({
        success: true,
        isAuthenticated: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          subscriptionTier: user.subscriptionTier,
          profileImageUrl: user.profileImageUrl,
          role: user.role
        }
      });
    } catch (error) {
      console.error('🔒 iOS auth status error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Auth status check failed' 
      });
    }
  });

  // iOS Logout - Invalidate token
  app.post("/api/ios/logout", iosAuthMiddleware, async (req, res) => {
    try {
      const userId = req.iosUserId;
      
      // Clear iOS auth token from database
      await storage.updateUser(userId, {
        iosAuthToken: null,
        iosTokenExpires: null
      });
      
      console.log('✅ iOS logout successful for user:', userId);
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('🔒 iOS logout error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Logout failed' 
      });
    }
  });

  // ===== iOS-SPECIFIC DATA ENDPOINTS =====
  // iOS Mood Entries - Get user's mood entries
  app.get("/api/ios/mood-entries", iosAuthMiddleware, async (req, res) => {
    try {
      const userId = req.iosUserId;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const entries = await storage.getMoodEntriesByUser(userId, limit);
      console.log('📱 iOS mood entries fetched for user:', userId, 'count:', entries.length);
      
      res.json({
        success: true,
        entries: entries
      });
    } catch (error) {
      console.error('📱 iOS mood entries error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch mood entries' 
      });
    }
  });

  // iOS Create Mood Entry
  app.post("/api/ios/mood-entries", iosAuthMiddleware, async (req, res) => {
    try {
      const userId = req.iosUserId;
      const moodData = req.body;
      
      const entry = await storage.createMoodEntry({
        ...moodData,
        userId,
        date: new Date(moodData.date)
      });
      
      console.log('📱 iOS mood entry created for user:', userId, 'entry:', entry.id);
      
      res.json({
        success: true,
        entry: entry
      });
    } catch (error) {
      console.error('📱 iOS mood entry creation error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create mood entry' 
      });
    }
  });

  // iOS Journal Entries - Get user's journal entries  
  app.get("/api/ios/daily-journal", iosAuthMiddleware, async (req, res) => {
    try {
      const userId = req.iosUserId;
      const journals = await storage.getAllDailyJournals(userId);
      
      console.log('📱 iOS journal entries fetched for user:', userId, 'count:', journals.length);
      
      res.json({
        success: true,
        journals: journals
      });
    } catch (error) {
      console.error('📱 iOS journal entries error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch journal entries' 
      });
    }
  });

  // iOS Create Journal Entry
  app.post("/api/ios/daily-journal", iosAuthMiddleware, async (req, res) => {
    try {
      const userId = req.iosUserId;
      const { date, content } = req.body;
      
      const journal = await storage.createOrUpdateDailyJournal(userId, date, content);
      
      console.log('📱 iOS journal entry created for user:', userId, 'date:', date);
      
      res.json({
        success: true,
        journal: journal
      });
    } catch (error) {
      console.error('📱 iOS journal entry creation error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create journal entry' 
      });
    }
  });

  // iOS User Profile
  app.get("/api/ios/profile", iosAuthMiddleware, async (req, res) => {
    try {
      const user = req.iosUser;
      
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          age: user.age,
          gender: user.gender,
          subscriptionTier: user.subscriptionTier,
          profileImageUrl: user.profileImageUrl,
          role: user.role,
          notificationsEnabled: user.notificationsEnabled,
          emailNotificationsEnabled: user.emailNotificationsEnabled,
          smsNotificationsEnabled: user.smsNotificationsEnabled,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error('📱 iOS profile error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch profile' 
      });
    }
  });

  // iOS Update Profile
  app.put("/api/ios/profile", iosAuthMiddleware, async (req, res) => {
    try {
      const userId = req.iosUserId;
      const updates = req.body;
      
      // Filter allowed update fields
      const allowedFields = ['name', 'age', 'gender', 'notificationsEnabled', 'emailNotificationsEnabled', 'smsNotificationsEnabled'];
      const filteredUpdates = {};
      
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      });
      
      const updatedUser = await storage.updateUser(userId, filteredUpdates);
      
      console.log('📱 iOS profile updated for user:', userId, 'fields:', Object.keys(filteredUpdates));
      
      res.json({
        success: true,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          name: updatedUser.name,
          age: updatedUser.age,
          gender: updatedUser.gender,
          subscriptionTier: updatedUser.subscriptionTier,
          profileImageUrl: updatedUser.profileImageUrl,
          role: updatedUser.role,
          notificationsEnabled: updatedUser.notificationsEnabled,
          emailNotificationsEnabled: updatedUser.emailNotificationsEnabled,
          smsNotificationsEnabled: updatedUser.smsNotificationsEnabled,
          createdAt: updatedUser.createdAt
        }
      });
    } catch (error) {
      console.error('📱 iOS profile update error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update profile' 
      });
    }
  });

  // ===== WEB AUTHENTICATION ENDPOINTS (UNCHANGED) =====
  // Debug endpoint for Google authentication testing
  app.get("/api/auth/debug", (req, res) => {
    const session = (req as any).session;
    res.json({
      hasSession: !!session,
      sessionId: session?.id,
      userId: session?.userId,
      userRole: session?.userRole,
      cookies: req.headers.cookie,
      isProduction: process.env.NODE_ENV === 'production',
      fullSession: JSON.stringify(session)
    });
  });

  // Test session creation endpoint
  app.post("/api/auth/test-session", (req, res) => {
    const session = (req as any).session;
    session.userId = 999;
    session.userRole = 'user';
    session.user = {
      id: 999,
      name: 'Test User',
      role: 'user',
      email: 'test@example.com',
      username: 'testuser'
    };
    
    session.save((err: any) => {
      if (err) {
        console.error('Test session save error:', err);
        return res.status(500).json({ error: 'Failed to save session' });
      }
      
      res.json({ 
        message: 'Test session created',
        sessionId: session.id,
        userId: session.userId,
        userRole: session.userRole,
        hasUserObject: !!session.user
      });
    });
  });

  // Token-based authentication endpoint for Google OAuth
  app.post("/api/auth/token-login", async (req, res) => {
    try {
      const { token } = req.body;
      console.log('Token login attempt with token:', token ? 'present' : 'missing');
      
      if (!token) {
        return res.status(400).json({ error: 'Token required' });
      }

      // Validate login token
      console.log('Validating login token...');
      const user = await storage.validateLoginToken(token);
      if (!user) {
        console.log('Token validation failed - user not found or token expired');
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      console.log('Token validated for user:', user.id);

      // Create session with validated user
      const session = (req as any).session;
      session.userId = user.id;
      session.userRole = user.role || 'user';
      session.user = {
        id: user.id,
        name: user.name,
        role: user.role || 'user',
        email: user.email,
        username: user.username
      };

      session.save((err: any) => {
        if (err) {
          console.error('Token login session save error:', err);
          return res.status(500).json({ error: 'Failed to create session' });
        }

        console.log('✅ Token login successful for user:', user.id);
        res.json({
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      });
    } catch (error) {
      console.error('Token login error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });
  
  // CRITICAL FIX: Working user authentication endpoint
  app.get("/api/current-user", async (req, res) => {
    const session = (req as any).session;
    
    if (!session || !session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUser(session.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        role: user.role || 'user',
        notificationsEnabled: user.notificationsEnabled || false
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  // Debug endpoints for iOS testing
  app.post('/api/debug/platform-detection', (req, res) => {
    const debugData = req.body;
    console.log('\n🍎 iOS PLATFORM DETECTION DEBUG:');
    console.log('='.repeat(50));
    console.log('Platform:', debugData.platform);
    console.log('Is Native iOS:', debugData.isNativeIOS);
    console.log('Is iPhone User Agent:', debugData.isIPhoneUserAgent);
    console.log('Is Capacitor App:', debugData.isCapacitorApp);
    console.log('Final Is Native:', debugData.finalIsNative);
    console.log('User Agent:', debugData.userAgent);
    console.log('Location:', debugData.location);
    console.log('Timestamp:', debugData.timestamp);
    console.log('='.repeat(50));
    res.json({ received: true });
  });

  app.post('/api/debug/purchase-attempt', (req, res) => {
    const debugData = req.body;
    console.log('\n💳 iOS PURCHASE ATTEMPT DEBUG:');
    console.log('='.repeat(50));
    console.log('Product ID:', debugData.productId);
    console.log('Platform:', debugData.platform);
    console.log('Should Use Apple IAP:', debugData.shouldUseAppleIAP);
    console.log('Will Use Stripe:', debugData.willUseStripe);
    console.log('Platform Ready:', debugData.platformReady);
    console.log('User Agent:', debugData.userAgent);
    console.log('Timestamp:', debugData.timestamp);
    console.log('='.repeat(50));
    res.json({ received: true });
  });

  // Get current moon phase
  app.get("/api/moon/current", async (req, res) => {
    try {
      const today = new Date();
      // Always use today's date at midnight for consistent daily caching
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Check for force refresh parameter
      const forceRefresh = req.query.refresh === 'true';
      
      let moonPhase = forceRefresh ? null : await storage.getMoonPhaseByDate(todayMidnight);
      
      if (!moonPhase || forceRefresh) {
        console.log("Fetching fresh moon phase data for:", todayMidnight.toISOString().split('T')[0]);
        
        // Fetch from moon API and store
        const timestamp = Math.floor(todayMidnight.getTime() / 1000);
        const response = await fetch(`https://api.farmsense.net/v1/moonphases/?d=${timestamp}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
          const phaseData = data[0];
          console.log("Moon API response:", phaseData);
          
          moonPhase = await storage.upsertMoonPhase({
            date: todayMidnight,
            phase: phaseData.Phase?.toLowerCase().replace(' ', '_') || 'unknown',
            illumination: phaseData.Illumination || 0,
            name: phaseData.Phase || 'Unknown'
          });
        } else {
          // Fallback moon phase calculation
          console.log("Using fallback calculation for moon phase");
          const moonPhaseCalc = calculateMoonPhase(todayMidnight);
          moonPhase = await storage.upsertMoonPhase(moonPhaseCalc);
        }
      } else {
        console.log("Using cached moon phase for:", todayMidnight.toISOString().split('T')[0]);
      }
      
      res.json(moonPhase);
    } catch (error) {
      console.error('❌ Moon API error:', error);
      
      try {
        // Enhanced fallback calculation with better error handling
        const today = new Date();
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const moonPhase = calculateMoonPhase(todayMidnight);
        
        // Safely create moon phase with error handling
        const storedPhase = await storage.createMoonPhase(moonPhase);
        console.log('✅ Fallback moon phase created successfully');
        res.json(storedPhase);
      } catch (fallbackError) {
        console.error('❌ Fallback moon phase creation failed:', fallbackError);
        
        // Last resort: return a basic moon phase
        const basicMoonPhase = {
          id: Math.floor(Date.now() / 1000),
          date: new Date().toISOString().split('T')[0],
          phase: 'unknown',
          illumination: 50,
          name: 'Unknown'
        };
        
        res.json(basicMoonPhase);
      }
    }
  });

  // Create mood entry (supports guest users) - Phase 3: Uses global iOS middleware  
  app.post("/api/mood-entries", async (req, res) => {
    try {
      const data = insertMoodEntrySchema.parse(req.body);
      const { guestId } = req.body;
      
      // Get current moon phase
      const moonPhase = await storage.getMoonPhaseByDate(data.date);
      
      let userId = null;
      
      // Phase 3: Check iOS authentication from global middleware first
      if ((req as any).userId && (req as any).isIOSAuth) {
        userId = (req as any).userId;
        console.log("✅ iOS auth from global middleware for mood entry, userId:", userId);
      }
      // Check session-based auth for web users (including Passport user)
      else if ((req as any).session?.userId || (req as any).session?.user || (req as any).user) {
        userId = (req as any).session?.userId || (req as any).session?.user?.id || (req as any).user?.id;
        console.log("✅ Session/Passport auth detected for mood entry, userId:", userId);
      }
      
      // If still no userId, check for guest mode
      if (!userId && guestId) {
        // For guest users, use secure hash-based negative ID
        userId = generateGuestUserId(guestId);
      }
      
      // If still no userId, return error
      if (!userId) {
        return res.status(400).json({ message: "User authentication or guest ID required" });
      }
      
      const entryToCreate = {
        ...data,
        userId,
        moonPhase: moonPhase?.phase,
        moonIllumination: moonPhase?.illumination
      };
      
      const moodEntry = await storage.createMoodEntry(entryToCreate);
      
      res.json(moodEntry);
    } catch (error) {
      console.error("Mood entry creation error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid mood entry data" });
    }
  });

  // Get mood entries for user (supports guest users) - Phase 3: Uses global iOS middleware
  app.get("/api/mood-entries", async (req, res) => {
    try {
      const { guestId } = req.query;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      let userId = null;
      
      // Enhanced authentication check - supports both iOS and web
      console.log("🔍 Mood Entries GET - req.userId:", (req as any).userId, "req.isIOSAuth:", (req as any).isIOSAuth);
      
      // Check iOS auth header directly (Railway production fix)
      if (req.headers['x-ios-auth-token']) {
        const token = req.headers['x-ios-auth-token'] as string;
        try {
          const [userIdStr] = token.split(':');
          const tempUserId = parseInt(userIdStr);
          const user = await storage.getUser(tempUserId);
          if (user && user.iosAuthToken === token) {
            userId = tempUserId;
            console.log('✅ Mood Entries - iOS auth successful for user:', userId);
          }
        } catch (iosError) {
          console.log('❌ Mood Entries - iOS auth failed:', iosError);
        }
      }
      
      // Global middleware iOS auth
      else if ((req as any).userId && (req as any).isIOSAuth) {
        userId = (req as any).userId;
        console.log("✅ iOS auth from global middleware, userId:", userId);
      }
      // Check session-based auth for web users (including Passport user)
      else if ((req as any).session?.userId || (req as any).session?.user || (req as any).user) {
        userId = (req as any).session?.userId || (req as any).session?.user?.id || (req as any).user?.id;
        console.log("✅ Session/Passport auth detected, userId:", userId);
      }
      
      // If still no userId, check for guest mode
      if (!userId && guestId) {
        // For guest users, use secure hash-based negative ID
        userId = generateGuestUserId(guestId);
        console.log("🔍 Guest mode detected, userId:", userId);
      }
      
      // If still no userId, return error
      if (!userId) {
        console.error("🚨 Mood entries request without userId or guestId");
        return res.status(400).json({ message: "User authentication or guest ID required" });
      }
      
      console.log("🔍 Fetching mood entries for userId:", userId, "limit:", limit);
      
      // Add extra error handling for storage operation
      let entries;
      try {
        entries = await storage.getMoodEntriesByUser(userId, limit);
        console.log("✅ Storage returned", entries?.length || 0, "entries");
      } catch (storageError) {
        console.error("🚨 Storage.getMoodEntriesByUser failed:", storageError);
        // Return empty array instead of crashing
        entries = [];
      }
      
      // Safely add mood scores to entries for trend calculations
      const entriesWithScores = entries.map(entry => {
        try {
          return {
            ...entry,
            moodScore: calculateMoodScore(entry.mood, entry.intensity, entry.subMood)
          };
        } catch (scoreError) {
          console.error("🚨 calculateMoodScore failed for entry:", entry.id, scoreError);
          return {
            ...entry,
            moodScore: 3.0 // Default neutral score
          };
        }
      });
      
      console.log("✅ Returning", entriesWithScores.length, "mood entries with scores");
      res.json(entriesWithScores);
    } catch (error) {
      console.error("🚨 Critical error in /api/mood-entries:", error);
      console.error("🚨 Error stack:", error?.stack);
      res.status(500).json({ 
        message: "Failed to fetch mood entries",
        error: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  });

  // Get mood entries by date range
  app.get("/api/mood-entries/range", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      // Check authentication
      const session = req.session as any;
      if (!session?.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const entries = await storage.getMoodEntriesByDateRange(
        session.user.id,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      // Add mood scores to entries for trend calculations
      const entriesWithScores = entries.map(entry => ({
        ...entry,
        moodScore: calculateMoodScore(entry.mood, entry.intensity, entry.subMood)
      }));
      
      res.json(entriesWithScores);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mood entries" });
    }
  });

  // Update mood entry (supports both authenticated and guest users)
  app.put("/api/mood-entries/:id", async (req, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const data = insertMoodEntrySchema.parse(req.body);
      const { guestId } = req.body;
      
      let userId = null;
      
      // Check if user is authenticated
      if ((req as any).session?.userId || (req as any).session?.user) {
        userId = (req as any).session.userId || (req as any).session.user.id;
      } else if (guestId) {
        // For guest users, use secure hash-based negative ID
        userId = generateGuestUserId(guestId);
      } else {
        return res.status(400).json({ message: "User authentication or guest ID required" });
      }
      
      // Verify ownership of the entry
      const existingEntry = await storage.getMoodEntryById(entryId);
      if (!existingEntry || existingEntry.userId !== userId) {
        return res.status(404).json({ message: "Mood entry not found or access denied" });
      }
      
      // Get moon phase for the date
      const moonPhase = await storage.getMoonPhaseByDate(data.date);
      
      const entryToUpdate = {
        ...data,
        userId,
        moonPhase: moonPhase?.phase,
        moonIllumination: moonPhase?.illumination
      };
      
      const updatedEntry = await storage.updateMoodEntry(entryId, entryToUpdate);
      
      res.json(updatedEntry);
    } catch (error) {
      console.error("Mood entry update error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid mood entry data" });
    }
  });

  // Delete mood entry (supports both authenticated and guest users)
  app.delete("/api/mood-entries/:id", async (req, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const { guestId } = req.query;
      
      let userId = null;
      
      // Check if user is authenticated
      if ((req as any).session?.userId || (req as any).session?.user) {
        userId = (req as any).session.userId || (req as any).session.user.id;
      } else if (guestId) {
        // For guest users, use secure hash-based negative ID
        userId = generateGuestUserId(guestId);
      } else {
        return res.status(400).json({ message: "User authentication or guest ID required" });
      }
      
      // Verify ownership of the entry
      const existingEntry = await storage.getMoodEntryById(entryId);
      if (!existingEntry || existingEntry.userId !== userId) {
        return res.status(404).json({ message: "Mood entry not found or access denied" });
      }
      
      await storage.deleteMoodEntry(entryId);
      
      res.json({ success: true, message: "Mood entry deleted successfully" });
    } catch (error) {
      console.error("Mood entry deletion error:", error);
      res.status(500).json({ message: "Failed to delete mood entry" });
    }
  });

  // Get mood analytics
  app.get("/api/mood-analytics", async (req: any, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const { guestId } = req.query;
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - days);
      
      let userId = null;
      
      // Use unified authentication from middleware
      userId = req.userId; // Set by iOS middleware or session
      
      console.log('🔍 Analytics GET - req.userId:', req.userId, 'isIOSAuth:', req.isIOSAuth);
      
      // iOS Authentication Support
      if (!userId && req.headers['x-ios-auth-token']) {
        const token = req.headers['x-ios-auth-token'] as string;
        const user = await storage.getUser(parseInt(token.split(':')[0]));
        if (user && user.iosAuthToken === token) {
          userId = user.id;
          console.log('🔍 Analytics GET - iOS auth successful for user:', userId);
        } else {
          console.log('🔍 Analytics GET - iOS auth failed for token');
        }
      }
      // Check session-based auth for web users
      else if (!userId && ((req as any).session?.userId || (req as any).session?.user)) {
        userId = (req as any).session?.userId || (req as any).session?.user?.id;
        console.log("✅ Analytics - Session auth detected, userId:", userId);
      }
      
      // If still no userId, check for guest mode
      if (!userId && guestId) {
        // For guest users, use secure hash-based negative ID
        userId = generateGuestUserId(guestId);
        console.log('🔍 Analytics GET - using guest ID:', userId);
      }
      
      // If still no userId, return error
      if (!userId) {
        console.log('❌ Analytics GET - no authentication found');
        return res.status(400).json({ message: "User authentication or guest ID required" });
      }
      
      const entries = await storage.getMoodEntriesByDateRange(userId, pastDate, new Date());
      
      const analytics = {
        totalEntries: entries.length,
        averageMood: entries.length > 0 ? entries.reduce((sum, entry) => sum + calculateMoodScore(entry.mood, entry.intensity, entry.subMood), 0) / entries.length : 0,
        moodsByPhase: entries.reduce((acc, entry) => {
          if (entry.moonPhase) {
            if (!acc[entry.moonPhase]) {
              acc[entry.moonPhase] = { count: 0, totalMoodScore: 0 };
            }
            acc[entry.moonPhase].count++;
            acc[entry.moonPhase].totalMoodScore += calculateMoodScore(entry.mood, entry.intensity, entry.subMood);
          }
          return acc;
        }, {} as Record<string, { count: number; totalMoodScore: number }>),
        moodDistribution: entries.reduce((acc, entry) => {
          if (!acc[entry.mood]) acc[entry.mood] = 0;
          acc[entry.mood]++;
          return acc;
        }, {} as Record<string, number>),
        // Score-based mood distribution for consistent analytics across app
        scoreMoodDistribution: entries.reduce((acc, entry) => {
          const score = calculateMoodScore(entry.mood, entry.intensity, entry.subMood);
          if (score >= 4) acc.positive++;        // Excited + Happy moods (scores 4-5)
          else if (score >= 2.5) acc.neutral++;  // Neutral moods (scores 2.5-3.9) 
          else acc.challenging++;                // Sad + Anxious moods (scores 0-2.4)
          return acc;
        }, { positive: 0, neutral: 0, challenging: 0 }),
        periodDays: days
      };
      
      res.json(analytics);
    } catch (error) {
      console.error('❌ Analytics API Error:', error);
      
      // Return safe fallback data instead of crashing
      const fallbackAnalytics = {
        totalEntries: 0,
        averageMood: 0,
        moodsByPhase: {},
        moodDistribution: {},
        scoreMoodDistribution: { positive: 0, neutral: 0, challenging: 0 },
        periodDays: parseInt(req.query.days as string) || 30
      };
      
      // In production, return fallback data to prevent 500 errors
      if (process.env.NODE_ENV === 'production') {
        console.log('🔄 Production: Returning fallback analytics data');
        return res.json(fallbackAnalytics);
      }
      
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get community posts
  app.get("/api/community/posts", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const posts = await storage.getCommunityPosts(limit);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch community posts" });
    }
  });

  // Create community post
  app.post("/api/community/posts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const data = insertCommunityPostSchema.parse(req.body);
      const post = await storage.createCommunityPost({
        ...data,
        userId: userId
      });
      res.json(post);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid post data" });
    }
  });

  // Like community post
  app.post("/api/community/posts/:id/like", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      await storage.likeCommunityPost(postId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to like post" });
    }
  });


  // REMOVED - First duplicate logout route, using auth.ts implementation





  // REMOVED: Old /api/user endpoint - replaced by unified /api/auth/status
  // This endpoint was causing session conflicts by competing with the unified auth system

  // iOS-specific login endpoint - Direct token-based authentication
  app.post("/api/ios-login", async (req, res) => {
    console.log('📱 iOS Login: Request received');
    console.log('📱 iOS Login: Request body keys:', Object.keys(req.body || {}));
    try {
      const { username, password } = req.body;
      console.log('🍎 iOS Login: Authentication request for user:', username);

      if (!username || !password) {
        console.log('❌ iOS Login: Missing credentials');
        return res.status(400).json({ message: 'Username and password are required' });
      }

      // Find user by username or email (case-insensitive)
      const isEmail = username.includes('@');
      let user;
      
      if (isEmail) {
        user = await storage.getUserByEmail(username.toLowerCase().trim());
      } else {
        user = await storage.getUserByUsername(username.toLowerCase().trim());
      }

      if (!user) {
        console.log('❌ iOS Login: User not found:', username);
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      // Verify password with bcrypt (using imported bcrypt)
      let isPasswordValid = false;
      
      if (user.password && (user.password.startsWith('$2b$') || user.password.startsWith('$2a$'))) {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } else {
        // Legacy plain text password
        if (user.password === password) {
          isPasswordValid = true;
          // Auto-upgrade to hashed password
          const saltRounds = 12;
          const hashedPassword = await bcrypt.hash(password, saltRounds);
          await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));
        }
      }
      
      if (!isPasswordValid) {
        console.log('❌ iOS Login: Invalid password for user:', username);
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      console.log('✅ iOS Login: Password verified for user:', user.username);

      // Generate iOS authentication token with HMAC
      const { createHmac } = await import('crypto');
      const timestamp = Date.now();
      const tokenData = `${user.id}:${timestamp}`;
      const hash = createHmac('sha256', process.env.SESSION_SECRET || 'fallback').update(tokenData).digest('hex');
      const iosAuthToken = `${user.id}:${timestamp}:${hash}`;

      console.log('🔐 iOS Login: Generated secure token for user:', user.id);

      // Store token in database for verification
      try {
        await db.update(users)
          .set({ iosAuthToken: iosAuthToken })
          .where(eq(users.id, user.id));
        console.log('💾 iOS Login: Token stored in database');
      } catch (error) {
        console.error('❌ iOS Login: Failed to store token:', error);
        return res.status(500).json({ message: 'Failed to store authentication token' });
      }

      // Return success with token
      const responseData = {
        success: true,
        token: iosAuthToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role || 'user'
        },
        message: 'iOS authentication successful'
      };
      
      console.log('📱 iOS Login: Response being sent:');
      console.log('📱 iOS Login: Success:', responseData.success);
      console.log('📱 iOS Login: Token length:', responseData.token?.length);
      console.log('📱 iOS Login: User ID:', responseData.user.id);
      
      res.json(responseData);

      console.log('🎉 iOS Login: Authentication successful for user:', user.username);
    } catch (error) {
      console.error('💥 iOS Login: Unexpected error:', error);
      res.status(500).json({ message: 'Internal server error during iOS authentication' });
    }
  });

  // Login endpoint - supports both username and email
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log("=== LOGIN DEBUG ===");
      console.log("Login attempt:", { username, passwordLength: password?.length });
      console.log("Environment:", process.env.NODE_ENV);
      console.log("Session before login:", req.sessionID);
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username/email and password are required" });
      }
      
      // Determine if input is email or username
      const isEmail = username.includes('@');
      console.log("Login input detected as:", isEmail ? "email" : "username");
      
      // Look up user by username or email
      let user;
      if (isEmail) {
        user = await storage.getUserByEmail(username);
        console.log("Looking up user by email:", username);
      } else {
        user = await storage.getUserByUsername(username);
        console.log("Looking up user by username:", username);
      }
      
      if (!user) {
        console.log("User not found:", username);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Check password with backward compatibility for existing users
      let isPasswordValid = false;
      
      if (user.password && (user.password.startsWith('$2b$') || user.password.startsWith('$2a$'))) {
        // Password is already hashed with bcrypt
        isPasswordValid = await bcrypt.compare(password, user.password);
      } else {
        // Legacy plain text password - check and upgrade
        if (user.password === password) {
          isPasswordValid = true;
          
          // Automatically upgrade to hashed password
          console.log("Upgrading legacy password for user:", username);
          const saltRounds = 12;
          const hashedPassword = await bcrypt.hash(password, saltRounds);
          
          try {
            await db.update(users)
              .set({ password: hashedPassword })
              .where(eq(users.id, user.id));
            console.log("Password upgraded successfully for user:", username);
          } catch (error) {
            console.error("Failed to upgrade password:", error);
          }
        }
      }
      
      if (!isPasswordValid) {
        console.log("Invalid password for user:", username);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      console.log("User authenticated successfully:", user.id);
      
      // Check if user has 2FA enabled (applies to all users, not just admins)
      if (user.twoFactorEnabled) {
        const { twoFactorToken } = req.body;
        
        if (!twoFactorToken) {
          // User has 2FA enabled but no token provided
          return res.status(200).json({ 
            requiresTwoFactor: true,
            message: "Two-factor authentication required",
            userId: user.id 
          });
        }
        
        // Verify 2FA token
        const verification = verifyTwoFactorToken(
          twoFactorToken,
          user.twoFactorSecret!,
          user.twoFactorBackupCodes || []
        );
        
        if (!verification.isValid) {
          return res.status(401).json({ message: "Invalid two-factor authentication code" });
        }
        
        // If backup code was used, update the database
        if (verification.usedBackupCode) {
          const updatedCodes = removeUsedBackupCode(
            user.twoFactorBackupCodes || [],
            twoFactorToken
          );
          await storage.updateBackupCodes(user.id, updatedCodes);
        }
        
        console.log("2FA verification successful for user:", user.id);
      }
      
      console.log("Session object exists:", !!(req as any).session);
      console.log("Session ID:", (req as any).sessionID);
      
      if (!(req as any).session) {
        console.error("Session middleware not working - session is undefined");
        return res.status(500).json({ message: "Session configuration error" });
      }
      
      // Set session data properly
      (req as any).session.userId = user.id;
      (req as any).session.userRole = user.role || 'user';
      (req as any).session.user = {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role || 'user'
      };
      
      // Also use Passport session handling
      (req as any).login(user, (loginErr: any) => {
        if (loginErr) {
          console.error('❌ Passport login error:', loginErr);
        } else {
          console.log('✅ Passport login successful for user:', user.id);
        }
      });
      
      // Save session and respond immediately without reload verification
      (req as any).session.save(async (err: any) => {
        if (err) {
          console.error("❌ Login session save error:", err);
          return res.status(500).json({ message: "Session save failed" });
        }
        
        console.log("✅ LOGIN SUCCESS - Session saved:");
        console.log("  - Session ID:", (req as any).sessionID);
        console.log("  - Session userId:", (req as any).session.userId);
        console.log("  - Session user.id:", (req as any).session.user?.id);
        
        // Create iOS auth token for cross-platform compatibility
        const timestamp = Date.now();
        const tokenData = `${user.id}:${timestamp}`;
        const { createHmac } = await import('crypto');
        const hash = createHmac('sha256', process.env.SESSION_SECRET || 'fallback').update(tokenData).digest('hex');
        const iosAuthToken = `${user.id}:${timestamp}:${hash}`;
        
        // Store the iOS auth token in database for verification
        try {
          await db.update(users)
            .set({ iosAuthToken: iosAuthToken })
            .where(eq(users.id, user.id));
          console.log("✅ iOS auth token stored successfully");
        } catch (tokenError) {
          console.error('❌ Failed to store iOS auth token:', tokenError);
        }
        
        res.setHeader('X-iOS-Auth-Token', iosAuthToken);
        res.setHeader("Content-Type", "application/json");
        
        res.json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role || 'user'
          },
          iosAuthToken: iosAuthToken
        });
        
        console.log("🎉 Login successful - User authenticated and response sent");
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const { username, password, name, email, age, gender, guestId } = req.body;
      console.log("Registration attempt:", { username, email, name, age, gender, guestId });
      
      // Comprehensive input validation
      const validationErrors: string[] = [];
      
      // Username validation
      if (!username || !username.trim()) {
        validationErrors.push("Username is required");
      } else if (username.length < 3) {
        validationErrors.push("Username must be at least 3 characters");
      } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        validationErrors.push("Username can only contain letters, numbers, and underscores");
      }
      
      // Password validation
      if (!password) {
        validationErrors.push("Password is required");
      } else if (password.length < 6) {
        validationErrors.push("Password must be at least 6 characters");
      }
      
      // Full name validation
      if (!name || !name.trim()) {
        validationErrors.push("Name is required");
      } else if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) {
        validationErrors.push("Name can only contain letters, spaces, hyphens, and apostrophes");
      }
      
      // Email validation
      if (!email || !email.trim()) {
        validationErrors.push("Email is required");
      } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        validationErrors.push("Please enter a valid email address");
      }
      
      // Age validation
      if (age && (parseInt(age) < 13 || parseInt(age) > 120)) {
        validationErrors.push("Age must be between 13 and 120");
      }
      
      if (validationErrors.length > 0) {
        console.log("Validation errors:", validationErrors);
        return res.status(400).json({ message: validationErrors.join('; ') });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        console.log("Username already exists:", username);
        return res.status(400).json({ message: "Username already exists. Please choose a different username." });
      }
      
      // Check if email already exists
      const existingEmailUser = await storage.getUserByEmail(email);
      if (existingEmailUser) {
        console.log("Email already exists:", email);
        return res.status(400).json({ message: "Email address already exists. Please use a different email or sign in to your existing account." });
      }
      
      // Hash password before storing
      console.log("Hashing password...");
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Create new user
      console.log("Creating new user...");
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        name,
        email,
        age: age ? parseInt(age) : null,
        gender,
        role: 'user'
      });
      console.log("User created successfully:", newUser.id);
      
      // Transfer guest mood entries to new user account
      if (guestId) {
        try {
          console.log("Transferring guest entries for:", guestId);
          await storage.transferGuestEntries(guestId, newUser.id);
          console.log("Guest entries transferred successfully");
        } catch (transferError) {
          console.log("Warning: Could not transfer guest entries:", transferError);
        }
      }
      
      // Send welcome email (async, don't block registration) - no password in email for security
      if (email) {
        sendWelcomeEmail(email, name || username).then((emailSent) => {
          if (emailSent) {
            console.log("Welcome email sent successfully to:", email);
          } else {
            console.log("Failed to send welcome email to:", email);
          }
        }).catch((emailError) => {
          console.log("Welcome email error:", emailError);
        });
      }
      
      // Set session
      (req as any).session.userId = newUser.id;
      (req as any).session.user = { 
        id: newUser.id, 
        username: newUser.username,
        role: newUser.role || 'user' 
      };
      
      // Force session save
      (req as any).session.save((err: any) => {
        if (err) {
          console.error("Registration session save error:", err);
          return res.status(500).json({ message: "Session save failed" });
        }
        
        console.log("Registration session saved successfully for user:", newUser.id);
        
        res.json({ 
          success: true,
          user: {
            id: newUser.id,
            username: newUser.username,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role || 'user'
          }
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      console.error("Error details:", error instanceof Error ? error.message : "Unknown error");
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      res.status(500).json({ 
        message: "Registration failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // REMOVED - Second duplicate logout route, using auth.ts implementation

  // Forgot password endpoint removed - moved to proper location below

  // Debug endpoint for iOS testing
  app.get("/api/debug/test-auth", async (req, res) => {
    try {
      const testUsers = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role
      }).from(users).where(eq(users.username, 'iostest')).limit(1);
      
      res.json({
        server: 'running',
        timestamp: new Date().toISOString(),
        testUser: testUsers[0] || null,
        environment: process.env.NODE_ENV || 'unknown'
      });
    } catch (error) {
      res.status(500).json({ error: 'Debug endpoint failed', message: error.message });
    }
  });

  // Simple authentication status endpoint with iOS support
  app.get("/api/auth/status", async (req, res) => {
    try {
      const session = (req as any).session;
      const passportUser = (req as any).user;
      const iosAuthHeader = req.headers['x-ios-auth-token'] || req.headers['x-ios-auth'];
      
      console.log("🔍 Auth Status Debug:");
      console.log("  - Session exists:", !!session);
      console.log("  - Session ID:", session?.id);
      console.log("  - Session userId:", session?.userId);
      console.log("  - Session user:", session?.user?.id);
      console.log("  - Passport user:", passportUser?.id);
      console.log("  - iOS header:", !!iosAuthHeader);
      
      // Check iOS authentication first
      if (iosAuthHeader) {
        try {
          // Parse iOS auth token: userId:timestamp:hash
          const [userIdStr, timestampStr, hash] = iosAuthHeader.split(':');
          if (userIdStr && timestampStr && hash) {
            const userId = parseInt(userIdStr);
            const timestamp = parseInt(timestampStr);
            
            // Verify hash
            const tokenData = `${userId}:${timestamp}`;
            const { createHmac } = await import('crypto');
            const expectedHash = createHmac('sha256', process.env.SESSION_SECRET || 'fallback').update(tokenData).digest('hex');
            
            if (hash === expectedHash) {
              // Token is valid, load user and verify stored token
              const user = await storage.getUser(userId);
              if (user && user.iosAuthToken === iosAuthHeader) {
                console.log('✅ iOS token matched in database for user:', userId);
                return res.json({
                  isAuthenticated: true,
                  user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    role: user.role || 'user',
                    profileImageUrl: user.profileImageUrl,
                    age: user.age,
                    gender: user.gender,
                    notificationsEnabled: user.notificationsEnabled || false
                  }
                });
              }
            }
          }
        } catch (iosError) {
          console.error('iOS auth token verification failed:', iosError);
        }
      }
      
      // Check Passport user authentication first
      if (passportUser) {
        return res.json({
          isAuthenticated: true,
          user: {
            id: passportUser.id,
            username: passportUser.username,
            name: passportUser.name,
            email: passportUser.email,
            role: passportUser.role || 'user',
            profileImageUrl: passportUser.profileImageUrl,
            age: passportUser.age,
            gender: passportUser.gender,
            notificationsEnabled: passportUser.notificationsEnabled || false
          }
        });
      }
      
      // Check session-based authentication as fallback
      const sessionUserId = session?.userId || session?.user?.id;
      if (sessionUserId) {
        const user = await storage.getUser(sessionUserId);
        if (user) {
          return res.json({
            isAuthenticated: true,
            user: {
              id: user.id,
              username: user.username,
              name: user.name,
              email: user.email,
              role: user.role || 'user',
              profileImageUrl: user.profileImageUrl,
              age: user.age,
              gender: user.gender,
              notificationsEnabled: user.notificationsEnabled || false
            }
          });
        }
      }
      
      // Check passport authentication (Google OAuth)
      if (passportUser?.id) {
        const user = await storage.getUser(passportUser.id);
        if (user) {
          // Sync session data
          if (session && !sessionUserId) {
            session.userId = user.id;
            session.userRole = user.role || 'user';
          }
          
          return res.json({
            isAuthenticated: true,
            user: {
              id: user.id,
              username: user.username,
              name: user.name,
              email: user.email,
              role: user.role || 'user',
              profileImageUrl: user.profileImageUrl,
              age: user.age,
              gender: user.gender,
              notificationsEnabled: user.notificationsEnabled || false
            }
          });
        }
      }
      
      // No valid authentication found
      res.json({
        isAuthenticated: false,
        user: null
      });
    } catch (error) {
      console.error('Auth status check error:', error);
      res.status(500).json({
        isAuthenticated: false,
        user: null,
        error: 'Authentication check failed'
      });
    }
  });



  // Email notification preferences removed - only device notifications supported

  // Email test endpoint removed - email notifications disabled

  // Admin password reset endpoint removed - using backward compatibility in login



  // Password reset request - v2 to bypass cache
  app.post("/api/password-reset-request", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      console.log("🔄 Password reset requested for email:", email);
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        console.log("❌ User not found for email:", email);
        return res.json({ 
          success: true, 
          message: "If an account with that email exists, we've sent a password reset link." 
        });
      }
      
      // Generate secure reset token
      const resetToken = randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
      
      console.log("🔑 Generated reset token for user:", user.id);
      
      // Save reset token to database
      await storage.createPasswordResetToken(user.id, resetToken, tokenExpiry);
      
      // Create reset link - always use production domain for reset links
      const resetLink = `https://insidemeter.com/reset-password?token=${resetToken}`;
      
      console.log("📧 Attempting to send password reset email to:", user.email);
      
      // Send password reset email using SendGrid - ensure username is always included
      const displayName = user.username || user.name || 'User';
      console.log("🔤 Using display name for email:", displayName);
      const emailSent = await sendPasswordResetEmail(user.email!, displayName, resetLink);
      
      if (emailSent) {
        console.log("✅ Password reset email sent successfully to:", email);
        res.json({ 
          success: true, 
          message: "Password reset email sent successfully! Check your inbox." 
        });
      } else {
        console.error("❌ Failed to send password reset email to:", email);
        res.json({ 
          success: false, 
          message: "Failed to send password reset email. Please try again later." 
        });
      }
    } catch (error) {
      console.error("💥 Password reset error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Forgot password - generate reset token and send email
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      console.log("Password reset requested for email:", email);
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ 
          success: true, 
          message: "If an account with that email exists, we've sent a password reset link." 
        });
      }
      
      // Generate secure reset token
      const resetToken = randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
      
      // Save reset token to database
      await storage.createPasswordResetToken(user.id, resetToken, tokenExpiry);
      
      // Create reset link - always use production domain for reset links
      const resetLink = `https://insidemeter.com/reset-password?token=${resetToken}`;
      
      // Send password reset email - ensure username is always included
      const displayName = user.username || user.name || 'User';
      const emailSent = await sendPasswordResetEmail(user.email!, displayName, resetLink);
      
      if (emailSent) {
        console.log("Password reset email sent successfully to:", email);
      } else {
        console.error("Failed to send password reset email to:", email);
      }
      
      res.json({ 
        success: true, 
        message: "If an account with that email exists, we've sent a password reset link." 
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password with token
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      
      console.log("Password reset attempted with token:", token.substring(0, 8) + "...");
      
      // Find user by reset token
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      // Check if token has expired
      if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
        console.log("Reset token expired for user:", user.id);
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password and clear reset token
      await storage.updateUserPassword(user.id, hashedPassword);
      await storage.clearPasswordResetToken(user.id);
      
      console.log("Password reset successful for user:", user.id);
      
      res.json({ 
        success: true, 
        message: "Password has been reset successfully. You can now log in with your new password." 
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Verify reset token (for frontend validation)
  app.get("/api/verify-reset-token/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const user = await storage.getUserByResetToken(token);
      if (!user || !user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
        return res.status(400).json({ valid: false, message: "Invalid or expired reset token" });
      }
      
      res.json({ 
        valid: true, 
        email: user.email,
        username: user.username 
      });
    } catch (error) {
      console.error("Token verification error:", error);
      res.status(500).json({ valid: false, message: "Failed to verify token" });
    }
  });

  // Journal analytics endpoints
  app.get('/api/journal-analytics', async (req, res) => {
    try {
      const guestId = req.query.guestId as string;
      let userId: number | undefined;

      if (req.session?.userId) {
        userId = req.session.userId;
      } else if (guestId) {
        userId = generateGuestUserId(guestId);
      } else {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Get all daily journals and mood entries for the user
      const journals = await storage.getAllDailyJournals(userId);
      const moodEntries = await storage.getMoodEntriesByUser(userId, 1000); // Get more entries for comprehensive analysis
      
      if (journals.length === 0 && moodEntries.length === 0) {
        return res.json({
          emotionCloud: [],
          sentimentOverTime: [],
          topicFrequency: [],
          totalEntries: 0
        });
      }

      // Emotion Cloud Analysis - Include journal content AND sub-mood data
      let allText = journals.map(j => j.content).join(' ');
      
      // Add sub-mood data to the text analysis
      const subMoodText = moodEntries
        .filter(entry => entry.subMood && entry.subMood.trim() !== '')
        .map(entry => entry.subMood)
        .join(' ');
      
      allText = `${allText} ${subMoodText}`;
      const words = allText.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !['this', 'that', 'with', 'have', 'will', 'been', 'they', 'them', 'were', 'said', 'each', 'which', 'their', 'time', 'what', 'when', 'where', 'make', 'like', 'into', 'only', 'other', 'many', 'some', 'very', 'after', 'first', 'well', 'year', 'work', 'such', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'].includes(word));
      
      const wordCounts: Record<string, number> = {};
      words.forEach(word => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });

      const emotionCloud = Object.entries(wordCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([word, count]) => ({ word, count, sentiment: getSentimentScore(word) }));

      // Sentiment Over Time - Include both journals and mood entry notes
      const allEntries = [
        ...journals.map(journal => ({
          date: journal.date,
          content: journal.content,
          type: 'journal'
        })),
        ...moodEntries
          .filter(entry => entry.notes && entry.notes.trim() !== '')
          .map(entry => ({
            date: entry.date,
            content: entry.notes || '',
            type: 'mood'
          }))
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const sentimentOverTime = allEntries.map(entry => {
        const sentiment = analyzeSentiment(entry.content);
        return {
          date: entry.date,
          sentiment: sentiment,
          score: sentiment === 'positive' ? 1 : sentiment === 'negative' ? -1 : 0
        };
      }).slice(-30); // Last 30 entries

      // Topic Frequency Analysis
      const topicKeywords = {
        'Work': ['work', 'job', 'office', 'meeting', 'project', 'boss', 'colleague', 'deadline', 'stress', 'career'],
        'Relationships': ['love', 'friend', 'family', 'partner', 'relationship', 'date', 'marriage', 'boyfriend', 'girlfriend', 'spouse'],
        'Health': ['health', 'exercise', 'gym', 'run', 'walk', 'doctor', 'medicine', 'sick', 'pain', 'energy'],
        'Emotions': ['happy', 'sad', 'angry', 'excited', 'nervous', 'anxious', 'calm', 'peaceful', 'frustrated', 'joy'],
        'Activities': ['travel', 'vacation', 'movie', 'book', 'music', 'hobby', 'sport', 'game', 'shopping', 'cooking'],
        'Sleep': ['sleep', 'tired', 'rest', 'dream', 'insomnia', 'wake', 'nap', 'exhausted', 'sleepy', 'bed']
      };

      const topicCounts: Record<string, number> = {};
      Object.keys(topicKeywords).forEach(topic => {
        topicCounts[topic] = 0;
      });

      journals.forEach(journal => {
        const content = journal.content.toLowerCase();
        Object.entries(topicKeywords).forEach(([topic, keywords]) => {
          keywords.forEach(keyword => {
            if (content.includes(keyword)) {
              topicCounts[topic]++;
            }
          });
        });
      });

      const topicFrequency = Object.entries(topicCounts)
        .filter(([, count]) => count > 0)
        .map(([topic, count]) => ({ topic, count }))
        .sort((a, b) => b.count - a.count);

      res.json({
        emotionCloud,
        sentimentOverTime,
        topicFrequency,
        totalEntries: journals.length + moodEntries.filter(entry => entry.notes && entry.notes.trim() !== '').length
      });

    } catch (error) {
      console.error('Error fetching journal analytics:', error);
      res.status(500).json({ message: 'Failed to fetch journal analytics' });
    }
  });

  // Helper functions for sentiment analysis
  function getSentimentScore(word: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = [
      'happy', 'joy', 'love', 'excited', 'amazing', 'wonderful', 'great', 'good', 'beautiful', 'peaceful', 'calm', 'grateful', 'blessed', 'success', 'achieve', 'win', 'celebrate',
      'energized', 'motivated', 'celebratory', 'inspired', 'playful', 'creative', 'hopeful', 'fantastic', 'excellent', 'perfect', 'awesome', 'brilliant', 'fabulous', 'delighted',
      'thrilled', 'elated', 'content', 'satisfied', 'pleased', 'cheerful', 'optimistic', 'confident', 'proud', 'accomplished', 'fulfilled', 'blessed', 'thankful', 'appreciative',
      'radiant', 'vibrant', 'dynamic', 'enthusiastic', 'passionate', 'determined', 'focused', 'clear', 'bright', 'uplifting', 'refreshing', 'invigorating', 'rejuvenating'
    ];
    const negativeWords = [
      'sad', 'angry', 'hate', 'terrible', 'awful', 'bad', 'worst', 'pain', 'hurt', 'stress', 'anxious', 'worried', 'fear', 'fail', 'loss', 'difficult', 'problem',
      'disappointed', 'frustrated', 'depressed', 'overwhelmed', 'exhausted', 'tired', 'drained', 'defeated', 'hopeless', 'discouraged', 'upset', 'irritated', 'annoyed',
      'miserable', 'lonely', 'isolated', 'rejected', 'abandoned', 'betrayed', 'guilty', 'ashamed', 'embarrassed', 'confused', 'lost', 'stuck', 'blocked', 'struggling'
    ];
    
    if (positiveWords.includes(word)) return 'positive';
    if (negativeWords.includes(word)) return 'negative';
    return 'neutral';
  }

  function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    const positiveWords = [
      'happy', 'joy', 'love', 'excited', 'amazing', 'wonderful', 'great', 'good', 'beautiful', 'peaceful', 'calm', 'grateful', 'blessed', 'success', 'achieve', 'win', 'celebrate',
      'energized', 'motivated', 'celebratory', 'inspired', 'playful', 'creative', 'hopeful', 'fantastic', 'excellent', 'perfect', 'awesome', 'brilliant', 'fabulous', 'delighted',
      'thrilled', 'elated', 'content', 'satisfied', 'pleased', 'cheerful', 'optimistic', 'confident', 'proud', 'accomplished', 'fulfilled', 'blessed', 'thankful', 'appreciative',
      'radiant', 'vibrant', 'dynamic', 'enthusiastic', 'passionate', 'determined', 'focused', 'clear', 'bright', 'uplifting', 'refreshing', 'invigorating', 'rejuvenating'
    ];
    const negativeWords = [
      'sad', 'angry', 'hate', 'terrible', 'awful', 'bad', 'worst', 'pain', 'hurt', 'stress', 'anxious', 'worried', 'fear', 'fail', 'loss', 'difficult', 'problem',
      'disappointed', 'frustrated', 'depressed', 'overwhelmed', 'exhausted', 'tired', 'drained', 'defeated', 'hopeless', 'discouraged', 'upset', 'irritated', 'annoyed',
      'miserable', 'lonely', 'isolated', 'rejected', 'abandoned', 'betrayed', 'guilty', 'ashamed', 'embarrassed', 'confused', 'lost', 'stuck', 'blocked', 'struggling'
    ];

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  // Get all daily journal entries for user
  app.get("/api/daily-journal", async (req: any, res) => {
    try {
      // Use unified authentication from middleware
      let userId = req.userId; // Set by iOS middleware or session
      
      if (!userId) {
        console.log('🔍 Journal GET - No authentication found');
        return res.status(401).json({ message: "Authentication required" });
      }
      
      console.log('🔍 Journal GET - userId:', userId, 'isIOSAuth:', req.isIOSAuth);

      const journals = await storage.getAllDailyJournals(userId);
      res.json(journals || []);
    } catch (error) {
      console.error("Error fetching daily journals:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });

  // Get daily journal entry
  app.get("/api/daily-journal/:date", async (req: any, res) => {
    try {
      // Use unified authentication from middleware
      let userId = req.userId; // Set by iOS middleware or session
      
      if (!userId) {
        console.log('🔍 Journal GET date - No authentication found');
        return res.status(401).json({ message: "Authentication required" });
      }

      const { date } = req.params;
      const journal = await storage.getDailyJournal(userId, date);
      
      res.json(journal || { content: "" });
    } catch (error) {
      console.error("Error fetching daily journal:", error);
      res.status(500).json({ message: "Failed to fetch journal entry" });
    }
  });

  // Save daily journal entry
  app.post("/api/daily-journal", async (req: any, res) => {
    try {
      // Use unified authentication from middleware
      let userId = req.userId; // Set by iOS middleware or session
      
      console.log('🔍 Journal POST - userId:', userId, 'isIOSAuth:', req.isIOSAuth);
      
      if (!userId) {
        console.log("❌ Journal save failed - no valid user ID found");
        return res.status(401).json({ message: "Please log in to save your journal entry" });
      }

      const { date, content } = req.body;
      if (!date || content === undefined) {
        return res.status(400).json({ message: "Date and content are required" });
      }

      console.log(`✅ Saving journal for user ${userId} on ${date}`);
      const journal = await storage.createOrUpdateDailyJournal(userId, date, content);
      
      res.json(journal);
    } catch (error) {
      console.error("Error saving daily journal:", error);
      res.status(500).json({ message: "Failed to save journal entry" });
    }
  });

  // Test endpoint for notifications (development only)
  app.post("/api/notifications/test", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ message: "Not found" });
    }

    try {
      console.log("Manual notification test triggered");
      await sendTestNotifications();
      res.json({ success: true, message: "Test notifications sent" });
    } catch (error) {
      console.error("Error sending test notifications:", error);
      res.status(500).json({ message: "Failed to send test notifications" });
    }
  });

  // Admin middleware
  const requireAdmin = async (req: any, res: any, next: any) => {
    try {
      console.log("Admin middleware - checking session:", req.session);
      
      // Check for user ID in either session.user.id or session.userId formats
      const userId = req.session?.user?.id || req.session?.userId;
      
      if (!userId) {
        console.log("No session or user ID found");
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const user = await storage.getUser(userId);
      console.log("Found user for admin check:", user);
      
      if (!user) {
        console.log("User not found in database");
        return res.status(401).json({ message: "User not found" });
      }
      
      if (user.role !== 'admin') {
        console.log("User role is not admin:", user.role);
        return res.status(403).json({ message: "Admin access required" });
      }
      
      console.log("Admin access granted for user:", user.id);
      next();
    } catch (error) {
      console.error("Admin middleware error:", error);
      return res.status(500).json({ message: "Authentication check failed" });
    }
  };

  // Admin routes
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Temporary direct admin endpoint for debugging
  app.get("/api/admin/debug-users", async (req, res) => {
    try {
      const activity = await storage.getUserActivity();
      res.json(activity);
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(500).json({ message: "Failed to fetch user activity" });
    }
  });

  app.get("/api/admin/activity", requireAdmin, async (req, res) => {
    try {
      console.log("Fetching user activity for admin panel");
      const activity = await storage.getUserActivity();
      
      // Enhance with real-time Stripe subscription data
      const enhancedActivity = await Promise.all(activity.map(async (user) => {
        if (user.stripeSubscriptionId && !user.adminGrantedPro) {
          try {
            const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
            const isYearly = subscription.items.data.some(item => 
              item.price.recurring?.interval === 'year'
            );
            
            return {
              ...user,
              stripeSubscriptionType: isYearly ? 'yearly' : 'monthly',
              stripeActualStatus: subscription.status,
              stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
              stripeCurrentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null
            };
          } catch (stripeError) {
            console.error(`Error fetching Stripe data for user ${user.userId}:`, stripeError.message);
            return {
              ...user,
              stripeSubscriptionType: 'unknown',
              stripeActualStatus: 'error',
              stripeCancelAtPeriodEnd: false,
              stripeCurrentPeriodEnd: null
            };
          }
        }
        return {
          ...user,
          stripeSubscriptionType: user.adminGrantedPro ? 'admin_grant' : 'free',
          stripeActualStatus: user.subscriptionStatus || 'free',
          stripeCancelAtPeriodEnd: false,
          stripeCurrentPeriodEnd: null
        };
      }));
      
      console.log("Enhanced user activity data with Stripe details");
      res.json(enhancedActivity);
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(500).json({ message: "Failed to fetch user activity" });
    }
  });

  // Admin revenue analytics endpoint
  app.get("/api/admin/revenue-metrics", requireAdmin, async (req, res) => {
    try {
      console.log("Fetching revenue metrics for admin panel");
      const metrics = await storage.getRevenueMetrics();
      console.log("Revenue metrics data:", metrics);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching revenue metrics:", error);
      res.status(500).json({ message: "Failed to fetch revenue metrics" });
    }
  });

  // Admin endpoint to update user subscription
  app.post("/api/admin/update-subscription", requireAdmin, async (req, res) => {
    try {
      const { userId, tier } = req.body;
      
      if (!userId || !tier) {
        return res.status(400).json({ message: "User ID and tier are required" });
      }
      
      if (!['free', 'pro'].includes(tier)) {
        return res.status(400).json({ message: "Invalid subscription tier" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get admin user info for tracking
      const adminUserId = req.session?.user?.id || req.session?.userId;
      const adminUser = await storage.getUser(adminUserId);
      const adminUsername = adminUser ? adminUser.username : 'admin';
      
      // Update subscription based on tier
      const subscriptionData = tier === 'pro' ? {
        subscriptionTier: 'pro',
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        adminGrantedPro: true,
        adminGrantedDate: new Date(),
        adminGrantedBy: adminUsername,
      } : {
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        adminGrantedPro: false,
        adminGrantedDate: null,
        adminGrantedBy: null,
      };
      
      await storage.updateUserSubscription(userId, subscriptionData);
      
      // Send Pro upgrade email when admin upgrades user to pro
      if (tier === 'pro' && user.email && user.name) {
        try {
          await sendProUpgradeEmail(user.email, user.name || user.username);
          console.log(`Pro upgrade email sent to ${user.email}`);
        } catch (emailError) {
          console.error('Failed to send Pro upgrade email:', emailError);
          // Don't fail the upgrade if email fails
        }
      }
      
      console.log(`Admin ${adminUsername} updated user ${userId} subscription to ${tier}${tier === 'pro' ? ' (admin-granted)' : ''}`);
      res.json({ 
        message: `User subscription updated to ${tier}${tier === 'pro' ? ' (admin-granted)' : ''}`,
        userId,
        tier,
        adminGranted: tier === 'pro'
      });
    } catch (error) {
      console.error("Error updating user subscription:", error);
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  // Profile management endpoints
  
  // Change password
  app.post('/api/change-password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const { currentPassword, newPassword } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new passwords are required' });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }
      
      // Get user to verify current password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password || '');
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      
      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password
      await storage.updateUserPassword(userId, hashedNewPassword);
      
      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Failed to change password' });
    }
  });
  
  // Submit feedback
  app.post('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const { rating, feedback } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      if (!rating || !feedback || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Valid rating (1-5) and feedback text are required' });
      }
      
      // Get user information for the email
      const user = await storage.getUser(userId);
      const userInfo = user ? `${user.name || user.username} (${user.email || 'No email'})` : `User ID: ${userId}`;
      
      // Send feedback email to contact@yoganebula.com
      try {
        const emailSent = await sendEmail({
          to: 'contact@yoganebula.com',
          from: 'Samir Lal <contact@yoganebula.com>',
          subject: 'InsideMeter App Feedback',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4F46E5;">New Feedback Received</h2>
              
              <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #374151;">User Information</h3>
                <p style="margin: 5px 0;"><strong>User:</strong> ${userInfo}</p>
                <p style="margin: 5px 0;"><strong>Rating:</strong> ${rating}/5 ⭐</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              <div style="background: #FFFFFF; border: 1px solid #E5E7EB; padding: 20px; border-radius: 8px;">
                <h3 style="margin: 0 0 15px 0; color: #374151;">Feedback</h3>
                <p style="line-height: 1.6; color: #4B5563;">${feedback}</p>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center;">
                <p style="color: #6B7280; font-size: 14px;">
                  This feedback was submitted through the InsideMeter app
                </p>
              </div>
            </div>
          `,
          text: `
New Feedback Received

User: ${userInfo}
Rating: ${rating}/5
Date: ${new Date().toLocaleString()}

Feedback:
${feedback}

This feedback was submitted through the InsideMeter app.
          `
        });
        
        if (emailSent) {
          console.log(`Feedback email sent successfully for user ${userId}: Rating ${rating}/5`);
        } else {
          console.error(`Failed to send feedback email for user ${userId}`);
        }
      } catch (emailError) {
        console.error('Error sending feedback email:', emailError);
        // Don't fail the API call if email fails, just log it
      }
      
      // Log feedback for backup
      console.log(`Feedback received from user ${userId}: Rating ${rating}/5, Feedback: ${feedback}`);
      
      res.json({ success: true, message: 'Feedback submitted successfully' });
    } catch (error) {
      console.error('Submit feedback error:', error);
      res.status(500).json({ message: 'Failed to submit feedback' });
    }
  });
  
  // Get billing history
  app.get('/api/billing-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Get user subscription details to find Stripe customer ID
      const subscription = await storage.getUserSubscriptionDetails(userId);
      
      if (!subscription || !subscription.stripeCustomerId) {
        return res.json([]); // Return empty array if no subscription or customer ID
      }
      
      // Fetch invoices from Stripe
      const invoices = await stripe.invoices.list({
        customer: subscription.stripeCustomerId,
        limit: 10,
      });
      
      const billingHistory = invoices.data.map(invoice => ({
        id: invoice.id,
        date: new Date(invoice.created * 1000).toISOString(),
        description: invoice.description || `${invoice.lines.data[0]?.description || 'Subscription'} - ${new Date(invoice.created * 1000).toLocaleDateString()}`,
        amount: (invoice.amount_paid / 100).toFixed(2),
        status: invoice.status === 'paid' ? 'Paid' : invoice.status,
        downloadUrl: invoice.hosted_invoice_url,
      }));
      
      res.json(billingHistory);
    } catch (error) {
      console.error('Billing history error:', error);
      res.json([]); // Return empty array on error to show "no history" message
    }
  });
  
  // Get payment method
  app.get('/api/payment-method', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Get user subscription details to find Stripe customer ID
      const subscription = await storage.getUserSubscriptionDetails(userId);
      
      if (!subscription || !subscription.stripeCustomerId) {
        return res.json(null); // Return null if no subscription or customer ID
      }
      
      // Fetch payment methods from Stripe
      const paymentMethods = await stripe.paymentMethods.list({
        customer: subscription.stripeCustomerId,
        type: 'card',
      });
      
      if (paymentMethods.data.length === 0) {
        return res.json(null);
      }
      
      const card = paymentMethods.data[0].card;
      const user = await storage.getUser(userId);
      
      const paymentMethod = {
        id: paymentMethods.data[0].id,
        cardType: card?.brand?.toUpperCase() || 'CARD',
        last4: card?.last4 || '****',
        expMonth: card?.exp_month || '**',
        expYear: card?.exp_year || '****',
        holderName: user?.name || 'Card Holder',
      };
      
      res.json(paymentMethod);
    } catch (error) {
      console.error('Payment method error:', error);
      res.json(null); // Return null on error to show "no payment method" message
    }
  });

  // AI Insights endpoints for Pro users
  app.get('/api/ai/insights', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Check subscription status
      const subscription = await storage.getUserSubscriptionDetails(userId);
      if (!subscription || (subscription.subscriptionTier !== 'pro' && req.session?.userRole !== 'admin')) {
        return res.status(403).json({ message: 'Pro subscription required for AI insights' });
      }

      // Get user data for analysis
      const moodEntries = await storage.getMoodEntriesByUser(userId, 100);
      const journals = await storage.getAllDailyJournals(userId);
      
      if (moodEntries.length === 0) {
        return res.json({
          patterns: ["Start tracking your mood regularly to discover meaningful patterns"],
          recommendations: ["Begin by logging your mood daily to build a foundation for analysis"],
          moodTrends: "Not enough data yet - keep tracking to see your emotional patterns emerge",
          lunarCorrelations: "Lunar correlations will become visible after consistent tracking",
          emotionalWellness: "Your wellness journey is just beginning - every entry counts",
          actionItems: ["Track your mood daily", "Note activities that affect your emotions", "Be patient as patterns develop"]
        });
      }

      const insights = await generateMoodInsights(moodEntries, journals);
      res.json(insights);
    } catch (error) {
      console.error('Error generating AI insights:', error);
      res.status(500).json({ message: 'Failed to generate AI insights' });
    }
  });

  app.get('/api/ai/weekly-report', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Check subscription status
      const subscription = await storage.getUserSubscriptionDetails(userId);
      if (!subscription || (subscription.subscriptionTier !== 'pro' && req.session?.userRole !== 'admin')) {
        return res.status(403).json({ message: 'Pro subscription required for weekly reports' });
      }

      const moodEntries = await storage.getMoodEntriesByUser(userId, 50);
      const journals = await storage.getAllDailyJournals(userId);
      
      const report = await generateWeeklyReport(moodEntries, journals);
      res.json(report);
    } catch (error) {
      console.error('Error generating weekly report:', error);
      res.status(500).json({ message: 'Failed to generate weekly report' });
    }
  });

  app.post('/api/ai/mood-analysis', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Check subscription status for real-time analysis
      const subscription = await storage.getUserSubscriptionDetails(userId);
      if (!subscription || (subscription.subscriptionTier !== 'pro' && req.session?.userRole !== 'admin')) {
        return res.status(403).json({ message: 'Pro subscription required for AI mood analysis' });
      }

      const { mood, intensity, activities } = req.body;
      const recentEntries = await storage.getMoodEntriesByUser(userId, 10);
      
      const analysis = await analyzeMoodPattern(mood, intensity, activities, recentEntries);
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing mood pattern:', error);
      res.status(500).json({ message: 'Failed to analyze mood pattern' });
    }
  });

  // Historical Reports endpoint
  app.post('/api/ai/historical-report', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const subscription = await storage.getUserSubscriptionDetails(userId);
      if (!subscription || (subscription.subscriptionTier !== 'pro' && req.session?.userRole !== 'admin')) {
        return res.status(403).json({ message: 'Pro subscription required for historical reports' });
      }

      const { selectedActivities = [], selectedMoods = [], timeframe = '30 days' } = req.body;
      const moodEntries = await storage.getMoodEntriesByUser(userId, 200);
      
      const report = await generateHistoricalReport(moodEntries, selectedActivities, selectedMoods, timeframe);
      res.json(report);
    } catch (error) {
      console.error('Error generating historical report:', error);
      res.status(500).json({ message: 'Failed to generate historical report' });
    }
  });

  // Predictive Trends endpoint
  app.post('/api/ai/predictive-trends', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const subscription = await storage.getUserSubscriptionDetails(userId);
      if (!subscription || (subscription.subscriptionTier !== 'pro' && req.session?.userRole !== 'admin')) {
        return res.status(403).json({ message: 'Pro subscription required for predictive trends' });
      }

      const { birthDate } = req.body;
      const moodEntries = await storage.getMoodEntriesByUser(userId, 100);
      
      const trends = await generatePredictiveTrends(moodEntries, birthDate);
      res.json(trends);
    } catch (error) {
      console.error('Error generating predictive trends:', error);
      res.status(500).json({ message: 'Failed to generate predictive trends' });
    }
  });

  // NLP Guidance endpoint
  app.get('/api/ai/nlp-guidance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const subscription = await storage.getUserSubscriptionDetails(userId);
      if (!subscription || (subscription.subscriptionTier !== 'pro' && req.session?.userRole !== 'admin')) {
        return res.status(403).json({ message: 'Pro subscription required for NLP guidance' });
      }

      const moodEntries = await storage.getMoodEntriesByUser(userId, 50);
      const journals = await storage.getAllDailyJournals(userId);
      
      const guidance = await generateNLPGuidance(moodEntries, journals);
      res.json(guidance);
    } catch (error) {
      console.error('Error generating NLP guidance:', error);
      res.status(500).json({ message: 'Failed to generate NLP guidance' });
    }
  });

  // Advanced Analytics endpoint
  app.get('/api/ai/advanced-analytics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const subscription = await storage.getUserSubscriptionDetails(userId);
      if (!subscription || (subscription.subscriptionTier !== 'pro' && req.session?.userRole !== 'admin')) {
        return res.status(403).json({ message: 'Pro subscription required for advanced analytics' });
      }

      const moodEntries = await storage.getMoodEntriesByUser(userId, 200);
      
      const analytics = await generateAdvancedAnalytics(moodEntries);
      res.json(analytics);
    } catch (error) {
      console.error('Error generating advanced analytics:', error);
      res.status(500).json({ message: 'Failed to generate advanced analytics' });
    }
  });

  // Data export endpoint for Pro users
  app.get('/api/export/mood-data', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Check subscription status
      const subscription = await storage.getUserSubscriptionDetails(userId);
      if (!subscription || (subscription.subscriptionTier !== 'pro' && req.session?.userRole !== 'admin')) {
        return res.status(403).json({ message: 'Pro subscription required for data export' });
      }

      // Get all user data
      const moodEntries = await storage.getMoodEntriesByUser(userId, 10000); // Large limit for export
      const journals = await storage.getAllDailyJournals(userId);
      
      // Format as CSV
      let csvContent = 'Date,Mood,Intensity,Notes,Moon Phase,Moon Illumination,Activities\n';
      
      for (const entry of moodEntries) {
        const activities = Array.isArray(entry.activities) ? entry.activities.join(';') : '';
        const notes = entry.notes ? entry.notes.replace(/"/g, '""') : '';
        csvContent += `"${entry.date.toISOString().split('T')[0]}","${entry.mood}","${entry.intensity}","${notes}","${entry.moonPhase || ''}","${entry.moonIllumination || ''}","${activities}"\n`;
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="mood-data-export.csv"');
      res.send(csvContent);
    } catch (error) {
      console.error('Error exporting data:', error);
      res.status(500).json({ message: 'Failed to export data' });
    }
  });

  // Subscription endpoints - separate test routes for development
  app.post("/api/subscription/create-customer", async (req, res) => {
    try {
      // Use the same authentication pattern as other endpoints
      const guestId = req.query.guestId as string;
      let userId: number | undefined;

      if (req.session?.userId) {
        userId = req.session.userId;
      } else if (guestId) {
        userId = generateGuestUserId(guestId);
      } else {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const user = await storage.getUser(userId);
      
      if (!user || !user.email) {
        return res.status(400).json({ message: "User email is required for subscription" });
      }

      // Check if user already has a Stripe customer ID
      if (user.stripeCustomerId) {
        return res.json({ customerId: user.stripeCustomerId });
      }

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || user.username,
        metadata: {
          userId: user.id.toString()
        }
      });

      // Update user with Stripe customer ID
      await storage.updateUserSubscription(user.id, {
        stripeCustomerId: customer.id
      });

      res.json({ customerId: customer.id });
    } catch (error) {
      console.error("Error creating Stripe customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.post("/api/subscription/create-subscription", async (req, res) => {
    try {
      const { priceId, tier } = req.body;
      
      // Use the same authentication pattern as other endpoints
      const guestId = req.query.guestId as string;
      let userId: number | undefined;

      if (req.session?.userId) {
        userId = req.session.userId;
      } else if (guestId) {
        userId = generateGuestUserId(guestId);
      } else {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }



      // Regular Stripe subscription flow for real price IDs
      let customerId = user.stripeCustomerId;

      // Create customer if doesn't exist
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email!,
          name: user.name || user.username,
          metadata: { userId: user.id.toString() }
        });
        customerId = customer.id;
        
        await storage.updateUserSubscription(user.id, {
          stripeCustomerId: customerId
        });
      }

      // Create subscription with real Stripe price ID
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      // Update user subscription in database
      await storage.updateUserSubscription(user.id, {
        subscriptionTier: tier,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      // Send Pro subscription thank you email for pro tier upgrades
      if (tier === 'pro' && user.email && user.name) {
        try {
          await sendProSubscriptionThankYouEmail(user.email, user.name || user.username);
          console.log(`Pro subscription thank you email sent to ${user.email}`);
        } catch (emailError) {
          console.error('Failed to send Pro subscription thank you email:', emailError);
          // Don't fail the subscription upgrade if email fails
        }
      }

      res.json({
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        status: subscription.status
      });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.get("/api/subscription/status", isAuthenticated, async (req, res) => {
    try {
      // User is authenticated at this point due to middleware
      const userId = (req as any).user.id;



      const subscriptionDetails = await storage.getUserSubscriptionDetails(userId);
      
      if (!subscriptionDetails) {
        return res.json({
          subscriptionTier: 'free',
          subscriptionStatus: 'active',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          subscriptionEndDate: null,
          trialEndDate: null
        });
      }

      res.json(subscriptionDetails);
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  // Manual subscription sync endpoint
  app.post("/api/subscription/sync", async (req, res) => {
    try {
      const session = (req as any).session;
      
      if (!session?.userId) {
        return res.status(401).json({ 
          message: 'Authentication required for subscription sync',
          requiresLogin: true 
        });
      }

      const userId = session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeCustomerId) {
        return res.json({ 
          message: "No Stripe customer ID found",
          synced: false 
        });
      }

      console.log(`Syncing subscription for user ${userId} with Stripe customer ${user.stripeCustomerId}`);

      // Fetch active subscriptions from Stripe
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'active',
        limit: 1
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        const priceId = subscription.items.data[0]?.price.id;
        
        let tier = 'free';
        if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID || priceId === process.env.STRIPE_PRO_ANNUAL_PRICE_ID) {
          tier = 'pro';
        }

        console.log(`Found active subscription ${subscription.id} with tier ${tier} for user ${userId}`);

        // Update user subscription in database
        await storage.updateUserSubscription(userId, {
          subscriptionTier: tier as 'free' | 'pro',
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          subscriptionStartDate: new Date(subscription.created * 1000),
          subscriptionEndDate: new Date(subscription.current_period_end * 1000)
        });

        res.json({ 
          message: `Subscription synced successfully - upgraded to ${tier}`,
          synced: true,
          tier: tier,
          subscriptionId: subscription.id
        });
      } else {
        console.log(`No active subscriptions found for user ${userId}`);
        res.json({ 
          message: "No active subscriptions found",
          synced: false 
        });
      }
    } catch (error) {
      console.error("Error syncing subscription:", error);
      res.status(500).json({ message: "Failed to sync subscription" });
    }
  });



  // Function to determine subscription tier using Stripe as source of truth (FIXED LOGIC)
  const getUserSubscriptionTier = async (user: any) => {
        // Admin override always takes priority
        if (user.adminGrantedPro) {
          console.log("🔧 Admin-granted Pro access detected");
          return {
            tier: 'pro',
            source: 'admin',
            adminGrantedBy: user.adminGrantedBy,
            adminGrantedDate: user.adminGrantedDate
          };
        }
        
        // No Stripe subscription = free tier
        if (!user.stripeSubscriptionId) {
          console.log("📭 No Stripe subscription ID found");
          return {
            tier: 'free',
            source: 'no_subscription'
          };
        }
        
        try {
          // Fetch the user's Stripe subscription
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          console.log("📊 Stripe subscription status:", subscription.status, "period_end:", new Date(subscription.current_period_end * 1000));

          let hasProAccess = false;
          let accessReason = '';

          if (subscription.status === 'active' || subscription.status === 'trialing') {
            if (subscription.cancel_at_period_end) {
              // Subscription is active but set to cancel at period end (grace period)
              if (subscription.current_period_end) {
                const periodEndDate = new Date(subscription.current_period_end * 1000);
                const isValidDate = !isNaN(periodEndDate.getTime());
                hasProAccess = isValidDate ? new Date() < periodEndDate : true; // If date invalid, keep access
                accessReason = hasProAccess ? 'grace_period' : 'expired';
              } else {
                // No period end date, but subscription is still active - keep access
                hasProAccess = true;
                accessReason = 'grace_period';
              }
            } else {
              // Actively paid or in trial → full pro access
              hasProAccess = true;
              accessReason = subscription.status === 'trialing' ? 'trial' : 'active_subscription';
            }
          } else if (subscription.status === 'canceled' && subscription.current_period_end) {
            // Grace period: subscription canceled but current period still valid
            const periodEndDate = new Date(subscription.current_period_end * 1000);
            const isValidDate = !isNaN(periodEndDate.getTime());
            hasProAccess = isValidDate && new Date() < periodEndDate;
            accessReason = hasProAccess ? 'grace_period' : 'expired';
          }

          // Return current access level
          return {
            tier: hasProAccess ? 'pro' : 'free',
            source: 'stripe',
            stripeStatus: subscription.status,
            accessReason: accessReason,
            periodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
            cancelAtPeriodEnd: subscription.cancel_at_period_end || false
          };
        } catch (stripeError: any) {
          console.error("❌ Stripe API error:", stripeError.message);
          if (stripeError.code === 'resource_missing') {
            // Subscription doesn't exist in Stripe anymore
            return {
              tier: 'free',
              source: 'stripe_missing',
              error: 'Subscription not found in Stripe'
            };
          }
          throw stripeError;
        }
      };
  
  // Now the function is available to all endpoints below

  // Real-time subscription status endpoint using Stripe as source of truth
  app.get("/api/subscription/status-realtime", isAuthenticated, async (req, res) => {
    try {
      console.log("🔄 Real-time subscription status check");
      
      // Get user from authentication middleware
      const sessionUserId = (req as any).session?.userId || (req as any).session?.user?.id;
      const passportUserId = req.user?.id;
      let user;
      
      if (passportUserId) {
        user = await storage.getUser(passportUserId);
      } else if (sessionUserId) {
        user = await storage.getUser(sessionUserId);
      }
      
      if (!user) {
        console.error("❌ User not found in status endpoint");
        return res.status(400).json({ message: "User not found" });
      }

      console.log("✅ Checking subscription status for user:", user.id, user.email);

      const subscriptionInfo = await getUserSubscriptionTier(user);
      
      // Update local database to match Stripe reality (except for admin grants)
      if (subscriptionInfo.source === 'stripe' && subscriptionInfo.tier !== user.subscriptionTier) {
        console.log(`🔄 Syncing database: ${user.subscriptionTier} → ${subscriptionInfo.tier}`);
        await storage.updateUserSubscription(user.id, {
          subscriptionTier: subscriptionInfo.tier as 'free' | 'pro',
          subscriptionStatus: subscriptionInfo.stripeStatus || 'active'
        });
      }

      console.log("✅ Final subscription tier:", subscriptionInfo.tier, "source:", subscriptionInfo.source);

      res.json({
        tier: subscriptionInfo.tier,
        source: subscriptionInfo.source,
        details: subscriptionInfo
      });

    } catch (error) {
      console.error("❌ Error checking real-time subscription status:", error);
      res.status(500).json({ message: "Failed to check subscription status" });
    }
  });

  app.post("/api/subscription/cancel", isAuthenticated, async (req, res) => {
    try {
      console.log("🔄 Cancellation request received");
      console.log("🔍 req.user:", req.user?.id, req.user?.email);
      console.log("🔍 session:", (req as any).session?.userId, (req as any).session?.user?.id);
      
      // Get user from authentication middleware
      const sessionUserId = (req as any).session?.userId || (req as any).session?.user?.id;
      const passportUserId = req.user?.id;
      let user;
      
      if (passportUserId) {
        user = await storage.getUser(passportUserId);
      } else if (sessionUserId) {
        user = await storage.getUser(sessionUserId);
      }
      
      if (!user) {
        console.error("❌ User not found in cancellation endpoint");
        return res.status(400).json({ message: "User not found" });
      }
      
      console.log("✅ User found for cancellation:", user.id, user.email, user.stripeSubscriptionId);
      console.log("🔍 User subscription details:", {
        stripeSubscriptionId: user.stripeSubscriptionId,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        isDemoOrMissing: !user.stripeSubscriptionId || user.stripeSubscriptionId.startsWith('demo_')
      });

      // For demo subscriptions or users without Stripe subscription ID
      if (!user.stripeSubscriptionId || user.stripeSubscriptionId.startsWith('demo_')) {
        // Immediate downgrade to free for demo users
        await storage.updateUserSubscription(user.id, {
          subscriptionTier: 'free',
          subscriptionStatus: 'active',
          stripeSubscriptionId: null,
          subscriptionStartDate: new Date(),
          subscriptionEndDate: null
        });

        // Send cancellation email
        if (user.email && user.name) {
          try {
            await sendSubscriptionCancellationEmail(user.email, user.name || user.username);
            console.log(`Subscription cancellation email sent to ${user.email}`);
          } catch (emailError) {
            console.error('Failed to send cancellation email:', emailError);
            // Don't fail the cancellation if email fails
          }
        }

        return res.json({ 
          message: "Subscription canceled and downgraded to free tier",
          demo: true
        });
      }

      // Cancel real Stripe subscription at period end
      console.log("🔄 Attempting to cancel Stripe subscription:", user.stripeSubscriptionId);
      
      try {
        const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
          cancel_at_period_end: true
        });
        console.log("✅ Stripe subscription successfully cancelled");
        
        // Update user subscription status (only if Stripe call succeeded)
        await storage.updateUserSubscription(user.id, {
          subscriptionStatus: 'canceled'
        });

        // Send cancellation email
        if (user.email && user.name) {
          try {
            await sendSubscriptionCancellationEmail(user.email, user.name || user.username);
            console.log(`Subscription cancellation email sent to ${user.email}`);
          } catch (emailError) {
            console.error('Failed to send cancellation email:', emailError);
            // Don't fail the cancellation if email fails
          }
        }

        return res.json({ 
          message: "Subscription will be canceled at the end of the current period",
          subscription: "Subscription updated successfully"
        });
        
      } catch (stripeError: any) {
        console.error("❌ Stripe cancellation failed:", stripeError.message);
        console.error("❌ Stripe error code:", stripeError.code);
        
        // If subscription doesn't exist in Stripe, treat as already cancelled
        if (stripeError.code === 'resource_missing') {
          console.log("🔄 Subscription not found in Stripe - treating as already cancelled");
          
          // Update database to reflect cancellation
          await storage.updateUserSubscription(user.id, {
            subscriptionTier: 'free',
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: null,
            subscriptionStartDate: new Date(),
            subscriptionEndDate: new Date() // Immediate cancellation since it doesn't exist
          });

          // Send cancellation email
          if (user.email && user.name) {
            try {
              await sendSubscriptionCancellationEmail(user.email, user.name || user.username);
              console.log(`Subscription cancellation email sent to ${user.email}`);
            } catch (emailError) {
              console.error('Failed to send cancellation email:', emailError);
            }
          }

          return res.json({ 
            message: "Subscription was already cancelled and account has been downgraded to free tier",
            alreadyCancelled: true
          });
        }
        
        // Re-throw other Stripe errors
        throw stripeError;
      }
    } catch (error) {
      console.error("❌ Error canceling subscription:", error);
      console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  app.post("/api/subscription/downgrade", isAuthenticated, async (req, res) => {
    try {
      const { tier } = req.body;
      const session = (req as any).session;
      const user = await storage.getUser(session.userId);
      
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      // Demo downgrade - immediate tier change
      await storage.updateUserSubscription(user.id, {
        subscriptionTier: tier,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: tier === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      // Send cancellation email for downgrades to free tier
      if (tier === 'free' && user.email && user.name) {
        try {
          await sendSubscriptionCancellationEmail(user.email, user.name || user.username);
          console.log(`Subscription cancellation email sent to ${user.email}`);
        } catch (emailError) {
          console.error('Failed to send cancellation email:', emailError);
          // Don't fail the downgrade if email fails
        }
      }

      res.json({ 
        message: `Successfully changed to ${tier} tier`,
        tier: tier
      });
    } catch (error) {
      console.error("Error changing subscription:", error);
      res.status(500).json({ message: "Failed to change subscription" });
    }
  });

  // Create Stripe checkout session for subscription upgrades  
  app.post("/api/subscription/create-checkout-session", async (req, res) => {
    try {
      const { tier, billing = 'monthly' } = req.body;
      
      console.log('🔍 Subscription checkout request:', { tier, billing });
      
      // Use exact same session access pattern as working session-test endpoint
      const session = (req as any).session;
      
      console.log('🔍 Session check for subscription:', {
        hasSession: !!session,
        sessionId: session?.id,
        userId: session?.userId,
        userRole: session?.userRole,
        passportUser: req.user
      });
      
      // Check both session-based auth (regular login) and passport auth (Google OAuth)
      const userId = session?.userId || req.user?.id;
      
      if (!userId) {
        console.log('❌ No authenticated user found for subscription');
        return res.status(401).json({ 
          message: 'Authentication required for subscription',
          requiresLogin: true 
        });
      }

      console.log('✅ Authenticated user found for subscription:', userId);

      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      // Ensure Stripe price IDs are configured
      if (!process.env.STRIPE_PRO_MONTHLY_PRICE_ID || !process.env.STRIPE_PRO_ANNUAL_PRICE_ID) {
        console.error('Missing Stripe Price IDs configuration');
        return res.status(500).json({
          message: "Payment configuration error. Please contact support."
        });
      }

      // Real Stripe checkout session
      const priceIds = {
        pro: {
          monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_1234',
          annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || 'price_5678'
        }
      };

      const priceId = priceIds[tier as keyof typeof priceIds]?.[billing as keyof typeof priceIds.pro];
      
      if (!priceId) {
        return res.status(400).json({ message: "Invalid tier or billing period" });
      }

      // Create or get Stripe customer BEFORE creating checkout session
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        console.log('Creating new Stripe customer for user:', user.id, user.email);
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: user.name || user.username,
          metadata: {
            userId: user.id.toString()
          }
        });
        customerId = customer.id;
        
        // Update user with Stripe customer ID immediately
        await storage.updateUserSubscription(user.id, {
          stripeCustomerId: customerId
        });
        console.log('Stored Stripe customer ID:', customerId, 'for user:', user.id);
      }

      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,  // Use customer ID instead of customer_email
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.protocol}://${req.get('host')}/?subscription_success=true`,
        cancel_url: `${req.protocol}://${req.get('host')}/subscription?cancelled=true`,
        metadata: {
          userId: user.id.toString(),
          tier: tier
        }
      });

      res.json({ url: checkoutSession.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        tier: req.body.tier,
        billing: req.body.billing,
        userId: session?.userId,
        userEmail: user?.email,
        stripeError: error
      });
      res.status(500).json({ 
        message: "Failed to create checkout session",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Create Stripe setup session for adding payment methods
  app.post("/api/subscription/create-setup-session", async (req, res) => {
    try {
      // Use exact same session access pattern as working session-test endpoint
      const session = (req as any).session;
      
      if (!session?.userId) {
        return res.status(401).json({ 
          message: 'Authentication required for payment setup',
          requiresLogin: true 
        });
      }

      const userId = session.userId;

      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      // For demo mode, return demo setup URL
      if (process.env.NODE_ENV === 'development' || !process.env.STRIPE_SECRET_KEY) {
        return res.json({
          url: `${req.protocol}://${req.get('host')}/profile?demo_payment_setup=true`,
          demo: true
        });
      }

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: user.name || user.username,
          metadata: {
            userId: user.id.toString()
          }
        });
        customerId = customer.id;
        
        // Update user with Stripe customer ID
        await storage.updateUserSubscription(user.id, {
          stripeCustomerId: customerId
        });
      }

      // Create setup session for adding payment methods
      const setupSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'setup',
        success_url: `${req.protocol}://${req.get('host')}/?setup_success=true`,
        cancel_url: `${req.protocol}://${req.get('host')}/profile?setup_cancelled=true`,
        metadata: {
          userId: user.id.toString()
        }
      });

      res.json({ url: setupSession.url });
    } catch (error) {
      console.error("Error creating setup session:", error);
      console.error("Setup session error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        userId,
        userEmail: user?.email,
        isDemoMode: process.env.NODE_ENV === 'development' || !process.env.STRIPE_SECRET_KEY
      });
      res.status(500).json({ 
        message: "Failed to create payment setup session",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Apple In-App Purchase sync endpoint removed - iOS subscription functionality disabled

  // REMOVED - Duplicate cancel subscription endpoint
  // The working version is above at line 2662

  // Create billing portal session
  app.post("/api/subscription/billing-portal", isAuthenticated, async (req, res) => {
    const session = req.session as any;
    const userId = session?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: "No billing information found" });
      }

      // Create billing portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${req.protocol}://${req.get('host')}/profile`,
      });

      res.json({ url: portalSession.url });
    } catch (error: any) {
      console.error("Error creating billing portal session:", error);
      
      // Handle specific Stripe billing portal configuration error
      if (error.code === 'invalid_request_error' && error.message.includes('No configuration provided')) {
        return res.status(400).json({ 
          message: "Billing portal not configured",
          error: "The billing portal needs to be configured in your Stripe dashboard before customers can access it. Please visit https://dashboard.stripe.com/settings/billing/portal to set up your customer portal.",
          configurationRequired: true
        });
      }
      
      res.status(500).json({ 
        message: "Failed to create billing portal session",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Stripe webhook handler for subscription updates
  app.post("/api/stripe/webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      // Note: You'll need to set STRIPE_WEBHOOK_SECRET in production
      event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          const customerId = session.customer as string;
          
          console.log('Checkout session completed:', session.id, 'for customer:', customerId);
          
          // Find user by Stripe customer ID
          const users = await storage.getAllUsers();
          const user = users.find(u => u.stripeCustomerId === customerId);
          
          if (user && session.subscription) {
            // Fetch the subscription details
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
            
            // Determine tier based on price ID
            const priceId = subscription.items.data[0]?.price.id;
            let tier = 'free';
            
            if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID || priceId === process.env.STRIPE_PRO_ANNUAL_PRICE_ID) {
              tier = 'pro';
            }
            
            console.log(`Updating user ${user.id} to ${tier} tier with subscription ${subscription.id}`);
            console.log('🔍 Subscription period details:', {
              current_period_start: subscription.current_period_start,
              current_period_end: subscription.current_period_end,
              status: subscription.status
            });
            
            // Safely convert Stripe timestamps to Date objects
            const subscriptionEndDate = subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000)
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default to 30 days from now
            
            console.log('🔍 Calculated end date:', subscriptionEndDate);
            
            // Update user subscription in database
            await storage.updateUserSubscription(user.id, {
              subscriptionTier: tier as 'free' | 'pro',
              stripeSubscriptionId: subscription.id,
              subscriptionStatus: subscription.status,
              subscriptionStartDate: new Date(),
              subscriptionEndDate: subscriptionEndDate
            });
            
            console.log(`Successfully updated user ${user.id} subscription status`);
            
            // Send Pro subscription thank you email for pro tier upgrades
            if (tier === 'pro' && user.email) {
              try {
                const displayName = user.name || user.username || 'InsideMeter User';
                console.log(`Sending Pro subscription thank you email to ${user.email} (${displayName})`);
                await sendProSubscriptionThankYouEmail(user.email, displayName);
                console.log(`✅ Pro subscription thank you email sent successfully to ${user.email}`);
              } catch (emailError) {
                console.error('❌ Failed to send Pro subscription thank you email:', emailError);
                console.error('Email error details:', emailError);
              }
            } else {
              console.log(`⚠️ Pro subscription email NOT sent - tier: ${tier}, email: ${user.email ? 'present' : 'missing'}`);
            }
          } else {
            console.error('User not found for customer ID:', customerId);
          }
          break;

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object as Stripe.Subscription;
          const subscriptionCustomerId = subscription.customer as string;
          
          // Find user by Stripe customer ID
          const allUsers = await storage.getAllUsers();
          const subscriptionUser = allUsers.find(u => u.stripeCustomerId === subscriptionCustomerId);
          
          if (subscriptionUser) {
            // Safely convert Stripe timestamp
            const endDate = subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000)
              : null;
            
            await storage.updateUserSubscription(subscriptionUser.id, {
              subscriptionStatus: subscription.status,
              subscriptionEndDate: endDate
            });
          }
          break;

        case 'invoice.payment_succeeded':
          // Handle successful payment
          const invoice = event.data.object as Stripe.Invoice;
          console.log('Payment succeeded for invoice:', invoice.id);
          break;

        case 'invoice.payment_failed':
          // Handle failed payment
          const failedInvoice = event.data.object as Stripe.Invoice;
          console.log('Payment failed for invoice:', failedInvoice.id);
          break;
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Manual subscription sync endpoint for admin use
  app.post("/api/admin/sync-subscription", requireAdmin, async (req, res) => {
    try {
      const { userEmail, subscriptionTier = 'pro' } = req.body;
      
      if (!userEmail) {
        return res.status(400).json({ message: "User email is required" });
      }
      
      const user = await storage.getUserByEmail(userEmail);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Manually sync subscription
      await storage.updateUserSubscription(user.id, {
        subscriptionTier: subscriptionTier as 'free' | 'pro',
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: subscriptionTier === 'pro' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
      });
      
      console.log(`Admin manually synced subscription for ${userEmail} to ${subscriptionTier}`);
      
      res.json({ 
        success: true,
        message: `Successfully updated ${userEmail} to ${subscriptionTier} tier`,
        user: {
          id: user.id,
          email: user.email,
          tier: subscriptionTier
        }
      });
    } catch (error) {
      console.error("Error syncing subscription:", error);
      res.status(500).json({ message: "Failed to sync subscription" });
    }
  });

  // Admin monitoring endpoints
  app.get("/api/admin/monitoring/system", requireAdmin, async (req, res) => {
    try {
      const metrics = await storage.getSystemMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching system metrics:", error);
      res.status(500).json({ message: "Failed to fetch system metrics" });
    }
  });

  app.get("/api/admin/monitoring/performance", requireAdmin, async (req, res) => {
    try {
      const metrics = await storage.getPerformanceMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });

  app.get("/api/admin/monitoring/engagement", requireAdmin, async (req, res) => {
    try {
      const data = await storage.getUserEngagementData();
      res.json(data);
    } catch (error) {
      console.error("Error fetching engagement data:", error);
      res.status(500).json({ message: "Failed to fetch engagement data" });
    }
  });

  app.get("/api/admin/monitoring/business", requireAdmin, async (req, res) => {
    try {
      const metrics = await storage.getBusinessMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching business metrics:", error);
      res.status(500).json({ message: "Failed to fetch business metrics" });
    }
  });

  // Debug endpoint for purchase attempts (remove in production)
  app.post("/api/debug/purchase-attempt", async (req, res) => {
    try {
      const debugData = req.body;
      console.log('🛒 PURCHASE ATTEMPT DEBUG:', JSON.stringify(debugData, null, 2));
      
      // Log to console for debugging
      console.group('📱 Purchase Debug Details');
      console.log('Platform:', debugData.platform);
      console.log('Product ID:', debugData.productId);
      console.log('Will Use Apple IAP:', debugData.shouldUseAppleIAP);
      console.log('Will Use Stripe:', debugData.willUseStripe);
      console.log('Timestamp:', debugData.timestamp);
      console.log('User Agent:', debugData.userAgent?.substring(0, 100) + '...');
      console.groupEnd();
      
      res.json({ success: true, message: 'Debug data logged' });
    } catch (error) {
      console.error('Debug logging error:', error);
      res.json({ success: false, message: 'Debug logging failed' });
    }
  });

  // 2FA Routes for Admin Security
  app.post("/api/admin/2fa/setup", requireAdmin, async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (user.twoFactorEnabled) {
        return res.status(400).json({ message: "2FA is already enabled" });
      }

      const { secret, qrCodeUrl, backupCodes } = generateTwoFactorSecret(user.username);
      const qrCodeDataUrl = await generateQRCodeDataUrl(qrCodeUrl);

      // Temporarily store secret (not saved to DB until verified)
      req.session.tempTwoFactorSecret = secret;
      req.session.tempBackupCodes = backupCodes;

      res.json({
        qrCodeDataUrl,
        backupCodes,
        secret, // Include for manual entry if QR doesn't work
      });
    } catch (error) {
      console.error("2FA setup error:", error);
      res.status(500).json({ message: "Failed to setup 2FA" });
    }
  });

  app.post("/api/admin/2fa/verify-setup", requireAdmin, async (req, res) => {
    try {
      const { token } = req.body;
      const userId = req.session?.userId;
      const tempSecret = req.session?.tempTwoFactorSecret;
      const tempBackupCodes = req.session?.tempBackupCodes;

      if (!userId || !tempSecret || !tempBackupCodes) {
        return res.status(400).json({ message: "2FA setup session expired" });
      }

      const verification = verifyTwoFactorToken(token, tempSecret);
      if (!verification.isValid) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // Save 2FA settings to database
      await storage.setupTwoFactor(userId, tempSecret, tempBackupCodes);

      // Clear temporary session data
      delete req.session.tempTwoFactorSecret;
      delete req.session.tempBackupCodes;

      res.json({ message: "2FA successfully enabled" });
    } catch (error) {
      console.error("2FA verification error:", error);
      res.status(500).json({ message: "Failed to verify 2FA" });
    }
  });

  app.post("/api/admin/2fa/verify", async (req, res) => {
    try {
      const { token } = req.body;
      const userId = req.session?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(400).json({ message: "2FA not enabled" });
      }

      const verification = verifyTwoFactorToken(
        token,
        user.twoFactorSecret,
        user.twoFactorBackupCodes || []
      );

      if (!verification.isValid) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // If backup code was used, remove it from the list
      if (verification.usedBackupCode) {
        const updatedCodes = removeUsedBackupCode(
          user.twoFactorBackupCodes || [],
          token
        );
        await storage.updateBackupCodes(userId, updatedCodes);

        // Check if backup codes are running low
        const lowBackupCodes = hasLowBackupCodes(updatedCodes);
        
        res.json({
          verified: true,
          usedBackupCode: true,
          remainingBackupCodes: updatedCodes.length,
          lowBackupCodes,
        });
      } else {
        res.json({ verified: true });
      }
    } catch (error) {
      console.error("2FA verification error:", error);
      res.status(500).json({ message: "Failed to verify 2FA" });
    }
  });

  app.get("/api/admin/2fa/status", requireAdmin, async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        enabled: user.twoFactorEnabled || false,
        backupCodesCount: user.twoFactorBackupCodes?.length || 0,
        lowBackupCodes: hasLowBackupCodes(user.twoFactorBackupCodes || []),
      });
    } catch (error) {
      console.error("2FA status error:", error);
      res.status(500).json({ message: "Failed to get 2FA status" });
    }
  });

  app.post("/api/admin/2fa/disable", requireAdmin, async (req, res) => {
    try {
      const { token } = req.body;
      const userId = req.session?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorEnabled) {
        return res.status(400).json({ message: "2FA not enabled" });
      }

      // Verify current 2FA token before disabling
      const verification = verifyTwoFactorToken(
        token,
        user.twoFactorSecret!,
        user.twoFactorBackupCodes || []
      );

      if (!verification.isValid) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      await storage.disableTwoFactor(userId);
      res.json({ message: "2FA successfully disabled" });
    } catch (error) {
      console.error("2FA disable error:", error);
      res.status(500).json({ message: "Failed to disable 2FA" });
    }
  });

  app.post("/api/admin/2fa/regenerate-backup-codes", requireAdmin, async (req, res) => {
    try {
      const { token } = req.body;
      const userId = req.session?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorEnabled) {
        return res.status(400).json({ message: "2FA not enabled" });
      }

      // Verify current 2FA token before regenerating codes
      const verification = verifyTwoFactorToken(
        token,
        user.twoFactorSecret!,
        user.twoFactorBackupCodes || []
      );

      if (!verification.isValid) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      const newBackupCodes = generateNewBackupCodes();
      await storage.updateBackupCodes(userId, newBackupCodes);

      res.json({ 
        message: "Backup codes regenerated successfully",
        backupCodes: newBackupCodes 
      });
    } catch (error) {
      console.error("Backup codes regeneration error:", error);
      res.status(500).json({ message: "Failed to regenerate backup codes" });
    }
  });

  // ========== USER 2FA ENDPOINTS ==========
  
  // Get user 2FA status
  app.get("/api/user/2fa/status", isAuthenticated, async (req: any, res) => {
    try {
      // Get userId from either session (web) or authenticated user (iOS)
      const userId = req.session?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const backupCodesCount = user.twoFactorBackupCodes?.length || 0;
      const lowBackupCodes = backupCodesCount <= 3;

      res.json({
        enabled: user.twoFactorEnabled || false,
        backupCodesCount,
        lowBackupCodes
      });
    } catch (error) {
      console.error("User 2FA status error:", error);
      res.status(500).json({ message: "Failed to fetch 2FA status" });
    }
  });

  // Initialize user 2FA setup
  app.post("/api/user/2fa/setup", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.twoFactorEnabled) {
        return res.status(400).json({ message: "2FA is already enabled" });
      }

      const { secret, qrCodeDataUrl, backupCodes } = await setupTwoFactor(user.username, "insidemeter.com");

      // Store temporary data in session
      req.session.tempTwoFactorSecret = secret;
      req.session.tempBackupCodes = backupCodes;

      res.json({
        qrCodeDataUrl,
        secret,
        backupCodes
      });
    } catch (error) {
      console.error("User 2FA setup error:", error);
      res.status(500).json({ message: "Failed to initialize 2FA setup" });
    }
  });

  // Verify and complete user 2FA setup
  app.post("/api/user/2fa/verify-setup", isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.body;
      const userId = req.session?.userId;
      const tempSecret = req.session?.tempTwoFactorSecret;
      const tempBackupCodes = req.session?.tempBackupCodes;

      if (!userId || !tempSecret || !tempBackupCodes) {
        return res.status(400).json({ message: "Invalid setup session" });
      }

      // Verify the token with temporary secret
      if (!verifyTwoFactorToken(token, tempSecret, [])) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // Save 2FA settings to user
      await storage.update2FASettings(userId, {
        twoFactorSecret: tempSecret,
        twoFactorEnabled: true,
        twoFactorBackupCodes: tempBackupCodes
      });

      // Clear temporary data
      delete req.session.tempTwoFactorSecret;
      delete req.session.tempBackupCodes;

      res.json({ message: "2FA successfully enabled" });
    } catch (error) {
      console.error("User 2FA verify error:", error);
      res.status(500).json({ message: "Failed to enable 2FA" });
    }
  });

  // Disable user 2FA
  app.post("/api/user/2fa/disable", isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.body;
      const userId = req.session?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorEnabled) {
        return res.status(400).json({ message: "2FA not enabled" });
      }

      // Verify current 2FA token before disabling
      const verification = verifyTwoFactorToken(
        token,
        user.twoFactorSecret!,
        user.twoFactorBackupCodes || []
      );

      if (!verification) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // Disable 2FA
      await storage.update2FASettings(userId, {
        twoFactorSecret: null,
        twoFactorEnabled: false,
        twoFactorBackupCodes: null
      });

      res.json({ message: "2FA successfully disabled" });
    } catch (error) {
      console.error("User 2FA disable error:", error);
      res.status(500).json({ message: "Failed to disable 2FA" });
    }
  });

  // Regenerate user backup codes
  app.post("/api/user/2fa/regenerate-backup-codes", isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.body;
      const userId = req.session?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorEnabled) {
        return res.status(400).json({ message: "2FA not enabled" });
      }

      // Verify current 2FA token before regenerating codes
      const verification = verifyTwoFactorToken(
        token,
        user.twoFactorSecret!,
        user.twoFactorBackupCodes || []
      );

      if (!verification) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // Generate new backup codes
      const newBackupCodes = generateBackupCodes();

      // Update user with new backup codes
      await storage.update2FASettings(userId, {
        twoFactorBackupCodes: newBackupCodes
      });

      res.json({ 
        message: "Backup codes regenerated successfully",
        backupCodes: newBackupCodes 
      });
    } catch (error) {
      console.error("User backup codes regeneration error:", error);
      res.status(500).json({ message: "Failed to regenerate backup codes" });
    }
  });

  // ========== USER NOTIFICATION SETTINGS ENDPOINTS ==========
  
  // Get user notification settings
  app.get("/api/user/notification-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        emailNotificationsEnabled: user.emailNotificationsEnabled || false,
        notificationEmail: user.notificationEmail,
        email: user.email,
        smsNotificationsEnabled: user.smsNotificationsEnabled || false,
        notificationPhone: user.notificationPhone
      });
    } catch (error) {
      console.error("Get notification settings error:", error);
      res.status(500).json({ message: "Failed to fetch notification settings" });
    }
  });

  // Debug endpoint for iOS platform detection
  app.post("/api/debug/platform-detection", async (req, res) => {
    try {
      const debugInfo = req.body;
      console.log('📱 PLATFORM DETECTION DEBUG:', JSON.stringify(debugInfo, null, 2));
      res.json({ success: true, received: debugInfo });
    } catch (error) {
      console.error('Debug endpoint error:', error);
      res.status(500).json({ message: 'Debug logging failed' });
    }
  });

  // Update user notification settings
  app.post("/api/user/update-notification-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { emailEnabled, email } = req.body;

      // Validate email if email notifications are being enabled
      if (emailEnabled && (!email || !email.includes('@'))) {
        return res.status(400).json({ message: "Valid email address required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update notification settings
      await storage.updateUserNotificationSettings(userId, {
        emailNotificationsEnabled: emailEnabled,
        notificationEmail: emailEnabled ? email : null
      });

      res.json({ 
        message: emailEnabled ? "Email notifications enabled" : "Email notifications disabled",
        emailNotificationsEnabled: emailEnabled,
        notificationEmail: emailEnabled ? email : null
      });
    } catch (error) {
      console.error("Update notification settings error:", error);
      res.status(500).json({ message: "Failed to update notification settings" });
    }
  });

  // SMS notification settings endpoint
  app.post("/api/user/sms-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { smsEnabled, phoneNumber } = req.body;

      // Validate phone number if SMS notifications are being enabled
      if (smsEnabled && (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 10)) {
        return res.status(400).json({ message: "Valid phone number required (at least 10 digits)" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update SMS notification settings
      await storage.updateUserSmsSettings(userId, {
        smsNotificationsEnabled: smsEnabled,
        notificationPhone: smsEnabled ? phoneNumber : null
      });

      res.json({ 
        message: smsEnabled ? "SMS notifications enabled" : "SMS notifications disabled",
        smsNotificationsEnabled: smsEnabled,
        notificationPhone: smsEnabled ? phoneNumber : null
      });
    } catch (error) {
      console.error("Update SMS settings error:", error);
      res.status(500).json({ message: "Failed to update SMS settings" });
    }
  });

  // Test SMS notifications endpoint
  app.post("/api/test-sms-notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.smsNotificationsEnabled || !user.notificationPhone) {
        return res.status(400).json({ message: "SMS notifications not enabled or phone number not set" });
      }

      const { sendTestSMS } = await import("./sms");
      const userName = user.name || user.username || 'Friend';
      const success = await sendTestSMS(user.notificationPhone, userName);

      if (success) {
        res.json({ message: "Test SMS sent successfully" });
      } else {
        res.status(500).json({ 
          message: "Failed to send test SMS - SMS may not be available in your region",
          details: "Twilio SMS service has geographic limitations. Your phone number region may not be enabled for SMS delivery."
        });
      }
    } catch (error) {
      console.error("Test SMS error:", error);
      res.status(500).json({ 
        message: "Failed to send test SMS due to service restrictions",
        details: "SMS delivery may not be available in your region due to Twilio geographic limitations"
      });
    }
  });

  // Phone verification endpoints
  app.post("/api/phone/send-verification", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { phoneNumber } = req.body;
      
      if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 10) {
        return res.status(400).json({ message: "Valid phone number required" });
      }

      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save verification code to user record
      await storage.updateUserPhoneVerification(userId, {
        phoneVerificationCode: verificationCode,
        phoneVerificationExpiry: expiryTime
      });

      // Send SMS with verification code
      const { sendPhoneVerificationSMS } = await import("./sms");
      const success = await sendPhoneVerificationSMS(phoneNumber, verificationCode);

      if (success) {
        res.json({ message: "Verification code sent successfully" });
      } else {
        res.status(500).json({ 
          message: "Failed to send verification SMS",
          details: "SMS service may not be available in your region"
        });
      }
    } catch (error) {
      console.error("Phone verification error:", error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  app.post("/api/phone/verify-code", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { phoneNumber, verificationCode } = req.body;
      
      if (!phoneNumber || !verificationCode) {
        return res.status(400).json({ message: "Phone number and verification code required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if code matches and hasn't expired
      if (user.phoneVerificationCode !== verificationCode) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      if (!user.phoneVerificationExpiry || new Date() > user.phoneVerificationExpiry) {
        return res.status(400).json({ message: "Verification code has expired" });
      }

      // Mark phone as verified and enable SMS notifications
      await storage.updateUserSmsSettings(userId, {
        smsNotificationsEnabled: true,
        notificationPhone: phoneNumber,
        phoneVerified: true,
        phoneVerificationCode: null,
        phoneVerificationExpiry: null
      });

      res.json({ 
        message: "Phone number verified successfully", 
        phoneVerified: true,
        smsNotificationsEnabled: true
      });
    } catch (error) {
      console.error("Phone verification error:", error);
      res.status(500).json({ message: "Failed to verify phone number" });
    }
  });

  // Domain reputation and security endpoints
  app.get('/.well-known/security.txt', (req, res) => {
    res.type('text/plain');
    res.send(`Contact: contact@yoganebula.com
Expires: 2025-12-31T23:59:59.000Z
Acknowledgments: https://insidemeter.com/security
Preferred-Languages: en
Canonical: https://insidemeter.com/.well-known/security.txt
Policy: https://insidemeter.com/privacy

# Inside Meter Security Contact
# A YogaNebula Initiative - Established 2014
# Responsible disclosure encouraged`);
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'Inside Meter API',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  });

  app.get('/status', (req, res) => {
    res.json({
      service: 'Inside Meter - Track. Reflect. Transform.',
      status: 'operational',
      uptime: process.uptime(),
      category: 'Health & Wellness Application',
      organization: 'YogaNebula Initiative',
      established: '2014',
      contact: 'contact@yoganebula.com'
    });
  });

  // Analytics tracking endpoint for cookie consent
  app.post('/api/analytics/track', async (req, res) => {
    try {
      const { type, data, tracking_id, session_id } = req.body;
      
      // Basic validation
      if (!type || !data) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Log analytics event (in production, this would go to analytics service)
      console.log('📊 Analytics Event:', {
        type,
        tracking_id,
        session_id,
        timestamp: new Date().toISOString(),
        data: JSON.stringify(data).substring(0, 200) // Truncate for logging
      });

      // Store analytics data in database if needed
      // This could be expanded to store in a dedicated analytics table
      
      res.json({ success: true, message: 'Event tracked' });
    } catch (error) {
      console.error('Analytics tracking error:', error);
      res.status(500).json({ message: 'Failed to track event' });
    }
  });

  // Cookie preferences endpoint
  app.get('/api/cookie-preferences', (req, res) => {
    // Return current cookie preferences (could be stored per user)
    res.json({
      essential: true,
      analytics: false,
      personalization: false
    });
  });



  // Support contact form endpoint
  app.post('/api/support/contact', async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;
      
      // Validate required fields
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Email to Samir Lal (support team)
      const supportEmailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #ffffff; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 20px; border-radius: 8px 8px 0 0; margin: -30px -30px 20px -30px; }
            .header h1 { margin: 0; font-size: 24px; color: #ffffff; }
            .content { color: #333333; }
            .field { margin-bottom: 15px; }
            .field-label { font-weight: bold; color: #444444; margin-bottom: 5px; }
            .field-value { color: #333333; padding: 10px; background: #f8f9fa; border-radius: 4px; border-left: 4px solid #667eea; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>InsideMeter Support Request</h1>
            </div>
            <div class="content">
              <p style="color: #333333;">A new support request has been submitted through the InsideMeter support page:</p>
              
              <div class="field">
                <div class="field-label">From:</div>
                <div class="field-value">${name} &lt;${email}&gt;</div>
              </div>
              
              <div class="field">
                <div class="field-label">Subject:</div>
                <div class="field-value">${subject}</div>
              </div>
              
              <div class="field">
                <div class="field-label">Message:</div>
                <div class="field-value">${message.replace(/\n/g, '<br>')}</div>
              </div>
              
              <div class="footer">
                <p style="color: #666666;">This message was sent via the InsideMeter support form at ${new Date().toLocaleString()}.</p>
                <p style="color: #666666;"><strong>Reply directly to this email to respond to ${name}.</strong></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Thank you email to the sender
      const thankYouEmailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #ffffff; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 20px; border-radius: 8px 8px 0 0; margin: -30px -30px 20px -30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; color: #ffffff; }
            .header p { margin: 5px 0 0 0; opacity: 0.9; color: #ffffff; }
            .content { color: #333333; }
            .highlight-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 0 4px 4px 0; }
            .response-info { background: #e3f2fd; border: 1px solid #bbdefb; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666666; font-size: 14px; text-align: center; }
            .logo { width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; font-size: 24px; font-weight: bold; color: #ffffff; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">IM</div>
              <h1>Thank You for Contacting Us!</h1>
              <p>Your message has been received</p>
            </div>
            <div class="content">
              <p style="color: #333333; font-size: 16px;">Dear ${name},</p>
              
              <p style="color: #333333;">Thank you for reaching out to the InsideMeter support team. We've successfully received your message regarding "<strong style="color: #333333;">${subject}</strong>" and wanted to confirm that it's in our queue.</p>
              
              <div class="highlight-box">
                <h3 style="color: #333333; margin-top: 0;">What happens next?</h3>
                <ul style="color: #333333; padding-left: 20px;">
                  <li>Our team will review your inquiry within the next few hours</li>
                  <li>You'll receive a detailed response within <strong style="color: #333333;">24-48 hours</strong></li>
                  <li>For technical issues, we may ask for additional information</li>
                </ul>
              </div>
              
              <div class="response-info">
                <p style="color: #333333; margin: 0;"><strong>Please note:</strong> Response times may occasionally be extended during our ongoing wellness workshops and retreats. We appreciate your patience as our team balances support duties with our commitment to advancing mindfulness and mental health practices.</p>
              </div>
              
              <p style="color: #333333;">In the meantime, you might find our <a href="https://insidemeter.com/support" style="color: #667eea;">support page</a> helpful for common questions about InsideMeter's features and functionality.</p>
              
              <div class="footer">
                <p style="color: #666666;">This is an automated confirmation email.</p>
                <p style="color: #666666;"><strong>Samir Lal</strong><br>
                Yoga Nebula - Creating innovative wellness solutions<br>
                contact@yoganebula.com</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send email to support team (Samir) using SendGrid
      const supportEmailSent = await sendEmail({
        to: 'contact@yoganebula.com',
        from: 'contact@yoganebula.com',
        subject: `[InsideMeter Support] ${subject} - From ${name}`,
        html: supportEmailContent,
        text: `New support request from ${name} (${email})\n\nSubject: ${subject}\n\nMessage:\n${message}\n\nSent: ${new Date().toLocaleString()}`,
        fromName: 'Samir Lal'
      });

      // Send thank you email to sender using SendGrid  
      const thankYouEmailSent = await sendEmail({
        to: email,
        from: 'contact@yoganebula.com',
        subject: 'Thank you for contacting InsideMeter Support',
        html: thankYouEmailContent,
        text: `Dear ${name},\n\nThank you for contacting InsideMeter support. We've received your message about "${subject}" and will respond within 24-48 hours.\n\nPlease note that response times may be extended during wellness workshops.\n\nBest regards,\nSamir Lal\nYoga Nebula\ncontact@yoganebula.com`,
        fromName: 'Samir Lal'
      });

      if (supportEmailSent && thankYouEmailSent) {
        res.json({ 
          success: true, 
          message: 'Your message has been sent successfully. You should receive a confirmation email shortly.' 
        });
      } else {
        throw new Error('Failed to send one or more emails');
      }
      
    } catch (error) {
      console.error('Support contact form error:', error);
      res.status(500).json({ 
        message: 'Failed to send your message. Please try again or email us directly at contact@yoganebula.com' 
      });
    }
  });

  // Marketing contact form endpoint
  app.post('/api/marketing/contact', async (req, res) => {
    try {
      const { name, email, role, interest, message } = req.body;
      
      // Validate required fields
      if (!name || !email || !role || !interest || !message) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Email to Samir Lal (marketing team)
      const marketingEmailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #ffffff; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 20px; border-radius: 8px 8px 0 0; margin: -30px -30px 20px -30px; }
            .header h1 { margin: 0; font-size: 24px; color: #ffffff; }
            .content { color: #333333; }
            .field { margin-bottom: 15px; }
            .field-label { font-weight: bold; color: #444444; margin-bottom: 5px; }
            .field-value { color: #333333; padding: 10px; background: #f8f9fa; border-radius: 4px; border-left: 4px solid #667eea; }
            .priority { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 InsideMeter Marketing Inquiry</h1>
            </div>
            <div class="content">
              <p style="color: #333333;">A new marketing inquiry has been submitted through the InsideMeter landing page:</p>
              
              ${interest === 'Therapist Portal Waitlist' ? `
              <div class="priority">
                <h3 style="color: #856404; margin-top: 0;">🎯 THERAPIST PORTAL WAITLIST REQUEST</h3>
                <p style="color: #856404; margin: 0;">This prospect is interested in the upcoming Therapist Portal feature - high priority lead!</p>
              </div>
              ` : ''}
              
              <div class="field">
                <div class="field-label">Name:</div>
                <div class="field-value">${name}</div>
              </div>
              
              <div class="field">
                <div class="field-label">Email:</div>
                <div class="field-value">${email}</div>
              </div>
              
              <div class="field">
                <div class="field-label">Role:</div>
                <div class="field-value">${role}</div>
              </div>
              
              <div class="field">
                <div class="field-label">Primary Interest:</div>
                <div class="field-value">${interest}</div>
              </div>
              
              <div class="field">
                <div class="field-label">Message:</div>
                <div class="field-value">${message.replace(/\n/g, '<br>')}</div>
              </div>
              
              <div class="footer">
                <p style="color: #666666;">This inquiry was submitted via the InsideMeter marketing page at ${new Date().toLocaleString()}.</p>
                <p style="color: #666666;"><strong>Follow-up recommended within 24 hours for optimal conversion.</strong></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Personalized thank you email based on interest
      const isTherapistPortal = interest === 'Therapist Portal Waitlist';
      const thankYouEmailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #ffffff; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 20px; border-radius: 8px 8px 0 0; margin: -30px -30px 20px -30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; color: #ffffff; }
            .header p { margin: 5px 0 0 0; opacity: 0.9; color: #ffffff; }
            .content { color: #333333; }
            .highlight-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 0 4px 4px 0; }
            .therapist-special { background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%); border: 2px solid #667eea; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666666; font-size: 14px; text-align: center; }
            .logo { width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; font-size: 24px; font-weight: bold; color: #ffffff; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">IM</div>
              <h1>Welcome to the Future of Emotional Wellness!</h1>
              <p>Your inquiry has been received</p>
            </div>
            <div class="content">
              <p style="color: #333333; font-size: 16px;">Dear ${name},</p>
              
              <p style="color: #333333;">Thank you for your interest in InsideMeter! As a ${role.toLowerCase()}, you're joining a growing community of forward-thinking individuals who are revolutionizing emotional wellness through technology.</p>
              
              ${isTherapistPortal ? `
              <div class="therapist-special">
                <h3 style="color: #333333; margin-top: 0;">🎉 You're on the Therapist Portal Waitlist!</h3>
                <p style="color: #333333; margin-bottom: 10px;"><strong>Congratulations on securing your spot for early access to our groundbreaking Therapist Portal.</strong></p>
                <ul style="color: #333333; padding-left: 20px;">
                  <li><strong>Priority Access:</strong> You'll be among the first to experience the portal when it launches in Q2 2025</li>
                  <li><strong>Special Pricing:</strong> Early adopters receive exclusive beta pricing</li>
                  <li><strong>Direct Input:</strong> Help shape the platform with your feedback during beta testing</li>
                  <li><strong>Dedicated Support:</strong> One-on-one onboarding and training sessions</li>
                </ul>
              </div>
              ` : ''}
              
              <div class="highlight-box">
                <h3 style="color: #333333; margin-top: 0;">What happens next?</h3>
                <ul style="color: #333333; padding-left: 20px;">
                  <li>I'll personally review your inquiry and respond within 24 hours</li>
                  <li>We'll schedule a personalized demo tailored to your specific needs</li>
                  <li>You'll receive exclusive access to beta features and early releases</li>
                  <li>Join our community of wellness professionals and early adopters</li>
                </ul>
              </div>
              
              <p style="color: #333333;">In the meantime, feel free to explore more about InsideMeter on our <a href="https://insidemeter.com" style="color: #667eea;">main platform</a> or reach out directly if you have any immediate questions.</p>
              
              <div class="footer">
                <p style="color: #666666;">This is a personalized response to your inquiry.</p>
                <p style="color: #666666;"><strong>Samir Lal</strong><br>
                Founder & CEO, Yoga Nebula<br>
                InsideMeter Development Team<br>
                contact@yoganebula.com</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send email to marketing team (Samir) using SendGrid
      const marketingEmailSent = await sendEmail({
        to: 'contact@yoganebula.com',
        from: 'contact@yoganebula.com',
        subject: `🚀 InsideMeter Marketing Lead: ${interest} - ${name}`,
        html: marketingEmailContent,
        text: `New marketing inquiry from ${name} (${email})\n\nRole: ${role}\nInterest: ${interest}\n\nMessage:\n${message}\n\nSubmitted: ${new Date().toLocaleString()}`,
        fromName: 'Samir Lal'
      });

      // Send personalized thank you email to prospect using SendGrid
      const thankYouEmailSent = await sendEmail({
        to: email,
        from: 'contact@yoganebula.com',
        subject: isTherapistPortal ? 
          '🎉 Welcome to the Therapist Portal Waitlist - InsideMeter' : 
          'Welcome to the InsideMeter Community - Next Steps Inside',
        html: thankYouEmailContent,
        text: `Dear ${name},\n\nThank you for your interest in InsideMeter! ${isTherapistPortal ? "You've been added to our priority Therapist Portal waitlist. " : ""}I'll personally respond to your inquiry within 24 hours with detailed information tailored to your needs as a ${role.toLowerCase()}.\n\nBest regards,\nSamir Lal\nFounder & CEO, Yoga Nebula\ncontact@yoganebula.com`,
        fromName: 'Samir Lal'
      });

      if (marketingEmailSent && thankYouEmailSent) {
        res.json({ 
          success: true, 
          message: 'Thank you for your interest! You\'ll receive a personalized response within 24 hours.' 
        });
      } else {
        throw new Error('Failed to send one or more emails');
      }
      
    } catch (error) {
      console.error('Marketing contact form error:', error);
      res.status(500).json({ 
        message: 'Failed to send your message. Please try again or email us directly at contact@yoganebula.com' 
      });
    }
  });

  // Serve Apple documentation files
  app.get('/download-links', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'download_links.html'));
  });
  
  app.get('/apple-docs', (req, res) => {
    try {
      const markdownPath = path.join(process.cwd(), 'InsideMeter_Apple_Store_Submission_Package.md');
      const encryptionPath = path.join(process.cwd(), 'ENCRYPTION_COMPLIANCE_DOCUMENTATION.md');
      
      const markdownContent = fs.readFileSync(markdownPath, 'utf8');
      const encryptionContent = fs.readFileSync(encryptionPath, 'utf8');
      
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>InsideMeter - Apple App Store Submission Package</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 1000px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #ffffff;
            color: #000000;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #000000;
            margin-bottom: 40px;
            padding-bottom: 30px;
        }
        .header h1 {
            font-size: 2.5em;
            margin: 0;
            color: #000000;
            font-weight: 700;
        }
        .compliance-section {
            background: #f0f8f0;
            border: 2px solid #006600;
            padding: 20px;
            margin: 30px 0;
            border-radius: 8px;
        }
        h1, h2, h3, h4 { color: #000000; margin-top: 30px; }
        h2 { border-bottom: 2px solid #000000; padding-bottom: 10px; }
        p, li { color: #000000; }
        strong { color: #000000; font-weight: 600; }
        pre { background: #f5f5f5; padding: 15px; border: 1px solid #ccc; white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="header">
        <h1>InsideMeter - Apple App Store Submission Package</h1>
        <p><strong>Version 2.9 • July 8, 2025</strong></p>
    </div>
    
    <div class="compliance-section">
        <h3>✅ Apple Compliance Updates (July 8, 2025)</h3>
        <ul>
            <li><strong>Privacy Protection:</strong> All AI queries are stripped of personally identifiable data before being sent to OpenAI's API</li>
            <li><strong>Export Compliance:</strong> App uses only standard encryption (TSU exemption applies, no BIS approval needed)</li>
            <li><strong>Guest Functionality:</strong> Complete app experience available without account creation, no crashes or restrictions</li>
            <li><strong>Payment Compliance:</strong> All purchases handled through Apple's In-App Purchase system</li>
        </ul>
    </div>
    
    <pre>${markdownContent}</pre>
    
    <hr style="border: 2px solid #000000; margin: 40px 0;">
    
    <h2>🔒 Encryption Compliance Documentation</h2>
    <pre>${encryptionContent}</pre>
    
    <div style="text-align: center; margin-top: 50px; border-top: 2px solid #000000; padding-top: 20px;">
        <p><strong>Ready for Apple App Store Submission</strong></p>
        <p>Document Generated: July 8, 2025</p>
    </div>
</body>
</html>`;
      
      res.send(html);
    } catch (error) {
      console.error('Error serving Apple docs:', error);
      res.status(500).send('Error loading documentation');
    }
  });
  
  app.get('/apple-docs-md', (req, res) => {
    res.download(path.join(process.cwd(), 'InsideMeter_Apple_Store_Submission_Package.md'), 'InsideMeter_Apple_Store_Submission_Package.md');
  });
  
  app.get('/encryption-docs', (req, res) => {
    res.download(path.join(process.cwd(), 'ENCRYPTION_COMPLIANCE_DOCUMENTATION.md'), 'ENCRYPTION_COMPLIANCE_DOCUMENTATION.md');
  });
  
  app.get('/submission-docs', (req, res) => {
    res.download(path.join(process.cwd(), 'APPLE_SUBMISSION_DOCUMENTATION.md'), 'APPLE_SUBMISSION_DOCUMENTATION.md');
  });

  // Let Vite handle all static file serving (both development and production)
  console.log('🔧 Routes configured - Vite will handle static files and SPA routing');

  // Let Vite handle all static file serving and SPA routing

  const httpServer = createServer(app);
  return httpServer;
}

// Fallback moon phase calculation
function calculateMoonPhase(date: Date) {
  const synodicMonth = 29.530588853; // Length of moon cycle
  const newMoon = new Date('2000-01-06T18:14:00Z'); // Known new moon
  const daysSinceNewMoon = (date.getTime() - newMoon.getTime()) / (1000 * 60 * 60 * 24);
  const currentCycle = ((daysSinceNewMoon % synodicMonth) + synodicMonth) % synodicMonth;
  
  let phase: string;
  let name: string;
  const illumination = Math.abs(Math.cos((currentCycle / synodicMonth) * 2 * Math.PI)) * 100;
  
  if (currentCycle < 1.84566) {
    phase = 'new';
    name = 'New Moon';
  } else if (currentCycle < 5.53699) {
    phase = 'waxing_crescent';
    name = 'Waxing Crescent';
  } else if (currentCycle < 9.22831) {
    phase = 'first_quarter';
    name = 'First Quarter';
  } else if (currentCycle < 12.91963) {
    phase = 'waxing_gibbous';
    name = 'Waxing Gibbous';
  } else if (currentCycle < 16.61096) {
    phase = 'full';
    name = 'Full Moon';
  } else if (currentCycle < 20.30228) {
    phase = 'waning_gibbous';
    name = 'Waning Gibbous';
  } else if (currentCycle < 23.99361) {
    phase = 'last_quarter';
    name = 'Last Quarter';
  } else {
    phase = 'waning_crescent';
    name = 'Waning Crescent';
  }
  
  return {
    date,
    phase,
    illumination,
    name
  };
}
