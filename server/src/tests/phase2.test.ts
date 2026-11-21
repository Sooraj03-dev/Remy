// server/src/tests/phase2.test.ts
// Automated Integration Test Suite for Phase 2 Verification

process.env.NODE_ENV = 'test';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../index';
import { resetMockStore } from '../config/testDb';

let server: http.Server;
let baseUrl: string;

before((_, done) => {
  resetMockStore();
  server = app.listen(0, () => {
    const address = server.address() as { port: number };
    baseUrl = `http://localhost:${address.port}/api`;
    done();
  });
});

after((_, done) => {
  server.close(done);
});

describe('Phase 2 — Core Backend Integration Test Suite', () => {
  let sellerClerkId = 'clerk_seller_123';
  let otherStudentClerkId = 'clerk_student_456';
  let adminClerkId = 'clerk_admin_789';
  let createdProductId: string;

  // 1 & 2: Student signup and synchronization with Neon
  test('1 & 2: User profile is correctly synchronized into database', async () => {
    const res = await fetch(`${baseUrl}/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': sellerClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        fullName: 'Priya Sharma',
        email: 'priya@university.edu',
        university: 'National Tech Institute',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.fullName, 'Priya Sharma');
    assert.strictEqual(body.data.role, 'student'); // Default role must be student
  });

  // 3 & 4: Seller creates product & saved with pending status
  test('3 & 4: Seller creates product and it is saved with pending_review status', async () => {
    const res = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': sellerClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        title: 'Signals & Systems 2nd Edition',
        price: 450,
        category: 'books',
        condition: 'like_new',
        description: 'Hardcover textbook with no highlighting',
        campusLocation: 'Engineering Library Foyer',
        images: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.id, 'Product should have a unique ID');
    assert.strictEqual(
      body.data.status,
      'pending_review',
      'New products MUST have pending_review status',
    );
    assert.strictEqual(body.data.price, 450);

    createdProductId = body.data.id;
  });

  // 6 (pre-check): Pending product must NOT be visible on public marketplace
  test('6 (pre): Pending product is NOT visible in public marketplace feed', async () => {
    const res = await fetch(`${baseUrl}/products`);
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    const found = body.data.some((p: { id: string }) => p.id === createdProductId);
    assert.strictEqual(found, false, 'Pending product must not be exposed to public');
  });

  // 9: Normal student CANNOT approve products
  test('9: A normal student cannot approve products (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/admin/products/${createdProductId}/approve`, {
      method: 'POST',
      headers: {
        'x-test-user-id': sellerClerkId,
        'x-test-user-role': 'student', // student role
      },
    });

    const body = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, 'FORBIDDEN');
  });

  // 5 & 6: Admin approves product -> becomes visible in marketplace
  test('5 & 6: Admin approves product and it becomes visible in marketplace', async () => {
    const approveRes = await fetch(
      `${baseUrl}/admin/products/${createdProductId}/approve`,
      {
        method: 'POST',
        headers: {
          'x-test-user-id': adminClerkId,
          'x-test-user-role': 'admin',
        },
      },
    );

    const approveBody = await approveRes.json();
    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveBody.success, true);
    assert.strictEqual(approveBody.data.status, 'available');

    // Marketplace check: now visible
    const marketRes = await fetch(`${baseUrl}/products`);
    const marketBody = await marketRes.json();
    assert.strictEqual(marketRes.status, 200);
    const found = marketBody.data.some((p: { id: string }) => p.id === createdProductId);
    assert.strictEqual(found, true, 'Approved product must now be visible in marketplace');
  });

  // 7: Seller can edit their own product
  test('7: Seller can edit their own product', async () => {
    const res = await fetch(`${baseUrl}/products/${createdProductId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': sellerClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        price: 400, // discounted
        description: 'Hardcover textbook, price reduced!',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.price, 400);
  });

  // 8: Another student CANNOT edit that product
  test('8: Another student cannot edit that product (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/products/${createdProductId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': otherStudentClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        price: 10,
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, 'FORBIDDEN');
  });

  // 10: Invalid product information produces validation errors
  test('10: Invalid product information produces 400 validation errors', async () => {
    const res = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': sellerClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        title: 'A', // too short (< 3 chars)
        price: -50, // negative price
        category: 'invalid_category',
        condition: 'broken',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, 'VALIDATION_ERROR');
  });

  // Rejection with reason check (Task 5)
  test('Admin rejection stores reviewer reason and updates status', async () => {
    // Create another pending product
    const createRes = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': sellerClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        title: 'Old Chemistry Lab Coat',
        price: 200,
        category: 'clothing',
        condition: 'fair',
      }),
    });
    const createBody = await createRes.json();
    const rejectTargetId = createBody.data.id;

    const rejectRes = await fetch(
      `${baseUrl}/admin/products/${rejectTargetId}/reject`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': adminClerkId,
          'x-test-user-role': 'admin',
        },
        body: JSON.stringify({
          reason: 'Item does not meet cleanliness safety standards for lab gear.',
        }),
      },
    );

    const rejectBody = await rejectRes.json();
    assert.strictEqual(rejectRes.status, 200);
    assert.strictEqual(rejectBody.success, true);
    assert.strictEqual(rejectBody.data.status, 'rejected');
    assert.strictEqual(
      rejectBody.data.rejectionReason,
      'Item does not meet cleanliness safety standards for lab gear.',
    );
  });
});
