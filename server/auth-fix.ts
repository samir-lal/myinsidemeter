// Production Authentication Fix - Replace isAuthenticated function
import type { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

export async function isAuthenticated(req: any, res: Response, next: NextFunction) {
  console.log("🔍 Auth Fix - isAuthenticated Debug:");
  console.log("  - Session exists:", !!req.session);
  console.log("  - Session userId:", req.session?.userId);
  console.log("  - Session user:", req.session?.user?.id);
  console.log("  - Passport user:", req.user?.id);
  console.log("  - iOS auth header:", !!req.headers['x-ios-auth']);
  
  try {
    // Check session authentication (most common for web)
    const sessionUserId = req.session?.userId || req.session?.user?.id;
    if (sessionUserId) {
      console.log("✅ Session authentication confirmed, userId:", sessionUserId);
      req.userId = sessionUserId;
      req.isAuthenticated = true;
      return next();
    }

    // Check Passport user (Google OAuth)
    if (req.user?.id) {
      console.log("✅ Passport authentication confirmed, userId:", req.user.id);
      
      // Sync session for OAuth users
      req.session.userId = req.user.id;
      req.session.user = {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role || 'user'
      };
      
      req.userId = req.user.id;
      req.isAuthenticated = true;
      return next();
    }

    // Check iOS authentication
    const iosAuthHeader = req.headers['x-ios-auth'] || req.headers['x-ios-auth-token'];
    if (iosAuthHeader) {
      try {
        const [userIdStr, timestampStr, hash] = (iosAuthHeader as string).split(':');
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
            if (user) {
              console.log("✅ iOS authentication successful:", userId);
              req.user = user;
              req.userId = userId;
              req.isAuthenticated = true;
              return next();
            }
          }
        }
      } catch (iosError) {
        console.error('iOS auth verification failed:', iosError);
      }
    }

    // Try Passport session deserialization as last resort
    if (req.session?.passport?.user && !req.user) {
      try {
        const user = await storage.getUser(req.session.passport.user);
        if (user) {
          console.log("✅ Passport deserialization successful:", user.id);
          req.user = user;
          req.userId = user.id;
          req.isAuthenticated = true;
          
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
    return res.status(500).json({ message: "Authentication error" });
  }
}

// Optional authentication - doesn't fail if not authenticated
export async function optionalAuthentication(req: any, res: Response, next: NextFunction) {
  try {
    await isAuthenticated(req, res, () => {
      // User is authenticated
      next();
    });
  } catch (error) {
    // User is not authenticated, but continue anyway
    req.userId = null;
    req.isAuthenticated = false;
    next();
  }
}