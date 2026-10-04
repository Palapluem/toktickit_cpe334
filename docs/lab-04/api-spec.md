# Lab 4 API Specification

**Version:** 1.0 — approved for implementation, 3 October 2026
**Extends:** `docs/lab-03/api-spec.md`. Only new or changed endpoints are specified here; every other Lab 2 and Lab 3 endpoint is unchanged.

---

## 1. Conventions

Unchanged from Lab 3:

- authentication by the httpOnly session cookie (`lab-03` §1);
- the `mustChangePassword` gate;
- the JSON error envelope `{ "error": { "code", "message", "fieldErrors", "correlationId" } }`;
- timestamps as ISO 8601 UTC strings, localised to Asia/Bangkok by the client.

The three refusal questions keep their Lab 3 meaning (`lab-03` §2):

- no valid session → **401**;
- a role that may never perform the operation → **403**;
- a role that may, but not on this record → **404**.

A Ticket path parameter that names another Requester's Ticket is 404. So is an `:actionId` that does not belong to `:id`.

Request bodies are validated strictly. An unknown property, or a server-owned property (`performedBy`, `createdAt`, `completedBy`, `completedAt`, `cancelledBy`, `cancelledAt`, `status` on create, `version`), is **400 `VALIDATION_FAILED`** with a field error. It is never silently ignored (AC-11).

### Status codes added in Lab 4

| Status | Code | Meaning |
|---|---|---|
| 400 | `ASSIGNEE_NOT_ELIGIBLE` | The named assignee is not an active IT Staff or Administrator user (BR-07) |
| 400 | `INVALID_ACTION_TRANSITION` | The requested Action move is not in §5.1 of the specification. The response includes `currentStatus` and `permittedTransitions` |
| 409 | `OPEN_ACTIONS_BLOCK_RESOLUTION` | `RESOLVED` or `CLOSED` requested while Actions are open (BR-20). The response includes `openActionCount` |
| 409 | `TICKET_NOT_WORKABLE` | Action write on a Ticket in `RESOLVED`, `CLOSED` or `CANCELLED` (BR-23). The response includes `ticketStatus` |
| 409 | `ACTION_TERMINAL` | Edit, reassignment or transition of a `COMPLETED` or `CANCELLED` Action (BR-10) |
| 409 | `STALE_VERSION` | `expectedVersion` differs from the stored version (BR-31). The response includes `currentVersion` and the current resource |

409 keeps its Lab 3 meaning: the request is valid, but the current state forbids it. 400 means the request itself is wrong. These extra fields live in `error.details`, so that `message` stays safe to display.

---

## 2. Data shapes

### `ActionTaken` — IT Staff and Administrator view

```json
{
  "id": "5b1e…",
  "ticketId": "9f8e…",
  "status": "IN_PROGRESS",
  "description": "Collect the relay error from the mail gateway log.",
  "result": null,
  "followUpRequired": true,
  "followUpNote": "Confirm with the vendor whether the allow-list was truncated.",
  "attachmentNotes": "See relay-error.png on this Ticket.",
  "assignee": { "id": "cc33…", "displayName": "Olivia Reed", "isActive": true },
  "performedBy": { "id": "bb22…", "displayName": "Daniel Carter" },
  "actionAt": "2026-10-04T03:12:09.000Z",
  "completedBy": null,
  "completedAt": null,
  "cancelledBy": null,
  "cancelledAt": null,
  "cancellationReason": null,
  "version": 2,
  "updatedAt": "2026-10-04T05:40:00.000Z"
}
```

- `actionAt` is the Action Date/Time: the server time of creation (BR-05, §11.3).
- `performedBy` is the creator (BR-05).
- `assignee.isActive: false` is displayed for a historical assignee who was later deactivated (BR-08).

### `ActionTaken` — Requester view

The same fields, except that every person is `{ "displayName": "…" }` only: no identifier and no `isActive` (BR-17). The fields are read-only, and no action controls are implied.

### `TicketEvent`

```json
{
  "id": "e1a2…",
  "type": "STATUS_CHANGED",
  "actor": { "displayName": "Patricia Evans" },
  "createdAt": "2026-10-04T06:00:00.000Z",
  "details": { "from": "IN_PROGRESS", "to": "RESOLVED" }
}
```

`details` by type (BR-30 — no free text):

