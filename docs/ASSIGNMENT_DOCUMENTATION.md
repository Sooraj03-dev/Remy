# Campus Marketplace (Unimart) — Software Development Fundamentals Assignment Report

**Project Title:** Unimart — A Mobile-First Campus Marketplace  
**Course:** Software Development Fundamentals  
**Academic Target Deadline:** 23 November 2026  
**Author / Lead Developer:** Lead Full-Stack Engineering Team  
**Version:** 3.0.0 (Submission-Ready Architecture)  
**Database Branch:** Neon PostgreSQL `dev` (`br-falling-boat-bdcp0b61`)  

---

## 1. Executive Summary & Problem Statement

### 1.1 Problem Statement
University students regularly purchase and sell textbooks, electronics, bicycles, stationery, and dorm essentials at the start and conclusion of academic semesters. However, existing commercial platforms (OLX, Facebook Marketplace, generic e-commerce):
1. **Lack Trust & Safety:** Non-student strangers frequently create fraudulent listings or coordinate unsafe exchanges off-campus.
2. **High Shipping Costs & Delays:** Physical parcel delivery is unnecessary when buyer and seller study on the same campus.
3. **No Campus Verification:** Commercial platforms lack university email authentication, leading to spam and counterfeit goods.
4. **Poor Negotiation & Accountability:** Without campus meetup standards or academic reputation tracking, scam transactions go unmoderated.

### 1.2 Proposed Solution: Unimart
Unimart solves this problem by delivering a dedicated, mobile-first marketplace restricted to university members. Key innovations include:
- **Zero-Delivery Campus Meetups:** Predefined, well-lit certified campus exchange zones (Library Foyer, Student Center Plaza, Campus Main Gate Security Checkpoint).
- **Claymorphism Visual Experience:** Accessible, soft, tactile dual-shadow UI with calm academic palette (`#F3EEFA`, `#B9A0EB`, `#CFF2E2`, `#FFC6BA`, `#342949`).
- **Two-Tier Moderation & AI Assistance:** Student listings are assisted by AI recommendations and reviewed by human campus verifiers before publication.
- **Atomic Concurrency Protection:** High-concurrency safe transitions in Neon PostgreSQL preventing duplicate purchases.
- **End-to-End Transaction Safety:** Order-linked chat, sandbox digital UPI payments, and structured return/refund management.

---

## 2. Project Objectives

1. Develop a high-performance cross-platform mobile app using React Native, Expo, and TypeScript.
2. Implement a secure, scalable RESTful backend in Node.js, Express, and Neon PostgreSQL using Drizzle ORM.
3. Enforce campus-grade authentication with Clerk JWT token validation and role-based access control (`student`, `verifier`, `admin`).
4. Support the 16 core functional requirements defined in the Campus Marketplace UML specification.
5. Provide 100% automated test coverage across relational data persistence, concurrency protection, and role authorization.
6. Package the mobile application for production deployment with Expo EAS Build.

---

## 3. Stakeholder Analysis

| Stakeholder | Key Goals | Platform Responsibilities |
|-------------|-----------|---------------------------|
| **Student Buyer** | Find affordable course essentials nearby; verify physical condition before payment; arrange safe on-campus pickup. | Browse listings, save wishlists, place meetup orders, test UPI/cash payments, chat with seller. |
| **Student Seller** | Monetize unused textbooks and electronics quickly; receive verified student inquiries; avoid unverified strangers. | Create listings, use AI suggestions, coordinate pickups, confirm/fulfill orders. |
| **Campus Verifier** | Ensure listings comply with campus honor codes and safety regulations; prevent counterfeit materials. | Inspect pending listings queue, approve, reject with reason, or request changes. |
| **Administrator** | Maintain platform health, review community abuse reports, manage user privileges, enforce campus policies. | Oversee moderation queue, resolve reports, suspend/restore student accounts, monitor system metrics. |

---

## 4. Functional Requirements Specification

The system implements all 16 requirements specified in the Campus Marketplace reference model:

1. **FR-01: Student Authentication:** Real Clerk JWT token exchange, persistent sessions, university email mapping, and role protection.
2. **FR-02: Profiles & Activity:** User profile inspection, seller rating, active listings count, and transaction history.
3. **FR-03: Marketplace Modes:** Seamless buyer and seller capabilities within a single student account.
4. **FR-04: Discovery & Search:** Multi-parameter search, category filtering, condition filtering, price range boundaries, and pagination.
5. **FR-05: Wishlist Management:** Persistent Neon database bookmarks with instant UI heart toggling and saved items gallery.
6. **FR-06: Product Listings CRUD:** Draft submission, Cloudinary image upload, seller editing, deactivation, and deletion.
7. **FR-07: AI-Assisted Listing:** AI suggestions for title refinement, expanded description, category classification, and objective quality scoring (0–100).
8. **FR-08: Human Verification:** Verifier approval, documented rejection reason, and seller change request workflow.
9. **FR-09: Community Moderation:** Student community reports against products or users, moderator resolution queue, and listing removals.
10. **FR-10: Buyer–Seller Messaging:** Order-linked conversation threads, real-time message exchange, unread badges, and auto-read receipts.
11. **FR-11: In-App Notifications:** Database-backed alerts for new orders, status transitions, moderation updates, and messages.
12. **FR-12: Campus Meetup Coordination:** Certified safe campus exchange points catalog with zone filtering and operating hours.
13. **FR-13: Digital UPI Payments:** Sandbox UPI payment session initiation, transaction reference generation, and backend payment verification.
14. **FR-14: Order Tracking:** Buyer and seller tabbed order management across complete status lifecycle.
15. **FR-15: Returns & Refunds:** Structured return requests, reason selection, evidence notes, seller/admin review, and refund status tracking.
16. **FR-16: Administrative User Management:** User directory search, account details inspection, and suspension/restoration controls.

