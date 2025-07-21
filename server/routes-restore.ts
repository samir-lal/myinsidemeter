import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { insertUserSchema, insertMoodEntrySchema, insertDailyJournalSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // User registration
  app.post("/api/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email!);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password!, 12);
      
      // Create user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
        username: validatedData.email, // Use email as username
      });

      res.status(201).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // User login
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Look up user by email
      const user = await storage.getUserByEmail(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password!);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create session
      (req as any).session.userId = user.id;
      (req as any).session.user = {
        id: user.id,
        email: user.email,
        username: user.username,
      };

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout
  app.post("/api/logout", (req, res) => {
    (req as any).session.destroy(() => {
      res.json({ success: true });
    });
  });

  // Auth status
  app.get("/api/auth/status", (req, res) => {
    const session = (req as any).session;
    if (session?.userId) {
      res.json({
        isAuthenticated: true,
        user: session.user
      });
    } else {
      res.json({
        isAuthenticated: false,
        user: null
      });
    }
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    const session = (req as any).session;
    if (session?.userId) {
      res.json(session.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Mood entries
  app.get("/api/mood-entries", async (req, res) => {
    try {
      const session = (req as any).session;
      if (!session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const entries = await storage.getMoodEntries(session.userId);
      res.json(entries);
    } catch (error) {
      console.error("Get mood entries error:", error);
      res.status(500).json({ message: "Failed to fetch mood entries" });
    }
  });

  app.post("/api/mood-entries", async (req, res) => {
    try {
      const session = (req as any).session;
      if (!session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const validatedData = insertMoodEntrySchema.parse(req.body);
      const entry = await storage.createMoodEntry({
        ...validatedData,
        userId: session.userId,
      });

      res.status(201).json(entry);
    } catch (error) {
      console.error("Create mood entry error:", error);
      res.status(500).json({ message: "Failed to create mood entry" });
    }
  });

  // Daily journal
  app.get("/api/daily-journal", async (req, res) => {
    try {
      const session = (req as any).session;
      if (!session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const entries = await storage.getDailyJournalEntries(session.userId);
      res.json(entries);
    } catch (error) {
      console.error("Get journal entries error:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });

  app.post("/api/daily-journal", async (req, res) => {
    try {
      const session = (req as any).session;
      if (!session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const validatedData = insertDailyJournalSchema.parse(req.body);
      const entry = await storage.createDailyJournalEntry({
        ...validatedData,
        userId: session.userId,
      });

      res.status(201).json(entry);
    } catch (error) {
      console.error("Create journal entry error:", error);
      res.status(500).json({ message: "Failed to create journal entry" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}