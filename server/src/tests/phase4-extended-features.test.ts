// server/src/tests/phase4-extended-features.test.ts
// Automated integration test suite for Phase 4: Extended UML Features
// Tests: AI Assist, Verification Audit, Community Moderation, Safe Meetup Locations,
// Digital Payments (Sandbox), Returns/Refunds, and Admin User Management.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../index';
import { getDb } from '../config/db';
import { users } from '../db/schema/users';
import { products } from '../db/schema/products';
import { orders } from '../db/schema/orders';
import { reports } from '../db/schema/reports';
import { payments } from '../db/schema/payments';
import { returns } from '../db/schema/returns';
import { verifications } from '../db/schema/verifications';
import { eq } from 'drizzle-orm';

let server: http.Server;
let baseUrl: string;

// Test actors
const ADMIN_CLERK_ID = 'user_p4_admin_' + Date.now();
const SELLER_CLERK_ID = 'user_p4_seller_' + Date.now();
const BUYER_CLERK_ID = 'user_p4_buyer_' + Date.now();
const STUDENT_CLERK_ID = 'user_p4_student_' + Date.now();

const adminHeaders = {
  'Content-Type': 'application/json',
  'x-test-user-id': ADMIN_CLERK_ID,
  'x-test-user-role': 'admin',
};

const sellerHeaders = {
  'Content-Type': 'application/json',
  'x-test-user-id': SELLER_CLERK_ID,
  'x-test-user-role': 'student',
};

const buyerHeaders = {
  'Content-Type': 'application/json',
  'x-test-user-id': BUYER_CLERK_ID,
  'x-test-user-role': 'student',
};

const studentHeaders = {
  'Content-Type': 'application/json',
  'x-test-user-id': STUDENT_CLERK_ID,
  'x-test-user-role': 'student',
};

let adminDbId: string;
let sellerDbId: string;
let buyerDbId: string;
let studentDbId: string;

let testProductId: string;
let testOrderId: string;
let testReportId: string;
let testReturnId: string;

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address() as { port: number };
      baseUrl = `http://localhost:${address.port}/api`;
      resolve();
    });
  });
});

