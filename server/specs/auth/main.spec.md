# User Auth & User Management Specification (Firebase Phone Auth + Firestore Profile)

## 0. Overview

### Authentication Model (Phone Number)

* Users sign up / sign in with **Firebase Phone Auth** on the client (OTP handled by Firebase SDK).
* Client sends Firebase **ID token** to backend on each request.
* Backend verifies token and manages **application user profile**, **roles**, **statuses**, and **admin operations** in Firestore + Firebase Admin SDK.

### Sources of Truth

* **Identity:** Firebase Auth user record
* **Role/Status:** Firestore `profiles` collection (authoritative)
* **Firebase custom claims:** optional cache for client UX; **not authoritative** for authorization.

---

## 1. Schemas Specification

### 1.1 Identity (Entity Object) — Firebase

* `uid`: String (Primary Key)
* `claims`: Map<string,string> (Optional; **admin-only in responses**)
* `display_name`: String (Optional)
* `phone_number`: String (E.164, Required)
* `disabled`: Boolean (Optional)
* `creation_timestamp`: Timestamp (Firebase server timestamp, Optional)
* `last_refresh_timestamp`: Timestamp (Firebase server timestamp, Optional)
* `last_sign_in_timestamp`: Timestamp (Firebase server timestamp, Optional)

### 1.2 Profile (Entity Object) — Firestore

* `uid`: String (Document ID, matches Firebase uid)
* `first_name`: String (Required; trimmed; 1–50)
* `last_name`: String (Required; trimmed; 1–50)
* `email`: String (Optional; standard format validate)
* `phone_number`: String (E.164, Required)
* `role`: Enum (["customer", "admin"]) (Required)
* `status`: Enum (["active", "inactive", "suspended", "deleted"]) (Required)
* `fcm_tokens`: List<String> (Optional; for FCM push notifications)
* `apn_tokens`: List<String> (Optional; for APN push notifications)
* `created_at`: Timestamp (Firestore server timestamp, Required)
* `updated_at`: Timestamp (Firestore server timestamp, Required)

**Soft delete fields (recommended):**

* `deleted_at`: Timestamp (nullable)
* `deleted_by`: String (nullable)
* `deleted_reason`: String (nullable; max 500)

### 1.3 User (Aggregate Object)

* `uid`: String
* `identity`: Identity
* `profile`: Profile

### 1.4 (Recommended) Admin Audit Collection

`user_audit_logs`

* `id`: String (Document ID)
* `action`: Enum (e.g., `profile_update`, `soft_delete`, `permanent_delete`, `revoke_tokens`, `restore`)
* `actor_uid`: String
* `target_uid`: String
* `reason`: String nullable
* `before`: Map nullable
* `after`: Map nullable
* `created_at`: Timestamp (Firestore server timestamp)

---

## 2. Status & Authorization Semantics

### 2.1 Effective Status (Deterministic)

`effective_status(target)`:

1. If `profile.status == "deleted"` → `"deleted"`
2. Else if `profile.status == "suspended"` → `"suspended"`
3. Else if `firebase.disabled == true` → `"inactive"`
4. Else → `profile.status`

### 2.2 Access Rules

* `deleted`: deny all non-admin actions; admin may read/manage.
* `suspended`: deny all non-admin actions; admin may read/manage.
* `inactive`: allow **GET self**; deny self writes (PATCH/DELETE) unless explicitly allowed.
* `active`: normal.

---

## 3. Common Auth (All Endpoints)

### 3.1 Authentication

* Verify Firebase ID token: signature, issuer, audience, expiry.
* Require `token.uid`.

### 3.2 Authorization Source of Truth

* Load Firestore `profile` document to determine role/status for any privileged checks.
* Do not authorize using `token.role` / `token.status` claims.

### 3.3 Caller Profile Existence

* If caller has **no profile document** yet:

  * Allow only: `GET /api/v1/me` and `POST /api/v1/users/profile`
  * Deny other endpoints.

### 3.4 Error Codes (Recommended)

* `401` invalid/expired token
* `403` forbidden (admin-only or status-blocked)
* `404` not found (used for non-admin attempts to access other users to reduce enumeration)
* `409` conflict (profile exists)
* `422` validation errors
* `400` empty PATCH body

