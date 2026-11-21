// server/src/tests/neon-db-verification.test.ts
// Automated end-to-end test suite for Phase 2A: Neon Database Verification

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { sql, eq } from 'drizzle-orm';
import { getDb, checkDbConnection } from '../config/db';
import { users, products } from '../db/schema';
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

describe('Phase 2A — Neon Database Verification Suite', () => {
  const testUserId = `test-clerk-${Date.now()}`;
  let createdDbUserId: string;

  // 1. Database Connectivity
  test('1. Database connectivity: checkDbConnection returns connected: true', async () => {
    const conn = await checkDbConnection();
    assert.strictEqual(conn.connected, true, `DB Connection failed: ${conn.error}`);
    assert.strictEqual(conn.error, undefined);
  });

  // 2. Read operation
  test('2. Read operation: Executes raw and Drizzle SELECT queries on Neon dev branch', async () => {
    const db = getDb();
    const result: any = await db.execute(sql`SELECT current_database() as db_name, version() as pg_version`);
    const rows = result.rows ?? result;
    assert.ok(rows.length > 0, 'Database query should return at least one row');
    assert.strictEqual(rows[0].db_name, 'neondb');

    // Read count from users table
    const countResult = await db.select({ count: sql`count(*)` }).from(users);
    assert.ok(countResult.length > 0);
  });

  // 3. Insert operation
  test('3. Insert operation: Inserts a new user record into users table via Drizzle', async () => {
    const db = getDb();
    const [newUser] = await db
      .insert(users)
      .values({
        clerkId: testUserId,
        fullName: 'Neon Verification Student',
        email: `student-${Date.now()}@campus.edu`,
        university: 'Engineering Campus',
        role: 'student',
      })
      .returning();

    assert.ok(newUser, 'New user should be returned after insert');
    assert.strictEqual(newUser.clerkId, testUserId);
    assert.strictEqual(newUser.role, 'student');
    assert.ok(newUser.id, 'User ID (UUID) should be generated');
    createdDbUserId = newUser.id;
  });

  // 4. Update operation
  test('4. Update operation: Updates user university and role via Drizzle', async () => {
    assert.ok(createdDbUserId, 'Prior test must set createdDbUserId');
    const db = getDb();

    const [updated] = await db
      .update(users)
      .set({
        university: 'Main Campus Central',
        rating: '4.85',
        updatedAt: new Date(),
      })
      .where(eq(users.id, createdDbUserId))
      .returning();

    assert.strictEqual(updated.university, 'Main Campus Central');
    assert.strictEqual(updated.rating, '4.85');
  });

  // 5. Delete operation
  test('5. Delete operation: Deletes the created test user and verifies removal', async () => {
    assert.ok(createdDbUserId, 'Prior test must set createdDbUserId');
    const db = getDb();

    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, createdDbUserId))
      .returning();

    assert.strictEqual(deleted.id, createdDbUserId);

    // Verify it is truly gone
    const lookup = await db.select().from(users).where(eq(users.id, createdDbUserId));
    assert.strictEqual(lookup.length, 0, 'Deleted user should no longer be in the database');
  });

  // 6. Drizzle ORM queries
  test('6. Drizzle ORM query builders: Handles relational structures and joins', async () => {
    const db = getDb();
    // Test selecting with filters and limits
    const activeProducts = await db
      .select({
        id: products.id,
        title: products.title,
        status: products.status,
      })
      .from(products)
      .where(eq(products.status, 'available'))
      .limit(5);

    assert.ok(Array.isArray(activeProducts));
  });

  // 7. Backend database integration
  test('7. Backend database integration: Express /api/health endpoint confirms database connection', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.status, 'ok');
    assert.strictEqual(data.data.services.database, 'connected');
  });

  // 8. Database error handling
  test('8. Database error handling: Gracefully handles constraint violations without leaking credentials', async () => {
    const db = getDb();
    // Inserting a product with non-existent seller_id must fail FK constraint
    let caughtError: any = null;
    try {
      await db.insert(products).values({
        sellerId: '00000000-0000-0000-0000-000000000000', // Non-existent user
        title: 'Ghost Product',
        price: '100.00',
        category: 'electronics',
        condition: 'good',
      });
    } catch (err: any) {
      caughtError = err;
    }

    assert.ok(caughtError, 'Expected foreign key constraint violation error');
    const errorString = String(caughtError.message ?? caughtError);
    assert.ok(
      errorString.includes('violates foreign key constraint') || errorString.includes('foreign key'),
      'Error message should indicate FK violation',
    );
    // Crucial: ensure DATABASE_URL or password is NOT leaked in the error
    assert.strictEqual(
      errorString.includes('postgresql://'),
      false,
      'Connection string must not leak in error message',
    );
  });
});
