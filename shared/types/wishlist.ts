// shared/types/wishlist.ts
// Shared Wishlist types used by mobile and server

import type { Product } from './product';

export interface WishlistItem {
  userId: string;
  productId: string;
  createdAt: string;
  product?: Product;
}