### 3.5 Response Views (Data Minimization)

**Self view:** omit `claims`, timestamps, and `disabled` unless needed
**Admin view:** may include `claims`, `disabled`, timestamps

---

## 4. Endpoints

## 4.0 Health Check

* **Method:** GET
* **Path:** `/health`
* **Description:** Public endpoint to check service health.

### Security

* Public (no token required)

### Response

```json
{
  "status": "ok"
}
```

---

## 4.1 Get Current User (Me) — Bootstrap & “profile exists?”

* **Method:** GET
* **Path:** `/api/v1/me`
* **Description:** Returns caller’s user aggregate if profile exists; otherwise returns identity + `profile=null`.

### Security

* Requires valid token

### Response (Self view)

* If profile exists: `{ user: User }`
* If profile missing: `{ uid, identity, profile: null, profile_missing: true }`

### Pseudo-code

1. Verify token.
2. Fetch Firebase userRecord by `token.uid`; if not found → `404`.
3. Fetch Firestore profile by `token.uid`; if not found → return identity-only response with `profile_missing=true`.
4. Compute `effective_status(self)`:

   * If `deleted` or `suspended` → `403`.
   * If `inactive` → allow.
5. Return self view aggregate.

---

## 4.2 Get User by UID (Self or Admin)

* **Method:** GET
* **Path:** `/api/v1/users/:uid`

### Security

1. If `params.uid == token.uid` → allow unless `deleted/suspended` (inactive allowed for GET)
2. Else require caller role == admin
3. Non-admin requesting other users → `404`

### Response

* Self view when self
* Admin view when admin

### Pseudo-code

1. Verify token.
2. If `params.uid != token.uid`:

   * Load caller profile; if missing or role != admin → `404`/`403` (choose one; recommended `404`).
3. Load Firebase userRecord for target; if not found → `404`.
4. Load Firestore profile for target; if not found → `404`.
5. Compute effective_status(target):

   * If target `deleted/suspended` and caller not admin → `403`.
6. Return appropriate view.

---

## 4.3 Create User Profile (Self Bootstrap)

* **Method:** POST
* **Path:** `/api/v1/users/profile`
* **Description:** Creates Firestore profile document for authenticated user.

### Security

* Self only (`token.uid`)

### Request: CreateUserProfileDTO

* `first_name`: String (Required; trimmed; 1–50)
* `last_name`: String (Required; trimmed; 1–50)
* `email`: String (Optional; standard format validate)

### Server-assigned

* `role = "customer"`
* `status = "active"`

### Response

* Self view `User`

### Idempotency

* If profile exists → `409 Conflict` (or 200 idempotent; this spec uses 409).

### Pseudo-code

1. Verify token.
2. Validate DTO; else `422`.
3. Fetch Firebase userRecord by `token.uid`; if not found → `404`.
4. Create profile document in Firestore (`uid=token.uid`, role=customer, status=active).

   * On conflict → `409`.
5. Best-effort Firebase:

   * set `display_name = first_name + " " + last_name`
   * set custom claims `{ role:"customer", status:"active" }` (optional)
6. Return combined user (self view).

---

## 4.4 Update User Profile (Self)

* **Method:** PATCH
* **Path:** `/api/v1/me/profile`
* **Description:** Updates caller’s profile.

*(Prefer `/me/profile` to avoid uid-in-path mistakes; keep old `/users/:uid` only if required for backwards compatibility.)*

### Security

* Requires profile exists
* Deny if effective_status is `deleted/suspended`
* Deny if effective_status is `inactive` (writes blocked)

### Request: UpdateUserProfileDTO

* `first_name`: String (Optional; trimmed; 1–50)
* `last_name`: String (Optional; trimmed; 1–50)
* `email`: String (Optional; standard format validate)

### Response

* Self view `User`

### Pseudo-code

1. Verify token.
2. Validate body not empty; else `400`.
3. Load profile; if missing → `404`.
4. Compute effective_status(self); block writes if `inactive/suspended/deleted`.
5. Update only provided fields; set `updated_at`.
6. Best-effort Firebase: update `display_name` if name changed.
7. Return user.

---

## 4.5 Logout (Self) — Server-side Invalidate (Optional but Recommended)

