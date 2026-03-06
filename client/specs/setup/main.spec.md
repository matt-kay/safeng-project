# SafeMe App Setup Specification

## Overview
SafeMe is a virtual top-up application designed to help Nigerians in the diaspora and locally purchase airtime, data, TV subscriptions, and electricity.
The mobile app will be built Expo React Natively, targeting iOS, Android, and Web platforms.

## Brand Guidelines
- **Primary Colors**:
  - Deep Red: `#A10000`
  - Orange: `#FF8A50`

## Core Requirements
1. **Target Platforms**: iOS, Android, and Web.
2. **Architecture**: Feature-Driven Architecture (or modular architecture) separating Core components from Features.
3. **State Management**: Use modern, reactive, platform-agnostic state management.
4. **Routing**: Use modern navigation frameworks to support deep linking and advanced navigation flows.
5. **Backend Integration**: Firebase (Authentication, Crashlytics, Analytics), REST API via API Gateway.
6. **Themeing & Styling**: Support for both Light and Dark modes. The deep red and orange should be prominent accents.
7. **Localization**: Setup English only.
8. **Environment Configuration**: Set up flavors/build configurations (Development, Staging, Production).

## Core Setup Steps
1. **Initialize Project**:
   Create the base Expo React Native project specifying the organization bundle identifier `com.scitylana.safeme`.
2. **Add Dependencies**:
   Configure the platform's package manager with required foundational libraries (Networking, State Management, UI architecture).
3. **Folder Structure**:
   Set up the basic folder structure following a Feature-Driven/Clean Architecture approach.
4. **Theme Configuration**:
   Create base theme and color palette files incorporating the Brand Colors (`#A10000`, `#FF8A50`) and Light/Dark Mode support.
5. **Firebase Initialization**:
   Initialize Firebase using the appropriate platform-agnostic configuration files (`GoogleService-Info.plist` or `google-services.json`).
6. **Deep Linking Preparation**:
   Implement basic Expo React Native configurations for Deep Linking (Universal Links for iOS and App Links for Android).
