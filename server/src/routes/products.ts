// server/src/routes/products.ts
// Product management routes — real database queries via Drizzle ORM

import { Router } from 'express';
import { eq, and, sql, desc, ilike, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { protect, getAuthContext } from '../middleware/auth';
import { getDb } from '../config/db';
import { products } from '../db/schema/products';
import { users } from '../db/schema/users';
import type {
  Product,
  ProductCategory,
  ProductCondition,
  ProductStatus,
} from '../../../shared/types';

export const productsRouter = Router();

const CATEGORIES: [ProductCategory, ...ProductCategory[]] = [
  'books',
  'electronics',
  'clothing',
  'stationery',
  'sports',
  'furniture',
  'food',
  'other',
];

const CONDITIONS: [ProductCondition, ...ProductCondition[]] = [
  'new',
  'like_new',
  'good',
  'fair',
];

const createProductSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long').max(120),
  description: z.string().max(2000).optional(),
  price: z.number().positive('Price must be greater than zero'),
  category: z.enum(CATEGORIES, {
    errorMap: () => ({ message: 'Invalid product category.' }),
  }),
  condition: z.enum(CONDITIONS, {
    errorMap: () => ({ message: 'Invalid product condition.' }),
  }),
  images: z.array(z.string().url('Invalid image URL')).default([]),
  campusLocation: z.string().max(250).optional(),
});

const updateProductSchema = createProductSchema.partial().extend({
  status: z
    .enum([
      'pending',
      'pending_review',
      'under_review',
      'available',
      'sold',
      'rejected',
      'verified',
    ])
    .optional(),
});

/**
 * Helper to transform DB records (with joined user) to the shared Product interface
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapProductRecord = (record: any): Product => {
  const p = record.products ?? record;
  const u = record.users ?? {};
  return {
    id: p.id,
    sellerId: p.sellerId,
    sellerName: u.fullName ?? p.sellerName ?? 'Campus Seller',
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

/**
 * GET /api/products
 * Public marketplace feed — strictly returns only approved (available or verified) products.
 */
productsRouter.get('/', async (req, res, next) => {
  try {
    const search = (req.query.search as string) || '';
    const category = req.query.category as ProductCategory | undefined;
    const condition = req.query.condition as ProductCondition | undefined;
    const minPrice = req.query.minPrice
      ? parseFloat(req.query.minPrice as string)
      : undefined;
    const maxPrice = req.query.maxPrice
      ? parseFloat(req.query.maxPrice as string)
      : undefined;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt((req.query.limit as string) || '20', 10)),
    );
    const offset = (page - 1) * limit;

    const db = getDb();

    // Base condition: only publicly approved items
    const conditions = [
      sql`${products.status} IN ('available', 'verified')`,
    ];

    if (search) {
      conditions.push(
        sql`(${products.title} ILIKE ${`%${search}%`} OR ${products.description} ILIKE ${`%${search}%`})`,
      );
    }
    if (category && CATEGORIES.includes(category)) {
      conditions.push(eq(products.category, category));
    }
    if (condition && CONDITIONS.includes(condition)) {
      conditions.push(eq(products.condition, condition));
    }
    if (minPrice !== undefined && !isNaN(minPrice)) {
      conditions.push(gte(products.price, minPrice.toString()));
    }
    if (maxPrice !== undefined && !isNaN(maxPrice)) {
      conditions.push(lte(products.price, maxPrice.toString()));
    }

    const whereClause = and(...conditions);

    // Query listings with joined seller details
    const records = await db
      .select()
      .from(products)
      .innerJoin(users, eq(products.sellerId, users.id))
      .where(whereClause)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    // Count total matches for pagination
    const [totalRecord] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(whereClause);

    const total = Number(totalRecord?.count ?? 0);
    const data = records.map(mapProductRecord);

    res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/products/seller/me
 * Protected — returns all listings belonging to the authenticated seller (all statuses).
 */
productsRouter.get('/seller/me', protect, async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
      return;
    }

    const db = getDb();

    // Resolve user ID in DB
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId));

    if (!dbUser) {
      res.status(200).json({
        success: true,
        data: [],
        message: 'No user profile found yet.',
      });
      return;
    }

    const records = await db
      .select()
      .from(products)
      .innerJoin(users, eq(products.sellerId, users.id))
      .where(eq(products.sellerId, dbUser.id))
      .orderBy(desc(products.createdAt));

    const data = records.map(mapProductRecord);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/products/:id
 * Public product details.
 * If the product is not approved, only the seller or an admin/verifier can view it.
 */