| Type | Details |
|---|---|
| `STATUS_CHANGED` | `from`, `to`, and `cascadedActionCount` when the change was to `CANCELLED` |
| `OWNER_CHANGED` | `fromOwner`, `toOwner` (display names; `null` for unassigned) |
| `IT_PRIORITY_CHANGED` | `from`, `to` |
| `ACTION_CREATED` | `actionId`, `assignee` (display name) |
| `ACTION_UPDATED` | `actionId`, `changedFields` (field names only) |
| `ACTION_ASSIGNED` | `actionId`, `fromAssignee`, `toAssignee` |
| `ACTION_STARTED` / `ACTION_COMPLETED` | `actionId` |
| `ACTION_CANCELLED` | `actionId`, `cascade` (`true` when caused by BR-22) |

---

## 3. Actions Taken

### `GET /api/tickets/:id/actions`

Requester (own Ticket), IT Staff, Administrator. Returns every Action of the Ticket, ordered by `actionAt` ascending, then `id` (BR-29). The list is not paginated: one Ticket's work log is bounded by the work actually done.

**200** `{ "data": [ActionTaken, …] }` — the Requester view for a Requester, the full view otherwise.

**Failures:** `401` · `404` for a missing Ticket or another Requester's Ticket (AC-12).

### `POST /api/tickets/:id/actions`

IT Staff and Administrator (BR-03).

**Request**

```json
{
  "requestId": "1f0c2a1e-…",
  "description": "Collect the relay error from the mail gateway log.",
  "assigneeId": "cc33…",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": null
}
```

| Field | Rule |
|---|---|
| `requestId` | Required UUID generated by the client per form submission (BR-34) |
| `description` | Required, trimmed 1–2000 (BR-13) |
| `assigneeId` | Required. An active IT Staff or Administrator user (BR-06, BR-07). The client defaults it to the current user |
| `followUpRequired` | Boolean, default `false` |
| `followUpNote` | Required, 1–2000, when `followUpRequired` is `true`. Must be absent or `null` when it is `false` (BR-14) |
| `attachmentNotes` | Optional, at most 500 (BR-15) |

**Processing.** One transaction does all of the following:

1. Locks the Ticket row (BR-33).
2. Checks that the Ticket is in a working status (BR-23).
3. Checks `(ticketId, requestId)`: when it exists, returns that Action with **200** instead of creating a second one (BR-34).
4. Inserts the Action with status `PLANNED`, `performedBy` the caller and `actionAt` now.
5. Updates the Ticket's `updatedAt` (BR-35).
6. Writes `ACTION_CREATED` (BR-26).

**201** `{ "data": ActionTaken }` — or **200** for a repeated `requestId`.

**Failures:**

- `400 VALIDATION_FAILED` (field errors, including server-owned properties);
- `400 ASSIGNEE_NOT_ELIGIBLE` (AC-04);
- `401`;
- `403` for a Requester (AC-12);
- `404`;
- `409 TICKET_NOT_WORKABLE` (AC-13).

### `PATCH /api/tickets/:id/actions/:actionId`

IT Staff and Administrator. Edits fields and/or reassigns a non-terminal Action.

**Request** — `expectedVersion` plus at least one editable field:

```json
{ "expectedVersion": 2, "assigneeId": "bb22…", "result": "Gateway log shows a truncated allow-list." }
```

Editable: `description`, `result` (at most 2000), `followUpRequired`, `followUpNote`, `attachmentNotes`, `assigneeId`. Status changes are not accepted here.

**Processing.** One transaction:

1. Checks the version (BR-31), the terminal state (BR-10) and the Ticket's working status (BR-23).
2. Applies the fields. When `followUpRequired` becomes `false`, the stored note is cleared (BR-14).
3. Increments `version` and updates the Ticket's `updatedAt`.
4. Writes `ACTION_ASSIGNED` when the assignee changed and `ACTION_UPDATED` when other fields changed.

**200** `{ "data": ActionTaken }`

**Failures:**

- `400 VALIDATION_FAILED`;
- `400 ASSIGNEE_NOT_ELIGIBLE`;
- `401`;
- `403`;
- `404`;
- `409 ACTION_TERMINAL` (AC-09);
- `409 TICKET_NOT_WORKABLE`;
- `409 STALE_VERSION` (AC-19).

### `PATCH /api/tickets/:id/actions/:actionId/status`

IT Staff and Administrator. Moves an Action through §5.1.

**Request**

```json
{ "expectedVersion": 3, "status": "COMPLETED", "result": "Allow-list restored; external mail delivered." }
```

| Target | Extra field |
|---|---|
| `IN_PROGRESS` | — |
| `COMPLETED` | `result` — optional when a non-blank Result is already stored. The effective Result must be non-blank (BR-11, AC-07) |
| `CANCELLED` | `cancellationReason` — required, trimmed 1–500 (BR-12) |

