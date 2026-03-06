# Login and Profile Setup Android Specification

## Overview
This specification details the Native Android implementation of the authentication flow utilizing phone number sign-in via Firebase Auth and the subsequent profile setup for new users.

## Technologies
- **UI Framework**: Jetpack Compose
- **Authentication**: Firebase Authentication SDK for Android
- **State Management**: `ViewModel` + `StateFlow`
- **Navigation**: Jetpack Navigation Compose

## Setup Prerequisites
- Add your app's **SHA-1** and **SHA-256** fingerprints to the Firebase Console (Project Settings > General).
- Enable the **Play Integrity API** in the Google Cloud Console for your project.
- **Local Development:** Configure `FirebaseAuth` to connect to the local emulator on `10.0.2.2:9099` when built in `DEBUG` mode.

## Screens and Flow

### 1. Login Screen (Phone Number Input)
- **UI Elements:**
  - Create a Compose `@Composable` with the app logo and title.
  - Implement a custom dropdown using `ExposedDropdownMenuBox` for the Country Code Dropdown with search capability.
  - Use `OutlinedTextField` or `TextField` with `keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)` for phone input.
  - Implement a `VisualTransformation` to apply dynamic input masking directly to the text field.
  - A primary `Button` for "Send Code".
- **Logic & Validation:**
  - Expose a `StateFlow` representing ui state (loading, error, button enabled) from the `ViewModel`.
  - **Action on Submit:** Call `PhoneAuthProvider.verifyPhoneNumber()`.
  - **Navigation:** Use `NavController.navigate()` to proceed to the Verification Code route. On error, display a `Snackbar` using a `SnackbarHostState`.

### 2. Verification Code Screen (OTP Input)
- **UI Elements:**
  - A custom OTP input composable, usually involving a `BasicTextField` customized into a segmented row of digits.
  - "Verify" `Button`.
- **Logic & Validation:**
  - **Action on Submit:** Create `PhoneAuthCredential` and call `FirebaseAuth.getInstance().signInWithCredential()`.
  - **Post-Verification:** Call the `auth-service` API using the Client SDK inside a coroutine launched in `viewModelScope` to check for user existence.
  - **Navigation:** Based on backend response, navigate to the Home Graph or Setup Profile screen, popping the back stack.

### 3. Setup Profile Screen
- **UI Elements:**
  - `OutlinedTextField`s for First Name, Last Name, and Email.
  - Configure `KeyboardOptions` appropriately (e.g., `capitalization = KeyboardCapitalization.Words`).
  - "Complete Setup" `Button`.
- **Logic & Validation:**
  - Perform live validation matching in the `ViewModel`.
  - **Action on Submit:** Call backend to create the profile via Client SDK.
  - **Navigation:** On success, navigate to the Main Application Interface. On failure, trigger a `Snackbar`.
