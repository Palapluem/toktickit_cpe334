# Lab 3 API Specification

**Version:** 1.0 — approved for implementation, 11 September 2026
**Extends:** `docs/lab-02/api-spec.md`. Lab 2's ticket and attachment endpoints keep their paths and shapes; only the identity mechanism changes.
**Depends on:** `specification.md` §11.1 (session mechanism), confirmed 11 September.

---

## 1. Authentication mechanism

An opaque session token in an httpOnly cookie, backed by a `Session` row (`specification.md` §11.1).

```
Set-Cookie: toktickit_session=<32 random bytes, base64url>;
            HttpOnly; SameSite=Lax; Secure; Path=/; Max-Age=28800
```

| Property | Value | Rule |
|---|---|---|
| Token | 32 cryptographically random bytes, base64url | Not derived from the user id; not guessable |
| Storage | `Session` row: `id`, `userId`, `expiresAt`, `createdAt` | SEC-012 |
| Absolute lifetime | 8 hours | BR-08 |
| Logout | The row is **deleted** | BR-09 |
| Password change | Every *other* session for that user is deleted | BR-07 |
| Deactivation | Every session for that user is deleted | BR-39 |
| `httpOnly` | Yes — client JavaScript can never read it | SEC-013 |
| `SameSite` | `Lax` | SEC-015, §11.3 |
| `Secure` | Set wherever the transport is HTTPS | SEC-013 |

**Resolution order on every request.** The middleware reads the cookie, looks up the session, checks expiry, loads the user, and checks `isActive`. Any failure is 401. Handlers read the resolved user; the cookie value never reaches a handler (SEC-016, `lab-02 §11.21`).

**`X-Requester-Id` is gone.** Lab 2's header is removed entirely — not deprecated, not accepted as a fallback. A fallback would be a second identity path, and a second identity path is a second thing to secure (FR-14, AC-15).

## 2. Error envelope

