// shared/types/index.ts
// Barrel export for all shared types

export * from './user';
export * from './product';
export * from './order';
export * from './message';
export * from './wishlist';
export * from './notification';
export * from './report';
export * from './meetup';
export * from './payment';
export * from './return';
export * from './verification';
export * from './ai';

// API Response envelope types
export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ApiError {
  success: false;
  error: string;
  message: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Health check
export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  version: string;
  services: {
    database: 'connected' | 'disconnected' | 'unconfigured';
  };
}

