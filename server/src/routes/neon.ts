// server/src/routes/neon.ts
// Endpoints validating and providing access to Neon cloud backend primitives

import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { getDb } from '../config/db';
import {
  uploadToNeonStorage,
  listNeonStorageObjects,
  isStorageConfigured,
} from '../config/neonStorage';
import { fetchNeonAIModels, isAIGatewayConfigured } from '../config/neonAI';
import { invokeNeonHelloFunction } from '../config/neonFunctions';
import { sealProductsLiveQuery, isRealtimeConfigured } from '../config/neonRealtime';

export const neonRouter = Router();

/**
 * GET /api/neon/status
 * Live diagnostic endpoint testing all 6 Neon backend services end-to-end
 */
neonRouter.get('/status', async (_req, res) => {
  const results: Record<string, unknown> = {};

  // 1. Lakebase Postgres
  try {
    const db = getDb();
    const rawResult: any = await db.execute(
      sql`SELECT 1 as connected, current_database() as database, version() as version`,
    );
    const pgResult = rawResult?.rows ? rawResult.rows[0] : (Array.isArray(rawResult) ? rawResult[0] : rawResult);
    results.postgres = {
      status: 'connected',
      details: pgResult,
    };
  } catch (err) {
    results.postgres = {
      status: 'error',
      message: err instanceof Error ? err.message : String(err),
    };
  }

  // 2. Object Storage
  if (isStorageConfigured) {
    try {
      const objects = await listNeonStorageObjects();
      results.objectStorage = {
        status: 'connected',
        bucket: 'assets',
        objectCount: objects.length,
        configured: true,
      };
    } catch (err) {
      results.objectStorage = {
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  } else {
    results.objectStorage = { status: 'unconfigured' };
  }

  // 3. AI Gateway
  if (isAIGatewayConfigured) {
    try {
      const models = await fetchNeonAIModels();
      results.aiGateway = {
        status: 'connected',
        modelCount: models.length,
        configured: true,
      };
    } catch (err) {
      results.aiGateway = {
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  } else {
    results.aiGateway = { status: 'unconfigured' };
  }

  // 4. Neon Functions
  try {
    const funcRes = await invokeNeonHelloFunction();
    results.functions = {
      status: funcRes.status === 200 ? 'connected' : 'degraded',
      response: funcRes.message,
    };
  } catch (err) {
    results.functions = {
      status: 'error',
      message: err instanceof Error ? err.message : String(err),
    };
  }

  // 5. Neon Auth
  if (process.env.NEON_AUTH_JWKS_URL) {
    try {
      const authRes = await fetch(process.env.NEON_AUTH_JWKS_URL);
      const authData = (await authRes.json()) as { keys?: unknown[] };
      results.auth = {
        status: authRes.status === 200 ? 'connected' : 'degraded',
        keyCount: authData.keys?.length ?? 0,
        configured: true,
      };
    } catch (err) {
      results.auth = {
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  } else {
    results.auth = { status: 'unconfigured' };
  }

  // 6. Realtime
  if (isRealtimeConfigured) {
    try {
      const sealed = await sealProductsLiveQuery();
      results.realtime = {
        status: 'connected',
        sealedQueryGenerated: Boolean(sealed),
        configured: true,
      };
    } catch (err) {
      results.realtime = {
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  } else {
    results.realtime = { status: 'unconfigured' };
  }

  res.status(200).json({
    success: true,
    data: {
      branch: process.env.NEON_BRANCH || 'production',
      branchId: process.env.NEON_BRANCH_ID,
      services: results,
    },
  });
});

/**
 * POST /api/neon/storage/upload
 * Direct upload endpoint to Neon Object Storage
 */
neonRouter.post('/storage/upload', async (req, res, next) => {
  try {
    const { filename, content, contentType } = req.body as {
      filename: string;
      content: string; // base64 or utf8
      contentType?: string;
    };

    if (!filename || !content) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'filename and content are required',
      });
      return;
    }

    const key = `uploads/${Date.now()}-${filename}`;
    const buffer = Buffer.from(content, content.startsWith('data:') ? 'base64' : 'utf-8');
    const type = contentType || 'application/octet-stream';

    const uploaded = await uploadToNeonStorage(key, buffer, type);

    res.status(201).json({
      success: true,
      data: uploaded,
      message: 'Uploaded to Neon Object Storage successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/neon/realtime/products
 * Returns a sealed live query for products table
 */
neonRouter.get('/realtime/products', async (_req, res, next) => {
  try {
    const sealed = await sealProductsLiveQuery();
    res.status(200).json({
      success: true,
      data: sealed,
    });
  } catch (err) {
    next(err);
  }
});