Unchanged from Lab 2:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action.",
    "fieldErrors": [],
    "correlationId": "0f2c9e18-..."
  }
}
```

`message` is always safe to display. Stack traces, SQL fragments, file paths, and other users' data never appear (SEC-025).

### Status codes

| Status | Use |
|---|---|
| 200 | Successful retrieval or update |
| 201 | Resource created |
| 400 | Validation failure, malformed input, invalid query parameter |
| **401** | **No session, expired session, or the session's user is inactive** |
| **403** | **Authenticated, but this role may never perform this operation** |
| 404 | Resource does not exist, **or exists but belongs to another user** (BR-14) |
| 409 | Conflict — duplicate email, a state that forbids the change |
| 410 | Removed attachment content |
| 413 / 415 | Payload too large / unsupported media type |
| 500 | Unexpected, with a safe message and correlation identifier |

**401 versus 403, and 403 versus 404.** These three are decided by one question each, and getting them backwards is the subtle failure this sprint invites:

- *Is there a valid session?* No → **401**.
- *May this role ever do this?* No → **403**. The operation is refused on its face; nothing is revealed about any particular record.
- *May this role do this, but not to this record?* → **404**, never 403. A 403 here would confirm the record exists (BR-14).

### Error codes

`VALIDATION_FAILED` · `AUTHENTICATION_REQUIRED` · `INVALID_CREDENTIALS` · `PASSWORD_CHANGE_REQUIRED` · `FORBIDDEN` · `NOT_FOUND` · `EMAIL_ALREADY_EXISTS` · `INVALID_STATUS_TRANSITION` · `OWNER_NOT_ELIGIBLE` · `LAST_ADMINISTRATOR` · `CANNOT_DEACTIVATE_SELF` · `ATTACHMENT_LIMIT_REACHED` · `FILE_TOO_LARGE` · `UNSUPPORTED_FILE_TYPE` · `INTERNAL_ERROR`

---

## 3. Authentication endpoints

### `POST /api/auth/login`

Anonymous. Establishes a session.

**Request**
```json
{ "email": "jennifer.anderson@example.ac.th", "password": "..." }
```

**200** — sets the session cookie
```json
{
  "data": {
    "id": "aa11...",
    "displayName": "Jennifer Anderson",
    "email": "jennifer.anderson@example.ac.th",
    "role": "REQUESTER",
    "mustChangePassword": false
  }
}
```

**Failures**
- `401 INVALID_CREDENTIALS` — **identical body for an unknown email, a wrong password, and an inactive account** (BR-03). The three cases must be indistinguishable, including response timing where practical.
- `400 VALIDATION_FAILED` — missing or malformed email or password.

Never returns a hash, the session token in the body, or any indication of which check failed (AC-07).

### `POST /api/auth/logout`

Any authenticated user. Deletes the session row and clears the cookie.

**200** `{ "data": { "loggedOut": true } }`

Calling it without a session is also **200** — logging out of nothing is not an error, and reporting one would confirm whether a token was valid.

### `GET /api/auth/me`

Any authenticated user. The safe profile and access state.

**200**
```json
{
  "data": {
    "id": "aa11...",
    "displayName": "Jennifer Anderson",
    "email": "jennifer.anderson@example.ac.th",
    "role": "REQUESTER",
    "mustChangePassword": false
  }
}
```

**401** when no valid session exists. This endpoint is how the client learns its role — never from anything it stored (BR-13).

### `POST /api/auth/change-password`

Any authenticated user, **including one blocked by `mustChangePassword`** — this is the single endpoint that gate permits.

**Request**
```json
{ "currentPassword": "...", "newPassword": "..." }
```

**200** — clears `mustChangePassword`, deletes the user's other sessions (BR-07), keeps the current one.

**Failures**
- `400 VALIDATION_FAILED` — new password below the minimum length, or identical to the current one.
- `401 INVALID_CREDENTIALS` — current password wrong. The old password continues to work (AC-05).

---

## 4. The `mustChangePassword` gate

A user with `mustChangePassword = true` is refused **every endpoint except** `POST /api/auth/change-password`, `POST /api/auth/logout`, and `GET /api/auth/me`.

**403 `PASSWORD_CHANGE_REQUIRED`** — 403 rather than 401 because the session is valid; it is the account state that forbids the request. The client uses this code to route to the change-password screen; the server's refusal is the control (BR-02).

`GET /api/auth/me` stays open so the client can discover *why* it is being refused without a special case.

---

## 5. Lab 2 endpoints — unchanged paths, new identity

| Endpoint | Change |
|---|---|
| `GET /api/categories`, `/api/related-systems` | Now require authentication; otherwise unchanged |
| `GET /api/requesters` | **Removed.** It existed to populate the selector (FR-14) |
| `POST /api/tickets` | Requester is the authenticated user; `requesterId` in the body is rejected as an unknown property |
| `GET /api/tickets` | Scoped to the authenticated Requester by the query itself (SEC-019) |
| `GET /api/tickets/:id` | 404 for another user's Ticket (BR-14) |
| The four attachment endpoints | Ownership resolved from the session |

Response shapes are unchanged, so the client's rendering is untouched. Only the identity plumbing moves.

---

## 6. Requester additions

### `POST /api/tickets/:id/comments`

Requester (own Ticket), IT Staff, Administrator.

**Request** `{ "body": "..." }` — 1–2000 characters after trimming (BR-31)

**201**
```json
{
  "data": {
    "id": "c1a2...",
    "body": "I restarted the laptop and the problem persists.",
    "author": { "id": "aa11...", "displayName": "Jennifer Anderson", "role": "REQUESTER" },
    "createdAt": "2026-09-08T04:12:09.000Z"
  }
}
```

`author` and `createdAt` are set by the server; supplying either is a validation failure (BR-30, API-20).

**Failures:** `400 VALIDATION_FAILED` (empty, whitespace-only, over length) · `404 NOT_FOUND` (another Requester's Ticket) · `401`.

### `GET /api/tickets/:id/comments`

Same roles. Returns `{ "data": [ ... ] }` ordered oldest first.

### `POST /api/tickets/:id/requester-resolution`

Requester, own Ticket only.

Sets `requesterResolvedAt` to the server clock. **Does not change status** (BR-22, BR-23).

**200** `{ "data": { "requesterResolvedAt": "2026-09-08T04:30:00.000Z", "status": "IN_PROGRESS" } }`

The status is echoed deliberately, so a client that expected a transition can see there wasn't one.

**Failures:** `403 FORBIDDEN` for IT Staff or Administrator — this is the Requester's signal and nobody else's · `404` for another Requester's Ticket · `409` if the Ticket is `CANCELLED` or `CLOSED`.

---

## 7. Internal Notes

### `GET /api/tickets/:id/internal-notes` · `POST /api/tickets/:id/internal-notes`

**IT Staff and Administrator only.**

Same shape as comments. Author and timestamp are server-set.

**The refusal that matters.** A Requester — even the Ticket's owner — receives **403 `FORBIDDEN`** with an empty `fieldErrors`, and the body carries no count, no empty array, and no indication of whether notes exist (BR-28, AC-09).

Returning `{ "data": [] }` would be a leak: it distinguishes "you may not see these" from "there are none", and over several tickets that difference maps out where the notes are. The response is identical whether the Ticket has zero notes or fifty.

---

## 8. IT Staff endpoints

### `GET /api/staff/tickets`

IT Staff and Administrator. **The one list in the product that is not user-scoped** — which makes it the one place where a missing role check exposes everything (SEC-016).

**Query parameters**

| Parameter | Type | Default | Rules |
|---|---|---|---|
| `search` | string | — | trimmed, 1–150; case-insensitive partial match on `ticketNo` or `summary` |
| `status` | enum | — | one of the eight `TicketStatus` values |
| `itPriority` | enum | — | `LOW` \| `MEDIUM` \| `HIGH` \| `URGENT` |
| `categoryId` | UUID | — | must exist |
| `ownerId` | UUID \| `unassigned` \| `me` | — | `me` resolves to the authenticated user |
| `sort` | string | `itPriority:desc` | `<field>:<asc\|desc>`, whitelisted |
| `page` | integer | `1` | ≥1 |
| `pageSize` | integer | `20` | 1–50 |

**Sortable whitelist:** `createdAt`, `updatedAt`, `ticketNo`, `itPriority`, `status`, `lastActivityAt`.

Default ordering is **IT Priority descending, then oldest first** — a work queue answers "what is most urgent and has waited longest", which is a different question from My Tickets' "what did I do most recently" (`lab-02 BR-37`). A sort outside the whitelist is `400`, not a silent fallback.

**200**
```json
{
  "data": [
    {
      "id": "9f8e...", "ticketNo": "TKT-2026-000001",
      "summary": "Laptop battery drains quickly",
      "category": { "id": "8c22...", "name": "Hardware" },
      "requester": { "id": "aa11...", "displayName": "Jennifer Anderson" },
      "requestedPriority": "MEDIUM", "itPriority": "HIGH",
      "status": "IN_PROGRESS",
      "owner": { "id": "bb22...", "displayName": "Michael Brown" },
      "requesterResolvedAt": null,
      "createdAt": "2026-09-01T04:12:09.000Z",
      "updatedAt": "2026-09-08T02:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "totalItems": 42, "totalPages": 3, "hasPreviousPage": false, "hasNextPage": true },
  "appliedFilters": { "search": null, "status": null, "itPriority": null, "categoryId": null, "ownerId": null, "sort": "itPriority:desc" }
}
```

**Failures:** `403` for a Requester · `400` for any invalid parameter · `401`.

### `GET /api/staff/tickets/:id`

IT Staff and Administrator. The full Ticket including attachments, comments, notes, and the permitted next statuses for the calling role — so the client renders only legal transitions without re-implementing §5.1.

```json
"assignableOwners": [
  { "id": "bb22...", "displayName": "Daniel Carter" },
  { "id": "cc33...", "displayName": "Margaret Hale" }
],
"permittedTransitions": ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"]
```

`assignableOwners` contains only active IT Staff and Administrator users, ordered by
display name. It is the source for the Owner control; the client does not reconstruct
the eligible-role or active-account policy. The current owner is retained in the list
when necessary for display after an account is no longer eligible for a new assignment.

The server still validates the transition when it arrives. `permittedTransitions` is feedback, not the control (SEC-016).

### `PATCH /api/staff/tickets/:id/owner`

**Request** `{ "ownerId": "bb22..." }` or `{ "ownerId": null }` to unassign. `{ "ownerId": "me" }` is the claim.

**Failures:** `400 OWNER_NOT_ELIGIBLE` — the target is not an active IT Staff or Administrator user (BR-16, AC-21) · `403` for a Requester · `404`.

Claiming a `NEW` Ticket also moves it to `OPEN` in the same transaction (BR-24). The response returns both fields so the client does not have to infer it.

### `PATCH /api/staff/tickets/:id/it-priority`

**Request** `{ "itPriority": "HIGH" }`

Requested Priority is never touched (BR-18, AC-22). A body containing `requestedPriority` is a validation failure.

### `PATCH /api/staff/tickets/:id/status`

**Request** `{ "status": "RESOLVED" }`

Validated against §5.1 for the current status **and the calling role**.

**Failures:** `400 INVALID_STATUS_TRANSITION` — includes the current status and the permitted set, which is safe to disclose because it is policy rather than data · `403` for a role that may never make this transition — a Requester sending `RESOLVED` lands here (BR-22, AC-24).

Both are refusals; the distinction is *why*. An IT Staff member attempting `NEW → CLOSED` is asking for something no one may do, so 400. A Requester attempting `RESOLVED` is asking for something their role may never do, so 403.

---

## 9. Administrator endpoints

All require the Administrator role. Every one returns **403** for a Requester or IT Staff (AC-10, AC-11).

### `GET /api/admin/users`

| Parameter | Rules |
|---|---|
| `search` | trimmed, 1–150; case-insensitive partial match on name **or** email |
| `role` | `REQUESTER` \| `IT_STAFF` \| `ADMINISTRATOR` |

No pagination and no sort parameter — the labsheet excludes both (§8.5). Ordered by `displayName` ascending (`lab-02 §11.15`).

**200** — `{ "data": [ { "id", "displayName", "email", "role", "isActive", "mustChangePassword" } ] }`

**Never** includes `passwordHash` (AC-07, API-25).

### `POST /api/admin/users`

**Request**
```json
{ "displayName": "Somchai Prasert", "email": "somchai.p@example.ac.th",
  "role": "IT_STAFF", "isActive": true, "initialPassword": "..." }
```

**201** — the created user, without the hash. `mustChangePassword` is `true`, always (BR-06).

**Failures:** `409 EMAIL_ALREADY_EXISTS` — case-insensitive (BR-33, AC-29); the message names the field and nothing about the existing account (SEC-036) · `400 VALIDATION_FAILED` for an unknown role (BR-34) or a password below the minimum.

### `PATCH /api/admin/users/:id`

**Request** — any subset of `displayName`, `email`, `role`, `isActive`.

**Failures:**
- `409 EMAIL_ALREADY_EXISTS`
- `400 VALIDATION_FAILED` — unknown role
- `403 CANNOT_DEACTIVATE_SELF` — `isActive: false` on one's own account (BR-35, AC-31)
- `409 LAST_ADMINISTRATOR` — deactivating **or demoting** the only remaining active Administrator (BR-36, AC-32)

Both safety rules are evaluated **inside the update transaction**, counting active Administrators as part of it. Checking before the transaction admits a race where two Administrators deactivate each other simultaneously and the count is correct for each read individually.

Deactivating a user deletes their sessions (BR-39) and leaves every Ticket they own or submitted untouched (BR-38, API-33).

### `POST /api/admin/users/:id/initial-password`

**Request** `{ "initialPassword": "..." }`

Sets the hash, sets `mustChangePassword = true`, and deletes that user's sessions.

**200** `{ "data": { "id": "...", "mustChangePassword": true } }` — the password is never echoed. The Administrator already knows what they typed; a response that repeats it puts it in a log (SEC-032).

---

## 10. Traceability

| Capability | FR | AC | Tests |
|---|---|---|---|
| Login | FR-01, FR-02 | AC-01, AC-03 | API-01 … API-04 |
| Logout | FR-04 | AC-04 | API-05 |
| Current user | FR-03 | AC-07 | API-09 |
| Change password | FR-05, FR-06 | AC-02, AC-05, AC-06 | API-06 … API-08 |
| Requester continuation | FR-13, FR-14 | AC-14, AC-15 | MIG-04, MIG-05 |
| Public Comments | FR-15, FR-24 | AC-16 | API-19, API-20 |
| Resolution indication | FR-16 | AC-17 | API-24 |
| Internal Notes | FR-25 | AC-09, AC-25 | API-21, SEC-T05, SEC-T06 |
| Staff Queue | FR-17, FR-18 | AC-18, AC-19 | API-11 … API-13 |
| Ownership | FR-20, FR-21 | AC-20, AC-21 | API-14, API-15 |
| IT Priority | FR-22 | AC-22 | API-16 |
| Status transitions | FR-23 | AC-23, AC-24 | API-17, API-18, SEC-T10 |
| User list | FR-27, FR-28, FR-29 | AC-26, AC-27 | API-25, API-26 |
| Create user | FR-30, FR-35 | AC-28, AC-29 | API-27, API-28 |
| Update user | FR-31, FR-33, FR-34 | AC-30, AC-31, AC-32 | API-29 … API-31 |
| Initial password | FR-32 | AC-33 | API-32 |
| Authorization | FR-08 … FR-12 | AC-08 … AC-13 | SEC-T01 … SEC-T14 |
