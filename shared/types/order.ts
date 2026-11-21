// shared/types/order.ts
// Shared Order types used by both mobile and server

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'meetup_arranged'
  | 'completed'
  | 'refunded'
  | 'cancelled';

export interface Order {
  id: string;
  productId: string;
  productTitle: string;
  productImage?: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  status: OrderStatus;
  amount: number;
  paymentRef?: string;
  meetupLocation?: string;
  meetupTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  productId: string;
  amount: number;
  meetupLocation?: string;
  meetupTime?: string;
}

export interface UpdateOrderPayload {
  status?: OrderStatus;
  meetupLocation?: string;
  meetupTime?: string;
  paymentRef?: string;
}

