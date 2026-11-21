// server/src/db/schema/payments.ts
// Drizzle schema for UPI and campus cash payment records

import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { orders } from './orders';
import { users } from './users';

export const payments = pgTable('payments', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderId: uuid('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  payerId: uuid('payer_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  payeeId: uuid('payee_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  method: text('method').default('upi_demo').notNull(), // 'upi' | 'upi_demo' | 'cash_on_meetup'
  status: text('status').default('pending').notNull(), // 'pending' | 'completed' | 'failed' | 'refunded'
  transactionRef: text('transaction_ref').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type PaymentRecord = typeof payments.$inferSelect;
export type NewPaymentRecord = typeof payments.$inferInsert;

