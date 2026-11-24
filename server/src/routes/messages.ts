// server/src/routes/messages.ts
// Messaging routes — Buyer–Seller communication linked to orders

import { Router } from 'express';
import { eq, or, and, desc, asc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { protect, getAuthContext } from '../middleware/auth';
import { getDb } from '../config/db';
import { messages, orders, products, users } from '../db/schema';
import { createNotification } from './notifications';
import type { Message, Conversation } from '../../../shared/types';

export const messagesRouter = Router();

const sendMessageSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  content: z.string().min(1, 'Message cannot be empty').max(2000, 'Message exceeds 2000 characters'),
});

/**
 * GET /api/messages/conversations
 * Returns active order conversations for the current student (buyer or seller)
 */
messagesRouter.get('/conversations', protect, async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    const db = getDb();

    const [currentUser] = await db.select().from(users).where(eq(users.clerkId, userId!));
    if (!currentUser) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    // Get all orders where current user is either buyer or seller
    const userOrders = await db
      .select({
        orders,
        products,
        buyer: { id: users.id, fullName: users.fullName, avatarUrl: users.avatarUrl },
      })
      .from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .innerJoin(users, eq(orders.buyerId, users.id))
      .where(or(eq(orders.buyerId, currentUser.id), eq(orders.sellerId, currentUser.id)))
      .orderBy(desc(orders.updatedAt));

    const conversations: Conversation[] = [];

    for (const item of userOrders) {
      const isBuyer = item.orders.buyerId === currentUser.id;
      const otherUserId = isBuyer ? item.orders.sellerId : item.orders.buyerId;

      // Lookup other user details if current user is buyer (so other user is seller)
      let otherUserName = item.buyer.fullName;
      let otherUserAvatar = item.buyer.avatarUrl;

      if (isBuyer) {
        const [seller] = await db.select().from(users).where(eq(users.id, otherUserId));
        if (seller) {
          otherUserName = seller.fullName;
          otherUserAvatar = seller.avatarUrl;
        }
      }

      // Lookup last message
      const [lastMsg] = await db
        .select()
        .from(messages)
        .where(eq(messages.orderId, item.orders.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      // Unread count
      const [unreadResult] = await db
        .select({ count: sql`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.orderId, item.orders.id),
            eq(messages.receiverId, currentUser.id),
            eq(messages.read, false),
          ),
        );

      const unreadCount = Number(unreadResult?.count ?? 0);

      conversations.push({
        orderId: item.orders.id,
        productId: item.products.id,
        productTitle: item.products.title,
        otherUserId,
        otherUserName: otherUserName ?? 'Campus Student',
        otherUserAvatarUrl: otherUserAvatar ?? undefined,
        lastMessage: lastMsg ? lastMsg.content : `Order #${item.orders.id.slice(0, 6)} initiated`,
        lastMessageAt: lastMsg
          ? new Date(lastMsg.createdAt).toISOString()
          : new Date(item.orders.createdAt).toISOString(),
        unreadCount,
      });
    }

    res.status(200).json({ success: true, data: conversations });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/messages/order/:orderId
 * Fetches all messages for a specific order. Only buyer and seller can view.
 */
messagesRouter.get('/order/:orderId', protect, async (req, res, next) => {
  try {
    const { userId, role } = getAuthContext(req);
    const db = getDb();

    const [currentUser] = await db.select().from(users).where(eq(users.clerkId, userId!));
    if (!currentUser) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User not found.' });
      return;
    }

    const { orderId } = req.params;

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) {
      res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found.' });
      return;
    }

    const isParticipant =
      order.buyerId === currentUser.id ||
      order.sellerId === currentUser.id ||
      role === 'admin';

    if (!isParticipant) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You are not a participant in this conversation.',
      });
      return;
    }

    // Mark unread messages sent to current user as read
    await db
      .update(messages)
      .set({ read: true })
      .where(
        and(
          eq(messages.orderId, orderId),
          eq(messages.receiverId, currentUser.id),
          eq(messages.read, false),
        ),
      );

    const msgRecords = await db
      .select({
        messages,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.orderId, orderId))
      .orderBy(asc(messages.createdAt));

    const data: Message[] = (msgRecords as any[]).map((r) => ({
      id: r.messages.id,
      orderId: r.messages.orderId,
      senderId: r.messages.senderId,
      senderName: r.sender.fullName,
      senderAvatarUrl: r.sender.avatarUrl ?? undefined,
      receiverId: r.messages.receiverId,
      content: r.messages.content,
      read: r.messages.read,
      createdAt: new Date(r.messages.createdAt).toISOString(),
      isMine: r.messages.senderId === currentUser.id,
    }));

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/messages
 * Sends a message in an order conversation
 */
messagesRouter.post('/', protect, async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    const db = getDb();

    const validation = sendMessageSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors.map((e) => e.message).join(' '),
      });
      return;
    }

    const { orderId, content } = validation.data;

    const [currentUser] = await db.select().from(users).where(eq(users.clerkId, userId!));
    if (!currentUser) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User not found.' });
      return;
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) {
      res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found.' });
      return;
    }

    const isBuyer = order.buyerId === currentUser.id;
    const isSeller = order.sellerId === currentUser.id;

    if (!isBuyer && !isSeller) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You cannot send messages to an order you are not part of.',
      });
      return;
    }

    // Determine receiver
    const receiverId = isBuyer ? order.sellerId : order.buyerId;

    const [createdMsg] = await db
      .insert(messages)
      .values({
        orderId,
        senderId: currentUser.id,
        receiverId,
        content: content.trim(),
        read: false,
      })
      .returning();

    // Notify recipient
    await createNotification({
      userId: receiverId,
      type: 'new_message',
      title: `New message from ${currentUser.fullName}`,
      message: content.length > 80 ? `${content.slice(0, 77)}...` : content,
      data: { orderId, messageId: createdMsg.id },
    });

    const fullMessage: Message = {
      id: createdMsg.id,
      orderId: createdMsg.orderId,
      senderId: createdMsg.senderId,
      senderName: currentUser.fullName,
      senderAvatarUrl: currentUser.avatarUrl ?? undefined,
      receiverId: createdMsg.receiverId,
      content: createdMsg.content,
      read: createdMsg.read,
      createdAt: new Date(createdMsg.createdAt).toISOString(),
      isMine: true,
    };

    res.status(201).json({
      success: true,
      data: fullMessage,
      message: 'Message sent successfully.',
    });
  } catch (err) {
    next(err);
  }
});

