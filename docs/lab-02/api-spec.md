# Lab 2 API Specification

**Version:** 1.0 — approved for implementation, 24 August 2026
**Base path:** `/api` (see `specification.md` §11.3)
**Content type:** `application/json`, except attachment upload (`multipart/form-data`) and download (binary stream)
**Identifiers:** UUID strings
**Timestamps:** ISO 8601 UTC strings, e.g. `2026-08-19T03:14:22.000Z`
**Property naming:** camelCase

---

## 1. Conventions

### Requester context header
Lab 2 has no session. Every requester-scoped request carries the selected Development Requester:

```
X-Requester-Id: <uuid>
```

The server resolves and validates this header on every requester-scoped route: it must be present, must be a well-formed UUID, must exist, and must belong to an **active** Requester. A missing or unusable value is a `400`, not a silent fallback to some default requester.

> This header is the Lab 2 stand-in for a session. In Lab 3 it is removed and the identity comes from the authenticated session; no client-supplied requester identifier is accepted thereafter (`specification.md` BR-42). Keeping it in one header rather than sprinkling `requesterId` through request bodies means Lab 3 deletes one middleware instead of editing every endpoint.

### Error envelope
Every error response uses the same shape:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "One or more fields are invalid.",
    "fieldErrors": [
      { "field": "summary", "message": "Summary must be at least 5 characters." }
    ],
    "correlationId": "0f2c9e18-..."
  }
}
```

`fieldErrors` is an empty array when the failure is not field-specific. `message` is always safe to display; internal details and stack traces are never returned.

### Status codes

| Status | Use |
|---|---|
| 200 | Successful retrieval, or successful soft removal |
| 201 | Resource created |
| 400 | Validation failure, malformed or missing requester context, invalid query parameters |
| 404 | Resource does not exist, **or** exists but belongs to a different Requester (`specification.md` BR-16) |
| 409 | Conflict, e.g. active-attachment limit reached |
| 410 | Attachment content requested after soft removal |
| 413 | Uploaded file exceeds the size limit |
| 415 | Uploaded file type not permitted |
| 500 | Unexpected server error; safe message plus `correlationId` |

### Error codes

`VALIDATION_FAILED`, `REQUESTER_CONTEXT_REQUIRED`, `REQUESTER_INACTIVE`, `TICKET_NOT_FOUND`, `ATTACHMENT_NOT_FOUND`, `ATTACHMENT_LIMIT_REACHED`, `ATTACHMENT_REMOVED`, `FILE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE`, `INTERNAL_ERROR`

---

## 2. Reference data

### `GET /api/categories`
Active Ticket Categories for the Create Ticket form. Not requester-scoped.

**200**
```json
{
  "data": [
    { "id": "3f1a...", "name": "Account and Access" },
    { "id": "8c22...", "name": "Hardware" },
    { "id": "b0d7...", "name": "Software" },
    { "id": "e5f9...", "name": "Network" }
  ]
}
```
Ordered by `name` ascending. Inactive categories are excluded.

### `GET /api/related-systems`
Active Related Systems. Not requester-scoped. Same shape and ordering as categories.

**200**
```json
{
  "data": [
    { "id": "1a2b...", "name": "Campus Wi-Fi" },
    { "id": "2b3c...", "name": "Corporate Laptop" },
    { "id": "3c4d...", "name": "Email" },
    { "id": "4d5e...", "name": "Grade Submission App" },
    { "id": "5e6f...", "name": "LEB2 App" },
    { "id": "6f70...", "name": "Printer" },
    { "id": "7081...", "name": "VPN" }
  ]
}
```

### `GET /api/requesters`
Active Development Requesters for the selection screen. Not requester-scoped — this is the endpoint that *establishes* the context.

**200**
```json
{
  "data": [
    { "id": "aa11...", "displayName": "Jennifer Anderson", "email": "jennifer.anderson@example.ac.th" },
    { "id": "bb22...", "displayName": "Michael Brown", "email": "michael.brown@example.ac.th" },
    { "id": "cc33...", "displayName": "Sarah Johnson", "email": "sarah.johnson@example.ac.th" },
    { "id": "dd44...", "displayName": "David Lee", "email": "david.lee@example.ac.th" }
  ]
}
```
Ordered by `displayName`. **Inactive Requesters are never returned** (`specification.md` BR-10). Returns `{ "data": [] }` when none are active — the client renders an empty state, not an error.

---

## 3. Tickets

### `POST /api/tickets`
Create one validated Ticket for the current Requester.

**Headers:** `X-Requester-Id` required. `Content-Type: multipart/form-data` when attachments are included, otherwise `application/json`.

**Request (JSON form)**
```json
{
  "categoryId": "8c22...",
  "relatedSystemId": "3c4d...",
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when the system is idle. This started after last week's Windows update.",
  "requestedPriority": "MEDIUM"
}
```

**Request (multipart form)** — same fields as form parts, plus repeated `attachments` file parts (max 5).

**Accepted fields:** `categoryId`, `relatedSystemId`, `summary`, `description`, `requestedPriority`, `attachments`.
**Rejected if supplied:** `ticketNo`, `ticketDate`, `requesterId`, `itPriority`, `status`, `ownerId` — all server-controlled (`specification.md` BR-18). Unknown properties are rejected rather than ignored, so a typo surfaces instead of silently doing nothing.

**Validation**

| Field | Rule |
|---|---|
| `categoryId` | required, UUID, must reference an active Category |
| `relatedSystemId` | required, UUID, must reference an active Related System |
| `summary` | required, trimmed, 5–150 characters |
| `description` | required, trimmed, 10–5000 characters |
| `requestedPriority` | required, one of `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `attachments` | optional, at most 5 files, each ≤5 MB, MIME and extension in {jpg, jpeg, png, webp, pdf}. Checked **before** the Ticket is created — a violation rejects the whole request (`specification.md` BR-34) |

