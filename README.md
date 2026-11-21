# SOVRAN, Full-Stack 3D Fashion E-Commerce Storefront

Architectural luxury fashion and modern streetwear e-commerce platform built with React, TypeScript, Tailwind CSS, Three.js, Express.js, and **Firebase Firestore + Firebase Authentication**.

## Project Structure

```text
├── server.ts                       # Unified Express + Vite entry point (Port 3000)
├── firebase-applet-config.json     # Provisioned Firebase Web SDK & Firestore DB config
├── firestore.rules                 # Hardened Firestore security rules (schema + RBAC)
├── firebase-blueprint.json         # Firestore collections & schema documentation
├── backend/
│   ├── app.ts                      # Express app, security middleware, SEO routes, API mounting
│   ├── types.ts                    # Shared backend TypeScript contracts
│   ├── config/
│   │   └── env.ts                  # Server environment configuration
│   ├── middleware/
│   │   └── auth.middleware.ts      # Firebase ID token verification & admin guard
│   ├── services/
│   │   ├── payment.service.ts      # COD, Bank Transfer, Easypaisa, JazzCash, Stripe gateway
│   │   └── upload.service.ts       # Cloudinary upload + local upload fallback
│   ├── routes/
│   │   └── store.routes.ts         # Gateway capabilities, media/receipt uploads, Stripe webhook
│   └── seed/
│       └── seedData.ts             # Initial Men & Women PKR catalog, coupons & CMS defaults
└── src/
    ├── firebase.ts                 # Firebase Web SDK initialization (Firestore + Google Auth)
    ├── App.tsx                     # SPA router, ErrorBoundary & layout shell
    ├── context/StoreContext.tsx    # Global store, cart, wishlist, Firebase Auth & toast state
    ├── services/
    │   ├── firestoreService.ts     # Typed Firestore CRUD, cart/wishlist sync, order math & seeding
    │   └── api.ts                  # Express fetch client attaching Firebase ID Bearer tokens
    ├── components/
    │   ├── three/                  # HeroThreeScene & ProductThreeViewer (Three.js PBR)
    │   ├── layout/                 # Navbar & Footer
    │   ├── product/                # ProductCard & QuickViewModal
    │   ├── cart/                   # Slide-out CartDrawer
    │   └── common/                 # SafeImage, ErrorBoundary, SearchOverlay, SizeGuideModal
    └── pages/                      # Home, Shop, ProductDetail, Cart, Wishlist, Checkout,
                                    # OrderConfirmation, OrderTracking, Account, AdminDashboard
```

## Local Setup & Installation

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` if configuring optional media/card gateway secrets:
   - `CLOUDINARY_*` (optional): For cloud-hosted product & receipt images.
   - `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET` (optional): For live card checkout.
   - `APP_URL` (optional): Origin for CORS and Stripe redirect URLs.
3. Run development server (Express + Vite HMR-disabled dev middleware on port 3000):
   ```bash
   npm run dev
   ```
4. Build & run production:
   ```bash
   npm run build
   npm start
   ```

## Admin Account & Catalog Seeding

- Sign in via `/admin` (or `/account`) using **Google Sign-In** with the provisioned administrator account.
- On first administrator sign-in, `seedFirestoreIfEmpty()` automatically populates Firestore (`products`, `reviews`, `settings/default`, and `coupons`) if empty. You can also trigger this from **Admin Dashboard → Sync Seed Data**.

## Payment Integrations

- **Cash on Delivery (COD)**: Orders start unpaid (`pending`) and can be marked collected (`paid`) from the Admin Dashboard.
- **Bank Transfer / Easypaisa / JazzCash**: Customers view configured account details, submit their transaction reference (TID), and optionally upload a receipt image. Orders remain `pending_verification` until verified by an administrator.
- **Debit/Credit Cards (Stripe)**: When `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are configured, `/api/store/payments/create-stripe-session` creates a Stripe Checkout session and `/api/payments/stripe-webhook` verifies payment signatures server-side. Card numbers are never stored.
