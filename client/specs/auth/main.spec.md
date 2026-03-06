# Login and Profile Setup Specification (Expo React Native)

## Overview
This specification details the authentication flow utilizing phone number sign-in via Firebase Auth (using `expo-firebase-auth` or `react-Expo React Native-firebase` with Expo Config Plugins), and the subsequent profile setup for new users in the BriskVTU Expo application. This flow targets iOS, Android, and Web.

## Setup Prerequisites
Unified Firebase Project setup is required. Expo Config Plugins should handle Expo React Native configuration for iOS, Android, and Web. 

**Note for Local Development:** The application must be configured to connect to the Firebase Auth Emulator on port 9099 during development.

## Screens and Flow

### 1. Login Screen (Phone Number Input)
- **UI Elements:**
  - Branding (Logo, Title, informative text).
  - **Country Code Dropdown:** A dropdown to select the country code (e.g., +234 for Nigeria) with search functionality.
  - **Phone Number Input Field:**
    - Must automatically mask the input according to the selected country's phone number format.
    - Uses a numeric keyboard type.
  - "Continue" / "Send Code" Button.
- **Logic & Validation:**
  - Validate the phone number format based on the selected country code.
  - Disable the submit button until the inputted phone number is valid.
  - **Action on Submit:** 
    - Initiate Firebase Auth `verifyPhoneNumber`.
    - Display a loading state/indicator on the button or screen.
  - **Navigation:** 
    - On successful code transmission (or auto-retrieval start), navigate to the **Verification Code Screen**.
    - On failure, show an appropriate error message (e.g., "Invalid number", "Too many requests").

### 2. Verification Code Screen (OTP Input)
- **UI Elements:**
  - Informative text indicating the phone number to which the code was sent.
  - Option to edit/change the phone number (navigates back to the Login Screen).
  - **OTP Input Field:** A segmented or cleanly formatted field for entering the 6-digit Firebase verification code.
  - "Verify" Button (can auto-submit when all digits are filled).
  - "Resend Code" option (ideally with a countdown timer).
- **Logic & Validation:**
  - **Action on Submit:**
    - Verify the entered SMS code using the Firebase Auth `PhoneAuthProvider.credential`.
    - Display a loading state.
  - **Post-Verification Logic (Crucial Step):**
    - Assuming successful Firebase authentication, query the BriskVTU backend (via API Gateway/Client SDK) to check if the user profile exists.
  - **Navigation:**
    - **If User Exists:** Authenticate the session and navigate to the **Main Home Application Interface**.
    - **If User Does NOT Exist:** Navigate to the **Setup Profile Screen**.
    - On failure (invalid or expired OTP), show an error message and clear the OTP input.

### 3. Setup Profile Screen
- **UI Elements:**
  - Screen title: "Complete Your Profile" or similar.
  - **First Name Input Field:** Text input, capitalized words.
  - **Last Name Input Field:** Text input, capitalized words.
  - **Email Address Input Field:** Email keyboard type.
  - "Save Profile" / "Complete Setup" Button.
- **Logic & Validation:**
  - **Validation:** 
    - First Name and Last Name must not be empty and should meet minimum length requirements.
    - Email Address must be a valid email format.
  - **Action on Submit:**
    - Make a backend API call to create the user profile with the collected details (First Name, Last Name, Email, and the authenticated Phone Number/Firebase UID).
    - Display a loading state.
  - **Navigation:**
    - On successful profile creation, navigate to the **Main Home Application Interface**.
    - On failure, show an error message (e.g., "Network error", "Email already in use").
