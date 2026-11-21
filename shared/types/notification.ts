// shared/types/notification.ts
// Shared Notification types used by mobile and server

export type NotificationType =
  | 'new_order'
  | 'order_placed'
  | 'order_status'
  | 'order_status_changed'
  | 'product_approved'
  | 'product_rejected'
  | 'new_message'
  | 'system'
  | 'return_requested'
  | 'refund_processed'
  | 'general';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

