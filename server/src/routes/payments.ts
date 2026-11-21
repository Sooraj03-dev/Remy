// server/src/routes/payments.ts
// Digital UPI and sandbox campus payment routes

import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { protect, getAuthContext } from '../middleware/auth';
import { getDb } from '../config/db';
import { payments } from '../db/schema/payments';
import { orders } from '../db/schema/orders';
import { users } from '../db/schema/users';
import { createNotification } from './notifications';
import type { PaymentTransaction } from '../../../shared/types';

export const paymentsRouter = Router();

paymentsRouter.use(protect);

const initiateSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  method: z.enum(['upi', 'upi_demo', 'cash_on_meetup']),
});

const verifySchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  transactionRef: z.string().min(5, 'Transaction reference must be at least 5 chars'),
  paymentMethod: z.enum(['upi', 'upi_demo', 'cash_on_meetup']),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapPayment = (p: any): PaymentTransaction => ({
  id: p.id,
  orderId: p.orderId ?? p.order_id,
  payerId: p.payerId ?? p.payer_id,
  payeeId: p.payeeId ?? p.payee_id,
  amount: parseFloat(p.amount),
  method: p.method,
  status: p.status,
  transactionRef: p.transactionRef ?? p.transaction_ref,
  createdAt: new Date(p.createdAt ?? p.created_at).toISOString(),
  updatedAt: new Date(p.updatedAt ?? p.updated_at).toISOString(),
});

/**
 * POST /api/payments/initiate
 * Initiates payment flow for an order.
 */
paymentsRouter.post('/initiate', async (req, res, next) => {
  try {
    const { orderId, method } = initiateSchema.parse(req.body);
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
      res.status(403).json({ success: false, error: 'UNAUTHORIZED', message: 'Only buyer can initiate payment.' });
      return;
    }

    // Generate simulated or UPI reference
    const timestamp = Date.now();
    const upiRef = `UPI-CAMPUS-${timestamp.toString().slice(-6)}`;
    const upiVpa = 'campusmarketplace@okaxis';

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: parseFloat(order.amount),
        method,
        upiVpa,
        transactionRef: upiRef,
        isDemoPayment: true,
        note: 'This is a secure campus sandbox payment demonstration. No real monetary charge will be deducted.',
      },
      message: 'Payment session initiated.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments/verify
 * Backend verifies payment completion and records the transaction in Neon.
 */
paymentsRouter.post('/verify', async (req, res, next) => {
  try {
    const { orderId, transactionRef, paymentMethod } = verifySchema.parse(req.body);
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
      res.status(403).json({ success: false, error: 'UNAUTHORIZED', message: 'Only buyer can complete payment verification.' });
      return;
    }

    // Insert payment record
    const [paymentRecord] = await db
      .insert(payments)
      .values({
        orderId: order.id,
        payerId: user.id,
        payeeId: order.sellerId,
        amount: order.amount,
        method: paymentMethod,
        status: 'completed',
        transactionRef,
      })
      .returning();

    // Update order with payment ref
    await db
      .update(orders)
      .set({
        paymentRef: transactionRef,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    // Notify seller
    await createNotification({
      userId: order.sellerId,
      type: 'order_status_changed',
      title: 'Payment Received 💰',
      message: `Buyer completed payment (Ref: ${transactionRef}) for order #${order.id.slice(0, 8)}.`,
      data: { orderId: order.id, transactionRef },
    });

    res.status(200).json({
      success: true,
      data: mapPayment(paymentRecord),
      message: 'Payment verified and recorded successfully.',
    });
  } catch (err) {
    next(err);
  }
});

