// server/src/tests/phase3-orders-wishlists-messages.test.ts
// Automated Integration Test Suite for Phase 3: Orders, Wishlists and Communication

process.env.NODE_ENV = 'test';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../index';
import { getDb } from '../config/db';
import { users, products, orders, messages, wishlists, notifications } from '../db/schema';
import { eq, or } from 'drizzle-orm';

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

describe('Phase 3 — Orders, Wishlists and Communication Suite', () => {
  const ts = Date.now();
  const buyerClerkId = `clerk_buyer_p3_${ts}`;
  const sellerClerkId = `clerk_seller_p3_${ts}`;
  const thirdStudentClerkId = `clerk_third_p3_${ts}`;
  const adminClerkId = `clerk_admin_p3_${ts}`;

  let createdProductId: string;
  let secondProductId: string;
  let createdOrderId: string;

  // Cleanup all test records created during testing
  after(async () => {
    try {
      const db = getDb();
      if (createdOrderId) {
        await db.delete(messages).where(eq(messages.orderId, createdOrderId));
        await db.delete(orders).where(eq(orders.id, createdOrderId));
      }
      if (createdProductId) {
        await db.delete(wishlists).where(eq(wishlists.productId, createdProductId));
        await db.delete(products).where(eq(products.id, createdProductId));
      }
      if (secondProductId) {
        await db.delete(products).where(eq(products.id, secondProductId));
      }
      await db.delete(notifications).where(
        or(
          eq(notifications.title, 'New Order Received! 🎉'),
          eq(notifications.title, 'Order Status Updated: CONFIRMED'),
        ),
      );
      await db.delete(users).where(eq(users.clerkId, buyerClerkId));
      await db.delete(users).where(eq(users.clerkId, sellerClerkId));
      await db.delete(users).where(eq(users.clerkId, thirdStudentClerkId));
      await db.delete(users).where(eq(users.clerkId, adminClerkId));
    } catch (err) {
      console.warn('[Phase 3 Cleanup Warning]', err);
    }
  });

  // Setup: Register Buyer, Seller, Third Student and create Approved Product
  test('Setup: Register accounts and approve test listing on Neon dev branch', async () => {
    // 1. Sync Buyer
    await fetch(`${baseUrl}/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': buyerClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        fullName: 'Rohan Verma',
        email: `rohan.${ts}@campus.edu`,
        university: 'Engineering Campus',
      }),
    });

    // 2. Sync Seller
    await fetch(`${baseUrl}/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': sellerClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        fullName: 'Ananya Sen',
        email: `ananya.${ts}@campus.edu`,
        university: 'Science Campus',
      }),
    });

    // 3. Sync Third Student (unauthorized observer)
    await fetch(`${baseUrl}/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': thirdStudentClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        fullName: 'Vikram Joshi',
        email: `vikram.${ts}@campus.edu`,
        university: 'Arts Campus',
      }),
    });

    // 4. Sync Admin
    await fetch(`${baseUrl}/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': adminClerkId,
        'x-test-user-role': 'admin',
      },
      body: JSON.stringify({
        fullName: 'Admin Moderator',
        email: `admin.${ts}@campus.edu`,
      }),
    });

    // 5. Seller creates product
    const prodRes = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': sellerClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        title: 'TI-84 Plus CE Graphing Calculator',
        price: 3200,
        category: 'electronics',
        condition: 'like_new',
        campusLocation: 'Math Dept Foyer',
      }),
    });
    const prodData = await prodRes.json();
    createdProductId = prodData.data.id;

    // 6. Admin approves product
    await fetch(`${baseUrl}/admin/products/${createdProductId}/approve`, {
      method: 'POST',
      headers: {
        'x-test-user-id': adminClerkId,
        'x-test-user-role': 'admin',
      },
    });

    // 7. Seller creates second product for wishlist tests
    const secondRes = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': sellerClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        title: 'Linear Algebra Textbook 4th Ed',
        price: 550,
        category: 'books',
        condition: 'good',
      }),
    });
    const secondData = await secondRes.json();
    secondProductId = secondData.data.id;
    await fetch(`${baseUrl}/admin/products/${secondProductId}/approve`, {
      method: 'POST',
      headers: { 'x-test-user-id': adminClerkId, 'x-test-user-role': 'admin' },
    });
  });

  // Test 1: Buyer places an order for an available product
  test('1. Buyer places an order for an available product', async () => {
    const res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': buyerClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        productId: createdProductId,
        meetupLocation: 'Main Library 1st Floor Cafe',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.id, 'Order must return a unique ID');
    assert.strictEqual(body.data.status, 'placed');
    assert.strictEqual(body.data.amount, 3200);
    assert.strictEqual(body.data.meetupLocation, 'Main Library 1st Floor Cafe');
    assert.strictEqual(body.data.buyerName, 'Rohan Verma');
    assert.strictEqual(body.data.sellerName, 'Ananya Sen');

    createdOrderId = body.data.id;

    // Verify product status was atomically updated to 'sold'
    const db = getDb();
    const [prodRecord] = await db.select().from(products).where(eq(products.id, createdProductId));
    assert.strictEqual(prodRecord.status, 'sold', 'Product status must atomically lock to sold');
  });

  // Test 2: Seller receives the order
  test('2. Seller receives the order in seller orders list and notification is delivered', async () => {
    // Check seller orders
    const res = await fetch(`${baseUrl}/orders/seller`, {
      headers: {
        'x-test-user-id': sellerClerkId,
        'x-test-user-role': 'student',
      },
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    const orderFound = body.data.some((o: { id: string }) => o.id === createdOrderId);
    assert.strictEqual(orderFound, true, 'Seller must see the placed order');

    // Check seller in-app notifications
    const notifRes = await fetch(`${baseUrl}/notifications`, {
      headers: {
        'x-test-user-id': sellerClerkId,
        'x-test-user-role': 'student',
      },
    });
    const notifBody = await notifRes.json();
    assert.strictEqual(notifRes.status, 200);
    const orderNotif = notifBody.data.find((n: { type: string }) => n.type === 'new_order');
    assert.ok(orderNotif, 'Seller must receive a new_order notification');
    assert.strictEqual(orderNotif.title, 'New Order Received! 🎉');
  });

  // Test 3: Seller confirms the order
  test('3. Seller confirms the order', async () => {
    const res = await fetch(`${baseUrl}/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': sellerClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        status: 'confirmed',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'confirmed');
  });

  // Test 4: Buyer sees the updated status
  test('4. Buyer sees the updated status in my orders and receives notification', async () => {
    const res = await fetch(`${baseUrl}/orders/${createdOrderId}`, {
      headers: {
        'x-test-user-id': buyerClerkId,
        'x-test-user-role': 'student',
      },
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.status, 'confirmed');

    // Check buyer notifications
    const notifRes = await fetch(`${baseUrl}/notifications`, {
      headers: {
        'x-test-user-id': buyerClerkId,
        'x-test-user-role': 'student',
      },
    });
    const notifBody = await notifRes.json();
    assert.strictEqual(notifRes.status, 200);
    const statusNotif = notifBody.data.find((n: { type: string }) => n.type === 'order_status');
    assert.ok(statusNotif, 'Buyer must receive an order_status notification');
  });

  // Test 5: Duplicate or simultaneous purchases are handled safely
  test('5. Duplicate or concurrent purchases of claimed item are rejected', async () => {
    // Another student tries to buy the already ordered item
    const res = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': thirdStudentClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        productId: createdProductId,
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, 'PRODUCT_NOT_AVAILABLE');

    // Seller tries to buy their own item
    const selfRes = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': sellerClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        productId: secondProductId,
      }),
    });

    assert.strictEqual(selfRes.status, 400);
    const selfBody = await selfRes.json();
    assert.strictEqual(selfBody.error, 'CANNOT_PURCHASE_OWN_PRODUCT');
  });

  // Test 6: Unauthorized users cannot access other users' orders
  test('6. Unauthorized users cannot access other users orders (403 Forbidden)', async () => {
    // Third party views order
    const getRes = await fetch(`${baseUrl}/orders/${createdOrderId}`, {
      headers: {
        'x-test-user-id': thirdStudentClerkId,
        'x-test-user-role': 'student',
      },
    });
    assert.strictEqual(getRes.status, 403);

    // Third party modifies order
    const patchRes = await fetch(`${baseUrl}/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': thirdStudentClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({ status: 'completed' }),
    });
    assert.strictEqual(patchRes.status, 403);
  });

  // Test 7: Wishlist add and remove operations persist
  test('7. Wishlist add, check, and remove operations persist in Neon', async () => {
    // 1. Add to wishlist
    const addRes = await fetch(`${baseUrl}/wishlist/${secondProductId}`, {
      method: 'POST',
      headers: {
        'x-test-user-id': buyerClerkId,
        'x-test-user-role': 'student',
      },
    });
    const addBody = await addRes.json();
    assert.strictEqual(addRes.status, 201);
    assert.strictEqual(addBody.data.inWishlist, true);

    // 2. Check wishlist status
    const checkRes = await fetch(`${baseUrl}/wishlist/check/${secondProductId}`, {
      headers: {
        'x-test-user-id': buyerClerkId,
        'x-test-user-role': 'student',
      },
    });
    const checkBody = await checkRes.json();
    assert.strictEqual(checkRes.status, 200);
    assert.strictEqual(checkBody.data.inWishlist, true);

    // 3. List wishlist items
    const listRes = await fetch(`${baseUrl}/wishlist`, {
      headers: {
        'x-test-user-id': buyerClerkId,
        'x-test-user-role': 'student',
      },
    });
    const listBody = await listRes.json();
    assert.strictEqual(listRes.status, 200);
    const itemInWishlist = listBody.data.some((p: { id: string }) => p.id === secondProductId);
    assert.strictEqual(itemInWishlist, true);

    // 4. Remove from wishlist
    const delRes = await fetch(`${baseUrl}/wishlist/${secondProductId}`, {
      method: 'DELETE',
      headers: {
        'x-test-user-id': buyerClerkId,
        'x-test-user-role': 'student',
      },
    });
    const delBody = await delRes.json();
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delBody.data.inWishlist, false);

    // 5. Verify removal
    const verifyCheck = await fetch(`${baseUrl}/wishlist/check/${secondProductId}`, {
      headers: {
        'x-test-user-id': buyerClerkId,
        'x-test-user-role': 'student',
      },
    });
    const verifyBody = await verifyCheck.json();
    assert.strictEqual(verifyBody.data.inWishlist, false);
  });

  // Test 8: Buyer sends a message
  test('8. Buyer sends a message linked to the order conversation', async () => {
    const res = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': buyerClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        orderId: createdOrderId,
        content: 'Hi Ananya! Are you free to meet near the library fountain at 3 PM?',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.orderId, createdOrderId);
    assert.strictEqual(body.data.content, 'Hi Ananya! Are you free to meet near the library fountain at 3 PM?');
    assert.strictEqual(body.data.senderName, 'Rohan Verma');
  });

  // Test 9: Seller receives the message
  test('9. Seller receives the message, views conversation, and gets notified', async () => {
    // 1. View conversation messages
    const res = await fetch(`${baseUrl}/messages/order/${createdOrderId}`, {
      headers: {
        'x-test-user-id': sellerClerkId,
        'x-test-user-role': 'student',
      },
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.length >= 1, true);
    assert.strictEqual(body.data[0].content, 'Hi Ananya! Are you free to meet near the library fountain at 3 PM?');
    assert.strictEqual(body.data[0].read, true, 'Viewing messages must mark them as read');

    // 2. View conversation summary in conversations list
    const convRes = await fetch(`${baseUrl}/messages/conversations`, {
      headers: {
        'x-test-user-id': sellerClerkId,
        'x-test-user-role': 'student',
      },
    });
    const convBody = await convRes.json();
    assert.strictEqual(convRes.status, 200);
    const conv = convBody.data.find((c: { orderId: string }) => c.orderId === createdOrderId);
    assert.ok(conv, 'Conversation must appear in seller chats list');
    assert.strictEqual(conv.otherUserName, 'Rohan Verma');

    // 3. Seller in-app notification received
    const notifRes = await fetch(`${baseUrl}/notifications`, {
      headers: {
        'x-test-user-id': sellerClerkId,
        'x-test-user-role': 'student',
      },
    });
    const notifBody = await notifRes.json();
    assert.strictEqual(notifRes.status, 200);
    const msgNotif = notifBody.data.find((n: { type: string }) => n.type === 'new_message');
    assert.ok(msgNotif, 'Seller must receive a new_message notification');
  });

  // Test 10: Unauthorized users cannot read private messages
  test('10. Unauthorized users cannot read private messages or send messages (403 Forbidden)', async () => {
    // Third party views chat
    const getRes = await fetch(`${baseUrl}/messages/order/${createdOrderId}`, {
      headers: {
        'x-test-user-id': thirdStudentClerkId,
        'x-test-user-role': 'student',
      },
    });
    assert.strictEqual(getRes.status, 403);

    // Third party posts message
    const postRes = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': thirdStudentClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({
        orderId: createdOrderId,
        content: 'I want to eavesdrop',
      }),
    });
    assert.strictEqual(postRes.status, 403);
  });

  // Test 11: Invalid status changes are rejected
  test('11. Invalid status transitions and unauthorized role actions are rejected', async () => {
    // Buyer tries to complete the order (only seller can confirm/complete)
    const buyerCompleteRes = await fetch(`${baseUrl}/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': buyerClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({ status: 'completed' }),
    });
    assert.strictEqual(buyerCompleteRes.status, 403);

    // Invalid status string
    const invalidStatusRes = await fetch(`${baseUrl}/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': sellerClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({ status: 'invalid_status_value' }),
    });
    assert.strictEqual(invalidStatusRes.status, 400);
  });

  // Test 12: Order cancellation and product inventory relisting
  test('12. Order cancellation safely relists product back to available status', async () => {
    // Seller cancels order
    const cancelRes = await fetch(`${baseUrl}/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': sellerClerkId,
        'x-test-user-role': 'student',
      },
      body: JSON.stringify({ status: 'cancelled' }),
    });

    const cancelBody = await cancelRes.json();
    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelBody.data.status, 'cancelled');

    // Confirm product status is reverted back to 'available'
    const db = getDb();
    const [prodRecord] = await db.select().from(products).where(eq(products.id, createdProductId));
    assert.strictEqual(
      prodRecord.status,
      'available',
      'Cancelled order must revert product status to available so it can be re-purchased',
    );
  });
});

