// server/src/routes/reports.ts
// Community moderation and reporting routes (Report product, report user)

import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { protect, getAuthContext } from '../middleware/auth';
import { getDb } from '../config/db';
import { reports } from '../db/schema/reports';
import { users } from '../db/schema/users';
import { products } from '../db/schema/products';
import { createNotification } from './notifications';

export const reportsRouter = Router();

reportsRouter.use(protect);

const createReportSchema = z.object({
  targetType: z.enum(['product', 'user']),
  targetId: z.string().uuid('Invalid target ID format'),
  reason: z.enum([
    'spam',
    'inappropriate',
    'scam',
    'counterfeit',
    'harassment',
    'other',
  ]),
  details: z.string().max(1000).optional(),
});

/**
 * POST /api/reports
 * Submits a community report against a suspicious product listing or abusive user.
 */
reportsRouter.post('/', async (req, res, next) => {
  try {
    const validation = createReportSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors.map((e) => e.message).join(' '),
      });
      return;
    }

    const { userId } = getAuthContext(req);
    const db = getDb();

    // Resolve reporter
    const [reporter] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId!));

    if (!reporter) {
      res.status(401).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Reporter profile not found in database.',
      });
      return;
    }

    // Verify target exists
    if (validation.data.targetType === 'product') {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, validation.data.targetId));
      if (!product) {
        res.status(404).json({
          success: false,
          error: 'TARGET_NOT_FOUND',
          message: 'Product listing being reported does not exist.',
        });
        return;
      }
    } else {
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, validation.data.targetId));
      if (!targetUser) {
        res.status(404).json({
          success: false,
          error: 'TARGET_NOT_FOUND',
          message: 'User being reported does not exist.',
        });
        return;
      }
    }

    // Create report record
    const [newReport] = await db
      .insert(reports)
      .values({
        reporterId: reporter.id,
        targetType: validation.data.targetType,
        targetId: validation.data.targetId,
        reason: validation.data.reason,
        details: validation.data.details || null,
        status: 'pending',
      })
      .returning();

    // Notify user of report submission confirmation
    await createNotification({
      userId: reporter.id,
      type: 'system',
      title: 'Report Received 🛡️',
      message: `Your report regarding a ${validation.data.targetType} has been received and queued for campus moderator review.`,
      data: { reportId: newReport.id },
    });

    res.status(201).json({
      success: true,
      data: newReport,
      message: 'Report submitted successfully. Campus moderation will review it shortly.',
    });
  } catch (err) {
    next(err);
  }
});

