# Campus Marketplace — Design System & Architecture Reference

> This file is the **source of truth** for all design, navigation, database, security, and development conventions.  
> Every developer and AI agent working on this project must read and follow it completely.

---

## 1. Brand Identity

**App name:** Campus Marketplace (internal codename: Unimart)  
**Tagline:** Buy · Sell · Connect — on campus

---

## 2. Design Language — Claymorphism

The UI uses **Claymorphism**: soft, inflated 3-D card surfaces with rounded corners, pastel fill colors, layered inset + drop shadows, and generous padding. All interactive elements feel like physical clay buttons pressed on a pastel board.

### 2.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#F3EEFA` | App background, screen fill |
| `primary` | `#B9A0EB` | Primary buttons, active tab, highlights |
| `mint` | `#CFF2E2` | Success states, verified badges, mint cards |
| `peach` | `#FFC6BA` | Warning/pending states, peach cards |
| `text` | `#342949` | All body text, headings |
| `textSecondary` | `#7B6E8D` | Subtitles, labels, placeholders |
| `white` | `#FFFFFF` | Card surfaces, input backgrounds |
| `error` | `#FF6B6B` | Error states, destructive actions |
| `border` | `#E2D5F5` | Subtle borders on inputs and cards |
| `shadowColor` | `#B9A0EB` | Clay shadow tint |
| `overlay` | `rgba(52,41,73,0.4)` | Modal backdrops |

### 2.2 Typography

| Style | Font | Size | Weight |
|-------|------|------|--------|
| `h1` | System | 28 | 700 |
| `h2` | System | 22 | 700 |
| `h3` | System | 18 | 600 |
| `body` | System | 15 | 400 |
| `bodyBold` | System | 15 | 600 |
| `caption` | System | 12 | 400 |
| `captionBold` | System | 12 | 600 |
| `button` | System | 16 | 700 |

### 2.3 Spacing Scale

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 48`

### 2.4 Radius Scale

| Token | Value |
|-------|-------|
| `radiusSm` | 12 |
| `radiusMd` | 20 |
| `radiusLg` | 28 |
| `radiusXl` | 36 |
| `radiusFull` | 999 |

### 2.5 Shadow Tokens

```ts
// Clay outer shadow (elevation)
clayElevation: {
  shadowColor: '#B9A0EB',
  shadowOffset: { width: 4, height: 6 },
  shadowOpacity: 0.35,
  shadowRadius: 10,
  elevation: 8,
}

// Clay inner highlight (top-left bright edge)
clayInset: {
  shadowColor: '#FFFFFF',
  shadowOffset: { width: -3, height: -3 },
  shadowOpacity: 0.7,
  shadowRadius: 6,
}
```

---

## 3. Component Specifications

### 3.1 ClayButton

- Background: `primary` (#B9A0EB)
- Text: white, `button` style
- Border radius: `radiusFull` (pill shape)
- Padding: `12 × 24`
- Shadow: `clayElevation`
- Pressed state: scale 0.96, slight darken
- Variants: `primary` | `secondary` (white bg, primary border) | `ghost` (transparent) | `danger` (error bg)
- Min touch target: 48 px height

### 3.2 ClayCard

- Background: white
- Border radius: `radiusMd` (20)
- Shadow: `clayElevation`
- Padding: 16
- Variants: `default` | `mint` (bg #CFF2E2) | `peach` (bg #FFC6BA) | `lavender` (bg #E8DFFF)

### 3.3 ClayInput

- Background: white
- Border radius: `radiusMd`
- Border: 1.5 px solid `border`
- Padding: `14 × 16`
- Shadow: subtle inset
- Focus state: border becomes `primary`, subtle glow
- Error state: border becomes `error`
- Must use `accessibilityLabel`

### 3.4 ClayHeader

- Background: transparent (screen bg shows through)
- Large title: `h1`, color `text`
- Subtitle: `caption`, color `textSecondary`
- Right slot: optional icon button (notification bell, settings gear)
- Safe area aware

### 3.5 ProductCard

- ClayCard base
- Image: 160 × 120, border radius `radiusSm`, object-fit cover
- Title: `bodyBold`, 1 line, ellipsis
- Price: `h3`, color `primary`
- Seller name: `caption`, color `textSecondary`
- StatusBadge in top-right corner of image
- Wishlist heart icon (top-right overlay)
- Pressable — navigates to `/product/[id]`

### 3.6 StatusBadge

- Pill shape: `radiusFull`, padding `4 × 10`
- Statuses and colors:

| Status | Background | Text |
|--------|-----------|------|
| `available` | `#CFF2E2` | `#1A7A52` |
| `pending` | `#FFF3CD` | `#856404` |
| `sold` | `#FFE0DC` | `#C0392B` |
| `under_review` | `#E8DFFF` | `#5B3FA6` |
| `rejected` | `#FFE0DC` | `#C0392B` |
| `verified` | `#CFF2E2` | `#1A7A52` |