**201**
```json
{
  "data": {
    "id": "9f8e...",
    "ticketNo": "TKT-2026-000001",
    "createdAt": "2026-08-25T04:12:09.000Z",
    "updatedAt": "2026-08-25T04:12:09.000Z",
    "summary": "Laptop battery drains quickly",
    "description": "My laptop battery is draining...",
    "requestedPriority": "MEDIUM",
    "itPriority": "MEDIUM",
    "status": "NEW",
    "requester": { "id": "aa11...", "displayName": "Jennifer Anderson" },
    "category": { "id": "8c22...", "name": "Hardware" },
    "relatedSystem": { "id": "3c4d...", "name": "Email" },
    "owner": null,
    "attachments": [
      {
        "id": "c7d1...",
        "originalFilename": "battery-report.pdf",
        "mimeType": "application/pdf",
        "sizeBytes": 184320,
        "createdAt": "2026-08-25T04:12:09.000Z",
        "removedAt": null
      }
    ],
    "attachmentFailures": []
  }
}
```

`attachmentFailures` reports per-file problems when the Ticket **was** created but a file could not be **stored**. It never carries a rule violation: an oversized or disallowed file is rejected before the Ticket exists (see the two failure classes below). It is an empty array on a fully clean create:

```json
"attachmentFailures": [
  { "originalFilename": "screenshot.png", "reason": "STORAGE_WRITE_FAILED" }
]
```

**Failures:** `400 VALIDATION_FAILED` (any field rule, or an unknown/server-controlled property supplied) · `400 REQUESTER_CONTEXT_REQUIRED` · `400 REQUESTER_INACTIVE` · `413 FILE_TOO_LARGE` · `415 UNSUPPORTED_FILE_TYPE` · `500 INTERNAL_ERROR`

#### The two attachment failure classes

An attachment can fail this endpoint in two ways, and they do **not** behave alike (`specification.md` BR-34, §11.14). Implementing one and assuming the other follows is the mistake this section exists to prevent.

