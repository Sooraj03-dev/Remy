// server/drizzle.config.ts
// Drizzle Kit configuration for schema generation and migrations
// Run: npx drizzle-kit generate  (DO NOT run migrate without review)

import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
  verbose: true,
  strict: true,
} satisfies Config;