**Processing.** One transaction validates the version, the terminal state, the Ticket's working status and the move. It then sets `completedBy`/`completedAt` or `cancelledBy`/`cancelledAt` from the session and server clock, increments `version`, updates the Ticket's `updatedAt`, and writes `ACTION_STARTED`, `ACTION_COMPLETED` or `ACTION_CANCELLED`.

**200** `{ "data": ActionTaken }`

**Failures:**

- `400 INVALID_ACTION_TRANSITION` — for example `PLANNED → COMPLETED`;
- `400 VALIDATION_FAILED` — `result` or `cancellationReason`;
- `401`;
- `403`;
- `404`;
- `409 ACTION_TERMINAL`;
- `409 TICKET_NOT_WORKABLE`;
- `409 STALE_VERSION`.

---

## 4. Ticket workflow — changed endpoints

### `PATCH /api/staff/tickets/:id/status` (changed)

Roles and the matrix are unchanged (`lab-03` §5.1, specification §5.2). Requesters keep using this endpoint for their own `NEW → CANCELLED` and `RESOLVED → REOPENED`.

**Request** `{ "status": "RESOLVED", "expectedVersion": 7 }` — **`expectedVersion` is now required** (BR-31, §11.9). A request without it is `400 VALIDATION_FAILED`.

**Processing.** One transaction:

1. Locks the Ticket row (BR-33).
2. Checks the version.
3. Validates the transition for the caller's role.
4. For `RESOLVED` and `CLOSED`, counts Actions in `PLANNED` or `IN_PROGRESS` and refuses when the count is non-zero (BR-20).
5. For `CANCELLED`, cancels those Actions with reason "Ticket cancelled" and `cancelledBy` the caller (BR-22).
6. Updates status and `version`.
7. Writes `STATUS_CHANGED`, plus one `ACTION_CANCELLED` per cascaded Action.

**200**

```json
{
  "data": {
    "id": "9f8e…",
    "status": "RESOLVED",
    "version": 8,
    "updatedAt": "2026-10-04T06:00:00.000Z",
    "permittedTransitions": ["CLOSED", "REOPENED"],
    "cancelledActionCount": 0
  }
}
```

**Failures:**

- `400 INVALID_STATUS_TRANSITION` (Lab 3);
- `400 VALIDATION_FAILED`;
- `401`;
- `403` (a Requester asking for `RESOLVED`, as in Lab 3);
- `404`;
- `409 OPEN_ACTIONS_BLOCK_RESOLUTION` with `details.openActionCount` (AC-15);
- `409 STALE_VERSION` with `details.currentVersion` and `details.currentStatus` (AC-19).

### `PATCH /api/staff/tickets/:id/owner` · `PATCH /api/staff/tickets/:id/it-priority` (behaviour only)

Request and response shapes are unchanged (BR-32). Each success now increments the Ticket's `version` and writes `OWNER_CHANGED` or `IT_PRIORITY_CHANGED`. The response additionally carries `version`.

### `POST /api/tickets/:id/requester-resolution` (behaviour only)

Unchanged and still advisory (BR-25). It increments the Ticket's `version`, because the resolution indication is a Ticket field (BR-31).

### `GET /api/staff/tickets/:id` · `GET /api/tickets/:id` (additive)

Both detail responses add:

- `version`;
- `openActionCount`.

The staff response's `permittedTransitions` now omits `RESOLVED` and `CLOSED` while `openActionCount > 0` (AC-18), and adds `blockedTransitions: [{ "status": "RESOLVED", "reason": "OPEN_ACTIONS", "openActionCount": 2 }]`, so the interface can explain the omission. `assignableOwners` (Lab 3) is also the source for the Action assignee control.

### `GET /api/tickets/:id/history`

Requester (own Ticket), IT Staff, Administrator. Events are ordered by `createdAt` ascending, then `id` (BR-29). A Requester receives only `STATUS_CHANGED` events (BR-28, AC-23).

**200** `{ "data": [TicketEvent, …] }`. An empty array is valid for Tickets that have not changed since Lab 4 began.

**Failures:** `401` · `404` for a missing Ticket or another Requester's Ticket.

There is no endpoint to create, change or delete an event. The database refuses `UPDATE` and `DELETE` on the event table (BR-27).

---

## 5. Lists — `statusGroup`

`GET /api/staff/tickets` and `GET /api/tickets` accept one new optional parameter:

| Parameter | Type | Rule |
|---|---|---|
| `statusGroup` | enum | `active` only — `NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED` (BR-36). Combined with `status` → `400 VALIDATION_FAILED`. Any other value → `400` |

