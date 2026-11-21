// server/src/routes/admin.ts
// Admin and verifier product moderation, verification audit, community reports & user management

import { Router } from 'express';
import { eq, sql, desc, or, ilike } from 'drizzle-orm';
import { z } from 'zod';
import { protect, requireRole, getAuthContext } from '../middleware/auth';
import { getDb } from '../config/db';
import { products } from '../db/schema/products';
import { users } from '../db/schema/users';
import { verifications } from '../db/schema/verifications';
import { reports } from '../db/schema/reports';
import { createNotification } from './notifications';
import type {
  Product,
  ProductCategory,
  ProductCondition,
  ProductStatus,
  CommunityReport,
  VerificationLog,
} from '../../../shared/types';

export const adminRouter = Router();

// All admin routes require authentication and either 'admin' or 'verifier' role
adminRouter.use(protect, requireRole('admin', 'verifier'));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapAdminProduct = (record: any): Product => {
  const p = record.products ?? record;
  const u = record.users ?? {};
  return {
    id: p.id,
    sellerId: p.sellerId,
    sellerName: u.fullName ?? 'Campus Student',
    sellerAvatarUrl: u.avatarUrl ?? undefined,
    sellerEmail: u.email ?? undefined,
    title: p.title,
    description: p.description ?? undefined,
    price: parseFloat(p.price),
    category: p.category as ProductCategory,
    condition: p.condition as ProductCondition,
    status: p.status as ProductStatus,
    images: p.images ?? [],
    aiVerified: p.aiVerified ?? false,
    verifierId: p.verifierId ?? undefined,
    rejectionReason: p.rejectionReason ?? undefined,
    reviewedAt: p.reviewedAt ? new Date(p.reviewedAt).toISOString() : undefined,
    campusLocation: p.campusLocation ?? undefined,
    createdAt: new Date(p.createdAt).toISOString(),
    updatedAt: new Date(p.updatedAt).toISOString(),
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapReport = (record: any): CommunityReport => {
  const rep = record.reports ?? record;
  const u = record.reporter ?? {};
  return {
    id: rep.id,
    reporterId: rep.reporterId ?? rep.reporter_id,
    reporterName: u.fullName ?? undefined,
    targetType: rep.targetType ?? rep.target_type,
    targetId: rep.targetId ?? rep.target_id,
    reason: rep.reason,
    details: rep.details ?? undefined,
    status: rep.status,
    resolutionNotes: rep.resolutionNotes ?? rep.resolution_notes ?? undefined,
    resolvedBy: rep.resolvedBy ?? rep.resolved_by ?? undefined,
    createdAt: new Date(rep.createdAt ?? rep.created_at).toISOString(),
    updatedAt: new Date(rep.updatedAt ?? rep.updated_at).toISOString(),
  };
};

const rejectSchema = z.object({
  reason: z
    .string()
    .min(3, 'Rejection reason must be at least 3 characters long')
    .max(500),
});

const requestChangesSchema = z.object({
  changesRequested: z
    .string()
    .min(5, 'Requested changes must be at least 5 characters long')
    .max(500),
});

const resolveReportSchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
  resolutionNotes: z.string().max(500).optional(),
});

const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

/**
 * GET /api/admin/pending
 * Lists all product listings currently awaiting review.
 */
