// server/src/middleware/errorHandler.ts
// Global Express error handler

import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('[Error]', err);

  const status = (err as { status?: number }).status ?? 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : (err as Error).message;

  res.status(status).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message,
  });
};

