// server/src/types/express.d.ts
// Augment Express Request type to include Clerk auth

import type { AuthObject } from '@clerk/express';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthObject;
    }
  }
}

