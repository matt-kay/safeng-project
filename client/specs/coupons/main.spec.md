# Coupon Feature Specification (Client)

## 1. Overview
The Coupon feature in the BriskVTU app allows users to create, share, and manage funded coupons. It also enables users to redeem coupons shared by others. The feature is integrated with the user's wallet for funding and redemption.

## 2. User Roles

### 2.1 Coupon Creator
- **Goal**: Create and fund coupons, share them with others, and monitor their status.
- **Actions**:
  - Define `amountPerUse` and `maxUses`.
  - Set an expiry date.
  - View coupon details (shares, remaining uses).
  - Pause, resume, or revoke active coupons.

### 2.2 Coupon Redeemer
- **Goal**: Claim value from a shared coupon.
- **Actions**:
  - Enter a coupon code.
  - View coupon value and details before redemption.
  - Confirm redemption and see value added to wallet.

## 3. UI/UX Requirements

### 3.1 Create Coupon Screen
- **Input Fields**:
  - **Name**: Editable text field (prefilled with auto-generated default).
  - **Amount per Use**: Numeric input (supports currency formatting).
  - **Maximum Uses**: Numeric input.
  - **Expiry Date**: Date/time picker.
- **Dynamic Feedback**:
  - Display "Total Funding Amount" (`amountPerUse * maxUses`).
  - Validation: Ensure wallet balance is sufficient for total funding.
- **Action**: "Create and Fund Coupon" button.

### 3.2 Coupon Details Screen (Creator View)
- **Status Badge**: ACTIVE, PAUSED, EXPIRED, REVOKED.
- **Stats Card**:
  - `Remaining Uses` (e.g., "12 of 20 remaining").
  - `Total Funded` vs `Total Redeemed`.
- **Management Controls**:
  - **Share**: Copy code or share as a deep link.
  - **Pause/Resume**: Toggle button to control redemption availability.
  - **Revoke**: Button to permanently stop redemption and trigger refund.
- **Redemption History**: (Optional) List of recent redemptions (User avatar + amount).

### 3.3 Redeem Coupon Screen
- **Code Entry**: Input field for the secure coupon code.
- **Preview Card**: (Shown after entering code/link) Displays coupon name, value per use, and expiry date.
- **Redeem Button**: Primary action to claim the value.
- **Error States**:
  - `ALREADY_REDEEMED`
  - `COUPON_FULLY_REDEEMED`
  - `COUPON_EXPIRED`
  - `COUPON_PAUSED`
  - `COUPON_REVOKED`
  - `COUPON_NOT_FOUND`

## 4. Navigation
- Accessible via the **Menu** screen.
- Integrated into the **Wallet** section (e.g., "Gifts & Coupons").

## 5. Offline Behavior
- Users can view cached coupon details while offline.
- Creations and redemptions require an active internet connection (Real-time wallet interaction).
