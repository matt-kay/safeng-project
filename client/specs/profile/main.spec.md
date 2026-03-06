# Menu Screen (formerly Profile Screen) Specification

## Overview
This specification details the structure and functionality of the Menu Screen (accessed via the **Menu** tab in bottom navigation) for the BriskVTU client application. It centralizes account management, app settings, and support.

## UI Structure

### Section 1: User Profile Card (DiceBear Avatar)
- **Avatar:** 
  - Source: [DiceBear API](https://api.dicebear.com/7.x/avataaars/png)
  - Implementation: Fetch PNG using the user's `uid` as the `seed` to ensure a consistent, unique avatar.
- **Full Name:** Display the user's first and last name prominently.
- **Phone Number:** Display the authenticated phone number associated with the account.

### Section 2: Account Management
- **Update Profile:** 
  - Action: Navigates to `ProfileEditView`/`ProfileEditScreen`.
  - Validation: Names must not be empty.
  - Technical: MUST use `PATCH /api/v1/me/profile` for updates. Using `POST` will result in a `409 Conflict`.
- **Change Phone Number:** 
  - Action: Initiates the phone number update flow (OTP-based).
  - Technical (Client): Use Firebase Auth's `verifyBeforeUpdatePhoneNumber`.
  - Technical (Backend): MUST call `PATCH /api/v1/me/profile` with `phone_number` to sync with Firestore after Firebase Auth update.
- **Navigation Links:** 
  - Access to Beneficiaries, Transactions, and Coupons.

### Section 3: App Settings (Persistence)
- **Dark Mode:**
  - Component: Toggle Switch.
  - Action: Persists preference using `@AppStorage` (iOS) or `DataStore` (Android).
- **Haptic Feedback:**
  - Component: Toggle Switch.
  - Action: Enables/disables tactile feedback.

### Section 4: Support & Logout
- **About App / Contact Us:** Navigation links to support details.
- **Logout:**
  - **Confirmation Dialog:** MUST show a confirmation prompt ("Are you sure you want to log out?") before signing out.
  - Implementation: `alert` (iOS) or `AlertDialog` (Android).

## Footer
- **App Version & Build Number:** Display at the bottom of the list/column.

## Branding & Navigation
- **Navigation:** Accessible only via the "Menu" tab in the bottom navigation bar (rebranded from "Profile").
- **Home Screen:** The redundant "Profile" or "Menu" icon in the Home screen toolbar has been removed to streamline the experience.

## Platform Specifics
- **iOS:** Use `List` with `Section`. Use `AsyncImage` for avatars.
- **Android:** Use `LazyColumn` with `ListItem`. Use `Coil` for avatars.