after(async () => {
  // Cleanup test records
  try {
    const db = getDb();
    if (testOrderId) {
      await db.delete(returns).where(eq(returns.orderId, testOrderId));
      await db.delete(payments).where(eq(payments.orderId, testOrderId));
      await db.delete(orders).where(eq(orders.id, testOrderId));
    }
    if (testProductId) {
      await db.delete(verifications).where(eq(verifications.productId, testProductId));
      await db.delete(reports).where(eq(reports.targetId, testProductId));
      await db.delete(products).where(eq(products.id, testProductId));
    }
    const testClerkIds = [ADMIN_CLERK_ID, SELLER_CLERK_ID, BUYER_CLERK_ID, STUDENT_CLERK_ID];
    for (const cId of testClerkIds) {
      await db.delete(users).where(eq(users.clerkId, cId));
    }
  } catch (err) {
    console.warn('[Cleanup Warning]', err);
  }

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('Phase 4 — Extended Features & Moderation Suite', () => {
  test('Setup: Register accounts with role assignment on Neon dev branch', async () => {
    // 1. Sync Seller
    const sRes = await fetch(`${baseUrl}/auth/sync`, {
      method: 'POST',
      headers: sellerHeaders,
      body: JSON.stringify({
        fullName: 'Phase4 Seller',
        email: `seller_${Date.now()}@campus.edu`,
        university: 'Science Campus',
      }),
    });
    const sBody = await sRes.json();
    assert.strictEqual(sRes.status, 200);
    sellerDbId = sBody.data.id;

    // 2. Sync Buyer
    const bRes = await fetch(`${baseUrl}/auth/sync`, {
      method: 'POST',
      headers: buyerHeaders,
      body: JSON.stringify({
        fullName: 'Phase4 Buyer',
        email: `buyer_${Date.now()}@campus.edu`,
        university: 'Science Campus',
      }),
    });
    const bBody = await bRes.json();
    assert.strictEqual(bRes.status, 200);
    buyerDbId = bBody.data.id;

    // 3. Sync Regular Student
    const stRes = await fetch(`${baseUrl}/auth/sync`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({
        fullName: 'Phase4 Other Student',
        email: `student_${Date.now()}@campus.edu`,
        university: 'Science Campus',
      }),
    });
    const stBody = await stRes.json();
    assert.strictEqual(stRes.status, 200);
    studentDbId = stBody.data.id;

    // 4. Sync Admin and elevate in DB directly (authorized bootstrap)
    const aRes = await fetch(`${baseUrl}/auth/sync`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        fullName: 'Phase4 Admin Verifier',
        email: `admin_${Date.now()}@campus.edu`,
        university: 'Campus Administration',
      }),
    });
    const aBody = await aRes.json();
    assert.strictEqual(aRes.status, 200);
    adminDbId = aBody.data.id;

    const db = getDb();
    await db.update(users).set({ role: 'admin' }).where(eq(users.id, adminDbId));

    // Create a product by seller
    const prodRes = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: sellerHeaders,
      body: JSON.stringify({
        title: 'Algorithms 4th Edition Sedgewick',
        description: 'Complete algorithms reference in excellent condition with no markings.',
        price: 550,
        category: 'books',
        condition: 'like_new',
        campusLocation: 'Main University Library Foyer',
      }),
    });
    const prodBody = await prodRes.json();
    assert.strictEqual(prodRes.status, 201);
    testProductId = prodBody.data.id;

    assert.ok(sellerDbId && buyerDbId && adminDbId && testProductId);
  });

  // 1. AI-Assisted Listing Suggestions
  test('1. AI Assistant suggests title, description, and category based on draft inputs', async () => {
    const res = await fetch(`${baseUrl}/ai/suggest`, {
      method: 'POST',
      headers: sellerHeaders,
      body: JSON.stringify({
        draftTitle: 'macbook pro 14 inch m2 chip charger',
        price: 1200,
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.title);
    assert.strictEqual(body.data.suggestedCategory, 'electronics');
    assert.ok(Array.isArray(body.data.tips));
    assert.ok(body.data.description.length > 20);
  });

  // 2. AI Listing Quality Evaluation
  test('2. AI Assistant evaluates listing quality and returns objective score and tips', async () => {
    const res = await fetch(`${baseUrl}/ai/evaluate-listing`, {
      method: 'POST',
      headers: sellerHeaders,
      body: JSON.stringify({
        draftTitle: 'Discrete Mathematics and Its Applications 8th Edition',
        draftDescription: 'Hardcover textbook in like new condition. All chapter exercises and solutions intact.',
        category: 'books',
        price: 400,
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.qualityScore >= 70, 'Quality score should be >= 70 for well-described textbook');
    assert.strictEqual(body.data.isQualityPass, true);
    assert.ok(Array.isArray(body.data.feedback));
  });

  // 3. Campus Meetup Locations
  test('3. Returns certified safe campus exchange zones with operating hours', async () => {
    const res = await fetch(`${baseUrl}/meetup-locations`);
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 3, 'Should have multiple certified locations');

    const first = body.data[0];
    assert.ok(first.name);
    assert.ok(first.campusZone);
    assert.strictEqual(first.safeZoneCertified, true);
    assert.ok(first.operatingHours);
  });

  // 4. Product Verification: Request Changes
  test('4. Verifier requests changes on listing and audit log is recorded', async () => {
    const res = await fetch(`${baseUrl}/admin/products/${testProductId}/request-changes`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        changesRequested: 'Please add photos showing the spine and verify if access code is included.',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'changes_requested');

    // Verify audit trail
    const auditRes = await fetch(`${baseUrl}/admin/verifications/${testProductId}`, {
      headers: adminHeaders,
    });
    const auditBody = await auditRes.json();
    assert.strictEqual(auditRes.status, 200);
    assert.ok(Array.isArray(auditBody.data));
    assert.strictEqual(auditBody.data[0].action, 'changes_requested');

    // Admin approves the listing to allow purchasing in subsequent tests
    const approveRes = await fetch(`${baseUrl}/admin/products/${testProductId}/approve`, {
      method: 'POST',
      headers: adminHeaders,
    });
    assert.strictEqual(approveRes.status, 200);
  });

  // 5. Community Moderation: Report Product
  test('5. Student submits a community report against a listing', async () => {
    const res = await fetch(`${baseUrl}/reports`, {
      method: 'POST',
      headers: studentHeaders,
      body: JSON.stringify({
        targetType: 'product',
        targetId: testProductId,
        reason: 'spam',
        details: 'Duplicate listing posted in incorrect category.',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'pending');
    testReportId = body.data.id;
  });

  // 6. Admin Review & Resolution of Reports
  test('6. Admin reviews report queue and resolves community report', async () => {
    const listRes = await fetch(`${baseUrl}/admin/reports`, {
      headers: adminHeaders,
    });
    const listBody = await listRes.json();
    assert.strictEqual(listRes.status, 200);
    assert.ok(listBody.data.length > 0);

    const resolveRes = await fetch(`${baseUrl}/admin/reports/${testReportId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        status: 'resolved',
        resolutionNotes: 'Reviewed by moderator. Listing was verified.',
      }),
    });

    const resolveBody = await resolveRes.json();
    assert.strictEqual(resolveRes.status, 200);
    assert.strictEqual(resolveBody.data.status, 'resolved');
  });

  // 7. Place Order & Digital UPI Sandbox Payment
  test('7. Buyer places order and completes verified digital UPI payment', async () => {
    // Place order
    const orderRes = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: buyerHeaders,
      body: JSON.stringify({
        productId: testProductId,
        meetupLocation: 'Main University Library Foyer',
      }),
    });
    const orderBody = await orderRes.json();
    assert.strictEqual(orderRes.status, 201);
    testOrderId = orderBody.data.id;

    // Initiate payment
    const initRes = await fetch(`${baseUrl}/payments/initiate`, {
      method: 'POST',
      headers: buyerHeaders,
      body: JSON.stringify({
        orderId: testOrderId,
        method: 'upi_demo',
      }),
    });
    const initBody = await initRes.json();
    assert.strictEqual(initRes.status, 200);
    assert.strictEqual(initBody.data.isDemoPayment, true);
    assert.ok(initBody.data.transactionRef);

    // Verify payment
    const verifyRes = await fetch(`${baseUrl}/payments/verify`, {
      method: 'POST',
      headers: buyerHeaders,
      body: JSON.stringify({
        orderId: testOrderId,
        transactionRef: initBody.data.transactionRef,
        paymentMethod: 'upi_demo',
      }),
    });
    const verifyBody = await verifyRes.json();
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyBody.data.status, 'completed');
    assert.strictEqual(verifyBody.data.transactionRef, initBody.data.transactionRef);

    // Order record should have paymentRef
    const checkOrder = await fetch(`${baseUrl}/orders/${testOrderId}`, {
      headers: buyerHeaders,
    });
    const checkOrderBody = await checkOrder.json();
    assert.strictEqual(checkOrderBody.data.paymentRef, initBody.data.transactionRef);
  });

  // 8. Returns & Refunds Management
  test('8. Buyer requests return and seller approves the return request', async () => {
    // Transition order to completed first
    await fetch(`${baseUrl}/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: sellerHeaders,
      body: JSON.stringify({ status: 'completed' }),
    });

    // Buyer files return
    const returnRes = await fetch(`${baseUrl}/returns`, {
      method: 'POST',
      headers: buyerHeaders,
      body: JSON.stringify({
        orderId: testOrderId,
        reason: 'not_as_described',
        details: 'Cover page was slightly torn; agreed with seller for exchange.',
      }),
    });

    const returnBody = await returnRes.json();
    assert.strictEqual(returnRes.status, 201);
    assert.strictEqual(returnBody.data.status, 'requested');
    testReturnId = returnBody.data.id;

    // Duplicate return request rejected
    const dupRes = await fetch(`${baseUrl}/returns`, {
      method: 'POST',
      headers: buyerHeaders,
      body: JSON.stringify({
        orderId: testOrderId,
        reason: 'defective',
      }),
    });
    assert.strictEqual(dupRes.status, 400);

    // Seller approves return
    const approveReturnRes = await fetch(`${baseUrl}/returns/${testReturnId}`, {
      method: 'PATCH',
      headers: sellerHeaders,
      body: JSON.stringify({
        status: 'approved',
        sellerNotes: 'Agreed. Will meet at Main Library for refund.',
      }),
    });
    const approveReturnBody = await approveReturnRes.json();
    assert.strictEqual(approveReturnRes.status, 200);
    assert.strictEqual(approveReturnBody.data.status, 'approved');
  });

  // 9. Admin User Management
  test('9. Admin views users, inspects details, and suspends/restores user', async () => {
    // 1. List users
    const listRes = await fetch(`${baseUrl}/admin/users?search=Student`, {
      headers: adminHeaders,
    });
    const listBody = await listRes.json();
    assert.strictEqual(listRes.status, 200);
    assert.ok(Array.isArray(listBody.data));

    // 2. User details
    const detailRes = await fetch(`${baseUrl}/admin/users/${studentDbId}`, {
      headers: adminHeaders,
    });
    const detailBody = await detailRes.json();
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailBody.data.id, studentDbId);

    // 3. Suspend student
    const suspendRes = await fetch(`${baseUrl}/admin/users/${studentDbId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'suspended' }),
    });
    const suspendBody = await suspendRes.json();
    assert.strictEqual(suspendRes.status, 200);
    assert.strictEqual(suspendBody.data.status, 'suspended');

    // 4. Restore student
    const restoreRes = await fetch(`${baseUrl}/admin/users/${studentDbId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'active' }),
    });
    const restoreBody = await restoreRes.json();
    assert.strictEqual(restoreRes.status, 200);
    assert.strictEqual(restoreBody.data.status, 'active');

    // 5. Unauthorized student cannot manage users (403)
    const unauthRes = await fetch(`${baseUrl}/admin/users`, {
      headers: studentHeaders,
    });
    assert.strictEqual(unauthRes.status, 403);
  });
});
