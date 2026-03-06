# Notification Module Specification (NestJS + Google Pub/Sub)

## 0. Overview

### Module Goal
A unified notification module that handles sending messages across multiple channels: APN (iOS), FCM (Android), and Email (Amazon SES).

### Communication Model
Other layers communicate with the Notification Module asynchronously via **Google Cloud Pub/Sub**. The module acts as a subscriber to specific Pub/Sub topics and processes incoming notification requests.
While it is primarily a Pub/Sub event-driven piece of the monolithic architecture, it is built with **NestJS** to easily expose health checks, metrics, and Pub/Sub push HTTP endpoints.

### Core Channels
* **Push Notifications (iOS):** APN (Apple Push Notification service)
* **Push Notifications (Android):** FCM (Firebase Cloud Messaging)
* **Email:** Amazon SES (Simple Email Service)

---

## 1. Architecture & Pub/Sub Topics

### 1.1 Pub/Sub Topics
Other services publish to a central topic or specific topics based on the channel. Recommended unified topic:
* `notifications-outbound`

> [!IMPORTANT]
> **Data Residency & Authority** 
> The Notification Service is entirely stateless and does not own user data (emails or device tokens). 
> **Caller Responsibility:** Any upstream caller wishing to send a notification MUST query the **Auth module** (or local replicated profiles) to fetch the user's `email`, `fcm_tokens`, or `apn_tokens` BEFORE assembling and publishing the Pub/Sub payload.

### 1.2 Subscriptions
The server listens to a subscription:
* `notifications-outbound-sub`

### 1.3 NestJS Integration
* **Pub/Sub Push Delivery:** Google Cloud Pub/Sub pushes incoming messages to a dedicated HTTP endpoint (`POST /api/v1/pubsub/notifications`). This allows the module to scale quickly and seamlessly via standard HTTP routing.

---

## 2. Message Schemas & Payloads

### 2.1 Base Notification Payload
Messages published to the Pub/Sub topic must contain a structured JSON payload.

* `id`: UUID (Message ID for idempotency/tracking)
* `type`: Enum (`"single"`, `"batch"`)
* `channel`: Enum (`"apn"`, `"fcm"`, `"email"`)
* `priority`: Enum (`"high"`, `"normal"`) (Optional, default `"normal"`)
* `recipient`: String (Device Token or Email Address) - *used for single*
* `recipients`: List<String> - *used for batch*
* `payload`: Object (Channel-specific content)

### 2.2 Channel-Specific Payloads

#### APN (Apple Push Notification) Payload
* `title`: String
* `body`: String
* `sound`: String (Optional, default `"default"`)
* `badge`: Integer (Optional)
* `custom_data`: Object (Optional)

#### FCM (Firebase Cloud Messaging) Payload
* `title`: String
* `body`: String
* `image_url`: String (Optional)
* `data`: Object (Optional)

#### Email (Amazon SES) Payload
* `subject`: String
* `body_text`: String (Optional)
* `body_html`: String (Optional)
* `sender`: String (Optional, overrides default service sender)

---

## 3. Handlers and Endpoints

### 3.1 Pub/Sub Push Endpoint (HTTP Handler)
Google Pub/Sub sends a POST request to this endpoint containing the event data.

* **Method:** POST
* **Path:** `/api/v1/pubsub/notifications`
* **Description:** Receives the Pub/Sub message, decodes the base64 payload, and routes it to the correct channel handler.

**Security:**
* Require an authentication token (Pub/Sub JWT verification) or a secure query token parameter.

### 3.2 Single Notification Handler
Internal logic executed when `type == "single"`.

**Process:**
1. Parse the base payload and channel-specific payload using validation decorators (e.g., `class-validator`).
2. Route to the specific Provider Service (APN, FCM, SES).
3. Validate recipient format (e.g., accurate email format).
4. Send notification via the Provider SDK/API.
5. Log success/failure. 

### 3.3 Batch Notification Handler
Internal logic executed when `type == "batch"`.

**Process:**
1. Parse the base payload and channel-specific payload.
2. Chunk the `recipients` list based on the provider's batch limits:
   * **FCM:** Up to 500 tokens per multicast message.
   * **SES:** Up to 50 destinations per bulk email request (or parallelize single sends).
   * **APN:** Parallel single sends or leveraging HTTP/2 multiplexing.
3. Route chunks to the Provider Service.
4. Execute batch send concurrently (e.g., using `Promise.all`).
5. Aggregate success/failure results. Handle partial failures (e.g., log failed recipients).

---

## 4. Provider Integrations

### 4.1 APN (iOS)
* **Library:** `apn` or appropriate Node.js APNs package wrapper.
* **Auth:** Token-based (.p8 file) authentication with Apple.
* **Handling:** Support for background updates, payload size limits (4KB).

### 4.2 FCM (Android/Cross-platform)
* **Library:** Firebase Admin Node.js SDK (`firebase-admin`).
* **Auth:** Google Application Default Credentials or Service Account JSON.
* **Batching:** Use `messaging().sendEachForMulticast()` for efficient batch requests.

### 4.3 Email (Amazon SES)
* **Library:** `@aws-sdk/client-ses`.
* **Auth:** AWS IAM Role or AWS Access Key/Secret.
* **Handling:** Use `SendEmailCommand` or `SendRawEmailCommand`.

### 4.4 Local Development (Logger)
* **Description:** If `NODE_ENV=development`, the service should act as a mock provider.
* **Handling:** Instead of sending real notifications via APN, FCM, or SES, it should simply use the application logger to print the notification payload and recipient(s) to the console. This prevents sending accidental push notifications or emails during local development.

---

## 5. Error Handling and Reliability

### 5.1 Retry Strategy
* **Pub/Sub Native Retries:** Rely on Pub/Sub's native exponential backoff for delivery failures.
* Return `4xx` or `5xx` from the `/api/v1/pubsub/notifications` endpoint to trigger a Pub/Sub retry if the provider API is down or rate limits are hit.
* Return `200/204` if the message is structurally invalid (e.g., missing email)—this acknowledges and drops it, avoiding infinite retries. Consider a Dead Letter Queue (DLQ) for unprocessable messages.

### 5.2 Logging and Observability
* Correlate logs via `message_id`.
* Log provider response times and error codes.
* Setup monitoring (e.g., Prometheus) to track metrics for: Messages Received, Messages Sent Successfully, Failures per Channel.

---

## 6. Project Structure Overview

```text
server/
├── src/
│   ├── notification/
│   │   ├── notification.module.ts# Feature module
│   │   ├── notification.controller.ts
│   │   ├── api/
│   │   │   └── pubsub.controller.ts  # POST /api/v1/pubsub/notifications
│   │   ├── core/
│   │   │   ├── config/               # Configuration variables (AWS, APN)
│   │   │   ├── guards/               # Auth/Security (e.g., verify PubSub JWT)
│   │   │   └── exceptions/           # Custom exception filters
│   │   ├── models/
│   │   │   └── dto/                  # DTOs for Pub/Sub requests
│   │   ├── services/
│   │   │   ├── dispatcher.service.ts # Message router interpreting type/channel
│   │   │   ├── providers/
│   │   │   │   ├── apn.service.ts    # Apple Push Notification logic
│   │   │   │   ├── fcm.service.ts    # Firebase Cloud Messaging logic
│   │   │   │   └── ses.service.ts    # Amazon Simple Email Service logic
│   │   │   └── logger.service.ts     # Structured logging utility
```
