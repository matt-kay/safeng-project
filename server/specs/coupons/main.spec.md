# Coupon Feature Specification (Server)

## 1. Overview
The Coupon feature allows users to create funded coupons from their wallet, which can then be shared and redeemed by other users. This provides a mechanism for gifting and promotional value transfer within the BriskVTU platform.

## 2. Core Entities

### 2.1 Coupon Model
- `id`: string (UUID)
- `creatorUserId`: string (Reference to User)
- `code`: string (Unique, secure random token, e.g., SC-7H2K-9QPL-3M8D)
- `name`: string (Default: "Gift Coupon #<shortId>", editable)
- `currency`: string (e.g., "NGN")
- `amountPerUse`: number (Smallest unit, e.g., Kobo)
- `maxUses`: number (Maximum successful redemptions)
- `remainingUses`: number (Current available redemptions)
- `status`: enum (ACTIVE, PAUSED, REVOKED, EXPIRED)
- `expiresAt`: timestamp (Required)
- `fundingLedgerId`: string (Reference to wallet debit transaction)
- `expiredRefundLedgerId`: string (Nullable, reference to expiry refund transaction)
- `revokedRefundLedgerId`: string (Nullable, reference to revocation refund transaction)
- `createdAt`: timestamp
- `updatedAt`: timestamp

**Constraints:**
- `remainingUses >= 0`
- `maxUses >= 1`
- `amountPerUse > 0`
- `code` UNIQUE
- `expiresAt` > `createdAt`

### 2.2 Coupon Redemption Model
- `id`: string (UUID)
- `couponId`: string (Reference to Coupon)
- `redeemerUserId`: string (Reference to User)
- `amount`: number (Amount credited to redeemer)
- `status`: enum (SUCCESS, FAILED, REVERSED)
- `idempotencyKey`: string (Unique)
- `redeemLedgerId`: string (Reference to wallet credit transaction)
- `createdAt`: timestamp

**Constraints:**
- Unique index: `(couponId, redeemerUserId)` where `status = 'SUCCESS'` (One redemption per user per coupon)

## 3. Key Invariants
1. **Conservation of Value**: 
   - During active window: `creatorDebit = sum(redeemerCredits) + refunds + remainingUnrefunded`
   - After expiry/refund: `creatorDebit = sum(redeemerCredits) + expiryRefund`
2. **Max Usage**: Total `SUCCESS` redemptions <= `maxUses`.
3. **One Redemption Per User**: A user can only redeem a specific coupon once.
4. **Atomicity**: Wallet updates and coupon state changes must be atomic.
5. **Idempotency**: API endpoints must handle retries without duplicate debits/credits.

## 4. Endpoints

### 4.1 Create Coupon
- **POST** `/v1/coupons`
- **Payload**:
  ```json
  {
    "amount_per_use": 500,
    "max_uses": 20,
    "currency": "NGN",
    "name": "Birthday Gift",
    "expires_at": "2026-03-15T23:59:59Z",
    "idempotency_key": "uuid"
  }
  ```
- **Logic**:
  1. Validate creator wallet balance >= `amount_per_use * max_uses`.
  2. Generate secure `code` (Base32/Base62).
  3. Debit creator's wallet (Main Balance).
  4. Create `Coupon` record with `status=ACTIVE`.
  5. Return `Coupon` object.

### 4.2 Redeem Coupon
- **POST** `/v1/coupons/redeem`
- **Payload**:
  ```json
  {
    "code": "SC-7H2K-9QPL-3M8D",
    "idempotency_key": "uuid"
  }
  ```
- **Logic**:
  1. Locate coupon by `code`.
  2. Validate `status == ACTIVE`, `now < expiresAt`, and `remainingUses > 0`.
  3. Check for existing `SUCCESS` redemption for `(couponId, currentUserId)`.
  4. Atomic Transaction:
     - Decrement `remainingUses`.
     - Record `SUCCESS` redemption.
     - Credit redeemer's wallet.
  5. Return success/failure.

### 4.3 Manage Coupons
- **GET** `/v1/coupons`: List coupons created by the user.
- **GET** `/v1/coupons/:id`: Get detailed status and redemptions.
- **PATCH** `/v1/coupons/:id`: Update `name` or `expiresAt`.
- **POST** `/v1/coupons/:id/pause`: Set status to `PAUSED`.
- **POST** `/v1/coupons/:id/resume`: Set status back to `ACTIVE` (if not expired).
- **POST** `/v1/coupons/:id/revoke`: Set status to `REVOKED` and trigger immediate refund of unused funds.

## 5. Background Jobs

### 5.1 Expiry Refund Job
- **Trigger**: Frequent scheduled task (e.g., every minute).
- **Selection**: Coupons where `status IN (ACTIVE, PAUSED)` AND `expiresAt <= now` AND `expiredRefundLedgerId IS NULL`.
- **Logic**:
  1. Lock `Coupon` row.
  2. Set `status = EXPIRED`.
  3. Calculate `refundAmount = amountPerUse * remainingUses`.
  4. If `refundAmount > 0`, credit creator's wallet.
  5. Record `expiredRefundLedgerId`.
  6. Set `remainingUses = 0`.