---

## 4. Navigation Architecture

```
Root Stack
├── (auth) group         [unauthenticated]
│   ├── /login
│   └── /signup
└── (app) group          [authenticated via Clerk]
    ├── (tabs)           [Bottom Tab Navigator]
    │   ├── /home
    │   ├── /explore
    │   ├── /sell
    │   ├── /chats
    │   └── /profile
    ├── /product/[id]    [Modal or push]
    ├── /seller/dashboard
    └── /admin/dashboard [role-gated: admin only]
```

### Tab Bar Design

- Background: white, border-radius top `radiusLg` (28), elevated shadow
- Active tab: `primary` icon + label
- Inactive tab: `textSecondary` icon + label
- Icons: Lucide React Native or similar icon set
- Labels: `captionBold`

---

## 5. Screen Specifications

### 5.1 Login Screen
- Full background: `#F3EEFA`
- Centered ClayCard with logo, tagline
- ClayInputs: email, password
- ClayButton: "Sign In" (primary)
- Link: "Don't have an account? Sign Up"
- Clerk integration: `useSignIn` hook

### 5.2 Signup Screen
- Fields: full name, university email, password, confirm password
- University email validation (`.edu` or institution domain)
- Clerk integration: `useSignUp` hook

### 5.3 Home Screen
- ClayHeader: "Hey, {name} 👋" + notification bell
- Horizontal scroll: Featured listings (ProductCard)
- Section: "Recent near you"
- Section: "Categories" (pill chips: Books, Electronics, Clothing…)

### 5.4 Explore Screen
- Search bar (ClayInput)
- Filter chips: category, price range, condition
- Grid: 2-column ProductCard grid
- Pull-to-refresh

### 5.5 Product Details Screen
- Image carousel (swipeable)
- Title, price, condition, description
- Seller info row (avatar, name, rating)
- StatusBadge
- ClayButton: "Buy Now" | "Add to Wishlist"
- Meeting point map stub

### 5.6 Sell Screen
- Form: title, description, category, price, condition
- Image upload (Cloudinary, max 5 images)
- ClayButton: "List for Sale"
- Submits to backend → AI verification queue

### 5.7 Seller Dashboard
- My listings tabs: Active | Pending | Sold
- ProductCard list per tab
- Quick actions: Edit, Mark Sold, Delete

### 5.8 Chats Screen
- Conversation list (avatar, name, last message, time)
- Navigate to chat thread

### 5.9 Profile Screen
- Avatar, name, university, rating
- Stats: listings sold, active listings
- Menu: Edit Profile, My Orders, Wishlist, Settings, Sign Out

### 5.10 Admin Dashboard
- Role-gated (server verifies `admin` role in Clerk metadata)
- Tabs: Pending Approvals | Users | Reports
- Approve / Reject listing actions (call backend)

---

## 6. Database Schema

### Users
```sql
users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id     TEXT UNIQUE NOT NULL,
  full_name    TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  university   TEXT,
  avatar_url   TEXT,
  role         TEXT DEFAULT 'student',   -- 'student' | 'verifier' | 'admin'
  rating       NUMERIC(3,2) DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
)
```