productsRouter.get('/:id', async (req, res, next) => {
  try {
    const db = getDb();
    const [record] = await db
      .select()
      .from(products)
      .innerJoin(users, eq(products.sellerId, users.id))
      .where(eq(products.id, req.params.id));

    if (!record) {
      res.status(404).json({
        success: false,
        error: 'PRODUCT_NOT_FOUND',
        message: 'The requested product listing was not found.',
      });
      return;
    }

    const isApproved = ['available', 'verified'].includes(
      record.products.status,
    );

    if (!isApproved) {
      const { userId, role } = getAuthContext(req);
      const isSeller = userId && record.users.clerkId === userId;
      const isAdminOrVerifier = ['admin', 'verifier'].includes(role);

      if (!isSeller && !isAdminOrVerifier) {
        res.status(404).json({
          success: false,
          error: 'PRODUCT_NOT_AVAILABLE',
          message: 'This product listing is pending verification or is not available.',
        });
        return;
      }
    }

    res.status(200).json({
      success: true,
      data: mapProductRecord(record),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/products
 * Protected — creates a new product listing.
 * New listings ALWAYS start with 'pending_review' status.
 */
productsRouter.post('/', protect, async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
      return;
    }

    const validation = createProductSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors.map((e) => e.message).join(' '),
      });
      return;
    }

    const db = getDb();

    // Find the seller's user ID in Neon DB
    let [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId));

    if (!dbUser) {
      // Auto-create minimal user stub if not synced yet
      const [newUser] = await db
        .insert(users)
        .values({
          clerkId: userId,
          fullName: 'Campus Student',
          email: `${userId}@campus.local`,
          role: 'student',
        })
        .returning();
      dbUser = newUser;
    }

    const payload = validation.data;

    const [created] = await db
      .insert(products)
      .values({
        sellerId: dbUser.id,
        title: payload.title,
        description: payload.description || null,
        price: payload.price.toString(),
        category: payload.category,
        condition: payload.condition,
        status: 'pending_review', // Strict requirement: starts in pending review
        images: payload.images,
        campusLocation: payload.campusLocation || null,
        aiVerified: false,
      })
      .returning();

    const fullProduct = mapProductRecord({
      products: created,
      users: dbUser,
    });

    res.status(201).json({
      success: true,
      data: fullProduct,
      message: 'Product listed successfully. It will be visible once approved.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/products/:id
 * Protected — updates an existing product.
 * Only the owner or an admin can update. Sellers cannot self-approve pending listings.
 */
productsRouter.patch('/:id', protect, async (req, res, next) => {
  try {
    const { userId, role } = getAuthContext(req);
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
      return;
    }

    const validation = updateProductSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors.map((e) => e.message).join(' '),
      });
      return;
    }

    const db = getDb();

    const [existing] = await db
      .select()
      .from(products)
      .innerJoin(users, eq(products.sellerId, users.id))
      .where(eq(products.id, req.params.id));

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'PRODUCT_NOT_FOUND',
        message: 'Product listing not found.',
      });
      return;
    }

    const isOwner = existing.users.clerkId === userId;
    const isAdmin = role === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You are not authorized to modify this listing.',
      });
      return;
    }

    const updates = validation.data;
    const finalStatus = updates.status;

    let nextStatus = finalStatus;
    let resetReview = false;

    // If a rejected product is edited by its seller, resubmit it for review
    if (existing.products.status === 'rejected' && !isAdmin) {
      nextStatus = 'pending_review';
      resetReview = true;
    } else if (finalStatus && !isAdmin) {
      const allowedOwnerStatuses = ['available', 'sold'];
      if (
        !allowedOwnerStatuses.includes(finalStatus) ||
        existing.products.status === 'pending_review'
      ) {
        res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Sellers cannot approve or change verification status of pending items.',
        });
        return;
      }
    }

    const [updated] = await db
      .update(products)
      .set({
        ...(updates.title ? { title: updates.title } : {}),
        ...(updates.description !== undefined
          ? { description: updates.description }
          : {}),
        ...(updates.price ? { price: updates.price.toString() } : {}),
        ...(updates.category ? { category: updates.category } : {}),
        ...(updates.condition ? { condition: updates.condition } : {}),
        ...(updates.images ? { images: updates.images } : {}),
        ...(updates.campusLocation !== undefined
          ? { campusLocation: updates.campusLocation }
          : {}),
        ...(nextStatus ? { status: nextStatus } : {}),
        ...(resetReview ? { rejectionReason: null, reviewedAt: null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(products.id, req.params.id))
      .returning();

    res.status(200).json({
      success: true,
      data: mapProductRecord({ products: updated, users: existing.users }),
      message: 'Product listing updated successfully.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/products/:id
 * Protected — deletes or marks a product as inactive.
 * Only the owner or an admin can delete.
 */
productsRouter.delete('/:id', protect, async (req, res, next) => {
  try {
    const { userId, role } = getAuthContext(req);
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
      return;
    }

    const db = getDb();
    const [existing] = await db
      .select()
      .from(products)
      .innerJoin(users, eq(products.sellerId, users.id))
      .where(eq(products.id, req.params.id));

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'PRODUCT_NOT_FOUND',
        message: 'Product listing not found.',
      });
      return;
    }

    const isOwner = existing.users.clerkId === userId;
    const isAdmin = role === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You are not authorized to delete this product listing.',
      });
      return;
    }

    await db.delete(products).where(eq(products.id, req.params.id));

    res.status(200).json({
      success: true,
      data: null,
      message: 'Product listing deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
});
