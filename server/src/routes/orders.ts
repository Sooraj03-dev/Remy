// server/src/routes/orders.ts
// Order management routes — Real database transactions and order lifecycle

import { Router } from 'express';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { protect, getAuthContext } from '../middleware/auth';
import { getDb } from '../config/db';
import { orders, products, users } from '../db/schema';
import { createNotification } from './notifications';
import type { Order, OrderStatus } from '../../../shared/types';

export const ordersRouter = Router();

const createOrderSchema = z.object({
  productId: z.string().uuid('Invalid product ID format'),
  meetupLocation: z.string().max(250).optional(),
  meetupTime: z.string().datetime().optional(),
});

const updateOrderStatusSchema = z.object({
  status: z.enum([
    'placed',
    'confirmed',
    'meetup_arranged',
    'completed',
    'refunded',
    'cancelled',
  ]),
  meetupLocation: z.string().max(250).optional(),
  meetupTime: z.string().datetime().optional(),
  paymentRef: z.string().max(100).optional(),
});

// Helper to format Order response
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapOrderRecord = (record: any): Order => {
  const o = record.orders ?? record;
  const p = record.products ?? {};
  const b = record.buyer ?? {};
  const s = record.seller ?? {};

  return {
    id: o.id,
    productId: o.productId,
    productTitle: p.title ?? o.productTitle ?? 'Campus Product',
    productImage: p.images && p.images.length > 0 ? p.images[0] : undefined,
    buyerId: o.buyerId,
    buyerName: b.fullName ?? 'Campus Buyer',
    sellerId: o.sellerId,
    sellerName: s.fullName ?? 'Campus Seller',
    status: o.status as OrderStatus,
    amount: parseFloat(o.amount),
    paymentRef: o.paymentRef ?? undefined,
    meetupLocation: o.meetupLocation ?? undefined,
    meetupTime: o.meetupTime ? new Date(o.meetupTime).toISOString() : undefined,
    createdAt: new Date(o.createdAt).toISOString(),
    updatedAt: new Date(o.updatedAt).toISOString(),
  };
};

/**
 * POST /api/orders
 * Buyer places an order for an available product.
 * Atomically transitions product status to 'sold' to prevent concurrent purchases.
 */
