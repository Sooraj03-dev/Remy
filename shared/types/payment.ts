// shared/types/payment.ts
// Shared Payment types for digital UPI and campus cash workflows

export type PaymentMethod = 'upi' | 'upi_demo' | 'cash_on_meetup';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface PaymentTransaction {
  id: string;
  orderId: string;
  payerId: string;
  payeeId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionRef: string;
  createdAt: string;
  updatedAt: string;
}

export interface InitiatePaymentPayload {
  orderId: string;
  method: PaymentMethod;
}

export interface VerifyPaymentPayload {
  orderId: string;
  transactionRef: string;
  paymentMethod: PaymentMethod;
}