adminRouter.get('/pending', async (_req, res, next) => {
  try {
    const db = getDb();
    const records = await db
      .select()
      .from(products)
      .innerJoin(users, eq(products.sellerId, users.id))
      .where(
        sql`${products.status} IN ('pending', 'pending_review', 'under_review', 'changes_requested')`,
      )
      .orderBy(desc(products.createdAt));

    const data = records.map(mapAdminProduct);

    res.status(200).json({
      success: true,
      data,
      message: `Found ${data.length} listing(s) pending review.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/products/:id/approve
 * Approves a product listing, records verification audit log, and notifies seller.
 */
adminRouter.post('/products/:id/approve', async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    const db = getDb();

    let verifierDbId: string | null = null;
    if (userId) {
      const [verifierUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, userId));
      verifierDbId = verifierUser?.id || null;
    }

    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.id, req.params.id));

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'PRODUCT_NOT_FOUND',
        message: 'Product listing not found.',
      });
      return;
    }

    const [updated] = await db
      .update(products)
      .set({
        status: 'available',
        verifierId: verifierDbId,
        reviewedAt: new Date(),
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(products.id, req.params.id))
      .returning();

    // Record audit trail in verifications table
    await db.insert(verifications).values({
      productId: existing.id,
      reviewerId: verifierDbId,
      action: 'approved',
      notes: 'Listing passed review guidelines and was approved.',
    });

    // Notify seller of approval
    await createNotification({
      userId: existing.sellerId,
      type: 'product_approved',
      title: 'Listing Approved! 🚀',
      message: `Your listing "${existing.title}" was approved and is now live in the marketplace.`,
      data: { productId: existing.id },
    });

    const [withSeller] = await db
      .select()
      .from(products)
      .innerJoin(users, eq(products.sellerId, users.id))
      .where(eq(products.id, updated?.id || req.params.id));

    res.status(200).json({
      success: true,
      data: mapAdminProduct(withSeller || { products: updated || existing, users: null }),
      message: 'Product approved and published to marketplace.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/products/:id/reject
 * Rejects a product listing with documented reason and audit trail.
 */
adminRouter.post('/products/:id/reject', async (req, res, next) => {
  try {
    const validation = rejectSchema.safeParse(req.body);
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

    let verifierDbId: string | null = null;
    if (userId) {
      const [verifierUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, userId));
      verifierDbId = verifierUser?.id || null;
    }

    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.id, req.params.id));

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'PRODUCT_NOT_FOUND',
        message: 'Product listing not found.',
      });
      return;
    }

    const [updated] = await db
      .update(products)
      .set({
        status: 'rejected',
        verifierId: verifierDbId,
        rejectionReason: validation.data.reason,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(products.id, req.params.id))
      .returning();

    // Record audit trail
    await db.insert(verifications).values({
      productId: existing.id,
      reviewerId: verifierDbId,
      action: 'rejected',
      notes: validation.data.reason,
    });

    // Notify seller
    await createNotification({
      userId: existing.sellerId,
      type: 'product_rejected',
      title: 'Listing Needs Revision ⚠️',
      message: `Your listing "${existing.title}" was not approved: ${validation.data.reason}`,
      data: { productId: existing.id, reason: validation.data.reason },
    });

    const [withSeller] = await db
      .select()
      .from(products)
      .innerJoin(users, eq(products.sellerId, users.id))
      .where(eq(products.id, updated?.id || req.params.id));

    res.status(200).json({
      success: true,
      data: mapAdminProduct(withSeller || { products: updated || existing, users: null }),
      message: 'Product rejected with reason recorded.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/products/:id/request-changes
 * Verifier requests specific seller changes before approving.
 */
adminRouter.post('/products/:id/request-changes', async (req, res, next) => {
  try {
    const { changesRequested } = requestChangesSchema.parse(req.body);
    const { userId } = getAuthContext(req);
    const db = getDb();

    let verifierDbId: string | null = null;
    if (userId) {
      const [verifierUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, userId));
      verifierDbId = verifierUser?.id || null;
    }

    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.id, req.params.id));

    if (!existing) {
      res.status(404).json({ success: false, error: 'PRODUCT_NOT_FOUND', message: 'Product listing not found.' });
      return;
    }

    const [updated] = await db
      .update(products)
      .set({
        status: 'changes_requested',
        rejectionReason: changesRequested,
        updatedAt: new Date(),
      })
      .where(eq(products.id, req.params.id))
      .returning();

    await db.insert(verifications).values({
      productId: existing.id,
      reviewerId: verifierDbId,
      action: 'changes_requested',
      notes: changesRequested,
    });

    await createNotification({
      userId: existing.sellerId,
      type: 'system',
      title: 'Changes Requested on Listing ✏️',
      message: `Verifier requested changes on "${existing.title}": ${changesRequested}`,
      data: { productId: existing.id, changesRequested },
    });

    res.status(200).json({
      success: true,
      data: mapAdminProduct(updated),
      message: 'Changes requested from seller.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/verifications/:productId
 * Fetches the audit trail of verification actions for a product.
 */
adminRouter.get('/verifications/:productId', async (req, res, next) => {
  try {
    const db = getDb();
    const records = await db
      .select()
      .from(verifications)
      .leftJoin(users, eq(verifications.reviewerId, users.id))
      .where(eq(verifications.productId, req.params.productId))
      .orderBy(desc(verifications.createdAt));

    const data: VerificationLog[] = records.map((r: any) => ({
      id: r.verifications.id,
      productId: r.verifications.productId,
      reviewerId: r.verifications.reviewerId ?? undefined,
      reviewerName: r.users?.fullName ?? 'Automated Verifier',
      action: r.verifications.action,
      notes: r.verifications.notes ?? undefined,
      createdAt: new Date(r.verifications.createdAt).toISOString(),
    }));

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/reports
 * Lists all community reports queued for moderator review.
 */
adminRouter.get('/reports', async (_req, res, next) => {
  try {
    const db = getDb();
    const records = await db
      .select()
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .orderBy(desc(reports.createdAt));

    const data = records.map(mapReport);

    res.status(200).json({
      success: true,
      data,
      message: `Found ${data.length} community report(s).`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/reports/:id
 * Resolves or dismisses a community report.
 */
adminRouter.patch('/reports/:id', async (req, res, next) => {
  try {
    const { status, resolutionNotes } = resolveReportSchema.parse(req.body);
    const { userId } = getAuthContext(req);
    const db = getDb();

    let verifierDbId: string | null = null;
    if (userId) {
      const [verifierUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, userId));
      verifierDbId = verifierUser?.id || null;
    }

    const [updated] = await db
      .update(reports)
      .set({
        status,
        resolutionNotes: resolutionNotes || null,
        resolvedBy: verifierDbId,
        updatedAt: new Date(),
      })
      .where(eq(reports.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ success: false, error: 'REPORT_NOT_FOUND', message: 'Report not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: mapReport(updated),
      message: `Report marked as ${status}.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/products/:id
 * Moderation action: Removes an inappropriate or scam product listing from marketplace.
 */
adminRouter.delete('/products/:id', async (req, res, next) => {
  try {
    const db = getDb();
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, req.params.id));

    if (!product) {
      res.status(404).json({ success: false, error: 'PRODUCT_NOT_FOUND', message: 'Product not found.' });
      return;
    }

    await db
      .update(products)
      .set({ status: 'removed', updatedAt: new Date() })
      .where(eq(products.id, req.params.id));

    await createNotification({
      userId: product.sellerId,
      type: 'system',
      title: 'Listing Removed by Moderator ⚠️',
      message: `Your listing "${product.title}" was removed due to a community guideline violation.`,
      data: { productId: product.id },
    });

    res.status(200).json({
      success: true,
      message: 'Product listing removed from campus marketplace.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/users
 * Lists users with optional search, role, and status filtering.
 */
adminRouter.get('/users', async (req, res, next) => {
  try {
    const db = getDb();
    const search = req.query.search as string | undefined;

    let query = db
      .select({
        id: users.id,
        clerkId: users.clerkId,
        fullName: users.fullName,
        email: users.email,
        university: users.university,
        role: users.role,
        status: users.status,
        rating: users.rating,
        createdAt: users.createdAt,
      })
      .from(users);

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.where(
        or(
          ilike(users.fullName, term),
          ilike(users.email, term),
          ilike(users.university, term),
        ),
      );
    }

    const userRecords = await query.orderBy(desc(users.createdAt));

    res.status(200).json({
      success: true,
      data: userRecords,
      total: userRecords.length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/users/:id
 * Detailed user inspection including role, status, and activity counts.
 */
adminRouter.get('/users/:id', async (req, res, next) => {
  try {
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.params.id));

    if (!user) {
      res.status(404).json({ success: false, error: 'USER_NOT_FOUND', message: 'User not found.' });
      return;
    }

    const [listingsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.sellerId, user.id));

    const [reportsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(reports)
      .where(sql`${reports.targetId} = ${user.id}`);

    res.status(200).json({
      success: true,
      data: {
        ...user,
        activeListings: Number(listingsCount?.count || 0),
        reportsAgainstUser: Number(reportsCount?.count || 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * Suspends or restores a user account.
 */
adminRouter.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { status } = updateUserStatusSchema.parse(req.body);
    const db = getDb();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.params.id));

    if (!user) {
      res.status(404).json({ success: false, error: 'USER_NOT_FOUND', message: 'User not found.' });
      return;
    }

    const [updated] = await db
      .update(users)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.params.id))
      .returning();

    // Notify user of account status change
    await createNotification({
      userId: user.id,
      type: 'system',
      title: status === 'suspended' ? 'Account Suspended ⚠️' : 'Account Restored ✅',
      message:
        status === 'suspended'
          ? 'Your campus marketplace privileges have been temporarily suspended by an administrator.'
          : 'Your campus marketplace account privileges have been restored.',
      data: { status },
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: `User account has been marked as ${status}.`,
    });
  } catch (err) {
    next(err);
  }
});
