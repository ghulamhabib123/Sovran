# SOVRAN Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Identity & Email Verification**: All authenticated mutations require `request.auth != null && request.auth.token.email_verified == true`.
2. **Bootstrapped Admin & RBAC Isolation**: Admin privileges are granted ONLY when `request.auth.token.email == 'gameoover1289@gmail.com'` (with `email_verified == true`) or `exists(/databases/$(database)/documents/admins/$(request.auth.uid))`. Regular users cannot self-promote or write `/admins/{uid}`.
3. **PII Isolation**: User email/phone live in `/users/{uid}/private/info` and addresses in `/users/{uid}/addresses/{addressId}` — strictly readable/writable only by `isOwner(uid) || isAdmin()`. Orders containing customer contact & shipping PII are readable only by `existing().userId == request.auth.uid || isAdmin()`.
4. **Catalog & Coupon Integrity**: `/products` and `/settings/default` are writable exclusively by admins. Customers cannot alter product prices, stock counts, or store payment instructions.
5. **Order State & Financial Integrity**: Customers may only create orders where `userId == request.auth.uid`, `orderStatus == 'placed'`, `payment.status in ['pending', 'pending_verification']`, `stockRestored == false`, and `createdAt == request.time`. Only admins may update order status, payment verification status, or tracking numbers. Orders in terminal states (`delivered`, `cancelled`, `returned`) are locked against non-admin modification.
6. **Temporal & ID Integrity**: All document IDs (`orderId`, `productId`, `reviewId`, `addressId`, `couponCode`) must pass `isValidId()` (`^[a-zA-Z0-9_\-]+$`, max 128 chars). Timestamps (`createdAt`, `updatedAt`) are enforced against `request.time`.

## 2. The "Dirty Dozen" Attack Payloads (Must Return PERMISSION_DENIED)
1. **Unverified Admin Email Spoof**: User signs in with `email == 'gameoover1289@gmail.com'` and `email_verified == false`, attempts to update `/products/prod-men-01`.
2. **Self-Admin Escalation**: Customer writes `{ uid: auth.uid, email: 'attacker@x.com', role: 'superadmin', createdAt: serverTimestamp }` to `/admins/${auth.uid}`.
3. **Cross-User PII Read**: Authenticated User A attempts `get` on `/users/${userB}/private/info` or `/users/${userB}/addresses/addr-1`.
4. **Blanket Order List Scraping**: Authenticated User A queries `/orders` without `where('userId', '==', auth.uid)`.
5. **Order Ownership Spoof**: Authenticated User A creates an order at `/orders/ord-1` with `userId: userB`.
6. **Fake Paid Order Creation**: Authenticated User A creates `/orders/ord-2` with `payment: { method: 'card', status: 'paid', ... }` or `orderStatus: 'delivered'`.
7. **Shadow Field Injection on User Profile**: User A writes `{ uid: auth.uid, displayName: 'A', isAdmin: true, createdAt: ts, updatedAt: ts }` to `/users/${auth.uid}`.
8. **Product Price Tampering**: Non-admin authenticated user updates `/products/prod-men-01` setting `price: 1`.
9. **Oversized Document ID Poisoning**: User attempts to write `/orders/${'A'.repeat(300)}`.
10. **Client Timestamp Forgery**: User creates a review at `/products/prod-men-01/reviews/rev-9` with `createdAt` backdated to `2020-01-01`.
11. **Coupon Enumeration**: Non-admin customer attempts `list` query on `/coupons`.
12. **Newsletter Email Harvesting**: Unauthenticated or non-admin user attempts `get` or `list` on `/newsletter`.
