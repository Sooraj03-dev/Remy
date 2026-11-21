// shared/types/user.ts
// Shared User types used by both mobile and server

export type UserRole = 'student' | 'verifier' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  clerkId: string;
  fullName: string;
  email: string;
  university?: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  activeListings: number;
  totalSold: number;
}

export interface UpdateProfilePayload {
  fullName?: string;
  university?: string;
  avatarUrl?: string;
}

