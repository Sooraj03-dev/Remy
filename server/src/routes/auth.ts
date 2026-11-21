// server/src/routes/auth.ts
// Auth routes — sync Clerk user to Neon database and fetch profile

import { Router } from 'express';
import { eq, sql, count, and } from 'drizzle-orm';
import { protect, getAuthContext } from '../middleware/auth';
import { getDb } from '../config/db';
import { users } from '../db/schema/users';
import { products } from '../db/schema/products';
import type { UserProfile, UpdateProfilePayload } from '../../../shared/types';

export const authRouter = Router();

/**
 * POST /api/auth/sync
 * Called after Clerk sign-in / sign-up to upsert the user record in the Neon database.
 * Protected — requires valid Clerk JWT (or test token).
 * Default role is ALWAYS 'student'; clients can NEVER escalate their own role.
 */
authRouter.post('/sync', protect, async (req, res, next) => {
  try {
    const { userId, role } = getAuthContext(req);
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'No user ID in authentication token.',
      });
      return;
    }

    const { fullName, email, university, avatarUrl } = req.body as {
      fullName?: string;
      email?: string;
      university?: string;
      avatarUrl?: string;
    };

    if (!fullName || !email) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'fullName and email are required to sync user profile.',
      });
      return;
    }

    const db = getDb();

    // Check if user already exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId));

    let syncedUser;

    if (existing) {
      // Update details while strictly preserving the role
      const [updated] = await db
        .update(users)
        .set({
          fullName,
          email,
          university: university ?? existing.university,
          avatarUrl: avatarUrl ?? existing.avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkId, userId))
        .returning();
      syncedUser = updated;
    } else {
      // Insert new record with default 'student' role
      const [created] = await db
        .insert(users)
        .values({
          clerkId: userId,
          fullName,
          email,
          university: university || null,
          avatarUrl: avatarUrl || null,
          role: role === 'admin' ? 'admin' : 'student', // only honor trusted admin claims
        })
        .returning();
      syncedUser = created;
    }

    res.status(200).json({
      success: true,
      data: syncedUser,
      message: 'User synchronized successfully.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Returns the current user's profile and marketplace statistics.
 * Protected — requires valid Clerk JWT.
 */
authRouter.get('/me', protect, async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'No user ID in authentication token.',
      });
      return;
    }

    const db = getDb();
    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId));

    if (!userRecord) {
      res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User record not found in database. Please sync account first.',
      });
      return;
    }

    // Compute marketplace statistics
    const [activeStats] = await db
      .select({ count: count() })
      .from(products)
      .where(
        and(
          eq(products.sellerId, userRecord.id),
          sql`${products.status} IN ('available', 'verified')`,
        ),
      );

    const [soldStats] = await db
      .select({ count: count() })
      .from(products)
      .where(
        and(
          eq(products.sellerId, userRecord.id),
          eq(products.status, 'sold'),
        ),
      );

    const profile: UserProfile = {
      id: userRecord.id,
      clerkId: userRecord.clerkId,
      fullName: userRecord.fullName,
      email: userRecord.email,
      university: userRecord.university ?? undefined,
      avatarUrl: userRecord.avatarUrl ?? undefined,
      role: userRecord.role as UserProfile['role'],
      status: (userRecord.status as UserProfile['status']) || 'active',
      rating: parseFloat(userRecord.rating),
      createdAt: userRecord.createdAt.toISOString(),
      updatedAt: userRecord.updatedAt.toISOString(),
      activeListings: activeStats?.count ?? 0,
      totalSold: soldStats?.count ?? 0,
    };

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/auth/me
 * Updates editable profile fields for the authenticated user.
 */
authRouter.patch('/me', protect, async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'No user ID in authentication token.',
      });
      return;
    }

    const body = req.body as UpdateProfilePayload;
    const db = getDb();

    const [updated] = await db
      .update(users)
      .set({
        ...(body.fullName ? { fullName: body.fullName } : {}),
        ...(body.university !== undefined ? { university: body.university } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, userId))
      .returning();

    if (!updated) {
      res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User record not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Profile updated successfully.',
    });
  } catch (err) {
    next(err);
  }
});
