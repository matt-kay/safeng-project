# Server VTpass Services & Beneficiary Management Specification

## 1. SYSTEM OVERVIEW
### 1.1 Purpose
Build the backend infrastructure for a retail mobile bill payment application that handles VTpass service fulfillment, internal wallet ledger accounting, cashback calculations, and beneficiary management.

## 2. CORE SYSTEM COMPONENTS
- Wallet Ledger System
- Transaction Engine & State Machine
- Cashback Engine
- VTpass Integration Layer
- Requery & Status Sync Engine
- Beneficiary Management API

## 3. DATA MODELS

### 3.1 User Model Updates
Ensure the User model includes:
* `wallet_balance` (Integer, kobo)
* `total_cashback_earned` (Integer, kobo)

### 3.2 Wallet Ledger (CRITICAL)
All wallet changes MUST be ledger-based.
* `id`, `user_id`, `transaction_id` (nullable)
* `type`: (DEBIT, CREDIT, CASHBACK, REFUND)
* `amount`, `balance_before`, `balance_after`
* `description`, `created_at`
Condition: `balance` = `SUM(CREDITS) - SUM(DEBITS)`

### 3.3 Transaction
* `id`, `user_id`, `beneficiary_id` (nullable)
* `request_id` (Unique, Africa/Lagos datetime prefix, >=12 chars)
* `service_type` (AIRTIME, DATA, TV, ELECTRICITY)
* `service_id`, `biller_code`, `variation_code`
* `amount`, `commission_received`, `cashback_amount`
* `status`: (INITIATED, PROCESSING, PENDING, SUCCESS, FAILED, REVERSED)
* `vtpass_response` (JSON)
* `created_at`, `updated_at`

### 3.4 Beneficiary
* `id`, `user_id`, `nickname`
* `service_type` (AIRTIME, DATA, TV, ELECTRICITY)
* `provider_service_id`, `provider_display_name`
* `biller_code`
* `variation_code_default`
* `metadata` (JSON: e.g. meter_type, subscription_type_default, verified_customer_name, last_verified_at)
* `is_favorite` (Boolean)
* `last_used_at` (Timestamp, nullable)
* `status` (ACTIVE, ARCHIVED)

## 4. SERVER TRANSACTION FLOW & LOGIC

### 4.1 Purchase Execution (`POST /transactions/initiate`)
1. Validate payload and PIN.
2. Check duplicates: same user, biller_code, amount, service_type within last 2 minutes (status != FAILED).
3. Validate wallet balance >= amount.
4. Generate `request_id` and create `INITIATED` transaction.
5. Debit wallet and record ledger entry.
6. Call VTpass `/api/pay`
7. Update transaction status based on provider response (mapping `delivered`->`SUCCESS`, `pending`->`PENDING`, `failed`->`FAILED`).

### 4.2 State Machine
Strict transitions: `INITIATED` -> `PROCESSING` -> (`SUCCESS` | `PENDING` | `FAILED`). `FAILED` -> `REVERSED`.
Never update wallet without a corresponding ledger entry.

### 4.3 Requery Engine (Cron / Worker)
For `PENDING` transactions, systematically requery VTpass `/api/requery`.
Schedule: +10s, +30s, +60s, +180s, +300s. Halt on `SUCCESS` or `FAILED`.

### 4.4 Cashback Engine
`cashback = commission_received * 0.30`
Credit cashback ONLY when transaction status is `SUCCESS`. Added via `CASHBACK` ledger type.

### 4.5 VTpass Failure
If `FAILED`: Refund wallet -> Record `REFUND` ledger -> Mark transaction FAILED.

## 5. BENEFICIARY API ENDPOINTS

### 5.1 `POST /beneficiaries`
Validate: `nickname`, `biller_code`, `provider_service_id`.
Duplicates: Check combination of user_id, service_type, provider_service_id, biller_code. If exists, update metadata; else create.
Limits: Enforce max 100 per user, max 30 per service_type.
Trust/Safety: Auto-call `/merchant-verify` for TV/Electricity and store verified name/address in `metadata.verified_customer_name`.

### 5.2 `GET /beneficiaries`
Filters by `service_type`, `provider_service_id`. 
Return ordered: Favorites first, then most recently used, then alphabetical. Calculate algorithmic scores if needed by client.

### 5.3 `PATCH /beneficiaries/:id`
Allow editing: `nickname`, `is_favorite`, `variation_code_default`, `metadata`. Prevent editing: `biller_code` or `service_type`.

### 5.4 `POST /beneficiaries/:id/archive`
Soft delete: sets `status` to `ARCHIVED`.

## 6. EXTERNAL INTEGRATION & CACHING
* Cache variation codes from VTpass endpoints per service for 24 hours.
* Securely log VTpass errors, mapping to safe client-facing error messages.
* Use Africa/Lagos timezone exclusively for ID generation. All money values in DB stored as kobo.