const startChatSchema = z.object({
  productId: z.string().uuid('Invalid product ID format'),
});

/**
 * POST /api/messages/start
 * Finds existing conversation for a product or creates an inquiry order to chat
 */
messagesRouter.post('/start', protect, async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    const db = getDb();

    const validation = startChatSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors.map((e) => e.message).join(' '),
      });
      return;
    }

    const { productId } = validation.data;

    const [currentUser] = await db.select().from(users).where(eq(users.clerkId, userId!));
    if (!currentUser) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User not found.' });
      return;
    }

    const [product] = await db.select().from(products).where(eq(products.id, productId));
    if (!product) {
      res.status(404).json({ success: false, error: 'PRODUCT_NOT_FOUND', message: 'Product not found.' });
      return;
    }

    if (product.sellerId === currentUser.id) {
      res.status(400).json({
        success: false,
        error: 'CANNOT_CHAT_WITH_SELF',
        message: 'You are the seller of this listing.',
      });
      return;
    }

    // Check if an order or inquiry already exists between this buyer and seller for this product
    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.productId, productId),
          eq(orders.buyerId, currentUser.id),
          eq(orders.sellerId, product.sellerId),
        ),
      )
      .orderBy(desc(orders.createdAt))
      .limit(1);

    if (existingOrder) {
      res.status(200).json({
        success: true,
        data: {
          orderId: existingOrder.id,
          isNew: false,
        },
      });
      return;
    }

    // Create an inquiry order to host the conversation
    const [newOrder] = await db
      .insert(orders)
      .values({
        productId: product.id,
        buyerId: currentUser.id,
        sellerId: product.sellerId,
        status: 'inquiry',
        amount: product.price,
        meetupLocation: product.campusLocation || 'Campus Library / Common Area',
      })
      .returning();

    // Starter message from buyer to seller
    const starterContent = `Hi! I'm interested in "${product.title}". Is it still available for meetup?`;
    await db.insert(messages).values({
      orderId: newOrder.id,
      senderId: currentUser.id,
      receiverId: product.sellerId,
      content: starterContent,
      read: false,
    });

    // Notify seller
    await createNotification({
      userId: product.sellerId,
      type: 'new_message',
      title: `Inquiry on "${product.title}"`,
      message: `${currentUser.fullName}: ${starterContent}`,
      data: { orderId: newOrder.id },
    });

    res.status(201).json({
      success: true,
      data: {
        orderId: newOrder.id,
        isNew: true,
      },
    });
  } catch (err) {
    next(err);
  }
});
