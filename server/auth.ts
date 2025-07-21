import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import type { Express } from 'express';
import { storage } from './storage';
import crypto from 'crypto';

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('⚠️ Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

export function setupAuth(app: Express) {
  // Trust proxy configuration already handled in index.ts
  console.log('🔧 Auth setup - NODE_ENV:', process.env.NODE_ENV);
  
  // Session configuration with PostgreSQL store
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  console.log('🔧 Session configuration with PostgreSQL storage');

  const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    store: sessionStore,
    resave: true, // Force save to ensure session persistence
    saveUninitialized: false,
    rolling: false, // Don't regenerate session ID on each request
    name: 'connect.sid', // Explicit session name
    genid: () => {
      // Use crypto.randomUUID for consistent session ID generation
      return crypto.randomBytes(16).toString('hex');
    },
    cookie: {
      httpOnly: true, // Standard security for web sessions
      secure: process.env.NODE_ENV === 'production', // Secure in production only
      maxAge: sessionTtl,
      sameSite: 'lax', // Compatible with modern browsers
      path: '/',
      domain: undefined // Let browser set domain automatically
    }
  });
  
  app.use(sessionMiddleware);

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Simplified serialization for session-based auth only
  passport.serializeUser((user: any, done) => {
    console.log('🔐 Serializing user for session:', user.id);
    done(null, user.id);
  });

  // Simplified deserialization with better error handling
  passport.deserializeUser(async (id: any, done) => {
    try {
      console.log('🔓 Deserializing user ID:', id);
      if (!id || isNaN(parseInt(id))) {
        console.log('❌ Invalid user ID for deserialization:', id);
        return done(null, null);
      }
      
      const userId = parseInt(id);
      const user = await storage.getUser(userId);
      if (user) {
        console.log('✅ User deserialized successfully:', user.id);
        done(null, user);
      } else {
        console.log('❌ User not found during deserialization:', userId);
        done(null, null);
      }
    } catch (error) {
      console.error('❌ Deserialization error:', error);
      done(null, null);
    }
  });

  // Google OAuth configuration - Use current Replit domain
  const googleCallbackUrl = process.env.NODE_ENV === 'production' 
    ? 'https://insidemeter.com/auth/google/callback'
    : `https://${process.env.REPLIT_DOMAINS}/auth/google/callback`;
  
  console.log('🔧 Google OAuth callback URL:', googleCallbackUrl);
  
  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log(`🔧 Google OAuth final callback URL: ${googleCallbackUrl}`);

    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: googleCallbackUrl
    },
    async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        console.log('🔍 Google OAuth strategy called with profile:', {
          id: profile.id,
          emails: profile.emails,
          displayName: profile.displayName
        });

        const googleEmail = profile.emails?.[0]?.value;
        const googleName = profile.displayName;
        const googleId = profile.id;
        const profileImageUrl = profile.photos?.[0]?.value;

        console.log('📧 Extracted Google info:', { googleEmail, googleName, googleId });

        if (!googleEmail) {
          console.error('❌ No email found in Google profile');
          return done(new Error('No email found in Google profile'));
        }

        // Check if user exists by Google ID first
        let user = await storage.getUserByGoogleId(googleId);

        if (user) {
          console.log('✅ User found by Google ID:', user.id);
          return done(null, user);
        }

        // Check if user exists by email
        user = await storage.getUserByEmail(googleEmail);

        if (user) {
          console.log('✅ User found by email, updating with Google info:', user.id);
          // Update existing user with Google info
          user = await storage.updateUserGoogleInfo(user.id, { googleId, profileImageUrl });
          return done(null, user);
        }

        // Create new user
        console.log('🔧 Creating new user from Google OAuth...');
        user = await storage.createUserFromGoogle({
          googleId,
          email: googleEmail,
          name: googleName || googleEmail,
          profileImageUrl
        });
        console.log('✅ New user created:', user.id);

        return done(null, user);
      } catch (error) {
        console.error('❌ Google OAuth strategy error:', error);
        return done(error);
      }
    }));

    // Google OAuth routes - Use Passport's authenticate method
    console.log('🔧 Registering Google OAuth route: /auth/google');
    app.get('/auth/google', (req, res, next) => {
      console.log('🔧 Google OAuth route called - initiating Passport authentication...');
      console.log('🔍 OAuth request details:', { 
        userAgent: req.headers['user-agent'], 
        query: req.query 
      });
      
      passport.authenticate('google', { 
        scope: ['profile', 'email'],
        prompt: 'consent',
        accessType: 'offline'
      })(req, res, next);
    });

    app.get('/auth/google/callback',
      (req, res, next) => {
        console.log('🔍 Google OAuth callback received with query:', req.query);
        console.log('🔍 Callback URL hit successfully');
        passport.authenticate('google', { 
          failureRedirect: '/login?error=google_auth_failed' 
        })(req, res, next);
      },
      async (req, res) => {
        try {
          console.log('🔍 Google OAuth callback processing user...');
          const user = req.user as any;
          
          if (!user) {
            console.error('❌ Google OAuth: No user returned from authentication');
            return res.redirect('/login?error=auth_failed');
          }

          console.log(`✅ Google OAuth successful for user: ${user.id} (${user.email})`);
          
          // Web Google OAuth - Session is automatically managed by Passport
          res.redirect('/?auth=google_success');
        } catch (error) {
          console.error('❌ Google OAuth callback error:', error);
          res.redirect('/login?error=callback_failed');
        }
      }
    );

    console.log('✅ Google OAuth configured successfully');
  } else {
    console.log('⚠️ Google OAuth not configured - missing environment variables');
  }

  // Logout route that works for both regular and Google OAuth users
  app.post('/api/logout', (req, res) => {
    console.log('🔓 Logout request received');
    
    try {
      // Clear session data completely
      const session = (req as any).session;
      if (session) {
        // Clear user-specific session data
        delete session.userId;
        delete session.userRole; 
        delete session.user;
        delete session.passport;
        
        // Destroy session if it exists
        session.destroy((err: any) => {
          if (err) {
            console.error('❌ Session destruction error:', err);
          }
        });
      }
      
      // Use passport logout if available
      if (req.logout && typeof req.logout === 'function') {
        req.logout((err) => {
          if (err) {
            console.error('❌ Passport logout error:', err);
          }
        });
      }
      
      // Clear session cookies
      res.clearCookie('connect.sid');
      res.clearCookie('session');
      
      console.log('✅ User logged out successfully');
      res.json({ message: 'Logged out successfully' });
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Still clear cookies and respond success to avoid client issues
      res.clearCookie('connect.sid');
      res.clearCookie('session');
      res.json({ message: 'Logged out successfully' });
    }
  });
}
