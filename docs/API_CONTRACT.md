# Campus Marketplace — API Contract

> Version: 4.0.0 (Submission-Ready Architecture)  
> Base URL: `http://localhost:4000/api` (development)  
> Authentication: `Authorization: Bearer <clerk-jwt>` on all protected routes

---

## Response Envelope

### Success
```json
{
  "success": true,
  "data": {},
  "message": "optional human-readable note",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable description"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 207 | Multi-status (e.g., health degraded) |
| 400 | Bad Request — validation failure |
| 401 | Unauthorized — missing or invalid JWT |
| 403 | Forbidden — insufficient role or non-owner |
| 404 | Not Found |
| 422 | Unprocessable Entity — semantic error |
| 503 | Service Unavailable (e.g., cloud storage unconfigured) |
| 500 | Internal Server Error |

---

## Endpoints

### Health

#### `GET /api/health`
Public. Returns server and database status.

---

### Auth

#### `POST /api/auth/sync` 🔐
Upserts the authenticated user into our database after Clerk sign-in/sign-up.
Roles always default to `student`. Client requests cannot elevate privileges.

**Headers:** `Authorization: Bearer <clerk-jwt>`

**Body**
```json
{
  "fullName": "Alex Johnson",
  "email": "alex@university.edu",
  "university": "State University",
  "avatarUrl": "https://..."
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clerkId": "user_xxx",
    "fullName": "Alex Johnson",
    "email": "alex@university.edu",
    "role": "student"
  }
}
```

---

#### `GET /api/auth/me` 🔐
Returns the current user's DB profile with calculated statistics (`activeListings`, `totalSold`, `rating`).

---

### Products

#### `GET /api/products`
Public. Returns paginated product listings. Strictly filters out pending, under review, and rejected items (`status IN ('available', 'verified')`).

**Query parameters**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search title and description |
| `category` | string | Enum filter (`books`, `electronics`, `clothing`, etc.) |
| `condition` | string | Enum filter (`new`, `like_new`, `good`, `fair`) |
| `minPrice` | number | Minimum price |
| `maxPrice` | number | Maximum price |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 50) |

---

#### `GET /api/products/seller/me` 🔐
Protected. Returns all products owned by the authenticated seller across all statuses (`pending_review`, `under_review`, `available`, `verified`, `sold`, `rejected`).

---

#### `GET /api/products/:id`
Public. Returns a single product by ID. If product is pending or rejected, only the seller or an admin/verifier can view it.

---

#### `POST /api/products` 🔐
Creates a new product listing. Status automatically defaults to `pending_review`.

**Body**
```json
{
  "title": "Engineering Mathematics Textbook",
  "description": "3rd edition, good condition",
  "price": 350,
  "category": "books",
  "condition": "good",
  "images": ["https://res.cloudinary.com/..."],
  "campusLocation": "Main Library Foyer"
}
```

---

#### `PATCH /api/products/:id` 🔐
Updates a product listing. Only the owner or an admin can update. Sellers can mark `available` or `sold`, but cannot self-approve a pending listing.

---

#### `DELETE /api/products/:id` 🔐
Deletes a product listing. Owner or admin only.

---

### Image Uploads

#### `POST /api/upload/images` 🔐
Uploads up to 5 images to Cloudinary securely through the server.
Supports `multipart/form-data` with key `images` (JPEG, PNG, WebP <= 5MB) or JSON base64.

**Response 201**
```json
{
  "success": true,
  "data": {
    "urls": ["https://res.cloudinary.com/demo/image/upload/..."],
    "files": [
      {
        "url": "https://res.cloudinary.com/demo/image/upload/...",
        "publicId": "campus-marketplace/products/...",
        "format": "jpg",
        "size": 240500
      }
    ]
  }
}
```

---

### Admin Moderation (role: `admin` | `verifier` required)

#### `GET /api/admin/pending` 🔐🛡️
Returns all listings awaiting verification (`pending`, `pending_review`, `under_review`).

#### `POST /api/admin/products/:id/approve` 🔐🛡️
Approves a listing (sets `status = 'available'`), records `verifierId` and `reviewedAt`.

#### `POST /api/admin/products/:id/reject` 🔐🛡️
Rejects a listing with reason documentation.

**Body**
```json
{
  "reason": "Clear photos required showing current condition."
}
```

---

---

### Orders

#### `POST /api/orders` 🔐
Places an order for an available product.
Enforces:
- Self-purchase prevention (buyers cannot order their own product).
- Product status validation (must be `available` or `verified`).
- Atomic status transition (`available` -> `sold`) to prevent race conditions and concurrent double-purchases.
- Automatic seller notification generation (`order_placed`).

**Body**
```json
{
  "productId": "uuid",
  "meetupLocation": "Student Center Foyer",
  "meetupTime": "2026-11-22T14:00:00.000Z"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "productId": "uuid",
      "buyerId": "uuid",
      "sellerId": "uuid",
      "status": "placed",
      "amount": "350.00",
      "meetupLocation": "Student Center Foyer",
      "meetupTime": "2026-11-22T14:00:00.000Z",
      "createdAt": "..."
    },
    "product": { ... }
  }
}
```

---

#### `GET /api/orders` 🔐
Fetches all orders placed by the authenticated buyer, ordered by newest first. Includes seller profile and product details.

---

#### `GET /api/orders/seller` 🔐
Fetches all incoming orders for products owned by the authenticated seller. Includes buyer profile and product details.

---

#### `GET /api/orders/:id` 🔐
Fetches a single order by ID with associated product, buyer, seller, and meetup details.
Restricted to order participants (buyer, seller) or administrators.

---

#### `PATCH /api/orders/:id/status` 🔐
Updates order status across the lifecycle: `placed` -> `confirmed` / `cancelled` / `delivered` / `completed`.
Enforces role-based permissions:
- Buyer can cancel (`cancelled`) if not yet completed/delivered.
- Seller can confirm (`confirmed`), reject/cancel (`cancelled`), or mark delivered (`delivered`).
- On cancellation, product status is automatically relisted back to `available`.
- Automatically emits notifications to the other party (`order_status_changed`).

**Body**
```json
{
  "status": "confirmed"
}
```

---

### Wishlist

#### `GET /api/wishlist` 🔐
Fetches all items bookmarked by the authenticated user, including product details and seller information.

---

#### `POST /api/wishlist/:productId` 🔐
Adds a product to the user's wishlist (idempotent; safe against duplicate additions).

---

#### `DELETE /api/wishlist/:productId` 🔐
Removes a product from the user's wishlist.

---

#### `GET /api/wishlist/check/:productId` 🔐
Checks if a product is saved in the user's wishlist.
Returns `{ success: true, data: { inWishlist: boolean } }`.

---

### Messages

#### `GET /api/messages/conversations` 🔐
Fetches all active conversations for the authenticated user, grouped by `orderId`. Returns counterparty info, product info, last message preview, timestamp, and unread count.

---

#### `GET /api/messages/order/:orderId` 🔐
Fetches full chronological message history for a specific order. Automatically marks incoming messages as read for the requesting participant. Restricted to buyer, seller, or admin.

---

#### `POST /api/messages` 🔐
Sends a message linked to an order.
Enforces:
- Sender must be an authorized participant in the order.
- Message text must be non-empty (1–2000 chars).
- Creates in-app notification (`new_message`) for the receiver.

**Body**
```json
{
  "orderId": "uuid",
  "content": "Hey, I have arrived at the Student Center foyer."
}
```

---

### Notifications

#### `GET /api/notifications` 🔐
Fetches notifications for the authenticated user (newest first).
Returns list and `unreadCount`.

---

#### `PATCH /api/notifications/:id/read` 🔐
Marks a single notification owned by the authenticated user as read.

---

#### `PATCH /api/notifications/read-all` 🔐
Marks all unread notifications for the authenticated user as read.

---

### AI Listing Assistant

#### `POST /api/ai/suggest` 🔐
Generates smart recommendations for listing title, expanded description, category, and pricing tips based on draft inputs.

**Body**
```json
{
  "draftTitle": "macbook pro 14 inch m2 chip charger",
  "price": 1200
}
```

---

#### `POST /api/ai/evaluate-listing` 🔐
Computes an objective listing quality score (0–100), passing status (`isQualityPass`), and actionable improvement tips for sellers.

---

### Campus Meetup Locations

#### `GET /api/meetup-locations`
Public. Returns list of certified safe campus exchange zones with campus zone labels and operating hours.

#### `GET /api/meetup-locations/:id`
Public. Details for a specific certified campus exchange point.

---

### Community Moderation & Reports

#### `POST /api/reports` 🔐
Submits a community moderation report against a suspicious product listing or abusive user account.
Reasons: `spam`, `inappropriate`, `scam`, `counterfeit`, `harassment`, `other`.

**Body**
```json
{
  "targetType": "product",
  "targetId": "uuid",
  "reason": "spam",
  "details": "Duplicate speculative listing"
}
```

---

### Digital UPI Payments (Sandbox)

#### `POST /api/payments/initiate` 🔐
Initiates a sandbox digital payment session for a placed order. Returns transaction reference and demo UPI handle (`campusmarketplace@okaxis`).

#### `POST /api/payments/verify` 🔐
Backend verifies payment completion, updates `orders.paymentRef`, inserts into `payments` table, and delivers a payment notification to the seller.

---

### Returns and Refunds

#### `POST /api/returns` 🔐
Buyer files a return/refund request for an order with specified reason and notes.

#### `GET /api/returns/buyer` 🔐
Buyer views their submitted return requests.

#### `GET /api/returns/seller` 🔐
Seller views incoming return requests.

#### `PATCH /api/returns/:id` 🔐
Seller or Administrator approves, rejects, or marks a return refunded.

---

### Extended Administration & Moderation

#### `POST /api/admin/products/:id/request-changes` 🔐🛡️
Verifier requests specific revisions on a listing, setting status to `changes_requested`, logging an entry in `verifications`, and alerting the seller.

#### `GET /api/admin/verifications/:productId` 🔐🛡️
Returns full auditable verification history for a product.

#### `GET /api/admin/reports` 🔐🛡️
Lists community moderation reports for moderator review.

#### `PATCH /api/admin/reports/:id` 🔐🛡️
Resolves or dismisses a community report with resolution notes.

#### `DELETE /api/admin/products/:id` 🔐🛡️
Moderator action removing an inappropriate product listing from the marketplace.

#### `GET /api/admin/users` 🔐🛡️
Directory of campus users with optional `?search=` filter and status/role indicators.

#### `GET /api/admin/users/:id` 🔐🛡️
Detailed user inspection including listing count and community reports against the user.

#### `PATCH /api/admin/users/:id/status` 🔐🛡️
Suspends or restores a student account (`status: 'active' | 'suspended'`).

---

> 🔐 = Requires Clerk JWT  
> 🛡️ = Requires `admin` or `verifier` role
