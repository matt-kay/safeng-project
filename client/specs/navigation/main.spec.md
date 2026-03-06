# Bottom Navigation Specification

## Overview
This specification defines the main navigation structure for the SafeMe mobile applications (iOS, Android, and Web). The app uses a bottom navigation bar to provide quick access to the core features.

## Tabs
The bottom navigation bar consists of four primary tabs:

1.  **Home**
    *   **Icon:** `home` (Outline when inactive, Solid when active) from `Ionicons`.
    *   **Label:** "Home"
    *   **Purpose:** Overview of recent activities, quick actions, and branding.
2.  **Wallet**
    *   **Icon:** `card` (Outline when inactive, Solid when active) from `Ionicons`.
    *   **Label:** "Wallet"
    *   **Purpose:** Balance overview, funding options, and transaction history.
3.  **VTU**
    *   **Icon:** `flash` (Outline when inactive, Solid when active) from `Ionicons`.
    *   **Label:** "VTU"
    *   **Purpose:** Airtime, Data, Cable TV, and Electricity bill payments.
4.  **Menu**
    *   **Icon:** `person` (Outline when inactive, Solid when active) from `Ionicons`.
    *   **Label:** "Menu"
    *   **Purpose:** User details, app settings, support (About App, Contact Us), and navigation to other sections like Beneficiaries, Transactions, and Coupons.

## Behavior
- **Default Tab:** The "Home" tab is selected by default upon entering the main application.
- **Persistence:** The navigation bar remains visible across all screens within these main sections.
- **Re-selection:** Tapping an already selected tab should scroll the content to the top (if applicable) or pop back to the root of that tab's navigation stack.
- **Haptic Feedback:** Subtle haptic feedback should be provided on tab selection (platform-dependent).

## Navigation Flow Integration
- **Post-Login:** Transition from Login/OTP to the Main Application (Home Tab).
- **Post-Profile Setup:** Transition from Setup Profile to the Main Application (Home Tab).