---

## 5. Non-Functional Requirements

- **Security & Privacy:** Passwords and credentials never touch client storage; Clerk JWT tokens validated server-side on every protected endpoint; sensitive diagnostic routes shielded by admin role checks.
- **Data Integrity & Concurrency:** Concurrency-safe atomic database locking prevents race conditions and duplicate purchases of single-quantity items.
- **Performance:** Sub-100ms API response times for cached routes; paginated feeds (default 20, max 50 items) prevent memory bloat on mobile devices.
- **Accessibility & UX:** Claymorphism design system enforces 48px minimum touch targets, high contrast dark text (`#342949`) on pastel backgrounds, and clear error banners.
- **Extensibility:** Monorepo architecture with clean separation of mobile, server, and shared contracts (`shared/types`).

---

## 6. Architecture & Technology Stack

```
┌────────────────────────────────────────────────────────┐
│                   Expo Mobile Client                   │
│   (React Native · Expo Router · Claymorphism UI)      │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS / REST (Clerk JWT)
┌──────────────────────────▼─────────────────────────────┐
│                 Node.js Express Server                 │
│  (Auth Middleware · Zod Validation · Business Logic)  │
└────────────┬─────────────┬─────────────┬───────────────┘
             │             │             │
    Drizzle  │   Databricks│    Multipart│
      ORM    │   AI Gateway│    Upload   │
┌────────────▼─────┐ ┌─────▼───────┐ ┌───▼───────────────┐
│ Neon PostgreSQL  │ │ Neon AI /   │ │ Cloudinary Media  │
│ Serverless Cloud │ │ Smart Assist│ │ CDN Image Storage │
└──────────────────┘ └─────────────┘ └───────────────────┘
```

---

## 7. Database Model & Schema Migrations

The database is deployed on **Neon Serverless PostgreSQL** using **Drizzle ORM**.

### Applied Migrations:
1. `0000_unknown_sir_ram.sql`: Initial schema creation for `users`, `products`, `orders`, `messages`, and `wishlists`.
2. `0001_mysterious_cobalt_man.sql`: Addition of `notifications` table with cascade deletion.
3. `0002_aberrant_swarm.sql`: Addition of `meetup_locations`, `reports`, `verifications`, `payments`, `returns` tables, and `users.status` column.

Refer to [DATABASE_SCHEMA.md](file:///Users/sreelakshmi/Desktop/Unimart/docs/DATABASE_SCHEMA.md) for full column specifications.

---

## 8. UML Architectural Models

All UML models are formally detailed in [UML_DIAGRAMS.md](file:///Users/sreelakshmi/Desktop/Unimart/docs/UML_DIAGRAMS.md):
- **Use Case Diagram:** Actors (Student, Verifier, Admin) and 19 system use cases.
- **Sequence Diagrams:** Complete checkout/payment flow and verification/change-request flow.
- **State Machine Diagrams:** Dual state machines for Product Listing Lifecycle and Order/Refund Lifecycle.
- **Activity Diagram:** End-to-end swimlane activity flow from search to meetup handover.
- **Class Diagram:** Full Entity-Relationship diagram showing all 11 database models with cardinality.

---

## 9. Test Results & Verification Matrix

The automated test runner executes 6 test suites across 56 test cases on the live Neon development branch:

| Suite | Focus Area | Tests | Status |
|-------|------------|-------|--------|
| **Suite 1: Phase 2A** | Neon Database Connectivity & Drizzle ORM | 8 | ✅ Passed |
| **Suite 2: Neon E2E** | Cloud Services Health Check | 4 | ✅ Passed |
| **Suite 3: Phase 2** | Core Marketplace CRUD & Role Security | 10 | ✅ Passed |
| **Suite 4: Phase 2B** | Complete User Scenario & Clerk Token Sync | 11 | ✅ Passed |
| **Suite 5: Phase 3** | Orders, Wishlists & Order-Scoped Chat | 13 | ✅ Passed |
| **Suite 6: Phase 4** | AI Assist, Moderation, Payments & Returns | 10 | ✅ Passed |
| **Total** | **Comprehensive Full System Coverage** | **56** | **100% Pass** |

---

## 10. Android Build & Deployment Guide

### Build Configuration:
- `mobile/app.json`: Package name configured as `com.unimart.campusmarketplace`, splash and adaptive icon background `#F3EEFA`, camera/media permissions declared.
- `mobile/eas.json`: Configured with `preview` profile targeting APK distribution (`buildType: "apk"`).

### How to Build the Android APK:
```bash
# 1. Install EAS CLI globally
npm install -g eas-cli

# 2. Log in to Expo account
eas login

# 3. Configure EAS project
cd mobile
eas project:init

# 4. Trigger cloud APK build
eas build -p android --profile preview
```

---

## 11. Conclusion & Future Roadmap

Unimart successfully addresses the core vulnerabilities of traditional second-hand student commerce by combining verified university identities, certified physical campus exchange zones, AI-assisted listing authoring, and robust database concurrency protection. The application satisfies all functional and non-functional requirements of the Software Development Fundamentals curriculum and is fully prepared for demonstration and final submission.

