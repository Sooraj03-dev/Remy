// server/src/db/schema/returns.ts
// Drizzle schema for return and refund requests

import {
  pgTable,
  uuid,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { orders } from './orders';
import { products } from './products';
import { users } from './users';

export const returns = pgTable('returns', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderId: uuid('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  productId: uuid('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  buyerId: uuid('buyer_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  sellerId: uuid('seller_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  reason: text('reason').notNull(),
  details: text('details'),
  status: text('status').default('requested').notNull(), // 'requested' | 'approved' | 'rejected' | 'refunded'
  sellerNotes: text('seller_notes'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ReturnRecord = typeof returns.$inferSelect;
export type NewReturnRecord = typeof returns.$inferInsert;

