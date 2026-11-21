# Campus Marketplace — Database Schema

> ORM: Drizzle ORM  
> Database: Neon PostgreSQL (serverless)  
> Driver: `@neondatabase/serverless`

---

> [!IMPORTANT]
> Never run `drizzle-kit push` or `drizzle-kit migrate` directly on the production database without a migration review.  
> Use `drizzle-kit generate` to create migration files, review them, then apply them in a controlled deploy.

---

## Schema Overview

```
users ─┬────────────────────── products ──┬─── orders ──┬─── messages
       │  (seller_id, verifier_id)         │  (product_id) │  (order_id)
       ├──────────── wishlists ────────────┘              └──────────────
       │             (user_id, product_id)
       │
       └──────────── notifications
                     (user_id)
```

---

## Tables

### `users`

Stores registered students and staff. Linked to Clerk via `clerk_id`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | Internal user ID |
| `clerk_id` | `TEXT` | UNIQUE, NOT NULL | Clerk identity ID |
| `full_name` | `TEXT` | NOT NULL | |
| `email` | `TEXT` | UNIQUE, NOT NULL | University email |
| `university` | `TEXT` | nullable | Campus institution |
| `avatar_url` | `TEXT` | nullable | Cloudinary profile photo URL |
| `role` | `TEXT` | NOT NULL, default `'student'` | `student` \| `verifier` \| `admin` |
| `rating` | `NUMERIC(3,2)` | NOT NULL, default `'0'` | Average seller rating |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

---

### `products`

Marketplace listings submitted by student sellers.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `seller_id` | `UUID` | FK → `users.id` CASCADE DELETE | |
| `title` | `TEXT` | NOT NULL | |
| `description` | `TEXT` | nullable | |
| `price` | `NUMERIC(10,2)` | NOT NULL | Price in INR |
| `category` | `TEXT` | NOT NULL | Enum: `books`, `electronics`, `clothing`, etc. |
| `condition` | `TEXT` | NOT NULL | Enum: `new`, `like_new`, `good`, `fair` |
| `status` | `TEXT` | NOT NULL, default `'pending_review'` | Enum: `pending`, `pending_review`, `under_review`, `available`, `sold`, `rejected`, `verified` |
| `images` | `TEXT[]` | NOT NULL, default `'{}'` | Array of Cloudinary URLs |
| `ai_verified` | `BOOLEAN` | NOT NULL, default `false` | AI automated pre-check |
| `verifier_id` | `UUID` | FK → `users.id`, nullable | Moderator user ID |
| `rejection_reason` | `TEXT` | nullable | Reason given on rejection |
| `reviewed_at` | `TIMESTAMPTZ` | nullable | Verification timestamp |
| `campus_location` | `TEXT` | nullable | Preferred campus meetup spot |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

**Status lifecycle:**
```
pending_review ───(admin/verifier approve)───► available (public) ───(purchase)───► sold
       │                                               ▲
       ▼                                               │
(admin/verifier reject)                                │
       │                                               │
    rejected ──────────────(seller edits/resubmits)────┘
```

---

### `orders`

Transactions between buyers and sellers for campus meetups.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `product_id` | `UUID` | FK → `products.id` | |
| `buyer_id` | `UUID` | FK → `users.id` | |
| `seller_id` | `UUID` | FK → `users.id` | |
| `status` | `TEXT` | NOT NULL, default `'placed'` | |
| `amount` | `NUMERIC(10,2)` | NOT NULL | |
| `payment_ref` | `TEXT` | nullable | UPI reference |
| `meetup_location` | `TEXT` | nullable | |
| `meetup_time` | `TIMESTAMPTZ` | nullable | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | |

---

### `messages`

Scoped to order conversations between buyer and seller.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `order_id` | `UUID` | FK → `orders.id` CASCADE DELETE | |
| `sender_id` | `UUID` | FK → `users.id` CASCADE DELETE | |
| `receiver_id` | `UUID` | FK → `users.id` CASCADE DELETE | |
| `content` | `TEXT` | NOT NULL | Message text |
| `read` | `BOOLEAN` | NOT NULL, default `false` | Read receipt flag |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

---

### `wishlists`

Join table linking users to bookmarked products.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `user_id` | `UUID` | FK → `users.id` CASCADE DELETE | Composite PK (user_id, product_id) |
| `product_id` | `UUID` | FK → `products.id` CASCADE DELETE | Composite PK (user_id, product_id) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

---

### `notifications`

