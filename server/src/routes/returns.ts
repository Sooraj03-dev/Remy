// server/src/routes/returns.ts
// Returns and refund management routes

import { Router } from 'express';
import { z } from 'zod';
import { eq, desc, or } from 'drizzle-orm';
import { protect, getAuthContext } from '../middleware/auth';
import { getDb } from '../config/db';
import { returns } from '../db/schema/returns';
import { orders } from '../db/schema/orders';
import { users } from '../db/schema/users';
import { products } from '../db/schema/products';
import { createNotification } from './notifications';
import type { ReturnRequest } from '../../../shared/types';

export const returnsRouter = Router();

returnsRouter.use(protect);

const createReturnSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  reason: z.enum(['not_as_described', 'defective', 'wrong_item', 'other']),
  details: z.string().max(1000).optional(),
});

const updateReturnStatusSchema = z.object({
  status: z.enum(['approved', 'rejected', 'refunded']),
  sellerNotes: z.string().max(500).optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapReturn = (r: any): ReturnRequest => {
  const ret = r.returns ?? r;
  const p = r.products ?? {};
  const b = r.buyer ?? {};
  const s = r.seller ?? {};
  return {
    id: ret.id,
    orderId: ret.orderId ?? ret.order_id,
    productId: ret.productId ?? ret.product_id,
    productTitle: p.title ?? undefined,
    buyerId: ret.buyerId ?? ret.buyer_id,
    buyerName: b.fullName ?? undefined,
    sellerId: ret.sellerId ?? ret.seller_id,
    sellerName: s.fullName ?? undefined,
    amount: ret.amount ? parseFloat(ret.amount) : 0,
    reason: ret.reason,
    details: ret.details ?? undefined,
    status: ret.status,
    sellerNotes: ret.sellerNotes ?? ret.seller_notes ?? undefined,
    createdAt: new Date(ret.createdAt ?? ret.created_at).toISOString(),
    updatedAt: new Date(ret.updatedAt ?? ret.updated_at).toISOString(),
  };
};

/**
 * POST /api/returns
 * Buyer submits a return/refund request for an order.
 */
returnsRouter.post('/', async (req, res, next) => {
  try {
    const { orderId, reason, details } = createReturnSchema.parse(req.body);
    const { userId } = getAuthContext(req);
    const db = getDb();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId!));

    if (!user) {
      res.status(401).json({ success: false, error: 'USER_NOT_FOUND', message: 'User not found.' });
      return;
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found.' });
      return;
    }

    if (order.buyerId !== user.id) {
      res.status(403).json({ success: false, error: 'UNAUTHORIZED', message: 'Only buyer can request a return.' });
      return;
    }

    // Check if return request already exists
    const [existing] = await db
      .select()
      .from(returns)
      .where(eq(returns.orderId, orderId));

    if (existing) {
      res.status(400).json({
        success: false,
        error: 'DUPLICATE_RETURN_REQUEST',
        message: 'A return or refund request has already been filed for this order.',
      });
      return;
    }

    const [newReturn] = await db
      .insert(returns)
      .values({
        orderId: order.id,
        productId: order.productId,
        buyerId: user.id,
        sellerId: order.sellerId,
        reason,
        details: details || null,
        status: 'requested',
      })
      .returning();

    // Notify seller of return request
    await createNotification({
      userId: order.sellerId,
      type: 'order_status_changed',
      title: 'Return Request Filed 🔄',
      message: `Buyer filed a return request for order #${order.id.slice(0, 8)} (${reason}).`,
      data: { orderId: order.id, returnId: newReturn.id },
    });

    res.status(201).json({
      success: true,
      data: mapReturn(newReturn),
      message: 'Return request submitted successfully.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/returns/buyer
 * Buyer gets their return requests.
 */
returnsRouter.get('/buyer', async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId!));

    if (!user) {
      res.status(401).json({ success: false, error: 'USER_NOT_FOUND', message: 'User not found.' });
      return;
    }

    const records = await db
      .select()
      .from(returns)
      .innerJoin(products, eq(returns.productId, products.id))
      .where(eq(returns.buyerId, user.id))
      .orderBy(desc(returns.createdAt));

    res.status(200).json({
      success: true,
      data: (records as any[]).map(mapReturn),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/returns/seller
 * Seller gets incoming return requests.
 */
returnsRouter.get('/seller', async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId!));

    if (!user) {
      res.status(401).json({ success: false, error: 'USER_NOT_FOUND', message: 'User not found.' });
      return;
    }

    const records = await db
      .select()
      .from(returns)
      .innerJoin(products, eq(returns.productId, products.id))
      .where(eq(returns.sellerId, user.id))
      .orderBy(desc(returns.createdAt));

    res.status(200).json({
      success: true,
      data: (records as any[]).map(mapReturn),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/returns/:id
 * Seller or admin updates return request (approves, rejects, or marks refunded).
 */
returnsRouter.patch('/:id', async (req, res, next) => {
  try {
    const { status, sellerNotes } = updateReturnStatusSchema.parse(req.body);
    const { userId, role } = getAuthContext(req);
    const db = getDb();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId!));

    if (!user) {
      res.status(401).json({ success: false, error: 'USER_NOT_FOUND', message: 'User not found.' });
      return;
    }

    const [existing] = await db
      .select()
      .from(returns)
      .where(eq(returns.id, req.params.id));

    if (!existing) {
      res.status(404).json({ success: false, error: 'RETURN_NOT_FOUND', message: 'Return request not found.' });
      return;
    }

    const isSeller = existing.sellerId === user.id;
    const isAdmin = role === 'admin' || role === 'verifier';

    if (!isSeller && !isAdmin) {
      res.status(403).json({ success: false, error: 'UNAUTHORIZED', message: 'Only seller or admin can update return request.' });
      return;
    }

    const [updated] = await db
      .update(returns)
      .set({
        status,
        sellerNotes: sellerNotes || existing.sellerNotes,
        updatedAt: new Date(),
      })
      .where(eq(returns.id, req.params.id))
      .returning();

    // Notify buyer
    await createNotification({
      userId: existing.buyerId,
      type: 'order_status_changed',
      title: `Return Request ${status.toUpperCase()} 🔄`,
      message: `Your return request has been ${status}. ${sellerNotes ? `Note: ${sellerNotes}` : ''}`,
      data: { returnId: existing.id, orderId: existing.orderId, status },
    });

    res.status(200).json({
      success: true,
      data: mapReturn(updated),
      message: `Return request marked as ${status}.`,
    });
  } catch (err) {
    next(err);
  }
});