### Products
```sql
products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  price           NUMERIC(10,2) NOT NULL,
  category        TEXT NOT NULL,
  condition       TEXT NOT NULL,          -- 'new' | 'like_new' | 'good' | 'fair'
  status          TEXT DEFAULT 'pending', -- 'pending' | 'under_review' | 'available' | 'sold' | 'rejected'
  images          TEXT[],                 -- Cloudinary URLs
  ai_verified     BOOLEAN DEFAULT false,
  verifier_id     UUID REFERENCES users(id),
  campus_location TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)
```

### Orders
```sql
orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID REFERENCES products(id),
  buyer_id        UUID REFERENCES users(id),
  seller_id       UUID REFERENCES users(id),
  status          TEXT DEFAULT 'placed',  -- 'placed' | 'confirmed' | 'meetup_arranged' | 'completed' | 'refunded'
  amount          NUMERIC(10,2) NOT NULL,
  payment_ref     TEXT,
  meetup_location TEXT,
  meetup_time     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)
```

### Messages
```sql
messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID REFERENCES orders(id),
  sender_id   UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  content     TEXT NOT NULL,
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
)
```

### Wishlists
```sql
wishlists (
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
)
```

---

## 7. API Conventions

- Base path: `/api`
- Auth: `Authorization: Bearer <clerk-jwt>` on all protected routes
- Response envelope:
```json
{
  "success": true,
  "data": {},
  "message": "optional",
  "pagination": { "page": 1, "limit": 20, "total": 100 }
}
```
- Error envelope:
```json
{
  "success": false,
  "error": "PRODUCT_NOT_FOUND",
  "message": "Human readable message"
}
```
- HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity, 500 Internal Server Error

---

## 8. Security Rules

1. **Never connect Expo/React Native directly to Neon.** All DB access goes through the Express server.
2. **Never expose `DATABASE_URL`, `CLERK_SECRET_KEY`, or `CLOUDINARY_API_SECRET` in mobile code.**
3. **Admin roles** are set server-side only via Clerk `publicMetadata.role`. The mobile app reads this from the JWT but never asserts it.
4. **Image uploads** go through the backend, which forwards to Cloudinary. Mobile never holds Cloudinary secrets.
5. **JWT verification** uses `@clerk/express` `requireAuth()` middleware — never skip on sensitive routes.
6. **No fake payment confirmations.** Payment integration is stubbed but never claims success without real confirmation.

---

## 9. Development Conventions

- **TypeScript strict mode** everywhere (`"strict": true`)
- **No `any`** except in explicit type-cast escape hatches (comment required)
- **Shared types** live in `shared/types/` and are referenced by both mobile and server
- **Environment variables** declared in `.env.example`; never committed
- **Drizzle migrations** must be reviewed before applying to production
- **React Native only** — no `div`, `span`, `p`, `button`, `input` or browser APIs in mobile
- **Barrel exports** from `components/index.ts`
- **Naming**: files `camelCase.ts`, components `PascalCase.tsx`, constants `SCREAMING_SNAKE`
- **Git branching**: `main` (stable) → `develop` → `feature/*`, `fix/*`

---

## 10. Functional Requirements Reference (16 modules)

| # | Module | Phase |
|---|--------|-------|
| 1 | Authentication (Clerk) | Phase 1 |
| 2 | User Profiles | Phase 2 |
| 3 | Marketplace Modes (Buy/Sell) | Phase 1 scaffold |
| 4 | Discovery & Search | Phase 2 |
| 5 | Wishlist | Phase 3 |
| 6 | Product Listings (create/edit/delete) | Phase 2 |
| 7 | AI Verification | Phase 3 |
| 8 | Human Verification | Phase 3 |
| 9 | Moderation & Admin | Phase 2 scaffold |
| 10 | Messaging | Phase 3 |
| 11 | Push Notifications | Phase 3 |
| 12 | Campus Meetup Maps | Phase 4 |
| 13 | UPI Payments | Phase 4 |
| 14 | Order Tracking | Phase 3 |
| 15 | Refunds | Phase 4 |
| 16 | Admin User Management | Phase 2 scaffold |

