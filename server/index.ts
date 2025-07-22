import express, { type Request, Response, NextFunction } from "express";
import path from 'path';
import fs from 'fs';
// Session and authentication configuration handled in auth module
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startNotificationScheduler } from "./notifications";
import dns from 'dns';
// Passport configuration handled in auth module

// Fix DNS resolution for Google OAuth connectivity
dns.setDefaultResultOrder('ipv4first');

const app = express();

// Railway Debug: Check static file location
const staticPath = path.resolve(import.meta.dirname, 'public');
console.log('🪵 [Express] Serving static from:', staticPath);

// Check if index.html exists
const indexPath = path.join(staticPath, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('❌ [Express] index.html not found at:', indexPath);
} else {
  console.log('✅ [Express] index.html exists at:', indexPath);
}

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
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // API routes are already registered above

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Railway production fix: ensure we're in the right directory
    console.log('🔧 RAILWAY DEBUG: Production mode detected');
    console.log('🔧 RAILWAY DEBUG: Current working directory:', process.cwd());
    console.log('🔧 RAILWAY DEBUG: __dirname equivalent:', import.meta.dirname);
    
    // Import fs synchronously to check file system
    const fs = await import('fs');
    const path = await import('path');
    
    // Check all possible locations where built files might be
    const possiblePaths = [
      path.resolve(import.meta.dirname, "public"),
      path.resolve(process.cwd(), "server", "public"), 
      path.resolve(process.cwd(), "dist"),
      path.resolve(process.cwd(), "public"),
      path.resolve(import.meta.dirname, "..", "dist")
    ];
    
    console.log('🔍 RAILWAY DEBUG: Checking all possible build locations:');
    for (const checkPath of possiblePaths) {
      const exists = fs.existsSync(checkPath);
      console.log(`  📂 ${checkPath}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
      if (exists) {
        try {
          const files = fs.readdirSync(checkPath);
          console.log(`     📄 Files (${files.length}): ${files.slice(0, 10).join(', ')}${files.length > 10 ? '...' : ''}`);
          
          // Check specifically for index.html
          if (files.includes('index.html')) {
            const indexPath = path.join(checkPath, 'index.html');
            const stats = fs.statSync(indexPath);
            console.log(`     ✅ index.html found - size: ${stats.size} bytes`);
          }
        } catch (e) {
          console.log(`     ❌ Error reading directory: ${e.message}`);
        }
      }
    }
    
    // Additional debug for __dirname equivalent
    const staticPath = path.resolve(import.meta.dirname, 'public');
    console.log("🔧 Serving static files from:", staticPath);
    console.log("🔧 Static path exists:", fs.existsSync(staticPath));
    
    if (fs.existsSync(staticPath)) {
      const staticFiles = fs.readdirSync(staticPath);
      console.log("🔧 Static files found:", staticFiles.slice(0, 10));
    }
    
    console.log('🔧 RAILWAY DEBUG: Attempting to call serveStatic()...');
    try {
      serveStatic(app);
      console.log('✅ RAILWAY DEBUG: serveStatic() completed successfully');
      
      // Universal React SPA fallback route for client-side routing
      // This must be AFTER serveStatic() and AFTER all API routes
      const staticPath = path.resolve(import.meta.dirname, "public");
      app.get("*", (_req, res) => {
        const indexHtmlPath = path.resolve(staticPath, "index.html");
        console.log('📄 UNIVERSAL FALLBACK: Serving', indexHtmlPath, 'for route:', _req.path);
        res.sendFile(indexHtmlPath);
      });
      console.log('✅ RAILWAY DEBUG: Universal SPA fallback route added');
      
    } catch (error) {
      console.error('💥 RAILWAY DEBUG: serveStatic() failed:', error.message);
      console.error('💥 RAILWAY DEBUG: Error stack:', error.stack);
      throw error;
    }
  }

  // Enhanced startup logging for Railway debugging
  console.log('🚀 Starting InsideMeter server...');
  console.log('📊 Environment:', process.env.NODE_ENV || 'development');
  console.log('🔗 Port:', process.env.PORT || 5000);
  console.log('💾 Database URL exists:', !!process.env.DATABASE_URL);
  console.log('🔐 Session secret exists:', !!process.env.SESSION_SECRET);
  
  // Railway provides PORT environment variable, fallback to 5000 for development
  const port = process.env.PORT || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    console.log(`🎯 InsideMeter server successfully started on port ${port}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    log(`serving on port ${port}`);
    // Start notification scheduler after server is running
    startNotificationScheduler();
  });
  
  // Graceful shutdown handling for Railway
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
})();
