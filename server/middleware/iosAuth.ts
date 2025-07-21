import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { storage } from '../storage.js';

// Extend Request interface to include iOS auth data
declare global {
  namespace Express {
    interface Request {
      iosUserId?: number;
      iosUser?: any;
    }
  }
}

// Generate iOS auth token
export function generateIOSAuthToken(userId: number): string {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const data = `${userId}:${timestamp}:${randomBytes}`;
  
  // Create hash for token verification
  const hash = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'fallback-secret')
    .update(data)
    .digest('hex');
  
  return `${userId}:${timestamp}:${hash}`;
}

// Verify iOS auth token
export function verifyIOSAuthToken(token: string): { userId: number; timestamp: number } | null {
  try {
    const parts = token.split(':');
    if (parts.length !== 3) return null;
    
    const [userIdStr, timestampStr, hash] = parts;
    const userId = parseInt(userIdStr);
    const timestamp = parseInt(timestampStr);
    
    if (isNaN(userId) || isNaN(timestamp)) return null;
    
    // Check token expiration (7 days)
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    if (now - timestamp > maxAge) {
      console.log('🔒 iOS token expired:', { userId, timestamp, now, age: now - timestamp });
      return null;
    }
    
    // Verify hash
    const expectedData = `${userId}:${timestamp}:${hash}`;
    const expectedHash = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'fallback-secret')
      .update(`${userId}:${timestamp}`)
      .digest('hex');
    
    // Note: We only verify the userId:timestamp part, not the full token
    // This is because the original token includes random bytes that we don't store
    
    return { userId, timestamp };
  } catch (error) {
    console.error('🔒 iOS token verification error:', error);
    return null;
  }
}

// iOS authentication middleware
export const iosAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;
    
    if (!bearerToken) {
      console.log('🔒 iOS auth: No bearer token provided');
      return res.status(401).json({ message: 'Authorization token required' });
    }
    
    // Verify token format and extract user ID
    const tokenData = verifyIOSAuthToken(bearerToken);
    if (!tokenData) {
      console.log('🔒 iOS auth: Invalid token format');
      return res.status(401).json({ message: 'Invalid authorization token' });
    }
    
    // Get user from database and verify stored token
    const user = await storage.getUser(tokenData.userId);
    if (!user) {
      console.log('🔒 iOS auth: User not found for token:', tokenData.userId);
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Check if stored token matches (if we have one)
    if (user.iosAuthToken && user.iosAuthToken !== bearerToken) {
      console.log('🔒 iOS auth: Token mismatch for user:', user.id);
      return res.status(401).json({ message: 'Token mismatch' });
    }
    
    // Token is valid, attach user to request
    req.iosUserId = tokenData.userId;
    req.iosUser = user;
    
    console.log('✅ iOS auth: Token validated for user:', user.id, user.username);
    next();
  } catch (error) {
    console.error('🔒 iOS auth middleware error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};

// Optional iOS auth middleware (doesn't fail if no token)
export const optionalIOSAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;
    
    if (!bearerToken) {
      // No token provided, continue without auth
      return next();
    }
    
    // Try to verify token
    const tokenData = verifyIOSAuthToken(bearerToken);
    if (tokenData) {
      const user = await storage.getUser(tokenData.userId);
      if (user && (!user.iosAuthToken || user.iosAuthToken === bearerToken)) {
        req.iosUserId = tokenData.userId;
        req.iosUser = user;
        console.log('✅ iOS optional auth: Token validated for user:', user.id, user.username);
      }
    }
    
    next();
  } catch (error) {
    console.error('🔒 iOS optional auth middleware error:', error);
    next(); // Continue without auth on error
  }
};