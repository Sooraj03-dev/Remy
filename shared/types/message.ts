// shared/types/message.ts
// Shared Message types used by both mobile and server

export interface Message {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
  isMine?: boolean;
}

export interface Conversation {
  orderId: string;
  productId: string;
  productTitle: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatarUrl?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface SendMessagePayload {
  orderId: string;
  receiverId?: string;
  content: string;
}

export interface StartChatPayload {
  productId: string;
}

