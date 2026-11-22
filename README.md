# Campus Marketplace — Unimart

> A mobile-first second-hand marketplace for university students built with React Native + Expo, Node.js + Express, Neon PostgreSQL, Drizzle ORM, Clerk authentication, and Cloudinary.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native · Expo · TypeScript · Expo Router |
| UI System | Claymorphism design system (`#F3EEFA`, `#B9A0EB`, `#CFF2E2`, `#FFC6BA`, `#342949`) |
| Auth | Clerk (JWT authentication + role metadata) |
| Backend | Node.js · Express · TypeScript |
| Database | Neon PostgreSQL · Drizzle ORM |
| Media | Cloudinary image storage |
| Build | Expo EAS Build |

---

## Monorepo Structure

```
Unimart/
├── mobile/          # Expo React Native mobile application
│   ├── app/         # Expo Router file-based screens (market, checkout, orders, chat, wishlist, notifications, admin)
│   ├── components/  # Claymorphism & product components (ProductCard, StatusBadge, etc.)
│   ├── constants/   # Design tokens (theme.ts)
│   ├── services/    # api.ts (strongly typed backend API client)
│   ├── app.json     # Expo configuration (package: com.unimart.campusmarketplace)
│   ├── eas.json     # EAS Build profiles (preview APK & production AAB)
│   └── package.json
├── server/          # Express REST API backend
│   ├── src/
│   │   ├── config/  # db.ts (Neon/Drizzle), clerk.ts, cloudinary.ts, neonAI.ts, etc.
│   │   ├── db/      # 11 schema tables (users, products, orders, messages, wishlists, notifications, meetup, reports, verifications, payments, returns)
│   │   ├── middleware/ # auth.ts (JWT verify, requireRole), errorHandler.ts, requestLogger.ts
│   │   ├── routes/  # health, auth, products, upload, admin, orders, wishlist, messages, notifications, ai, meetup, reports, payments, returns
│   │   └── tests/   # 6 suites, 56 tests (phase2a, neon-e2e, phase2, phase2b, phase3, phase4)
│   └── package.json
├── shared/types/    # Shared TypeScript contracts (user, product, order, message, wishlist, notification, report, meetup, payment, return, verification, ai)
├── docs/            # ASSIGNMENT_DOCUMENTATION.md, UML_DIAGRAMS.md, IMPLEMENTATION_PROGRESS.md, API_CONTRACT.md, DATABASE_SCHEMA.md
├── design.md        # Canonical claymorphism design system reference
└── .env.example     # Environment variable templates
```

---

## Development Status

- ✅ **Phase 1: Project Foundation** — Expo Router navigation, claymorphism design system, shared types, server scaffold, Drizzle schema.
- ✅ **Phase 2A & 2B: Database & Core Marketplace** — Neon PostgreSQL connection, Drizzle migrations, Clerk auth sync, product CRUD, Cloudinary upload pipeline, admin moderation queue, connected mobile screens.
- ✅ **Phase 3: Transactions & Engagement** — Buyer checkout & order management, seller incoming order lifecycle, wishlist persistence, order-linked buyer-seller chat messaging, in-app notification center.
- ✅ **Phase 4: Advanced UML Features** — AI listing assistant & quality evaluation, verification audit trails & change requests, community moderation reports, certified safe campus meetup points, digital UPI sandbox payments, returns & refund disputes, admin user management.
- ✅ **Phase 5: Complete UI & Integration** — Claymorphism design adherence, loading/empty/error states, role guards.
- ✅ **Phase 6: Complete Database & Migrations** — 11 Neon tables with migrations `0000`, `0001`, `0002` applied on `dev` branch.
- ✅ **Phase 7: Full Automated Test Suite** — 56 passing tests across 6 test suites with 0 failures on live Neon dev database.
- ✅ **Phase 8: Android Build & Deployment** — Package `com.unimart.campusmarketplace`, EAS `preview` APK profile configured.
- ✅ **Phase 9: Assignment Documentation** — SDF assignment report and complete UML diagrams (Use Case, Sequence, State Machine, Activity, Class).
- ✅ **Phase 10: Final Quality Review** — Static typechecks passing with 0 errors across mobile and server, build verified.

---

## Running the Application

### 1. Backend Server

```bash
cd server
cp .env.example .env # configure credentials
npm run dev          # http://localhost:4000
npm test             # run Phase 2 automated test suite
npm run typecheck    # verify TypeScript
```

### 2. Mobile App

Create `mobile/.env` from `mobile/.env.example` if you haven't configured it
yet. Then run these commands from the repository root.

```bash
npm --prefix mobile install
npm run mobile
npm --prefix mobile run typecheck
```

`npm run mobile` launches Expo from the mobile project and loads the Expo Router
entry point. To clear Metro's cache, use `npm run mobile -- --clear`.
