import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Railway production fix: Enhanced WebSocket configuration
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;
neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced pool configuration with Railway IPv4 forcing
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  max: 3,
  ssl: { rejectUnauthorized: false },
  // Force IPv4 for Railway production
  host: process.env.NODE_ENV === 'production' && process.env.DATABASE_URL ? 
    process.env.DATABASE_URL.match(/postgres:\/\/[^:]+:[^@]+@([^:]+):/)?.[1] : undefined
});
export const db = drizzle({ client: pool, schema });