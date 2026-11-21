// server/src/config/neonRealtime.ts
// Neon Realtime client for sealing live queries over Lakebase Postgres

import { createRealtime, rawSql } from '@neon/realtime/server';

const isRealtimeConfigured = Boolean(process.env.NEON_REALTIME_SECRET);

export const realtime = isRealtimeConfigured
  ? createRealtime({
      secret: process.env.NEON_REALTIME_SECRET!,
      db: 'neondb',
    })
  : null;

/**
 * Creates a sealed live query for products table
 */
export async function sealProductsLiveQuery() {
  if (!realtime) {
    throw new Error('Neon Realtime secret is not configured.');
  }

  const query = rawSql(
    `SELECT id, title, price, status, category, condition, created_at FROM products WHERE status = 'available' ORDER BY created_at DESC LIMIT 20`,
  );

  return realtime.seal({ query });
}

export { isRealtimeConfigured };

