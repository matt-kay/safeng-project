---
description: Implement SOS Emergency Alert feature (Subscription + Contacts)
---

# SOS Emergency Alert Implementation Workflow

Follow these steps to implement the SOS feature.

## 1. Server-side Updates
- [ ] Add `sos_subscription_active` and `emergency_contacts` to `UserProfile` entity and `ProfileData` interface.
- [ ] Implement `PaystackService` in `server/src/infrastructure/services`.
- [ ] Create `PaystackWebhookController` to handle subscription events.
- [ ] Implement `SOSController` for contact management.
- [ ] Update `FirebaseService` to handle custom claims (`sos_active`).

## 2. Client-side Integration
- [ ] Add Paystack keys and Plan Code to `client/.env`.
- [ ] Create `SOSBenefitsModal` component.
- [ ] Implement `SOSSetupCard` in Home screen.
- [ ] Create `SOSSetupScreen` for contact input.
- [ ] Create `SOSManagementScreen` for status and editing.
- [ ] Add navigation and menu links.

## 3. Paystack Setup
- [ ] Create Plan in Paystack Dashboard (42,000 NGN/month).
- [ ] Configure Webhook URL.

## 4. Verification
- [ ] Test subscription with Paystack test cards.
- [ ] Verify Firestore profile updates.
- [ ] Verify Firebase Custom Claims update.
- [ ] Verify UI feedback with custom AlertModal.
