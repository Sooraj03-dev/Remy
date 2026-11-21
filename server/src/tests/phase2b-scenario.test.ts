// server/src/tests/phase2b-scenario.test.ts
// Comprehensive End-to-End Scenario Test Suite for Phase 2B

process.env.NODE_ENV = 'test';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../index';
import { getDb } from '../config/db';
import { users, products } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

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

describe('Phase 2B — Complete Marketplace End-to-End Scenario Suite', () => {
  const timestamp = Date.now();
  const studentClerkId = `clerk_student_${timestamp}`;
  const otherStudentClerkId = `clerk_other_${timestamp}`;
  const adminClerkId = `clerk_admin_${timestamp}`;

  let createdProductId: string;
  let rejectedProductId: string;

  // Cleanup test records after tests
  after(async () => {
    try {
      const db = getDb();
      if (createdProductId) {
        await db.delete(products).where(eq(products.id, createdProductId));
      }
      if (rejectedProductId) {
        await db.delete(products).where(eq(products.id, rejectedProductId));
      }
      await db.delete(users).where(eq(users.clerkId, studentClerkId));
      await db.delete(users).where(eq(users.clerkId, otherStudentClerkId));
      await db.delete(users).where(eq(users.clerkId, adminClerkId));
    } catch (cleanupErr) {
      console.warn('[Cleanup Warning]', cleanupErr);
    }
  });

  // Step 1: Student creates an account & profile synchronizes to Neon
  test('Step 1 & 2: Student registration & synchronization into Neon database', async () => {
    const res = await fetch(`${baseUrl}/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': studentClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        fullName: 'Aarav Patel',
        email: `aarav.${timestamp}@university.edu`,
        university: 'National Science University',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.fullName, 'Aarav Patel');
    assert.strictEqual(body.data.role, 'student', 'New users must strictly default to student role');

    // Also register Admin user
    await fetch(`${baseUrl}/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': adminClerkId,
        'x-test-user-role': 'admin',
      },
      body: JSON.stringify({
        fullName: 'Campus Admin Officer',
        email: `admin.${timestamp}@university.edu`,
        university: 'University Administration',
      }),
    });
  });

  // Duplicate sync prevention
  test('Prevents duplicate user accounts and updates existing record', async () => {
    const res = await fetch(`${baseUrl}/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': studentClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        fullName: 'Aarav Patel',
        email: `aarav.${timestamp}@university.edu`,
        university: 'Main Campus Engineering Hall',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.university, 'Main Campus Engineering Hall');

    // Confirm only one record exists in Neon users table
    const db = getDb();
    const records = await db.select().from(users).where(eq(users.clerkId, studentClerkId));
    assert.strictEqual(records.length, 1, 'There must be exactly one user record per clerkId');
  });

  // Privilege escalation prevention
  test('Prevents students from self-assigning administrator roles', async () => {
    const res = await fetch(`${baseUrl}/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': otherStudentClerkId,
        'x-test-user-role': 'student', // Client claims student role
      },
      body: JSON.stringify({
        fullName: 'Hacker Student',
        email: `hacker.${timestamp}@university.edu`,
        role: 'admin', // Malicious body attempting escalation
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.role, 'student', 'Self-assigned role escalation must be rejected');
  });

  // Step 3 & 4: Student creates a seller listing
  test('Step 3: Student creates a seller product listing (saved as pending_review)', async () => {
    const res = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': studentClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        title: 'MacBook Air M2 - 8GB / 256GB Midnight',
        price: 65000,
        category: 'electronics',
        condition: 'like_new',
        description: 'Used for one semester. Includes original box, MagSafe cable, and charger.',
        campusLocation: 'Central Library Cafe',
        images: ['https://res.cloudinary.com/demo/image/upload/sample_laptop.jpg'],
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.id, 'Product must have an id');
    assert.strictEqual(
      body.data.status,
      'pending_review',
      'New products MUST be saved with pending_review status',
    );
    assert.strictEqual(body.data.price, 65000);
    assert.strictEqual(body.data.sellerName, 'Aarav Patel');

    createdProductId = body.data.id;
  });

  // Step 5: Listing appears as pending review and is hidden from public
  test('Step 5: Pending listing is hidden from public marketplace and other students', async () => {
    // 1. Not in public list
    const marketRes = await fetch(`${baseUrl}/products`);
    const marketBody = await marketRes.json();
    assert.strictEqual(marketRes.status, 200);
    const found = marketBody.data.some((p: { id: string }) => p.id === createdProductId);
    assert.strictEqual(found, false, 'Pending item must not appear in public marketplace');

    // 2. Another student cannot view direct details of pending product
    const detailRes = await fetch(`${baseUrl}/products/${createdProductId}`, {
      headers: {
        'x-test-user-id': otherStudentClerkId,
        'x-test-user-role': 'student',
      },
    });
    assert.strictEqual(detailRes.status, 404);

    // 3. The owner CAN view their own pending listing
    const ownerRes = await fetch(`${baseUrl}/products/${createdProductId}`, {
      headers: {
        'x-test-user-id': studentClerkId,
        'x-test-user-role': 'student',
      },
    });
    const ownerBody = await ownerRes.json();
    assert.strictEqual(ownerRes.status, 200);
    assert.strictEqual(ownerBody.data.id, createdProductId);

    // 4. Listing appears in seller dashboard
    const sellerListingsRes = await fetch(`${baseUrl}/products/seller/me`, {
      headers: {
        'x-test-user-id': studentClerkId,
        'x-test-user-role': 'student',
      },
    });
    const sellerListings = await sellerListingsRes.json();
    assert.strictEqual(sellerListingsRes.status, 200);
    const inSellerList = sellerListings.data.some((p: { id: string }) => p.id === createdProductId);
    assert.strictEqual(inSellerList, true, 'Product must appear in seller dashboard');
  });

  // Step 6 & 7: Authorization protection on moderation
  test('Step 6: Normal students cannot approve listings (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/admin/products/${createdProductId}/approve`, {
      method: 'POST',
      headers: {
        'x-test-user-id': studentClerkId,
        'x-test-user-role': 'student',
      },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error, 'FORBIDDEN');
  });

  // Step 7: Authorized Admin approves listing
  test('Step 7: Admin reviews pending queue and approves the listing', async () => {
    // 1. Verify it is visible in Admin pending queue
    const queueRes = await fetch(`${baseUrl}/admin/pending`, {
      headers: {
        'x-test-user-id': adminClerkId,
        'x-test-user-role': 'admin',
      },
    });
    const queueBody = await queueRes.json();
    assert.strictEqual(queueRes.status, 200);
    const inQueue = queueBody.data.some((p: { id: string }) => p.id === createdProductId);
    assert.strictEqual(inQueue, true, 'Product must be in pending moderation queue');

    // 2. Admin approves the listing
    const approveRes = await fetch(`${baseUrl}/admin/products/${createdProductId}/approve`, {
      method: 'POST',
      headers: {
        'x-test-user-id': adminClerkId,
        'x-test-user-role': 'admin',
      },
    });
    const approveBody = await approveRes.json();
    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveBody.success, true);
    assert.strictEqual(approveBody.data.status, 'available');
    assert.ok(approveBody.data.reviewedAt, 'Reviewed timestamp must be recorded in Neon');
  });

  // Step 8 & 9: Buyer sees approved listing and views product details
  test('Step 8 & 9: Buyer sees the approved listing in marketplace and views product details', async () => {
    // 1. Visible in public marketplace feed
    const marketRes = await fetch(`${baseUrl}/products?category=electronics`);
    const marketBody = await marketRes.json();
    assert.strictEqual(marketRes.status, 200);
    const approvedProduct = marketBody.data.find((p: { id: string }) => p.id === createdProductId);
    assert.ok(approvedProduct, 'Approved product must be visible in marketplace');
    assert.strictEqual(approvedProduct.title, 'MacBook Air M2 - 8GB / 256GB Midnight');

    // 2. Buyer opens product details
    const detailsRes = await fetch(`${baseUrl}/products/${createdProductId}`);
    const detailsBody = await detailsRes.json();
    assert.strictEqual(detailsRes.status, 200);
    assert.strictEqual(detailsBody.data.id, createdProductId);
    assert.strictEqual(detailsBody.data.sellerName, 'Aarav Patel');
    assert.strictEqual(detailsBody.data.campusLocation, 'Central Library Cafe');
  });

  // Step 10: Unauthorized users cannot edit or delete the listing
  test('Step 10: Unauthorized users cannot edit or delete the listing', async () => {
    // Other student attempts edit
    const editRes = await fetch(`${baseUrl}/products/${createdProductId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': otherStudentClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({ price: 100 }),
    });
    assert.strictEqual(editRes.status, 403);

    // Other student attempts deletion
    const deleteRes = await fetch(`${baseUrl}/products/${createdProductId}`, {
      method: 'DELETE',
      headers: {
        'x-test-user-id': otherStudentClerkId,
        'x-test-user-role': 'student',
      },
    });
    assert.strictEqual(deleteRes.status, 403);
  });

  // Rejection & Resubmission Lifecycle test
  test('Rejection stores reason and seller edit resubmits for review', async () => {
    // 1. Create a second product to reject
    const createRes = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': studentClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        title: 'Broken Headphones',
        price: 200,
        category: 'electronics',
        condition: 'fair',
      }),
    });
    const created = await createRes.json();
    rejectedProductId = created.data.id;

    // 2. Admin rejects with reason
    const rejectRes = await fetch(`${baseUrl}/admin/products/${rejectedProductId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': adminClerkId,
        'x-test-user-role': 'admin',
      },
      body: JSON.stringify({ reason: 'Item is broken. Campus marketplace only accepts working goods.' }),
    });
    const rejected = await rejectRes.json();
    assert.strictEqual(rejectRes.status, 200);
    assert.strictEqual(rejected.data.status, 'rejected');
    assert.strictEqual(
      rejected.data.rejectionReason,
      'Item is broken. Campus marketplace only accepts working goods.',
    );

    // 3. Seller edits item and resubmits
    const updateRes = await fetch(`${baseUrl}/products/${rejectedProductId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': studentClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        title: 'Repaired Headset - Fully Working with Audio Cable',
        price: 350,
      }),
    });
    const updated = await updateRes.json();
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(
      updated.data.status,
      'pending_review',
      'Edited rejected listing must automatically reset to pending_review',
    );
  });

  // Validation & Error Handling tests
  test('Input validation errors reject malformed requests with 400 status', async () => {
    // Title too short
    const shortTitleRes = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': studentClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        title: 'Hi',
        price: 100,
        category: 'books',
        condition: 'good',
      }),
    });
    assert.strictEqual(shortTitleRes.status, 400);

    // Negative price
    const negPriceRes = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': studentClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        title: 'Calculus Book',
        price: -10,
        category: 'books',
        condition: 'good',
      }),
    });
    assert.strictEqual(negPriceRes.status, 400);

    // Rejection without reason
    const noReasonRes = await fetch(`${baseUrl}/admin/products/${createdProductId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': adminClerkId,
        'x-test-user-role': 'admin',
      },
      body: JSON.stringify({}),
    });
    assert.strictEqual(noReasonRes.status, 400);
  });

  // Security test for /api/neon/status
  test('/api/neon/status does not expose sensitive endpoints or credentials publicly', async () => {
    const res = await fetch(`${baseUrl}/neon/status`);
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);

    const bodyString = JSON.stringify(body);
    assert.strictEqual(bodyString.includes('postgresql://'), false, 'Must not leak database connection string');
    assert.strictEqual(bodyString.includes('npg_'), false, 'Must not leak Neon database password');
    assert.strictEqual(bodyString.includes('AWS_SECRET_ACCESS_KEY'), false, 'Must not leak AWS credentials');
    assert.strictEqual(bodyString.includes('Bearer '), false, 'Must not leak auth tokens');
    // Ensure raw internal endpoint URLs are removed from public output
    assert.strictEqual(bodyString.includes('endpoint'), false, 'Must not expose raw cloud service endpoints');
  });
});

