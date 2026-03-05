---
description: Implement User Auth & User Management based on the server specification
---

This workflow guides the agent to implement the authentication and user management features defined in the `server/specs/auth/main.spec.md` for the NestJS backend.

## Prerequisites
- NestJS backend is set up (`server/`).
- Ensure the agent reads and fully understands the specification in `server/specs/auth/main.spec.md` before proceeding.

## Steps

1. **Read the Specification**
   Use `view_file` to read the comprehensive specification file located at `server/specs/auth/main.spec.md`. This file contains the data schema, authorization semantics, error codes, and endpoints.
   
2. **Setup Firebase Admin**
   - Install `firebase-admin` in `server/package.json` if not already present.
   - Create a Firebase module that initializes `firebase-admin` using application credentials.

3. **Generate NestJS Components**
   - Use the NestJS CLI (`npx nest g module <name>`) to generate `Auth`, `Users`, and `Admin` modules.
   - Generate corresponding controllers and services.
   
4. **Implement Firebase Auth Guard**
   - Create an Auth Guard that verifies the Firebase ID token (`Bearer <token>`).
   - The guard should inject the decoded ID token into the request.

5. **Implement Firestore Repositories**
   - Create data access layers for the Firestore `profiles` and `user_audit_logs` collections.
   - Ensure the profiles schema `first_name`, `last_name`, `email`, `phone_number`, `role`, `status` is used.

6. **Implement User Role & Status Guard**
   - Implement the `effective_status` logic as specified in Section 2 of the spec.
   - Create guards/interceptors to enforce `admin` roles, and handle `deleted`, `suspended`, and `inactive` states accurately.

7. **Implement Endpoints**
   Following the spec in Section 4, implement these endpoints with the defined security rules:
   - `GET /health`
   - `GET /api/v1/me`
   - `GET /api/v1/users/:uid`
   - `POST /api/v1/users/profile`
   - `PATCH /api/v1/me/profile`
   - `POST /api/v1/auth/logout`
   - `POST /api/v1/me/devices`
   - `DELETE /api/v1/me/devices/:token`
   - `GET /api/v1/auth/session`
   Admin and deletion endpoints:
   - `DELETE /api/v1/me`
   - `DELETE /api/v1/admin/users/:uid`
   - `DELETE /api/v1/admin/users/:uid/permanent`
   - `PATCH /api/v1/admin/users/:uid`
   - `POST /api/v1/admin/users/:uid/revoke-tokens`
   - `GET /api/v1/admin/users`

8. **Testing and Verification**
   - Write end-to-end (e2e) tests or unit tests for the endpoints.
   - Mock `firebase-admin` auth and firestore methods to simulate database reads and token validations.
   - Verify that all security conditions outlined in the spec's pseudo-code are enforced safely without data leakage.
