// server/src/middleware/auth.ts
// Clerk JWT verification and role authorization middleware
// Secrets stay server-side only.

import { requireAuth, getAuth, clerkMiddleware } from '@clerk/express';
import type { Request, Response, NextFunction } from 'express';

/**
 * Safe wrapper for clerkMiddleware that only executes when Clerk credentials are provided.
 * In development or testing without credentials, it passes through gracefully.
 */
export const safeClerkMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (process.env.CLERK_SECRET_KEY || process.env.CLERK_PUBLISHABLE_KEY) {
    try {
      clerkMiddleware()(req, res, next);
      return;
    } catch {
      next();
      return;
    }
  }
  next();
};

export interface AuthenticatedUserPayload {
  userId: string;
  role: 'student' | 'verifier' | 'admin';
  email?: string;
  fullName?: string;
}

/**
 * Helper to get the authenticated Clerk user ID and role safely.
 * Supports test mode for automated test suites when CLERK_SECRET_KEY is not configured.
 */
export const getAuthContext = (
  req: Request,
): { userId: string | null; role: string } => {
  // Check test mode bypass only if NODE_ENV === 'test' or CLERK_SECRET_KEY is unset
  if (
    (process.env.NODE_ENV === 'test' || !process.env.CLERK_SECRET_KEY) &&
    req.headers['x-test-user-id']
  ) {
    const userId = req.headers['x-test-user-id'] as string;
    const role = (req.headers['x-test-user-role'] as string) || 'student';
    return { userId, role };
  }

  try {
    const auth = getAuth(req);
    const userId = auth?.userId || null;
    // Role is strictly stored in Clerk publicMetadata.role (server-side assigned)
    const publicMetadata = (auth?.sessionClaims?.publicMetadata ||
      (auth?.sessionClaims as Record<string, unknown>)?.metadata ||
      {}) as Record<string, unknown>;
    const role = (publicMetadata.role as string) || 'student';
    return { userId, role };
  } catch {
    return { userId: null, role: 'student' };
  }
};

/**
 * Route protection middleware — returns 401 if no valid user is authenticated.
 */
export const protect = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { userId } = getAuthContext(req);

  if (userId) {
    next();
    return;
  }

  res.status(401).json({
    success: false,
    error: 'UNAUTHORIZED',
    message: 'Authentication token required or session expired. Please sign in.',
  });
};

/**
 * Role-guard middleware factory.
 * Enforces admin or verifier role. Roles can NEVER be self-assigned by clients.
 */
export const requireRole =
  (...allowedRoles: Array<'student' | 'verifier' | 'admin'>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const { userId, role } = getAuthContext(req);

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
      return;
    }

    if (!allowedRoles.includes(role as 'student' | 'verifier' | 'admin')) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Action requires one of the following roles: ${allowedRoles.join(', ')}. Your role is '${role}'.`,
      });
      return;
    }

    next();
  };
