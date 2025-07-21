import express, { type Request, Response, NextFunction } from "express";
// Session and authentication configuration handled in auth module
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./vite-production";
import { startNotificationScheduler } from "./notifications";
import dns from 'dns';
// Passport configuration handled in auth module

// Fix DNS resolution for Google OAuth connectivity
dns.setDefaultResultOrder('ipv4first');

const app = express();

// CORS configuration for iOS cross-origin requests
app.use((req, res, next) => {
  // Allow requests from any origin for development (iOS apps calling Replit server)
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-ios-auth, X-iOS-Auth, x-ios-auth-token, X-iOS-Auth-Token');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }
  
  next();
});

// Use raw body for Stripe webhooks, JSON for everything else
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration moved to auth module

// Trust proxy configuration for production (Railway/Heroku/etc)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy for secure cookies in production
  console.log('🔧 Production mode: Trusting proxy for secure cookies');
} else {
  app.set('trust proxy', false); // No proxy in development
  console.log('🔧 Development mode: Direct connection (no proxy)');
}

// Authentication setup handled in registerRoutes

// Add cache-busting headers for both development AND production to force browser refresh
app.use((req, res, next) => {
  // Apply aggressive cache-busting for HTML, JS, CSS files
  if (req.path.includes('.html') || req.path.includes('.js') || req.path.includes('.css') || req.path === '/') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', Date.now().toString()); // Force refresh
  }
  // Allow caching for static assets like images, fonts
  else if (req.path.includes('.png') || req.path.includes('.jpg') || req.path.includes('.svg') || req.path.includes('.woff')) {
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
  }
  next();
});

// Phase 3: Global iOS authentication middleware removed - handled in routes

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logDetails = "";
      if (capturedJsonResponse) {
        logDetails = ` :: ${JSON.stringify(capturedJsonResponse).substring(0, 80)}${
          JSON.stringify(capturedJsonResponse).length > 80 ? "…" : ""
        }`;
      }

      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms${logDetails}`);
    }
  });

  next();
});

async function startServer() {
  try {
    console.log('🔧 Registering API routes...');
    const server = await registerRoutes(app);
    
    // Production: serve static files from dist/public
    console.log('🔧 Production mode: Serving static files from dist/public');
    serveStatic(app);

    const PORT = parseInt(process.env.PORT ?? "5000", 10);
    
    server.listen(PORT, "0.0.0.0", () => {
      console.log('🚀 Starting InsideMeter server...');
      console.log('📊 Environment:', process.env.NODE_ENV || 'development');
      console.log('🔗 Port:', PORT);
      console.log('💾 Database URL exists:', !!process.env.DATABASE_URL);
      console.log('🔐 Session secret exists:', !!process.env.SESSION_SECRET);
      console.log(`🎯 InsideMeter server successfully started on port ${PORT}`);
      console.log('🌐 Environment:', process.env.NODE_ENV || 'development');
      
      // Start notification scheduler after server is running
      try {
        startNotificationScheduler();
      } catch (error) {
        console.error('❌ Failed to start notification scheduler:', error);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();