| | Rule violation | Storage failure |
|---|---|---|
| Example | 6 MB file; `.exe`; MIME/extension mismatch | disk full, permission denied, adapter error |
| Detected | before any write | after the Ticket row exists |
| Ticket | **not created** | **kept** |
| Response | `413 FILE_TOO_LARGE` / `415 UNSUPPORTED_FILE_TYPE` | `201` with `attachmentFailures` populated |
| Requester can fix by resubmitting? | no — same file fails again | possibly — retry may succeed |

All files are validated **before** the transaction opens. If any one violates BR-26 or BR-27, the request is rejected whole: no Ticket, no partial upload, no stored file. The error names the offending file so the requester knows which to replace.

```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "One or more files exceed the 5 MB limit.",
    "fieldErrors": [
      { "field": "attachments[1]", "message": "screenshot.png is 6.2 MB; the limit is 5 MB." }
    ],
    "correlationId": "0f2c9e18-..."
  }
}
```

Once validation has passed and the transaction has committed, a file that then fails to store does **not** undo the Ticket. It is reported in `attachmentFailures` and the requester re-adds it from Ticket Detail.

The Ticket Number is allocated inside the same transaction as the insert, so two concurrent creates cannot collide (`specification.md` BR-05). The year in that number is the `Asia/Bangkok` calendar year, not the UTC one (`specification.md` BR-04, §11.13); `createdAt` in the response remains UTC.

---

### `GET /api/tickets`
The current Requester's Tickets, paginated. **Never returns another Requester's Ticket.**

**Headers:** `X-Requester-Id` required.

**Query parameters**

| Parameter | Type | Default | Rules |
|---|---|---|---|
| `search` | string | — | trimmed; 1–150 chars; case-insensitive partial match on `ticketNo` **or** `summary` |
| `categoryId` | UUID | — | must be an existing Category |
| `relatedSystemId` | UUID | — | must be an existing Related System |
| `requestedPriority` | enum | — | `LOW` \| `MEDIUM` \| `HIGH` \| `URGENT` |
| `status` | enum | — | one of the `TicketStatus` values |
| `sort` | string | `createdAt:desc` | `<field>:<asc\|desc>`; field must be whitelisted |
| `page` | integer | `1` | ≥1 |
| `pageSize` | integer | `10` | 1–50 |

**Sortable field whitelist:** `createdAt`, `updatedAt`, `ticketNo`, `summary`, `requestedPriority`, `status`.
A `sort` outside the whitelist is `400`, not a silent fallback (`specification.md` BR-38). Every sort is followed by a secondary `ticketNo:desc` so ordering is deterministic when the primary key ties (BR-37).

Multiple filters combine with AND. An unrecognised query parameter is rejected.

**200**
```json
{
  "data": [
    {
      "id": "9f8e...",
      "ticketNo": "TKT-2026-000001",
      "summary": "Laptop battery drains quickly",
      "category": { "id": "8c22...", "name": "Hardware" },
      "relatedSystem": { "id": "2b3c...", "name": "Corporate Laptop" },
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "status": "NEW",
      "owner": null,
      "createdAt": "2026-08-25T04:12:09.000Z",
      "updatedAt": "2026-08-25T04:12:09.000Z",
      "activeAttachmentCount": 1
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 42,
    "totalPages": 5,
    "hasPreviousPage": false,
    "hasNextPage": true
  },
  "appliedFilters": {
    "search": null,
    "categoryId": null,
    "relatedSystemId": null,
    "requestedPriority": null,
    "status": null,
    "sort": "createdAt:desc"
  }
}
```

`appliedFilters` echoes what the server actually applied, so the client can render Clear Filters state from the response rather than guessing from its own state.

A page past the last page returns `data: []` with correct metadata — not an error (`specification.md` BR-40).