ordersRouter.post('/', protect, async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required.' });
      return;
    }

    const validation = createOrderSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors.map((e) => e.message).join(' '),
      });
      return;
    }

    const { productId, meetupLocation, meetupTime } = validation.data;
    const db = getDb();

    // 1. Resolve Buyer User Record
    const [buyer] = await db.select().from(users).where(eq(users.clerkId, userId));
    if (!buyer) {
      res.status(404).json({ success: false, error: 'BUYER_NOT_FOUND', message: 'User profile not found.' });
      return;
    }

    // 2. Lookup Product
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId));

    if (!product) {
      res.status(404).json({ success: false, error: 'PRODUCT_NOT_FOUND', message: 'Product listing not found.' });
      return;
    }

    // 3. Prevent Self-Purchase
    if (product.sellerId === buyer.id) {
      res.status(400).json({
        success: false,
        error: 'CANNOT_PURCHASE_OWN_PRODUCT',
        message: 'You cannot place an order for your own listing.',
      });
      return;
    }

    // 4. Verify Product is Approved and Available
    if (product.status !== 'available' && product.status !== 'verified') {
      res.status(400).json({
        success: false,
        error: 'PRODUCT_NOT_AVAILABLE',
        message: 'This product is no longer available or is pending moderation.',
      });
      return;
    }

    // 5. Atomic conditional update: Claim product by setting status = 'sold'
    // Guarantees only one concurrent buyer can claim this item
    const [claimedProduct] = await db
      .update(products)
      .set({
        status: 'sold',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, productId),
          sql`${products.status} IN ('available', 'verified')`,
        ),
      )
      .returning();

    if (!claimedProduct) {
      res.status(409).json({
        success: false,
        error: 'CONCURRENT_ORDER_CONFLICT',
        message: 'Another student just placed an order for this item.',
      });
      return;
    }

    // 6. Create Order record
    const [createdOrder] = await db
      .insert(orders)
      .values({
        productId,
        buyerId: buyer.id,
        sellerId: product.sellerId,
        amount: product.price,
        status: 'placed',
        meetupLocation: meetupLocation || product.campusLocation || null,
        meetupTime: meetupTime ? new Date(meetupTime) : null,
      })
      .returning();

    // 7. Resolve Seller and Notify
    const [seller] = await db.select().from(users).where(eq(users.id, product.sellerId));

    await createNotification({
      userId: product.sellerId,
      type: 'new_order',
      title: 'New Order Received! 🎉',
      message: `${buyer.fullName} placed an order for "${product.title}" (₹${product.price}).`,
      data: { orderId: createdOrder.id, productId },
    });

    const fullOrder = mapOrderRecord({
      orders: createdOrder,
      products: product,
      buyer,
      seller,
    });

    res.status(201).json({
      success: true,
      data: fullOrder,
      message: 'Order placed successfully. Waiting for seller confirmation.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/orders
 * Returns orders placed by the current user (Buyer view)
 */
ordersRouter.get('/', protect, async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    const db = getDb();

    const [buyer] = await db.select().from(users).where(eq(users.clerkId, userId!));
    if (!buyer) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    const records = await db
      .select({
        orders,
        products,
        seller: users,
      })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .innerJoin(users, eq(orders.sellerId, users.id))
      .where(eq(orders.buyerId, buyer.id))
      .orderBy(desc(orders.createdAt));

    const data = (records as any[]).map((r) =>
      mapOrderRecord({
        orders: r.orders,
        products: r.products,
        buyer,
        seller: r.seller,
      }),
    );

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/orders/seller
 * Returns orders for items sold by the current user (Seller view)
 */
ordersRouter.get('/seller', protect, async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    const db = getDb();

    const [seller] = await db.select().from(users).where(eq(users.clerkId, userId!));
    if (!seller) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    const records = await db
      .select({
        orders,
        products,
        buyer: users,
      })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .innerJoin(users, eq(orders.buyerId, users.id))
      .where(eq(orders.sellerId, seller.id))
      .orderBy(desc(orders.createdAt));

    const data = (records as any[]).map((r) =>
      mapOrderRecord({
        orders: r.orders,
        products: r.products,
        buyer: r.buyer,
        seller,
      }),
    );

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/orders/:id
 * Fetches order details. Accessible only by buyer, seller, or admin.
 */
ordersRouter.get('/:id', protect, async (req, res, next) => {
  try {
    const { userId, role } = getAuthContext(req);
    const db = getDb();

    const [currentUser] = await db.select().from(users).where(eq(users.clerkId, userId!));
    if (!currentUser) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User not found.' });
      return;
    }

    const [orderRecord] = await db
      .select({
        orders,
        products,
      })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .where(eq(orders.id, req.params.id));

    if (!orderRecord) {
      res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found.' });
      return;
    }

    const isBuyer = orderRecord.orders.buyerId === currentUser.id;
    const isSeller = orderRecord.orders.sellerId === currentUser.id;
    const isAdmin = role === 'admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You are not authorized to view this order.',
      });
      return;
    }

    const [buyer] = await db.select().from(users).where(eq(users.id, orderRecord.orders.buyerId));
    const [seller] = await db.select().from(users).where(eq(users.id, orderRecord.orders.sellerId));

    const data = mapOrderRecord({
      orders: orderRecord.orders,
      products: orderRecord.products,
      buyer,
      seller,
    });

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/orders/:id/status
 * Updates order lifecycle state (confirm, arrange meetup, complete, cancel)
 */
ordersRouter.patch('/:id/status', protect, async (req, res, next) => {
  try {
    const { userId, role } = getAuthContext(req);
    const db = getDb();

    const validation = updateOrderStatusSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors.map((e) => e.message).join(' '),
      });
      return;
    }

    const [currentUser] = await db.select().from(users).where(eq(users.clerkId, userId!));
    if (!currentUser) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User not found.' });
      return;
    }

    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, req.params.id));

    if (!existingOrder) {
      res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found.' });
      return;
    }

    const isBuyer = existingOrder.buyerId === currentUser.id;
    const isSeller = existingOrder.sellerId === currentUser.id;
    const isAdmin = role === 'admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You are not authorized to modify this order.',
      });
      return;
    }

    const { status: targetStatus, meetupLocation, meetupTime, paymentRef } = validation.data;

    // Validate state transitions
    if (targetStatus === 'confirmed' && !isSeller && !isAdmin) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Only the seller can confirm an incoming order.',
      });
      return;
    }

    if (targetStatus === 'completed' && !isSeller && !isAdmin) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Only the seller can mark an order completed.',
      });
      return;
    }

    // If order is cancelled, revert product status back to 'available'
    if (targetStatus === 'cancelled' && existingOrder.status !== 'cancelled') {
      await db
        .update(products)
        .set({ status: 'available', updatedAt: new Date() })
        .where(eq(products.id, existingOrder.productId));
    }

    // Update order
    const [updatedOrder] = await db
      .update(orders)
      .set({
        status: targetStatus,
        ...(meetupLocation ? { meetupLocation } : {}),
        ...(meetupTime ? { meetupTime: new Date(meetupTime) } : {}),
        ...(paymentRef ? { paymentRef } : {}),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, req.params.id))
      .returning();

    // Notify the other party
    const targetUserId = isSeller ? existingOrder.buyerId : existingOrder.sellerId;
    await createNotification({
      userId: targetUserId,
      type: 'order_status',
      title: `Order Status Updated: ${targetStatus.replace('_', ' ').toUpperCase()}`,
      message: `Your campus order status changed to "${targetStatus}".`,
      data: { orderId: updatedOrder.id, status: targetStatus },
    });

    const [product] = await db.select().from(products).where(eq(products.id, updatedOrder.productId));
    const [buyer] = await db.select().from(users).where(eq(users.id, updatedOrder.buyerId));
    const [seller] = await db.select().from(users).where(eq(users.id, updatedOrder.sellerId));

    res.status(200).json({
      success: true,
      data: mapOrderRecord({ orders: updatedOrder, products: product, buyer, seller }),
      message: `Order successfully updated to ${targetStatus}.`,
    });
  } catch (err) {
    next(err);
  }
});
