// server/src/tests/neon-e2e.test.ts
// End-to-end verification test for all 6 Neon cloud backend services

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../index';

let server: http.Server;
let baseUrl: string;

before((_, done) => {
  server = app.listen(0, () => {
    const address = server.address() as { port: number };
    baseUrl = `http://localhost:${address.port}/api`;
    done();
  });
});

after((_, done) => {
  server.close(done);
});

describe('Neon Services End-to-End Verification Suite', () => {
  test('1. Health check verifies Neon PostgreSQL database connection', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'ok');
    assert.strictEqual(body.data.services.database, 'connected');
  });

  test('2. Neon status endpoint verifies all 6 services live', async () => {
    const res = await fetch(`${baseUrl}/neon/status`);
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);

    const services = body.data.services;

    // 1. Lakebase Postgres
    assert.strictEqual(
      services.postgres.status,
      'connected',
      'Lakebase Postgres should be connected',
    );
    assert.strictEqual(services.postgres.details.database, 'neondb');

    // 2. Object Storage
    assert.strictEqual(
      services.objectStorage.status,
      'connected',
      'Neon Object Storage should be connected',
    );
    assert.strictEqual(services.objectStorage.bucket, 'assets');

    // 3. AI Gateway
    assert.strictEqual(
      services.aiGateway.status,
      'connected',
      'Neon AI Gateway should be connected',
    );
    assert.ok(
      services.aiGateway.modelCount > 0,
      'AI Gateway catalog should list models',
    );

    // 4. Neon Functions
    assert.strictEqual(
      services.functions.status,
      'connected',
      'Neon Functions should be connected',
    );
    assert.strictEqual(
      services.functions.response,
      'Hello from Neon Functions',
    );

    // 5. Neon Auth
    assert.strictEqual(
      services.auth.status,
      'connected',
      'Neon Auth JWKS should be reachable',
    );
    assert.ok(services.auth.keyCount > 0, 'JWKS keys should be available');

    // 6. Realtime
    assert.strictEqual(
      services.realtime.status,
      'connected',
      'Neon Realtime should be connected',
    );
    assert.strictEqual(
      services.realtime.sealedQueryGenerated,
      true,
      'Realtime query sealing should succeed',
    );
  });

  test('3. Object Storage: Upload and generate signed URL for product asset', async () => {
    const res = await fetch(`${baseUrl}/neon/storage/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'campus-marketplace-badge.txt',
        content: 'Campus Marketplace Verified Asset on Neon Object Storage',
        contentType: 'text/plain',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.bucket, 'assets');
    assert.ok(
      body.data.signedUrl.startsWith('https://'),
      'Signed URL must be a valid HTTPS URL',
    );
  });

  test('4. Realtime: Generates sealed query for live subscriptions', async () => {
    const res = await fetch(`${baseUrl}/neon/realtime/products`);
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data, 'Sealed query must be returned');
  });
});

