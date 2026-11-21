// shared/types/return.ts
// Shared Return & Refund types

export type ReturnReason =
  | 'not_as_described'
  | 'defective'
  | 'wrong_item'
  | 'other';
export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'refunded';

export interface ReturnRequest {
  id: string;
  orderId: string;
  productId: string;
  productTitle?: string;
  buyerId: string;
  buyerName?: string;
  sellerId: string;
  sellerName?: string;
  amount: number;
  reason: ReturnReason;
  details?: string;
  status: ReturnStatus;
  sellerNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReturnPayload {
  orderId: string;
  reason: ReturnReason;
  details?: string;
}

