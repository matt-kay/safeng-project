# Wallet System Specification (Server)

## 1. Overview
The Wallet System enables users to hold balances in Naira (NGN), which they can use to pay for services within the platform. The wallet supports a Main Balance (for user top-ups) and a Cashback Balance (for promotional/reward funds). Users can top up their Main Balance via Stripe, using a saved credit or debit card. A 2-card limit is imposed per user.

## 2. Core Entities

### 2.1 Wallet Model
- `id`: string (UUID or Firebase Document ID)
- `userId`: string (Reference to User)
- `mainBalance`: number (in NGN, stored as smallest unit e.g., Kobo)
- `cashbackBalance`: number (in NGN, stored as smallest unit e.g., Kobo)
- `currency`: string (Default: "NGN")
- `createdAt`: timestamp
- `updatedAt`: timestamp

### 2.2 PaymentCard Model (Stripe Payment Methods)
- `id`: string
- `userId`: string
- `stripePaymentMethodId`: string
- `last4`: string
- `brand`: string
- `expiryMonth`: number
- `expiryYear`: number
- `isDefault`: boolean

*Note: A user can have a maximum of 2 saved cards.*

### 2.3 Transaction Model
- `id`: string
- `walletId`: string
- `userId`: string
- `type`: enum (TOP_UP, PAYMENT, CASHBACK, REFUND)
- `amount`: number (in NGN)
- `serviceFee`: number (in NGN)
- `exchangeRate`: number (Admin set NGN to USD rate at time of transaction, if applicable)
- `currency`: string ("NGN")
- `status`: enum (INITIATED, PENDING, SUCCESS, FAILED)
- `failureReason`: string (nullable)
- `stripePaymentIntentId`: string (nullable)
- `stripeTransactionObject`: object (nullable, to store raw Stripe event/payment intent data)
- `metadata`: object

## 3. Endpoints

### 3.1 Initiate Wallet
- **POST** `/wallet/initiate`
- **Description:** Creates a new wallet for the authenticated user if one doesn't exist.
- **Response:** `Wallet` object.

### 3.2 Add Card
- **POST** `/wallet/cards`
- **Description:** Attaches a new Stripe Payment Method to the user. Creates a Stripe Customer if necessary.
- **Validation:** Ensure the user has `< 2` saved cards. If `2`, reject with an error.

### 3.3 List Cards
- **GET** `/wallet/cards`
- **Description:** Returns the list of saved cards for the user.

### 3.4 Remove Card
- **DELETE** `/wallet/cards/:cardId`
- **Description:** Detaches the Stripe Payment Method from the customer and deletes the DB record.

### 3.5 Set Admin Exchange Rate
- **POST** `/admin/wallet/rate`
- **Description:** Allows admins to set the NGN to USD exchange rate used for top-ups.
- **Payload:** `{ rate: number }` (e.g., 1 USD = `rate` NGN).

### 3.6 Create Top-Up Intent
- **POST** `/wallet/topup/initiate`
- **Description:** Initiates a Stripe top-up.
- **Payload:** `{ amountNgn: number, cardId: string (optional if using default) }`
- **Logic:**
  1. Calculate necessary service fee for the top-up.
  2. Total NGN = `amountNgn + serviceFee`.
  3. Fetch current admin exchange rate.
  4. Convert Total NGN to USD.
  5. Create an `INITIATED` `Transaction` record in the database.
  6. Create a Stripe PaymentIntent in USD. Add `transactionId` in the PaymentIntent's metadata.
  7. Update the `Transaction` status to `PENDING` and save the `stripePaymentIntentId` and the initial Stripe response object inside `stripeTransactionObject`.
- **Response:** `{ clientSecret: string, transactionId: string, amountUsd: number, serviceFeeNgn: number, exchangeRate: number }`

## 4. Stripe Webhooks
- **Endpoint:** **POST** `/webhooks/stripe`
- **Description:** The single source of truth for updating wallet balances after top-ups.
- **Events:**
  - `payment_intent.succeeded`: 
    1. Parse `transactionId` from metadata.
    2. Fetch `Transaction`.
    3. Verify amount and currency.
    4. Update `Transaction` status to `SUCCESS`.
    5. Save the raw Stripe Event object in `stripeTransactionObject`.
    6. Increment user's `Wallet` `mainBalance` by the `amount` (excluding service fee).
  - `payment_intent.payment_failed`:
    1. Parse `transactionId` from metadata.
    2. Fetch `Transaction`.
    3. Update `Transaction` status to `FAILED`.
    4. Extract and save the `failureReason` from the Stripe event.
    5. Save the raw Stripe Event object in `stripeTransactionObject`.
