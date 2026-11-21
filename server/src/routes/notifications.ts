// server/src/routes/notifications.ts
// In-app notifications routes and helper

import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { protect, getAuthContext } from '../middleware/auth';
import { getDb } from '../config/db';
import { notifications, users } from '../db/schema';
import type { AppNotification, NotificationType } from '../../../shared/types';

export const notificationsRouter = Router();

/**
 * Helper to record a notification in the database for a user
 */
export async function createNotification(params: {
  userId: string; // Neon user ID (UUID)
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}) {
  try {
    const db = getDb();
    const [record] = await db
      .insert(notifications)
      .values({
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data ? JSON.stringify(params.data) : null,
        read: false,
      })
      .returning();
    return record;
  } catch (err) {
    console.warn('[Notification Error]', err);
    return null;
  }
}

/**
 * GET /api/notifications
 * Returns all notifications for the authenticated student, newest first
 */
notificationsRouter.get('/', protect, async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    if (!userId) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Auth required.' });
      return;
    }

    const db = getDb();
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.clerkId, userId));
    if (!user) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    const records = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt));

    const data: AppNotification[] = (records as any[]).map((r) => ({
      id: r.id,
      userId: r.userId,
      type: r.type as NotificationType,
      title: r.title,
      message: r.message,
      data: r.data ? JSON.parse(r.data) : undefined,
      read: r.read,
      createdAt: new Date(r.createdAt).toISOString(),
    }));

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Marks a notification as read
 */
notificationsRouter.patch('/:id/read', protect, async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    const db = getDb();

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.clerkId, userId!));
    if (!user) {
      res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'User not found.' });
      return;
    }

    const [updated] = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, req.params.id))
      .returning();

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications/read-all
 * Marks all notifications for user as read
 */
notificationsRouter.patch('/read-all', protect, async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    const db = getDb();

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.clerkId, userId!));
    if (!user) {
      res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'User not found.' });
      return;
    }

    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, user.id));

    res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
});
