// server/src/middleware/requestLogger.ts
// Lightweight structured request logger

import type { Request, Response, NextFunction } from 'express';

export const requestLogger = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const start = Date.now();
  _res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.path} ${_res.statusCode} +${duration}ms`,
      );
    }
  });
  next();
};