`appliedFilters` echoes `statusGroup`. The predicate is the same function the dashboards use (BR-37).

---

## 6. Dashboards

### `GET /api/staff/dashboard`

IT Staff and Administrator.

Every count is computed by the backend with a single aggregate query per group, never by loading Tickets (BR-40). Each metric returns its count together with the exact query that reproduces its set in the Queue, so the client never re-derives a predicate (BR-37).

**200**

```json
{
  "data": {
    "generatedAt": "2026-10-04T06:00:00.000Z",
    "metrics": {
      "unassigned":           { "count": 2, "query": { "ownerId": "unassigned", "statusGroup": "active" } },
      "assignedToMe":         { "count": 1, "query": { "ownerId": "me", "statusGroup": "active" } },
      "urgent":               { "count": 3, "query": { "itPriority": "URGENT", "statusGroup": "active" } },
      "waitingForRequester":  { "count": 1, "query": { "status": "WAITING_FOR_REQUESTER" } }
    },
    "byStatus": [
      { "status": "NEW", "count": 2, "query": { "status": "NEW" } }
    ],
    "myOpenActions": {
      "total": 2,
      "items": [
        {
          "actionId": "5b1e…", "status": "PLANNED", "description": "Check the relay allow-list…",
          "actionAt": "2026-10-04T03:12:09.000Z",
          "ticket": { "id": "9f8e…", "ticketNo": "TKT-2026-900003", "summary": "Cannot send mail…", "itPriority": "HIGH", "status": "OPEN" }
        }
      ]
    },
    "recentlyUpdated": [
      { "id": "9f8e…", "ticketNo": "TKT-2026-900004", "summary": "…", "status": "IN_PROGRESS", "itPriority": "URGENT",
        "owner": { "displayName": "Daniel Carter" }, "updatedAt": "2026-10-04T05:40:00.000Z" }
    ],
    "recentlyUpdatedQuery": { "sort": "updatedAt:desc" }
  }
}
```

- `byStatus` always lists all eight statuses, including zeros (BR-40).
- `myOpenActions.items` holds at most 10 items, ordered oldest `actionAt` first, then `id`.
- `recentlyUpdated` holds at most 5 items, ordered `updatedAt desc, id desc` (BR-38).
- `description` is truncated to 120 characters for the dashboard only.

**Failures:** `401` · `403` for a Requester (AC-30).

### `GET /api/requester/dashboard`

Requester only. Every value is restricted to `requesterId = me` (BR-39, AC-02).

**200**

```json
{
  "data": {
    "generatedAt": "2026-10-04T06:00:00.000Z",
    "totalTickets": 3,
    "metrics": {
      "open":           { "count": 2, "query": { "statusGroup": "active" } },
      "needsAttention": { "count": 1, "query": { "status": "WAITING_FOR_REQUESTER" } },
      "resolved":       { "count": 0, "query": { "status": "RESOLVED" } },
      "closed":         { "count": 0, "query": { "status": "CLOSED" } }
    },
    "recentlyUpdated": [
      { "id": "…", "ticketNo": "TKT-2026-900005", "summary": "…", "status": "WAITING_FOR_REQUESTER", "updatedAt": "…" }
    ],
    "recentlyUpdatedQuery": { "sort": "updatedAt:desc" }
  }
}
```

`totalTickets = 0` lets the interface show the first-use empty state instead of four zeros (AC-29).

**Failures:** `401` · `403` for IT Staff or an Administrator (AC-30).

---

## 7. Traceability

| Area | FR | BR | AC |
|---|---|---|---|
| Actions list / create | FR-01–FR-03, FR-07 | BR-01–BR-07, BR-13–BR-18, BR-23, BR-34 | AC-01, AC-03, AC-04, AC-11–AC-14 |
| Action edit / assign | FR-04, FR-05 | BR-07, BR-08, BR-10, BR-14, BR-31 | AC-05, AC-09, AC-10, AC-19 |
| Action status | FR-06 | BR-09–BR-12, BR-31 | AC-06–AC-09, AC-19 |
| Ticket status | FR-08–FR-11, FR-14 | BR-19–BR-25, BR-31, BR-33 | AC-15–AC-21, AC-25 |
| History | FR-12, FR-13 | BR-26–BR-30 | AC-22–AC-24 |
| Lists `statusGroup` | FR-20 | BR-36, BR-37 | AC-27, AC-33 |
| Dashboards | FR-15–FR-19 | BR-36–BR-40 | AC-02, AC-26–AC-31, AC-40 |
