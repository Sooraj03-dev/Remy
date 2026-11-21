// server/src/routes/wishlist.ts
// Wishlist management routes — Add, remove, list, and check saved products

import { Router } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { protect, getAuthContext } from '../middleware/auth';
import { getDb } from '../config/db';
import { wishlists, products, users } from '../db/schema';
import type { Product, ProductCategory, ProductCondition, ProductStatus } from '../../../shared/types';

export const wishlistRouter = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapProductRecord = (record: any): Product => {
  const p = record.products ?? record;
  const u = record.users ?? {};
  return {
    id: p.id,
    sellerId: p.sellerId,
    sellerName: u.fullName ?? 'Campus Seller',
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
    campusLocation: p.campusLocation ?? undefined,
    createdAt: new Date(p.createdAt).toISOString(),
    updatedAt: new Date(p.updatedAt).toISOString(),
  };
};

/**
 * GET /api/wishlist
 * Returns list of products saved by the authenticated student
 */
wishlistRouter.get('/', protect, async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    const db = getDb();

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId!));
    if (!user) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    const records = await db
      .select({
        products,
        users,
      })
      .from(wishlists)
      .innerJoin(products, eq(wishlists.productId, products.id))
      .innerJoin(users, eq(products.sellerId, users.id))
      .where(eq(wishlists.userId, user.id))
      .orderBy(desc(wishlists.createdAt));

    const data = records.map(mapProductRecord);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/wishlist/:productId
 * Adds a product to the user's wishlist
 */
wishlistRouter.post('/:productId', protect, async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    const db = getDb();

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId!));
    if (!user) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User not found.' });
      return;
    }

    const { productId } = req.params;

    // Check product exists
    const [product] = await db.select().from(products).where(eq(products.id, productId));
    if (!product) {
      res.status(404).json({ success: false, error: 'PRODUCT_NOT_FOUND', message: 'Product not found.' });
      return;
    }

    // Check if already in wishlist
    const [existing] = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.userId, user.id), eq(wishlists.productId, productId)));

    if (!existing) {
      await db.insert(wishlists).values({
        userId: user.id,
        productId,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Product added to wishlist.',
      data: { inWishlist: true, productId },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/wishlist/:productId
 * Removes a product from the user's wishlist
 */
wishlistRouter.delete('/:productId', protect, async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    const db = getDb();

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId!));
    if (!user) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'User not found.' });
      return;
    }

    const { productId } = req.params;

    await db
      .delete(wishlists)
      .where(and(eq(wishlists.userId, user.id), eq(wishlists.productId, productId)));

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist.',
      data: { inWishlist: false, productId },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/wishlist/check/:productId
 * Checks whether a specific product is saved in the user's wishlist
 */
wishlistRouter.get('/check/:productId', protect, async (req, res, next) => {
  try {
    const { userId } = getAuthContext(req);
    const db = getDb();

    const [user] = await db.select().from(users).where(eq(users.clerkId, userId!));
    if (!user) {
      res.status(200).json({ success: true, data: { inWishlist: false } });
      return;
    }

    const [existing] = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.userId, user.id), eq(wishlists.productId, req.params.productId)));

    res.status(200).json({
      success: true,
      data: { inWishlist: Boolean(existing) },
    });
  } catch (err) {
    next(err);
  }
});

