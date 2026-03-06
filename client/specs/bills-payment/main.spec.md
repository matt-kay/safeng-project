# Client VTpass Services & Beneficiary Management Specification

## 1. SYSTEM OVERVIEW
### 1.1 Purpose
Build the frontend interfaces Expo React Natively (iOS, Android, and Web) for retail mobile bill payment interacting with VTpass services, displaying accurate wallet balances, handling beneficiary state, and rendering detailed receipts.

## 2. CORE UI COMPONENTS
- Service Selection Forms (Airtime, Data, TV, Electricity)
- Beneficiary Picker & Manager
- PIN Confirmation Modal
- Transaction Error & Fraud Warning Alerts
- Detailed Receipt Screen

## 3. SERVICE DEFINITIONS & FLOWS

### 3.1 Airtime & Data
- Inputs: Phone Number, Amount (Airtime), Network/Provider, Plan/Variation (Data).
- Variations: Fetch cached variation codes for Data and populate intuitive pickers.

### 3.2 TV Subscription
- Flow: 
  1. Input Smartcard number and select provider (DSTV/GOTV).
  2. Verify Smartcard (silently calls server API).
  3. Display verified customer name on screen.
  4. User selects Bouquet/Plan.
  5. Enter PIN to submit.

### 3.3 Electricity
- Flow:
  1. Select Disco (AEDC, etc).
  2. Enter Meter Number and select Prepaid/Postpaid.
  3. Verify Meter (silently calls server API).
  4. Display verified name and address.
  5. Enter Amount and PIN.
- Receipt: Must prominently display the generated PREPAID TOKEN with a "Copy to Clipboard" button if prepaid.

## 4. BENEFICIARY PICKER UI STATE SPEC

### 4.1 Service Screen Entry
When user opens a service screen (e.g. Airtime):
- IF saved beneficiaries exist for that service: Display a horizontal scrolling row of "Saved" and "Recent" beneficiaries at the top of the form.
- Beneficiary Card Design: Show nickname, masked identifier (`080****123` or `****4567`), provider icon, verification badge, and favorite star.

### 4.2 On Tap Behavior
When user taps a Beneficiary Card:
- Form automatically pre-fills: Provider, Biller Code, and Default Plan (if saved).
- User can visually modify the plan or amount.
- Modifying the biller code unlinks the beneficiary from the request.

## 5. SAVE TOGGLE BEHAVIOR
On the Payment Review or Form:
- Add a toggle: `[✓] Save this beneficiary for next time`
- Defaults: 
  * OFF if it's a new or one-off biller code.
  * ON if intelligent auto-suggest triggers (used >= 2 times recently).
  * Hidden if a beneficiary card was already selected.

## 6. FRAUD & DUPLICATE PREVENTION LOGIC (Client-Side Feedback)
The client must interpret API responses and handle safety rules:
- Duplicate Warning: If API returns a duplicate prompt, show Modal: "You recently made this payment. Continue?" requiring hard confirmation.
- Electricity Protection: If user saved a beneficiary as Prepaid but switches the form to Postpaid, show warning before submission.
- TV Protection: If user selects "Change Bouquet" but saved default is "Renew", prompt for confirmation.

## 7. RECEIPT REQUIREMENTS
A standardized receipt screen must display:
- Status (Success, Pending, Failed)
- Identifier (Masked phone/meter)
- Service Type
- Amount Paid
- Cashback Earned
- Transaction `request_id`
- Timestamp (Converted to local format)
- *If Electricity Prepaid:* The generated Token & Copy button.

## 8. BENEFICIARIES MANAGEMENT SCREEN
A dedicated full-screen menu option ("My Beneficiaries"):
- List all beneficiaries.
- Filter chips (Airtime, Data, TV, Bills).
- Search bar (by nickname or suffix of biller_code).
- Sort order: Favorites on top, Recents, then Alphabetical.
- Swipe actions: Mark Favorite, Edit, Archive.
- Prevent modifying the core identity (`biller_code` or `provider`), only allow nickname/defaults modification.
