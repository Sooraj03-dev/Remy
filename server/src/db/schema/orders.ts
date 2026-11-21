// server/src/db/schema/orders.ts
// Drizzle schema for the orders table

import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { products } from './products';

export const orders = pgTable('orders', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  productId: uuid('product_id')
    .references(() => products.id)
    .notNull(),
  buyerId: uuid('buyer_id')
    .references(() => users.id)
    .notNull(),
  sellerId: uuid('seller_id')
    .references(() => users.id)
    .notNull(),
  status: text('status').default('placed').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  paymentRef: text('payment_ref'),
  meetupLocation: text('meetup_location'),
  meetupTime: timestamp('meetup_time', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type OrderRecord = typeof orders.$inferSelect;
export type NewOrderRecord = typeof orders.$inferInsert;