In-app alerts and notifications for order updates, messages, and approvals.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `user_id` | `UUID` | FK → `users.id` CASCADE DELETE | Recipient user ID |
| `type` | `TEXT` | NOT NULL | `order_placed`, `order_status_changed`, `listing_approved`, `listing_rejected`, `new_message`, `system` |
| `title` | `TEXT` | NOT NULL | Display title |
| `message` | `TEXT` | NOT NULL | Alert message content |
| `data` | `TEXT` | nullable | JSON payload string (e.g. `{ orderId, productId }`) |
| `read` | `BOOLEAN` | NOT NULL, default `false` | Read receipt |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

---

### `meetup_locations`

Certified safe campus exchange points.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `name` | `TEXT` | NOT NULL | e.g. "Main University Library Foyer" |
| `description` | `TEXT` | nullable | |
| `campus_zone` | `TEXT` | NOT NULL | e.g. "Central Campus", "North Campus" |
| `safe_zone_certified` | `BOOLEAN` | NOT NULL, default `true` | |
| `operating_hours` | `TEXT` | NOT NULL | e.g. "08:00 AM – 09:00 PM" |
| `latitude` | `NUMERIC(10,6)` | nullable | |
| `longitude` | `NUMERIC(10,6)` | nullable | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

---

### `reports`

Community moderation flags against suspicious listings or abusive users.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `reporter_id` | `UUID` | FK → `users.id` CASCADE DELETE | |
| `target_type` | `TEXT` | NOT NULL | `product` \| `user` |
| `target_id` | `UUID` | NOT NULL | Target entity ID |
| `reason` | `TEXT` | NOT NULL | `spam`, `inappropriate`, `scam`, `counterfeit`, `harassment`, `other` |
| `details` | `TEXT` | nullable | |
| `status` | `TEXT` | NOT NULL, default `'pending'` | `pending` \| `resolved` \| `dismissed` |
| `resolution_notes` | `TEXT` | nullable | |
| `resolved_by` | `UUID` | FK → `users.id`, nullable | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

---

### `verifications`

Auditable verification actions recorded by campus moderators and verifiers.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `product_id` | `UUID` | FK → `products.id` CASCADE DELETE | |
| `reviewer_id` | `UUID` | FK → `users.id`, nullable | |
| `action` | `TEXT` | NOT NULL | `approved`, `rejected`, `changes_requested`, `ai_passed`, `ai_flagged` |
| `notes` | `TEXT` | nullable | Revision feedback or reviewer comments |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

---

### `payments`

Digital UPI and campus sandbox payment transactions.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `order_id` | `UUID` | FK → `orders.id` CASCADE DELETE | |
| `payer_id` | `UUID` | FK → `users.id` CASCADE DELETE | Buyer ID |
| `payee_id` | `UUID` | FK → `users.id` CASCADE DELETE | Seller ID |
| `amount` | `NUMERIC(10,2)` | NOT NULL | Transaction amount in INR |
| `method` | `TEXT` | NOT NULL, default `'upi_demo'` | `upi`, `upi_demo`, `cash_on_meetup` |
| `status` | `TEXT` | NOT NULL, default `'pending'` | `pending`, `completed`, `failed`, `refunded` |
| `transaction_ref` | `TEXT` | NOT NULL | Verified UPI / Sandbox reference |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

---

### `returns`

Buyer return and refund dispute requests.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `order_id` | `UUID` | FK → `orders.id` CASCADE DELETE | |
| `product_id` | `UUID` | FK → `products.id` CASCADE DELETE | |
| `buyer_id` | `UUID` | FK → `users.id` CASCADE DELETE | |
| `seller_id` | `UUID` | FK → `users.id` CASCADE DELETE | |
| `reason` | `TEXT` | NOT NULL | `not_as_described`, `defective`, `wrong_item`, `other` |
| `details` | `TEXT` | nullable | |
| `status` | `TEXT` | NOT NULL, default `'requested'` | `requested`, `approved`, `rejected`, `refunded` |
| `seller_notes` | `TEXT` | nullable | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | |

---

## Generated Migrations

Migration files generated in `server/src/db/migrations/`:
- `0000_unknown_sir_ram.sql`: Initial schema creation for users, products, orders, messages, wishlists tables with foreign keys and cascade rules.
- `0001_mysterious_cobalt_man.sql`: Phase 3 addition of `notifications` table with cascade delete to `users.id`.
- `0002_aberrant_swarm.sql`: Phase 4 addition of `meetup_locations`, `reports`, `verifications`, `payments`, `returns` tables, and `users.status` column.