**Failures:** `400 VALIDATION_FAILED` (bad `page`, `pageSize`, `sort`, enum, UUID, or unknown parameter) · `400 REQUESTER_CONTEXT_REQUIRED` · `500 INTERNAL_ERROR`

---

### `GET /api/tickets/:id`
One Ticket owned by the current Requester, with attachment metadata.

**Headers:** `X-Requester-Id` required.

**200** — same object shape as the `POST` response `data`, with `attachments` including removed entries:

```json
{
  "data": {
    "id": "9f8e...",
    "ticketNo": "TKT-2026-000001",
    "summary": "Laptop battery drains quickly",
    "description": "My laptop battery is draining...",
    "requestedPriority": "MEDIUM",
    "itPriority": "MEDIUM",
    "status": "NEW",
    "requester": { "id": "aa11...", "displayName": "Jennifer Anderson" },
    "category": { "id": "8c22...", "name": "Hardware" },
    "relatedSystem": { "id": "2b3c...", "name": "Corporate Laptop" },
    "owner": null,
    "createdAt": "2026-08-25T04:12:09.000Z",
    "updatedAt": "2026-08-25T04:12:09.000Z",
    "attachments": [
      {
        "id": "c7d1...",
        "originalFilename": "battery-report.pdf",
        "mimeType": "application/pdf",
        "sizeBytes": 184320,
        "createdAt": "2026-08-25T04:12:09.000Z",
        "removedAt": null,
        "removedReason": null
      },
      {
        "id": "d8e2...",
        "originalFilename": "old-screenshot.png",
        "mimeType": "image/png",
        "sizeBytes": 51200,
        "createdAt": "2026-08-25T04:20:11.000Z",
        "removedAt": "2026-08-25T05:02:44.000Z",
        "removedReason": "Uploaded the wrong screenshot"
      }
    ]
  }
}
```

**Failures:** `404 TICKET_NOT_FOUND` — returned both when the identifier does not exist **and** when it belongs to a different Requester, so the response never reveals that someone else's Ticket exists (`specification.md` BR-16, §11.7) · `400 REQUESTER_CONTEXT_REQUIRED` · `500 INTERNAL_ERROR`

---

## 4. Attachments

### `GET /api/tickets/:id/attachments`
Attachment metadata for an owned Ticket, including removed entries.

**200**
```json
{
  "data": [
    {
      "id": "c7d1...",
      "originalFilename": "battery-report.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 184320,
      "uploadedBy": { "id": "aa11...", "displayName": "Jennifer Anderson" },
      "createdAt": "2026-08-25T04:12:09.000Z",
      "removedAt": null,
      "removedReason": null,
      "isDownloadable": true
    }
  ],
  "activeCount": 1,
  "activeLimit": 5
}
```

`activeCount` and `activeLimit` let the client disable the add control without hardcoding the rule.

**Failures:** `404 TICKET_NOT_FOUND` (missing or not owned) · `400 REQUESTER_CONTEXT_REQUIRED`

---

### `POST /api/tickets/:id/attachments`
Add one permitted attachment to an existing owned Ticket.

**Headers:** `X-Requester-Id` required. `Content-Type: multipart/form-data`.
**Body:** single file part named `attachment`.

**Validation:** MIME type and extension in {jpg, jpeg, png, webp, pdf}; size ≤5 MB; the Ticket must currently hold fewer than 5 **active** attachments (removed ones do not count, `specification.md` BR-28).

**201**
```json
{
  "data": {
    "id": "e9f3...",
    "originalFilename": "battery-graph.png",
    "mimeType": "image/png",
    "sizeBytes": 92160,
    "createdAt": "2026-08-25T06:31:02.000Z",
    "removedAt": null,
    "isDownloadable": true
  },
  "activeCount": 2,
  "activeLimit": 5
}
```

**Failures:** `404 TICKET_NOT_FOUND` · `409 ATTACHMENT_LIMIT_REACHED` · `413 FILE_TOO_LARGE` · `415 UNSUPPORTED_FILE_TYPE` · `400 VALIDATION_FAILED` (no file part) · `500 INTERNAL_ERROR`

