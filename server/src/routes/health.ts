// server/src/routes/health.ts
// GET /api/health — public health-check endpoint

import { Router } from 'express';
import { checkDbConnection } from '../config/db';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const dbCheck = await checkDbConnection();

  const services = {
    database: dbCheck.connected
      ? ('connected' as const)
      : dbCheck.error === 'DATABASE_URL_UNSET'
      ? ('unconfigured' as const)
      : ('disconnected' as const),
  };

  const payload = {
    status: services.database === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services,
  };

  const httpStatus = payload.status === 'ok' ? 200 : 207;
  res.status(httpStatus).json({ success: true, data: payload });
});