* **Method:** POST
* **Path:** `/api/v1/auth/logout`
* **Description:** Revokes refresh tokens for self; client must re-auth.

### Security

* Valid token required

### Response

* `204 No Content`

### Pseudo-code

1. Verify token.
2. Call Firebase Admin `revokeRefreshTokens(token.uid)`.
3. Return 204.

---

## 4.6 Register Device Token (Self)

* **Method:** POST
* **Path:** `/api/v1/me/devices`
* **Description:** Registers a new push notification device token (APN or FCM) for the caller. Helps maintain multiple active devices safely.

### Security

* Requires profile exists
* Deny if effective_status is `deleted/suspended`

### Request: RegisterDeviceDTO

* `token`: String (Required; the actual FCM or APN token)
* `type`: Enum (["fcm", "apn"]) (Required)

### Response

* `204 No Content`

### Pseudo-code

1. Verify token.
2. Validate body not empty; else `400`.
3. Load profile; if missing → `404`.
4. Compute effective_status(self); block writes if `inactive/suspended/deleted`.
5. Firestore Transaction: Atomic `arrayUnion` of `token` to `fcm_tokens` or `apn_tokens` array if it doesn't already exist. Set `updated_at`.
6. Return 204.

---

## 4.7 Remove Device Token (Self)

* **Method:** DELETE
* **Path:** `/api/v1/me/devices/:token`
* **Description:** Unregisters a previously registered push notification device token.

### Security

* Requires profile exists

### Request 
* No Body

### Response

* `204 No Content`

### Pseudo-code

1. Verify token.
2. Load profile; if missing → `404`.
3. Firestore Transaction: Atomic `arrayRemove` of `params.token` from both `fcm_tokens` and `apn_tokens` arrays. Set `updated_at`.
4. Return 204.

---

## 4.8 Get Session (Self) — Lightweight Auth Context (Optional)

* **Method:** GET
* **Path:** `/api/v1/auth/session`
* **Description:** Returns computed authorization context for the caller.

### Response

```json
{
  "uid": "…",
  "role": "customer|admin|null",
  "effective_status": "active|inactive|suspended|deleted",
  "profile_exists": true|false
}
```

### Pseudo-code

1. Verify token.
2. Load profile if exists.
3. Fetch Firebase userRecord disabled flag (or cache it if you already fetch in middleware).
4. Compute effective_status.
5. Return context.

---

# Deletion Endpoints

## 4.7 Self Soft Delete

* **Method:** DELETE
* **Path:** `/api/v1/me`
* **Description:** Soft deletes the caller.

### Security

* Self only
* Idempotent: if already deleted → 204

### Request (optional): SelfDeleteDTO

* `reason`: String (Optional; max 500)

### Response

* `204 No Content`

### Pseudo-code

1. Verify token.
2. Load profile; if missing → `404`.
3. If profile.status == deleted → 204.
4. Firestore transaction: set status=deleted, deleted_at=now, deleted_by=self, deleted_reason, updated_at.
5. Best-effort Firebase:

   * set `disabled=true`
   * revoke refresh tokens
6. Return 204.

---

## 4.8 Admin Soft Delete User

* **Method:** DELETE
* **Path:** `/api/v1/admin/users/:uid`
* **Description:** Soft deletes a target user.

### Security

* Admin only (caller profile.role == admin)

### Request (optional): AdminSoftDeleteDTO

* `reason`: String (Optional; max 500)

### Response

* `204 No Content`

### Pseudo-code

1. Verify token; load caller profile; require admin.
2. Load target profile; if missing → `404`.
3. If already deleted → 204.
4. Update profile document as deleted with deleted_by=admin.
5. Best-effort Firebase: disabled=true, revoke refresh tokens.
6. Audit log.
7. Return 204.

---

## 4.9 Admin Permanent Delete User

* **Method:** DELETE
* **Path:** `/api/v1/admin/users/:uid/permanent`
* **Description:** Permanently deletes user from Firebase and removes/scrubs Firestore data.

### Security

* Admin only
* (Recommended) require step-up auth for admins (policy)

### Request: AdminPermanentDeleteDTO

* `reason`: String (Optional; max 500)
* `also_delete_profile`: Boolean (Optional; default true)