The metadata row and the stored file are written together; if the row cannot be written, the stored file is deleted (`specification.md` §11.9).

---

### `GET /api/attachments/:id/download`
Stream one active attachment belonging to a Ticket owned by the current Requester.

**Headers:** `X-Requester-Id` required.

**200** — binary stream with:
```
Content-Type: <stored mimeType>
Content-Disposition: attachment; filename="<original filename, sanitised>"
Content-Length: <sizeBytes>
X-Content-Type-Options: nosniff
```

Always served as a download, never inline, so a stored file cannot be rendered as HTML in the browser context.

**Failures:** `404 ATTACHMENT_NOT_FOUND` (missing, or its Ticket is not owned by the current Requester) · `410 ATTACHMENT_REMOVED` (metadata exists but the attachment was soft-removed — the distinct status makes the "removed files must not be downloadable" rule observable in a test) · `400 REQUESTER_CONTEXT_REQUIRED`

---

### `DELETE /api/attachments/:id`
Soft-remove an attachment. The metadata row is retained.

**Headers:** `X-Requester-Id` required.

**Request**
```json
{ "reason": "Uploaded the wrong screenshot" }
```

**Validation:** `reason` required, trimmed, 3–200 characters (`specification.md` BR-32).

**200**
```json
{
  "data": {
    "id": "d8e2...",
    "originalFilename": "old-screenshot.png",
    "removedAt": "2026-08-25T05:02:44.000Z",
    "removedReason": "Uploaded the wrong screenshot",
    "removedBy": { "id": "aa11...", "displayName": "Jennifer Anderson" },
    "isDownloadable": false
  },
  "activeCount": 1,
  "activeLimit": 5
}
```

Sets `removedAt`, `removedReason`, `removedById` and leaves the row in place. Removing an already-removed attachment is idempotent and returns the existing removal record rather than an error.

**Failures:** `404 ATTACHMENT_NOT_FOUND` (missing or not owned) · `400 VALIDATION_FAILED` (missing or too-short reason) · `400 REQUESTER_CONTEXT_REQUIRED`

---

## 5. Traceability

| Endpoint | Functional requirements | Acceptance criteria |
|---|---|---|
| `GET /api/requesters` | FR-01 | AC-02, AC-04, AC-05 |
| `GET /api/categories` | FR-08 | AC-11 |
| `GET /api/related-systems` | FR-09 | AC-11 |
| `POST /api/tickets` | FR-10 – FR-15 | AC-06 – AC-17 |
| `GET /api/tickets` | FR-16 – FR-22 | AC-18 – AC-26 |
| `GET /api/tickets/:id` | FR-23, FR-24 | AC-27, AC-28 |
| `GET /api/tickets/:id/attachments` | FR-25 | AC-32 |
| `POST /api/tickets/:id/attachments` | FR-26 | AC-29, AC-30 |
| `GET /api/attachments/:id/download` | FR-27, FR-29 | AC-31, AC-33, AC-34 |
| `DELETE /api/attachments/:id` | FR-28 | AC-32 |

## 6. Open questions for review

1. **`X-Requester-Id` header versus a query/body field.** The header keeps the requester identifier out of every payload and out of URLs, and makes Lab 3 a one-middleware deletion. Confirm this over passing `requesterId` in bodies.
2. **404 versus 403 for cross-requester access.** Recorded in `specification.md` §11.7 as deliberate. Confirm the reviewer agrees this is hardening rather than an unclear error.
3. **410 for removed-attachment download.** A distinct status makes the rule directly testable; 404 would also be defensible. Confirm.
4. **Rejecting unknown query parameters and body properties.** Strict rejection surfaces typos but is less forgiving than ignoring them. Confirm strictness is wanted.
5. **`appliedFilters` in the list response.** Extra payload, but lets Clear Filters and filter chips render from server truth. Confirm it is worth keeping.
