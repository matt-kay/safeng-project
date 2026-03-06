# Client SDK Specification

## Overview
The Client SDK serves as the communication layer between the SafeMe client application and the backend API Gateway. It is responsible for managing authentication state, securely interacting with backend services (`auth-service`), and handling server-initiated token revocation.

## Technologies
- **HTTP Client**: Platform-Expo React Native or preferred networking library
- **Authentication**: Firebase Auth SDK
- **State Management**: Platform-Expo React Native or preferred state management system (for exposing SDK state to the UI)

## Core Responsibilities

### 1. API Gateway Connectivity
- **Base URL Configuration**: Dynamic URL resolution matching the environment (Dev, Staging, Prod).
- **Centralized Client**: A fully configured Dio instance with interceptors for logging, auth injection, and standardized error handling.

### 2. Authentication Flow (via auth-service & Firebase)
- **Account Management**: Exposes methods for interacting with `/api/v1/me/profile`:
  - `GET /me/profile`: Fetches the current user profile.
  - `POST /me/profile`: Creates a new profile (initial setup). Returns `409 Conflict` if a profile already exists.
  - `PATCH /me/profile`: Updates an existing profile (used in Edit Profile flow).
- **Synchronization**: Ensures that a successful Firebase authentication triggers a fetch or creation of the user profile in the backend.

### 3. Current User Management
- **State Exposure**: Exposes the current user's profile and authentication state via the preferred state management system.
- **Caching**: Securely stores and restores user session data to allow for immediate UI rendering upon app launch.

### 4. Token Management & Revocation
- **Token Injection**: An Auth Interceptor automatically retrieves the Firebase Auth ID Token (`getIdToken()`) and injects it (`Bearer <token>`) into the `Authorization` header of all outbound requests to protected endpoints.
- **Revocation Handling**: 
  - The SDK intercepts API error responses.
  - If a `401 Unauthorized` response is received indicating a revoked token (e.g., due to a remote sign-out or session invalidation on the server):
    - The SDK forcefully signs the user out of the local Firebase instance (`signOut()`).
    - Clears all cached user data.
    - Emits an unauthenticated state to the state management system, triggering the app router to immediately redirect the user to the Login screen.
