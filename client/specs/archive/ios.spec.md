# Login and Profile Setup iOS Specification

## Overview
This specification details the Native iOS implementation of the authentication flow utilizing phone number sign-in via Firebase Auth and the subsequent profile setup for new users.

## Technologies
- **UI Framework**: SwiftUI
- **Authentication**: `FirebaseAuth`
- **State Management**: `@Observable` (iOS 17+)
- **Navigation**: `NavigationStack` / `NavigationPath`

## Setup Prerequisites
- Add the APNs Auth Key in the Firebase Console (Project Settings > Cloud Messaging).
- In Xcode, navigate to your app target's **Signing & Capabilities** tab:
  - Add **Background Modes** and check **Remote notifications**.
- In Xcode, navigate to your app target's **Info** tab:
  - Add a new **URL Type** and paste the `REVERSED_CLIENT_ID` from your `GoogleService-Info.plist` into the **URL Schemes** field.
- **Local Development:** Configure `Auth.auth()` to use the local emulator on `localhost:9099` when built in `DEBUG` mode.

## Screens and Flow

### 1. Login Screen (Phone Number Input)
- **UI Elements:**
  - Create a SwiftUI `View` with the app logo and title.
  - Implement a custom `Picker` or a stylized `Menu` for the Country Code Dropdown with search capability.
  - Use a `TextField` with `.keyboardType(.numberPad)` for the phone number input.
  - Implement input masking logic directly in the `.onChange` modifier or within the backing view model.
  - A primary "Send Code" `Button`.
- **Logic & Validation:**
  - Implement validation logic in the view model to disable the button if the format is incorrect.
  - **Action on Submit:** Call `PhoneAuthProvider.provider().verifyPhoneNumber()`. Show a SwiftUI `ProgressView` conditionally.
  - **Navigation:** Append to the `NavigationPath` to navigate to the Verification Code screen. On error, display an `.alert` or a custom toast notification.

### 2. Verification Code Screen (OTP Input)
- **UI Elements:**
  - A custom SwiftUI view for the 6-digit OTP input, potentially using multiple focused `TextField`s or a single clear, styled field.
  - "Verify" `Button`.
- **Logic & Validation:**
  - **Action on Submit:** Create a credential and call `Auth.auth().signIn(with: credential)`.
  - **Post-Verification:** Call the `auth-service` API using the Client SDK to check for user existence.
  - **Navigation:** Update the root navigation state or append to the path, conditionally routing to the Home flow or Setup Profile flow.

### 3. Setup Profile Screen
- **UI Elements:**
  - Use `TextField`s for First Name, Last Name, and Email.
  - Apply `.textInputAutocapitalization(.words)` where appropriate.
  - Apply `.keyboardType(.emailAddress)` for the email field.
  - "Complete Setup" `Button`.
- **Logic & Validation:**
  - Standard string validation in the view model.
  - **Action on Submit:** Make a backend API call to create the profile.
  - **Navigation:** On success, update global state to transition the root view to the Main Application Interface. On failure, show an `.alert`.
