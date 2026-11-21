// server/src/db/schema/index.ts
// Barrel export for all Drizzle schema tables and relations

import { relations } from 'drizzle-orm';
import { users } from './users';
import { products } from './products';
import { orders } from './orders';
import { messages, wishlists } from './messages';
import { notifications } from './notifications';
import { meetupLocations } from './meetup_locations';
import { reports } from './reports';
import { verifications } from './verifications';
import { payments } from './payments';
import { returns } from './returns';

export * from './users';
export * from './products';
export * from './orders';
export * from './messages';
export * from './notifications';
export * from './meetup_locations';
export * from './reports';
export * from './verifications';
export * from './payments';
export * from './returns';

export const usersRelations = relations(users, ({ many }) => ({
  products: many(products, { relationName: 'sellerProducts' }),
  verifiedProducts: many(products, { relationName: 'verifiedProducts' }),
  buyerOrders: many(orders, { relationName: 'buyerOrders' }),
  sellerOrders: many(orders, { relationName: 'sellerOrders' }),
  sentMessages: many(messages, { relationName: 'sentMessages' }),
  receivedMessages: many(messages, { relationName: 'receivedMessages' }),
  wishlists: many(wishlists),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  seller: one(users, {
    fields: [products.sellerId],
    references: [users.id],
    relationName: 'sellerProducts',
  }),
  verifier: one(users, {
    fields: [products.verifierId],
    references: [users.id],
    relationName: 'verifiedProducts',
  }),
  orders: many(orders),
  wishlists: many(wishlists),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  product: one(products, {
    fields: [orders.productId],
    references: [products.id],
  }),
  buyer: one(users, {
    fields: [orders.buyerId],
    references: [users.id],
    relationName: 'buyerOrders',
  }),
  seller: one(users, {
    fields: [orders.sellerId],
    references: [users.id],
    relationName: 'sellerOrders',
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  order: one(orders, {
    fields: [messages.orderId],
    references: [orders.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: 'sentMessages',
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: 'receivedMessages',
  }),
}));

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  user: one(users, {
    fields: [wishlists.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [wishlists.productId],
    references: [products.id],
  }),
}));
