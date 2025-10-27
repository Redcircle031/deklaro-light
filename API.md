# 📡 Deklaro API Documentation

Complete API reference for Deklaro invoice automation platform.

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Tenant Invitations](#tenant-invitations)
3. [Invoices](#invoices)
4. [Companies](#companies)
5. [KSeF Integration](#ksef-integration)
6. [Stripe Payments](#stripe-payments)
7. [Rate Limiting](#rate-limiting)
8. [Error Handling](#error-handling)

---

## Authentication

All API requests require authentication via Supabase JWT tokens.

### Headers

```
Authorization: Bearer <jwt_token>
x-deklaro-tenant-id: <tenant_id>
```

### Getting a Token

```bash
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "jwt_token_here",
    "refresh_token": "refresh_token_here"
  }
}
```

---

## Tenant Invitations

### Create Invitation

Invite a new user to join a tenant organization.

```bash
POST /api/tenants/invitations
Authorization: Bearer <token>
x-deklaro-tenant-id: <tenant_id>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "role": "ACCOUNTANT",
  "message": "Welcome to the team!"
}
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Email address of the invitee |
| role | enum | Yes | One of: `OWNER`, `ACCOUNTANT`, `CLIENT` |
| message | string | No | Personal message (max 500 chars) |

**Response (201 Created):**
```json
{
  "success": true,
  "invitation": {
    "id": "uuid",
    "tenant_id": "uuid",
    "email": "newuser@example.com",
    "role": "ACCOUNTANT",
    "token": "secure_token_xyz",
    "status": "PENDING",
    "expires_at": "2025-11-03T12:00:00.000Z",
    "invited_by": "uuid",
    "message": "Welcome to the team!",
    "created_at": "2025-10-27T12:00:00.000Z"
  }
}
```

**Rate Limit:** 100 requests/minute

**Errors:**
- `400` - Invalid email or role
- `401` - Unauthorized
- `409` - User already invited or member
- `429` - Rate limit exceeded

---

### List Invitations

Get all invitations for a tenant.

```bash
GET /api/tenants/invitations
Authorization: Bearer <token>
x-deklaro-tenant-id: <tenant_id>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status: `PENDING`, `ACCEPTED`, `EXPIRED` |
| limit | number | Results per page (default: 20, max: 100) |
| offset | number | Pagination offset (default: 0) |

**Response (200 OK):**
```json
{
  "invitations": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "role": "ACCOUNTANT",
      "status": "PENDING",
      "expires_at": "2025-11-03T12:00:00.000Z",
      "created_at": "2025-10-27T12:00:00.000Z"
    }
  ],
  "total": 10,
  "limit": 20,
  "offset": 0
}
```

---

### Accept Invitation

Accept a pending invitation.

```bash
POST /api/tenants/invitations/accept
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "secure_token_xyz"
}
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | string | Yes | Invitation token from email |

**Response (200 OK):**
```json
{
  "success": true,
  "membership": {
    "id": "uuid",
    "tenant_id": "uuid",
    "user_id": "uuid",
    "role": "ACCOUNTANT",
    "joined_at": "2025-10-27T12:00:00.000Z"
  },
  "tenant": {
    "id": "uuid",
    "name": "Acme Corp"
  }
}
```

**Errors:**
- `400` - Missing or invalid token
- `401` - Unauthorized (must be authenticated)
- `403` - Email mismatch (token for different email)
- `404` - Invitation not found
- `410` - Invitation expired

---

### Revoke Invitation

Cancel a pending invitation.

```bash
DELETE /api/tenants/invitations/:invitationId
Authorization: Bearer <token>
x-deklaro-tenant-id: <tenant_id>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Invitation revoked"
}
```

---

## Invoices

### Upload Invoice

Upload invoice files for OCR processing.

```bash
POST /api/invoices/upload
Authorization: Bearer <token>
x-deklaro-tenant-id: <tenant_id>
Content-Type: multipart/form-data

files: [file1.pdf, file2.jpg]
```

**Request:**
- **Content-Type:** `multipart/form-data`
- **Field name:** `files` (array)
- **Max files:** 10 per request
- **Max size:** 10MB per file
- **Formats:** PDF, JPG, PNG

**Response (201 Created):**
```json
{
  "success": true,
  "invoices": [
    {
      "id": "uuid",
      "filename": "invoice_001.pdf",
      "status": "PROCESSING",
      "upload_url": "https://storage.supabase.co/...",
      "created_at": "2025-10-27T12:00:00.000Z"
    }
  ]
}
```

**Rate Limit:** 10 requests / 15 minutes

**Errors:**
- `400` - Invalid file format or size
- `401` - Unauthorized
- `413` - File too large
- `415` - Unsupported file type
- `429` - Rate limit exceeded

**Security:**
- Files are virus scanned before processing
- Magic byte validation
- Extension whitelisting

---

### Get Invoice

Retrieve invoice details.

```bash
GET /api/invoices/:invoiceId
Authorization: Bearer <token>
x-deklaro-tenant-id: <tenant_id>
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "filename": "invoice_001.pdf",
  "status": "APPROVED",
  "invoice_number": "FV/2025/001",
  "issue_date": "2025-10-27",
  "due_date": "2025-11-27",
  "total_amount": 1234.56,
  "currency": "PLN",
  "vat_amount": 234.56,
  "net_amount": 1000.00,
  "seller": {
    "name": "Seller Company",
    "nip": "1234567890",
    "address": "Street 1, Warsaw"
  },
  "buyer": {
    "name": "Buyer Company",
    "nip": "0987654321",
    "address": "Street 2, Krakow"
  },
  "line_items": [
    {
      "description": "Service A",
      "quantity": 1,
      "unit_price": 1000.00,
      "vat_rate": 23,
      "total": 1234.56
    }
  ],
  "ksef_number": "1234567890-20251027-ABCD1234-56",
  "created_at": "2025-10-27T12:00:00.000Z",
  "updated_at": "2025-10-27T12:30:00.000Z"
}
```

---

### List Invoices

Get all invoices for a tenant.

```bash
GET /api/invoices
Authorization: Bearer <token>
x-deklaro-tenant-id: <tenant_id>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status: `DRAFT`, `PROCESSING`, `REVIEWED`, `APPROVED`, `REJECTED`, `SUBMITTED` |
| from_date | string | ISO date (e.g., `2025-01-01`) |
| to_date | string | ISO date |
| limit | number | Results per page (default: 20, max: 100) |
| offset | number | Pagination offset |
| search | string | Search by invoice number, company name |

**Response (200 OK):**
```json
{
  "invoices": [...],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

**Rate Limit:** 300 requests / minute

---

### Update Invoice

Update invoice data.

```bash
PATCH /api/invoices/:invoiceId
Authorization: Bearer <token>
x-deklaro-tenant-id: <tenant_id>
Content-Type: application/json

{
  "status": "APPROVED",
  "invoice_number": "FV/2025/001",
  "total_amount": 1234.56
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "invoice": { ... }
}
```

---

### Delete Invoice

Delete an invoice.

```bash
DELETE /api/invoices/:invoiceId
Authorization: Bearer <token>
x-deklaro-tenant-id: <tenant_id>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Invoice deleted"
}
```

---

## Companies

### Create Company

Add a new company to the system.

```bash
POST /api/companies
Authorization: Bearer <token>
x-deklaro-tenant-id: <tenant_id>
Content-Type: application/json

{
  "name": "Example Company Sp. z o.o.",
  "nip": "1234567890",
  "address": "ul. Przykładowa 1",
  "city": "Warsaw",
  "postal_code": "00-001",
  "country": "PL"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "company": {
    "id": "uuid",
    "tenant_id": "uuid",
    "name": "Example Company Sp. z o.o.",
    "nip": "1234567890",
    "address": "ul. Przykładowa 1",
    "city": "Warsaw",
    "postal_code": "00-001",
    "country": "PL",
    "created_at": "2025-10-27T12:00:00.000Z"
  }
}
```

---

### Validate NIP

Validate Polish NIP (Tax ID) with GUS registry.

```bash
POST /api/companies/validate-nip
Authorization: Bearer <token>
Content-Type: application/json

{
  "nip": "1234567890"
}
```

**Response (200 OK):**
```json
{
  "valid": true,
  "company": {
    "name": "Example Company Sp. z o.o.",
    "nip": "1234567890",
    "regon": "123456789",
    "address": "ul. Przykładowa 1, 00-001 Warsaw",
    "status": "ACTIVE"
  }
}
```

---

### List Companies

Get all companies for a tenant.

```bash
GET /api/companies
Authorization: Bearer <token>
x-deklaro-tenant-id: <tenant_id>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search by name or NIP |
| city | string | Filter by city |
| limit | number | Results per page |
| offset | number | Pagination offset |

**Response (200 OK):**
```json
{
  "companies": [
    {
      "id": "uuid",
      "name": "Example Company",
      "nip": "1234567890",
      "city": "Warsaw"
    }
  ],
  "total": 25,
  "limit": 20,
  "offset": 0
}
```

---

## KSeF Integration

Polish National e-Invoice System integration.

### Authenticate with KSeF

Establish session with KSeF system.

```bash
POST /api/invoices/ksef/authenticate
Authorization: Bearer <token>
x-deklaro-tenant-id: <tenant_id>
Content-Type: application/json

{
  "nip": "1234567890"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "session_token": "ksef_session_token_xyz",
  "expires_at": "2025-10-27T14:00:00.000Z"
}
```

---

### Submit Invoice to KSeF

Submit approved invoice to KSeF system.

```bash
POST /api/invoices/ksef/submit
Authorization: Bearer <token>
x-deklaro-tenant-id: <tenant_id>
Content-Type: application/json

{
  "invoiceId": "uuid"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "ksef_number": "1234567890-20251027-ABCD1234-56",
  "submission_date": "2025-10-27T12:00:00.000Z",
  "status": "ACCEPTED"
}
```

**Errors:**
- `400` - Invoice not approved or invalid data
- `401` - Unauthorized
- `503` - KSeF service unavailable

---

### Get Invoice Status from KSeF

Check invoice status in KSeF system.

```bash
GET /api/invoices/ksef/status/:ksefNumber
Authorization: Bearer <token>
x-deklaro-tenant-id: <tenant_id>
```

**Response (200 OK):**
```json
{
  "ksef_number": "1234567890-20251027-ABCD1234-56",
  "status": "ACCEPTED",
  "submission_date": "2025-10-27T12:00:00.000Z",
  "acceptance_date": "2025-10-27T12:05:00.000Z"
}
```

---

### Download UPO (Confirmation)

Download UPO (Urzędowe Poświadczenie Odbioru) document from KSeF.

```bash
GET /api/invoices/ksef/upo/:ksefNumber
Authorization: Bearer <token>
x-deklaro-tenant-id: <tenant_id>
```

**Response (200 OK):**
- **Content-Type:** `application/pdf`
- Binary PDF file

---

## Stripe Payments

### Create Checkout Session

Create Stripe checkout session for subscription upgrade.

```bash
POST /api/stripe/checkout
Authorization: Bearer <token>
x-deklaro-tenant-id: <tenant_id>
Content-Type: application/json

{
  "priceId": "price_xxxxxxxxxxxxx"
}
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| priceId | string | Yes | Stripe Price ID from dashboard |

**Response (200 OK):**
```json
{
  "sessionId": "cs_test_xxxxxxxxxxxxx",
  "url": "https://checkout.stripe.com/c/pay/cs_test_xxxxxxxxxxxxx"
}
```

**Rate Limit:** 100 requests / minute

---

### Create Portal Session

Create Stripe customer portal session for subscription management.

```bash
POST /api/stripe/portal
Authorization: Bearer <token>
x-deklaro-tenant-id: <tenant_id>
```

**Response (200 OK):**
```json
{
  "url": "https://billing.stripe.com/p/session/xxxxxxxxxxxxx"
}
```

---

### Stripe Webhook

Handle Stripe webhooks (internal endpoint).

```bash
POST /api/stripe/webhook
Stripe-Signature: <signature>
Content-Type: application/json

{
  "type": "customer.subscription.created",
  "data": { ... }
}
```

**Supported Events:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## Rate Limiting

All API endpoints are rate-limited to prevent abuse.

### Rate Limit Headers

Every response includes rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1698412800
```

### Rate Limit Presets

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Upload | 10 requests | 15 minutes |
| OCR | 30 requests | 5 minutes |
| API | 100 requests | 1 minute |
| Auth | 5 requests | 15 minutes |
| Read | 300 requests | 1 minute |

### Rate Limit Exceeded (429)

```json
{
  "error": "Rate limit exceeded",
  "retry_after": 900,
  "limit": 10,
  "window": 900000
}
```

**Response Headers:**
```
Retry-After: 900
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1698412800
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 410 | Gone | Resource expired or deleted |
| 413 | Payload Too Large | File too large |
| 415 | Unsupported Media Type | Invalid file type |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | External service unavailable |

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_EMAIL` | Email format is invalid |
| `INVALID_ROLE` | Role must be OWNER, ACCOUNTANT, or CLIENT |
| `INVITATION_EXISTS` | User already invited |
| `INVITATION_EXPIRED` | Invitation has expired |
| `INVALID_TOKEN` | Invalid or missing token |
| `FILE_TOO_LARGE` | File exceeds size limit |
| `UNSUPPORTED_FORMAT` | File format not supported |
| `VIRUS_DETECTED` | File contains malware |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `KSEF_UNAVAILABLE` | KSeF service is down |
| `STRIPE_ERROR` | Payment processing error |

### Example Error Responses

**400 Bad Request:**
```json
{
  "error": "Invalid email format",
  "code": "INVALID_EMAIL",
  "details": {
    "email": "not-an-email"
  }
}
```

**401 Unauthorized:**
```json
{
  "error": "Missing or invalid authentication token",
  "code": "UNAUTHORIZED"
}
```

**429 Rate Limit:**
```json
{
  "error": "Rate limit exceeded. Try again in 15 minutes",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 900
}
```

---

## Pagination

List endpoints support pagination:

### Request
```bash
GET /api/invoices?limit=20&offset=40
```

### Response
```json
{
  "invoices": [...],
  "total": 150,
  "limit": 20,
  "offset": 40,
  "has_more": true
}
```

### Pagination Logic
```javascript
// Calculate pages
const totalPages = Math.ceil(total / limit);
const currentPage = Math.floor(offset / limit) + 1;

// Next page
const nextOffset = offset + limit;

// Previous page
const prevOffset = Math.max(0, offset - limit);
```

---

## Filtering & Search

### Query Parameters

Most list endpoints support filtering:

```bash
# Filter by status
GET /api/invoices?status=APPROVED

# Date range
GET /api/invoices?from_date=2025-01-01&to_date=2025-12-31

# Search
GET /api/invoices?search=FV/2025

# Combine filters
GET /api/invoices?status=APPROVED&from_date=2025-01-01&limit=50
```

---

## Webhooks

Deklaro can send webhooks for important events.

### Configuration

Configure webhooks in dashboard or via API:

```bash
POST /api/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/deklaro",
  "events": ["invoice.approved", "invoice.submitted"],
  "secret": "your_webhook_secret"
}
```

### Webhook Events

| Event | Description |
|-------|-------------|
| `invoice.created` | New invoice uploaded |
| `invoice.processed` | OCR completed |
| `invoice.approved` | Invoice approved |
| `invoice.rejected` | Invoice rejected |
| `invoice.submitted` | Submitted to KSeF |
| `tenant.member_added` | New team member joined |
| `subscription.updated` | Subscription changed |

### Webhook Payload

```json
{
  "event": "invoice.approved",
  "timestamp": "2025-10-27T12:00:00.000Z",
  "data": {
    "invoice_id": "uuid",
    "invoice_number": "FV/2025/001",
    "total_amount": 1234.56
  }
}
```

### Webhook Security

Verify webhook signatures:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Authenticate
const { data: auth } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Create invitation
const response = await fetch('/api/tenants/invitations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${auth.session.access_token}`,
    'x-deklaro-tenant-id': 'tenant-uuid',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'newuser@example.com',
    role: 'ACCOUNTANT'
  })
});

const invitation = await response.json();
```

### Python

```python
import requests

# Authenticate
auth_response = requests.post(
    'https://yourdomain.com/api/auth/signin',
    json={'email': 'user@example.com', 'password': 'password123'}
)
token = auth_response.json()['session']['access_token']

# Create invitation
headers = {
    'Authorization': f'Bearer {token}',
    'x-deklaro-tenant-id': 'tenant-uuid'
}
data = {
    'email': 'newuser@example.com',
    'role': 'ACCOUNTANT'
}
response = requests.post(
    'https://yourdomain.com/api/tenants/invitations',
    headers=headers,
    json=data
)
invitation = response.json()
```

---

## Additional Resources

- [Deployment Guide](./DEPLOYMENT.md)
- [Admin Setup Guide](./ADMIN_SETUP.md)
- [User Guide](./USER_GUIDE.md)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)

---

**Last Updated**: 2025-10-27
**API Version**: 1.0.0
