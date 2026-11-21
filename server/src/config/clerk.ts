// server/src/config/clerk.ts
// Clerk server-side SDK configuration.
// CLERK_SECRET_KEY is server-only — never sent to mobile.

const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!clerkSecretKey) {
  console.warn(
    '[Clerk] CLERK_SECRET_KEY is not set. ' +
      'JWT verification will fail until the key is configured in server/.env',
  );
}

// @clerk/express reads CLERK_SECRET_KEY automatically from env.
// This file serves as the central place to validate it at startup.
export const clerkConfig = {
  secretKey: clerkSecretKey,
  isConfigured: Boolean(clerkSecretKey),
};