### Response

* `204 No Content`

### Data Handling Options

* If `also_delete_profile=true`: delete profile document
* Else: scrub PII (first/last name) and keep deleted markers

### Pseudo-code

1. Verify token; require admin.
2. Load target profile; if missing → `404`.
3. Ensure target is soft-deleted (if not, soft-delete first).
4. Firebase Admin: delete user (`deleteUser(uid)`).

   * If already missing, continue but log.
5. Firestore transaction:

   * delete profile document OR scrub PII and keep tombstone
6. Audit log.
7. Return 204.

---

# Admin Management Endpoints

## 4.10 Admin Update User

* **Method:** PATCH
* **Path:** `/api/v1/admin/users/:uid`
* **Description:** Admin updates target user profile and/or role/status/disabled.

### Security

* Admin only

### Request: AdminUpdateUserDTO

* `first_name`: String (Optional; trimmed; 1–50)
* `last_name`: String (Optional; trimmed; 1–50)
* `disabled`: Boolean (Optional)
* `role`: Enum (["customer", "admin"], Optional)
* `status`: Enum (["active","inactive","suspended","deleted"], Optional)
* `reason`: String (Optional; max 500) *(for audit)*

### Status Transition Rules (Recommended)

* `deleted` is terminal unless you implement explicit restore.
* If `disabled=true`, effective status becomes at most `inactive` (unless suspended/deleted).

### Response

* Admin view `User`

### Pseudo-code

1. Verify token; require admin.
2. Validate DTO not empty.
3. Load target profile + Firebase record.
4. Apply allowed transitions.
5. Update Firestore fields; set updated_at.
6. Best-effort Firebase:

   * update disabled if provided
   * update display_name if name changed
   * update custom claims to match DB `{role,status}` (optional)
7. Audit log.
8. Return admin view.

---

## 4.11 Admin Revoke Tokens (Target User)

* **Method:** POST
* **Path:** `/api/v1/admin/users/:uid/revoke-tokens`
* **Description:** Revokes refresh tokens for a target user.

### Security

* Admin only

### Request: RevokeTokensDTO

* `reason`: String (Optional; max 500)

### Response

* `204 No Content`

### Pseudo-code

1. Verify token; require admin.
2. Ensure target exists (at least profile exists); else `404`.
3. Firebase Admin: `revokeRefreshTokens(uid)`.
4. Audit log.
5. Return 204.

---

## 4.12 Admin List/Search Users (Recommended)

* **Method:** GET
* **Path:** `/api/v1/admin/users`
* **Description:** Paginated list/search for admin UI.

### Security

* Admin only

### Query Params

* `status`: active|inactive|suspended|deleted (optional)
* `role`: customer|admin (optional)
* `query`: string (optional; searches name/phone if stored)
* `limit`: int (default 50, max 100)
* `cursor`: string (pagination token) OR `page`/`offset` (cursor preferred)

### Response

```json
{
  "items": [ { "uid": "...", "profile": {...}, "identity": {...minimal...} } ],
  "next_cursor": "..."
}
```

### Notes

* Prefer listing from Firestore as primary dataset; hydrate minimal identity fields as needed.
* Avoid returning `claims` in list views unless necessary.

---

## 5. Notes Specific to Phone Number Sign-up

### OTP / Verification

* No backend endpoints required for OTP if using Firebase client SDK.
* Backend only requires the Firebase ID token sent by the client.

### Phone Number in Firestore?

* Optional. If you don’t need to query by phone number server-side, don’t store it—read from Firebase identity when needed.
* If you *do* store it, add a `/api/v1/me/phone/sync` endpoint that copies Firebase `phone_number` into Firestore after successful sign-in.

---

## 6. Security Requirements (Recommended)

* Rate limit all endpoints.
* Input validation + trimming for all names/reasons.
* Uniform error responses; avoid leaking user existence to non-admins.
* Firestore is authoritative; Firebase Auth updates are best-effort with retry/outbox.
* Audit log for all admin actions affecting role/status/disabled/deletes/revocations.

---

If you want, I can also generate:

* a single **authorization matrix table** (endpoint × caller role × effective status),
* example request/response JSON for each endpoint,
* and Firestore index configurations for `profiles` + audit log.
