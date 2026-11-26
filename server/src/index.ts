// server/src/index.ts
// Express entry point for Campus Marketplace API

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { safeClerkMiddleware } from './middleware/auth';

import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { productsRouter } from './routes/products';
import { uploadRouter } from './routes/upload';
import { ordersRouter } from './routes/orders';
import { messagesRouter } from './routes/messages';
import { wishlistRouter } from './routes/wishlist';
import { notificationsRouter } from './routes/notifications';
import { adminRouter } from './routes/admin';
import { neonRouter } from './routes/neon';
import { aiRouter } from './routes/ai';
import { meetupRouter } from './routes/meetup';
import { reportsRouter } from './routes/reports';
import { paymentsRouter } from './routes/payments';
import { returnsRouter } from './routes/returns';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

const app = express();
const PORT = process.env.PORT ?? 4000;

// Disable ETags and prevent 304 empty responses for mobile clients
app.set('etag', false);

// ── Security & parsing middleware ──────────────────────────
app.use(helmet());
app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  next();
});
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:8081',
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(requestLogger);

// ── Clerk Authentication Middleware ────────────────────────
app.use(safeClerkMiddleware);

// ── Routes ─────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/neon', neonRouter);
app.use('/api/ai', aiRouter);
app.use('/api/meetup-locations', meetupRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/returns', returnsRouter);

// ── 404 ────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: 'The requested endpoint does not exist.',
  });
});

// ── Error handler (must be last) ───────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Campus Marketplace API running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Env:    ${process.env.NODE_ENV ?? 'development'}\n`);
  });
}

export default app;
