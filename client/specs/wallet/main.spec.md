# Wallet System Specification (Client)

## 1. Overview
The client wallet interface allows users to view their balances, manage payment methods (cards), and top up their wallet using Stripe. The design should cleanly distinguish between the Main Balance and Cashback Balance (both in NGN), and handle the currency conversion logic purely via server responses.

## 2. Screens & Components

### 2.1 Wallet Dashboard Screen
- **Balances Display:** Shows Main Balance (NGN) and Cashback Balance (NGN).
- **Recent Transactions:** A list showing transaction history. Transactions should visibly reflect their status (`INITIATED`, `PENDING`, `SUCCESS`, `FAILED`), and display the failure reason if applicable.
- **Actions:** "Top Up".

### 2.2 Payment Methods Screen (Manage Cards)
- **List Cards:** Display up to 2 saved cards showing the brand (Visa, Mastercard, etc.) and last 4 digits.
- **Add Card:** A button to add a new card safely via Stripe SDK. If the user already has 2 cards, this button should be hidden, disabled, or show an error toast if pressed.
- **Remove Card:** Swipe-to-delete or a delete icon/button next to a card.

### 2.3 Top-Up Flow
- **Step 1: Enter Amount:** User enters the amount in NGN they wish to top up into their Main Balance.
- **Step 2: Breakdown:** Display the `Requested Amount`, `Service Fee`, `Total Amount in NGN` (Requested + Fee), and the equivalent `Total Amount in USD` (using the admin rate fetched from the server).
- **Step 3: Select Card:** User selects a saved card or enters new card details if needed (within the 2-card limit).
- **Step 4: Confirm & Pay:** Call the server (`/wallet/topup/initiate`) to receive the `clientSecret` and `transactionId`. At this point, the transaction is functionally `PENDING`. Use the Stripe Mobile SDK to confirm the payment on the client side.
- **Step 5: Status:** Display a success/failure screen based on the Stripe SDK result. 
- **Step 6: Sync:** Immediately after a result returned by the Stripe SDK, refresh the wallet balance and the specific transaction status from the server to reflect the webhook-updated data.

## 3. Client State & ViewModels
- **WalletViewModel:** Fetches and stores the current wallet balances and transaction history. Polling or refresh mechanism must verify transaction states after a top-up attempt.
- **CardsViewModel:** Fetches and stores the list of saved cards. Handles deleting and refreshing.
- **TopUpViewModel:** Handles the logic for amount entry, displaying fees/USD conversion via server endpoint or cached rate, and orchestrating the Stripe payment intent confirmation.

## 4. Integration Requirements
- **Stripe Mobile SDK:** Both Android and iOS clients must integrate the respective Expo React Native Stripe SDKs to handle PCI-compliant card collection and 3DS (SCA) authentication if required by the card networks.
- **Synchronization:** The client should *not* update the wallet balance optimistically based strictly on the Stripe SDK UI completing. It must re-fetch the wallet balance and transaction history from the server to ensure the server's Stripe Webhook has successfully processed the transaction (moving it to `SUCCESS` or `FAILED`) and incremented the database.
