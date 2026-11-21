// shared/types/product.ts
// Shared Product types used by both mobile and server

export type ProductCondition = 'new' | 'like_new' | 'good' | 'fair';

export type ProductStatus =
  | 'pending'
  | 'pending_review'
  | 'under_review'
  | 'changes_requested'
  | 'available'
  | 'sold'
  | 'rejected'
  | 'removed'
  | 'verified';

export type ProductCategory =
  | 'books'
  | 'electronics'
  | 'clothing'
  | 'stationery'
  | 'sports'
  | 'furniture'
  | 'food'
  | 'other';

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerAvatarUrl?: string;
  sellerEmail?: string;
  title: string;
  description?: string;
  price: number;
  category: ProductCategory;
  condition: ProductCondition;
  status: ProductStatus;
  images: string[];
  aiVerified: boolean;
  verifierId?: string;
  rejectionReason?: string;
  reviewedAt?: string;
  campusLocation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductPayload {
  title: string;
  description?: string;
  price: number;
  category: ProductCategory;
  condition: ProductCondition;
  images: string[];
  campusLocation?: string;
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {
  status?: ProductStatus;
}

export interface ProductFilters {
  category?: ProductCategory;
  condition?: ProductCondition;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
}

