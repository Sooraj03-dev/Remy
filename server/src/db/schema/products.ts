// server/src/db/schema/products.ts
// Drizzle schema for the products table

import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const products = pgTable('products', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sellerId: uuid('seller_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  category: text('category').notNull(),
  condition: text('condition').notNull(),
  status: text('status').default('pending_review').notNull(),
  images: text('images').array().default(sql`ARRAY[]::text[]`).notNull(),
  aiVerified: boolean('ai_verified').default(false).notNull(),
  verifierId: uuid('verifier_id').references(() => users.id),
  rejectionReason: text('rejection_reason'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  campusLocation: text('campus_location'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ProductRecord = typeof products.$inferSelect;
export type NewProductRecord = typeof products.$inferInsert;

