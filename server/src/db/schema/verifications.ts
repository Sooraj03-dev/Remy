// server/src/db/schema/verifications.ts
// Drizzle schema for product verification audit trails

import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { products } from './products';
import { users } from './users';

export const verifications = pgTable('verifications', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  productId: uuid('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  reviewerId: uuid('reviewer_id').references(() => users.id),
  action: text('action').notNull(), // 'approved' | 'rejected' | 'changes_requested' | 'ai_passed' | 'ai_flagged'
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type VerificationRecord = typeof verifications.$inferSelect;
export type NewVerificationRecord = typeof verifications.$inferInsert;

