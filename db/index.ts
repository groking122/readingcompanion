import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Parse DATABASE_URL and ensure SSL is configured
// Remove any surrounding quotes that might be in the env var
const databaseUrl = process.env.DATABASE_URL.trim().replace(/^['"]|['"]$/g, '');

// Configure postgres client for serverless (Vercel) environment
const client = postgres(databaseUrl, {
  ssl: 'require',
  max: 10, // Increase connection pool for serverless
  idle_timeout: 20,
  connect_timeout: 10,
  // For serverless environments, use connection pooling
  ...(process.env.VERCEL && {
    max: 1, // Single connection per serverless function
  }),
});

export const db = drizzle(client, { schema });

