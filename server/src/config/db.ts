// server/src/config/db.ts
// Drizzle ORM + Neon PostgreSQL configuration
// DATABASE_URL is read from server environment only — never from mobile.

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import { createTestDb } from './testDb';

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV !== 'test') {
  console.warn(
    '[DB] DATABASE_URL is not set. ' +
      'Database operations will fail until a valid Neon connection string is provided in server/.env',
  );
}

// Lazily created so the server can start without crashing when DATABASE_URL is absent
export const getDb = () => {
  const currentConnectionString = process.env.DATABASE_URL || connectionString;
  if (!currentConnectionString) {
    if (process.env.NODE_ENV === 'test') {
      return createTestDb();
    }
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
        'Configure your Neon connection string in server/.env',
    );
  }
  const client = neon(currentConnectionString);
  return drizzle(client, { schema });
};

// Connectivity check helper
export const checkDbConnection = async (): Promise<{
  connected: boolean;
  error?: string;
}> => {
  const currentConnectionString = process.env.DATABASE_URL || connectionString;
  if (!currentConnectionString) {
    return { connected: false, error: 'DATABASE_URL_UNSET' };
  }
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    return { connected: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown database error';
    return { connected: false, error: msg };
  }
};

// Named export for convenience in route handlers
export type Db = ReturnType<typeof getDb>;
