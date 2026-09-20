# Lab 3 Test Plan and Results

**Version:** 1.0 — approved for implementation, 11 September 2026
**Status:** planned-test table derived from `specification.md` §9. Written **before** implementation; not to be reconstructed afterwards from whatever tests the coding agent happened to generate.

---

## 1. Test Strategy

Lab 2's strategy carries forward, mapped onto the course taxonomy from Lecture 3 and the per-feature/per-sprint distinction from Lecture 4. Lab 3 adds two levels that Lab 2 had no need for.

| Level | Proves | Tool | Scope |
|---|---|---|---|
| Unit | One function in isolation | Vitest | Per Issue |
| API integration | Handler + validation + Prisma + PostgreSQL, over HTTP | Vitest + Supertest | Per Issue |
| **Security / authorization** | **The boundary holds against a caller who should be refused** | **Vitest + Supertest, calling directly** | **Per Issue** |
| **Migration / regression** | **The Lab 2 increment still works, and its data survived** | **Vitest + Supertest** | **Per sprint** |
| UI component | A component's rendering and behaviour, network mocked | Vitest + Testing Library | Per Issue |
| UI style | Rendered output uses the theme tokens the style contract requires | Vitest + Testing Library | Per Issue |
| Responsive | Screens render correctly at three viewports | Playwright | Per sprint |
| E2E | A whole user journey through the running application | Playwright | Per sprint |
| Regression | The full suite, re-run after every change | all | Continuous |

### The two new levels, and why they are levels rather than tests

**Security / authorization.** Lecture 5 (p38) puts it plainly: *if security matters, write a test where the attacker or unauthorized user tries the action directly.* These tests never touch the interface. They construct a request as the wrong role or the wrong owner and assert the refusal — which is the only way to distinguish a hidden button from an enforced rule. Part 7 asks for this evidence by name.

**Migration / regression.** Lab 3 changes the identity mechanism underneath a released increment. The question "does Lab 2 still work" cannot be answered by the new tests, and answering it is worth its own level: the Lab 2 suite must pass having changed only *how it authenticates*, never *what it asserts*.

### Test design techniques

Carried from `testing-contract.md` §2 and applied to this sprint's material:

- **TDT-01 Equivalence partitioning** — role classes (Requester / IT Staff / Administrator / unauthenticated); account states (active / inactive / must-change-password).
- **TDT-02 Boundary-value analysis** — password length at, below, and above the minimum; comment length at 0, 1, 2000, 2001; page size bounds.
- **TDT-03 Decision tables** — the authorization matrix (§8.1) and the status transition matrix (§5.1) are decision tables already; each cell is a test.
- **TDT-04 State transition** — the ticket status machine; the account lifecycle (created → initial password → changed → active → inactive).
- **TDT-05 Error guessing** — the failures this design invites: a client-supplied `requesterId`, a logged-out session reused, a role changed in the browser, an injection-shaped comment, the last Administrator deactivating themselves.

### TDD approach

Red → Green → Refactor, per `testing-contract.md` §5. One exception, recorded because it matters:

**Authorization tests are boundary tests, not red-green cycles.** They pass the moment the middleware exists, so they cannot fail first in a meaningful way. They are still written in the red phase, and the way to confirm one is real is to remove the check locally, watch the test fail, and put it back. A boundary test earns its place by failing when the boundary is removed — not by failing before it is built.

---

## 2. Planned Tests

> **The `File` column was reconciled with labsheet §12 at release.** The six
> required server suites and the user-administration E2E suite now use the
> required names.
> Queue and Ticket Detail checks are consolidated in
> `e2e/lab-03/staff-ticket-flow.spec.ts`;
> responsive checks remain inside the feature specs that create their evidence.

### Unit

| ID | Requirement / AC | What it tests | Expected result | File | Final |
|---|---|---|---|---|---|
| UNIT-01 | BR-04 | Password hashing | Hash differs from plaintext; two hashes of one password differ (salt); verify succeeds | `server/tests/lab-03/password.unit.test.ts` | Pass |
| UNIT-02 | BR-05 | Password policy | Rejects below the minimum length; accepts at and above (TDT-02) | `server/tests/lab-03/password.unit.test.ts` | Pass |
| UNIT-03 | BR-21, §5.1 | Transition matrix | Every permitted transition allowed, every other refused, per role (TDT-03) | `server/tests/lab-03/transitions.unit.test.ts` | Pass |
| UNIT-04 | BR-12, §8.1 | Authorization matrix | Every cell resolves as the matrix states; an unlisted operation denies (TDT-03) | `server/tests/lab-03/authorization.unit.test.ts` | Pass |
| UNIT-05 | BR-31 | Comment/note validation | Rejects empty and whitespace-only; boundaries at 1 and 2000 (TDT-02) | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| UNIT-06 | BR-08 | Session expiry | An expired session is not valid; a live one is | `server/tests/lab-03/session.unit.test.ts` | Pass |

### API — authentication

| ID | AC | What it tests | Expected result | File | Final |
|---|---|---|---|---|---|
| API-01 | AC-01 | Valid login | Authenticated response; safe user data; no hash or token in body | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-02 | AC-03 | Unknown email | Same status and body as a wrong password | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-03 | AC-03 | Wrong password | Same status and body as an unknown email | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-04 | AC-03, BR-01 | Inactive account, correct password | Refused, indistinguishable from the two above | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-05 | AC-04, BR-09 | Logout invalidates | Protected call after logout returns 401 | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-06 | AC-02, BR-02 | Must-change gate | Every non-password-change endpoint refused until the password is changed | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-07 | AC-05 | Wrong current password | Change refused; the old password still authenticates | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-08 | AC-06 | Short new password | Refused with a field-level message; old password still works | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-09 | AC-07 | No secret leakage | No response from any auth endpoint contains a hash, session id, or secret | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-10 | BR-07 | Change invalidates others | A second session for the same user is refused after a password change | `server/tests/lab-03/auth.api.test.ts` | Pass |

### Security / authorization — called directly, never through the UI

| ID | AC | What it tests | Expected result | File | Final |
|---|---|---|---|---|---|
| SEC-T01 | AC-12 | Unauthenticated access | Every protected endpoint returns 401 | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-T02 | AC-08, BR-10 | Client-supplied `requesterId` | Ignored; the authenticated identity is used | `server/tests/lab-03/ownership.api.test.ts` | Pass |
| SEC-T03 | AC-13, BR-14 | Another Requester's Ticket | 404, and the body does not confirm it exists | `server/tests/lab-03/ownership.api.test.ts` | Pass |
| SEC-T04 | AC-13 | Another Requester's Attachment | 404, no metadata leaked | `server/tests/lab-02/attachments.api.test.ts` (API-28, on authenticated identity) | Pass |
| SEC-T05 | AC-09, BR-28 | Requester reads Internal Notes | Refused with no note content and no existence signal | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| SEC-T06 | AC-09 | Requester creates an Internal Note | Refused | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| SEC-T07 | AC-10 | Requester calls an Administrator endpoint | 403 on every admin route | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-T08 | AC-11 | IT Staff calls an Administrator endpoint | 403 on every admin route | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-T09 | AC-10 | Requester calls the Staff Queue | 403 | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-T10 | AC-24, BR-22 | Requester sends `RESOLVED` / `CLOSED` | Refused; status unchanged | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-T11 | BR-13 | Role sent by the client | Ignored; the session's role decides | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-T12 | BR-39 | Deactivated user's session | Refused on the next request | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| SEC-T13 | SEC-025 | Error bodies | No stack trace, SQL fragment, file path, or other user's data in any failure | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-T14 | SEC-027, TDT-05 | Injection-shaped input | Handled safely; no SQL error surfaces | `server/tests/lab-03/authorization.api.test.ts` | Pass |

The concrete-route portion of `authorization.api.test.ts` makes the release
gate auditable at the Express boundary: it enumerates all 25 protected routes
from `server/src/app.ts` and asserts 401 before routing for an unauthenticated
caller. It also exercises 20 concrete role-exclusive denied cells and asserts
403 with no `data` envelope for the denied role. The older `/ops/...` matrix
tests remain as policy-level coverage; this sweep proves that the live route
registration applies the policy.

### API — IT Staff

| ID | AC | What it tests | Expected result | File | Final |
|---|---|---|---|---|---|
| API-11 | AC-18 | Queue spans requesters | Tickets from all Requesters returned to IT Staff | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-12 | AC-19 | Queue query composition | Search, filter, sort, and pagination combine correctly (TDT-03) | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-13 | AC-19 | Invalid queue parameters | Validation failure, not a silent fallback | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-14 | AC-20, BR-24 | Claim unassigned | Owner set to the claimer; status moves `NEW` → `OPEN` | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-15 | AC-21, BR-16 | Assign to inactive user | Refused | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-16 | AC-22, BR-18 | IT Priority change | IT Priority updated; Requested Priority untouched | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-17 | AC-23, BR-21 | Illegal transition | Refused for every disallowed cell of §5.1; status unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-18 | §5.1 | Legal transitions | Every permitted cell succeeds (TDT-04) | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |

### API — comments, notes, resolution signal

| ID | AC | What it tests | Expected result | File | Final |
|---|---|---|---|---|---|
| API-19 | AC-16, BR-26 | Requester posts a Public Comment | Stored with author and server-set time; visible to IT Staff | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-20 | BR-30 | Client-supplied author or timestamp | Ignored; the server's values are used | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-21 | AC-25, BR-27 | Internal Note visibility | Visible to IT Staff and Administrator only | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-22 | BR-31 | Empty and whitespace content | Rejected for both comments and notes | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-23 | BR-29 | Append-only | No edit or delete endpoint exists for either | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-24 | AC-17, BR-23 | Resolution indication | Recorded as a timestamp; status unchanged | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |

### API — Administrator

| ID | AC | What it tests | Expected result | File | Final |
|---|---|---|---|---|---|
| API-25 | AC-26 | User list | Name, email, role, and status returned; no hash | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-26 | AC-27 | Search and role filter | Only matching users returned | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-27 | AC-28 | Create user | User can log in and must change the password | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-28 | AC-29, BR-33 | Duplicate email | 409; case-insensitive comparison | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-29 | AC-30, BR-34 | Unknown role | Refused on create and on update | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-30 | AC-31, BR-35 | Self-deactivation | Refused | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-31 | AC-32, BR-36 | Last active Administrator | Deactivation **and** demotion both refused | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-32 | AC-33, BR-06 | New initial password | Next login requires a change | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-33 | BR-38 | Deactivation preserves records | Tickets owned and submitted by the user are unchanged | `server/tests/lab-03/users-admin.api.test.ts` | Pass |

### Migration / regression

| ID | AC | What it tests | Expected result | File | Final |
|---|---|---|---|---|---|
| MIG-01 | BR-40 | Identifiers preserved | Every Lab 2 requester identifier still resolves to a `User` | `server/tests/lab-03/seed-database.api.test.ts` | Pass |
| MIG-02 | BR-42 | Data survives | Ticket and Attachment counts identical before and after | `server/tests/lab-03/seed-database.api.test.ts` | Pass |
| MIG-03 | BR-41 | Migrated credentials | Every migrated user must change the password at first login | `server/tests/lab-03/seed-database.api.test.ts` | Pass |
| MIG-04 | AC-14 | Lab 2 suite green | Every Lab 2 test passes on authenticated identity | the Lab 2 suite, migrated | Pass |
| MIG-05 | AC-15 | Selector gone | `X-Requester-Id`, the stored selection, and `GET /api/requesters` appear nowhere in `client/src` or `server/src` | `server/tests/lab-03/selector-removed.unit.test.ts` | Pass |

### UI component

| ID | AC | What it tests | Expected result | File | Final |
|---|---|---|---|---|---|
| UI-01 | AC-01 | Login success | Credentials submitted; user routed into the application | `client/tests/lab-03/Login.test.tsx` | Pass |
| UI-02 | AC-03 | Login failure | One safe message; no transport detail or account information | `client/tests/lab-03/Login.test.tsx` | Pass |
| UI-03 | AC-01 | Login busy state | Submit disabled while in flight; one request sent | `client/tests/lab-03/Login.test.tsx` | Pass |
| UI-04 | AC-02 | Change-password gate | A must-change user reaching any other route is redirected | `client/tests/lab-03/RouteGuard.test.tsx` | Pass |
| UI-05 | AC-06 | Change-password validation | Field-level messages for short and mismatched entries | `client/tests/lab-03/ChangePassword.test.tsx` | Pass |
| UI-06 | AC-35 | Shell identity | Authenticated name and role badge shown; Logout present | `client/tests/lab-03/AppShell.test.tsx` | Pass |
| UI-07 | AC-35, FR-11 | Role navigation | Each role sees only its permitted destinations | `client/tests/lab-03/AppShell.test.tsx` | Pass |
| UI-08 | AC-18 | Queue renders | Ownership and status visible; open-detail action present | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| UI-09 | AC-19 | Queue controls | Search, filter, and sort issue the expected query | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| UI-10 | FR-36 | Queue states | Loading, empty, no-results, forbidden, and failure all render | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| UI-11 | AC-20 | Claim action | Claim issues the request and reflects the new owner | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-12 | AC-23 | Status control | Only permitted transitions are offered for the current status and role | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| UI-13 | AC-37 | Comments versus notes | Both render, visually distinct, correctly labelled | `client/tests/lab-03/ThreadSection.test.tsx` | Pass |
| UI-14 | AC-25 | Requester sees no notes | The Requester detail screen renders no Internal Note affordance | `client/tests/lab-03/ThreadSection.test.tsx` | Pass |
| UI-15 | AC-26 | User list | Name, email, role, status, and Edit render | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| UI-16 | AC-29 | Duplicate email feedback | Conflict shown as a field-level message | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| UI-17 | AC-31, AC-32 | Safety refusals | Self-deactivation and last-Administrator refusals are shown clearly | `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| UI-18 | AC-36 | Forbidden state | Distinguishable from not-found and from a failure | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |

### UI style

| ID | Requirement | What it tests | Expected result | File | Final |
|---|---|---|---|---|---|
| STYLE-01 | STY-001, STY-003 | Tokens on new screens | No colour literal, no Bootstrap colour utility | `client/tests/lab-03/Login.test.tsx`, `client/tests/lab-03/StaffTicketQueue.test.tsx`, `client/tests/lab-03/StaffTicketDetail.test.tsx`, `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| STYLE-02 | STY-019, ui-spec | Role badges | Role rendered as text, not colour alone | `client/tests/lab-03/AppShell.test.tsx` | Pass |
| STYLE-03 | STY-019 | New status badges | All eight statuses render their text label | `client/tests/lab-03/StaffTicketQueue.test.tsx`, `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| STYLE-04 | STY-026 | Login and admin labelling | Every input has a programmatic label | `client/tests/lab-03/Login.test.tsx`, `client/tests/lab-03/ChangePassword.test.tsx`, `client/tests/lab-03/UserManagement.test.tsx` | Pass |
| STYLE-05 | STY-012 | Validation placement | Messages below their field and associated by `aria-describedby` | `client/tests/lab-03/Login.test.tsx`, `client/tests/lab-03/ChangePassword.test.tsx` | Pass |

### Responsive and E2E

| ID | AC | What it tests | Expected result | File | Final |
|---|---|---|---|---|---|
| RESP-01 | AC-34 | Login and Change Password at three viewports | No overflow, clipping, or overlap; screenshots captured | `e2e/lab-03/authentication.spec.ts` | Pass |
| RESP-02 | AC-34 | Staff Queue at three viewports | Readable at mobile; controls reachable; screenshots captured | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| RESP-03 | AC-34 | Staff Ticket Detail at three viewports | Comments and notes readable and distinct; screenshots captured | `e2e/lab-03/staff-ticket-flow.spec.ts`, `e2e/lab-03/comments-and-notes.spec.ts` | Pass |
| RESP-04 | AC-34 | User Management at three viewports | List usable at mobile; screenshots captured | `e2e/lab-03/user-administration.spec.ts` | Pass |
| E2E-01 | AC-01, AC-02, AC-04 | Authentication journey | Log in with an initial password → forced change → application opens → log out → protected URL refused | `e2e/lab-03/authentication.spec.ts` | Pass |
| E2E-02 | AC-18, AC-20, AC-25 | Staff ticket journey | Queue → open → claim → set IT Priority → status change → Public Comment → Internal Note | `e2e/lab-03/staff-ticket-flow.spec.ts`, `e2e/lab-03/comments-and-notes.spec.ts` | Pass |
| E2E-03 | AC-28, AC-31, AC-33 | User administration journey | Create user with initial password → that user logs in and must change it → self-deactivation refused | `e2e/lab-03/user-administration.spec.ts` | Pass |

---

The release-gap E2E additions are deliberately mapped to existing criteria rather than
creating new acceptance criteria: `DETAIL-07` proves attachment continuity, `DETAIL-08`
proves reassignment through the Staff Detail control, `DETAIL-09` proves safe retry
recovery, `AUTH-02` includes inactive-account refusal, and `ADMIN-04` proves the
create/edit/reset/forced-change journey.

## 3. Acceptance-Criterion Traceability

Every criterion in `specification.md` §9 maps to at least one planned test.

| AC | Tests |
|---|---|
| AC-01 | API-01 · UI-01 · UI-03 · E2E-01 |
| AC-02 | API-06 · UI-04 · E2E-01 |
| AC-03 | API-02 · API-03 · API-04 · UI-02 |
| AC-04 | API-05 · E2E-01 |
| AC-05 | API-07 |
| AC-06 | API-08 · UI-05 |
| AC-07 | API-09 |
| AC-08 | SEC-T02 |
| AC-09 | SEC-T05 · SEC-T06 |
| AC-10 | SEC-T07 · SEC-T09 |
| AC-11 | SEC-T08 |
| AC-12 | SEC-T01 |
| AC-13 | SEC-T03 · SEC-T04 |
| AC-14 | MIG-04 |
| AC-15 | MIG-05 |
| AC-16 | API-19 |
| AC-17 | API-24 |
| AC-18 | API-11 · UI-08 · E2E-02 |
| AC-19 | API-12 · API-13 · UI-09 |
| AC-20 | API-14 · UI-11 · E2E-02 |
| AC-21 | API-15 |
| AC-22 | API-16 |
| AC-23 | API-17 · UI-12 |
| AC-24 | SEC-T10 |
| AC-25 | API-21 · UI-14 · E2E-02 |
| AC-26 | API-25 · UI-15 |
| AC-27 | API-26 |
| AC-28 | API-27 · E2E-03 |
| AC-29 | API-28 · UI-16 |
| AC-30 | API-29 |
| AC-31 | API-30 · UI-17 · E2E-03 |
| AC-32 | API-31 · UI-17 |
| AC-33 | API-32 · E2E-03 |
| AC-34 | RESP-01 … RESP-04 |
| AC-35 | UI-06 · UI-07 |
| AC-36 | UI-18 |
| AC-37 | UI-13 |

AC-14 is intentionally a suite-level migration/regression criterion. `MIG-04`
is the result of running the complete Lab 2 suite against the migrated,
authenticated implementation, so it is recorded in the final-suite table
below rather than manufactured as a standalone Lab 3 test name.

**Business rules covered without a dedicated AC:** BR-05 (UNIT-02) · BR-07 (API-10) · BR-08 (UNIT-06) · BR-12 (UNIT-04) · BR-13 (SEC-T11) · BR-24 (API-14) · BR-29 (API-23) · BR-30 (API-20) · BR-31 (UNIT-05, API-22) · BR-38 (API-33) · BR-39 (SEC-T12) · BR-40–42 (MIG-01…03).

---

## 4. Coverage of the labsheet's named files

The labsheet §12 names the files it expects. Mapped:

| Labsheet file | Covered by |
|---|---|
| `server/tests/lab-03/auth.api.test.ts` | API-01 … API-10 |
| `server/tests/lab-03/authorization.api.test.ts` | SEC-T01 … SEC-T04, SEC-T07 … SEC-T14 |
| `server/tests/lab-03/staff-queue.api.test.ts` | API-11 … API-13 |
| `server/tests/lab-03/staff-ticket-detail.api.test.ts` | API-14 … API-18 |
| `server/tests/lab-03/comments-notes.api.test.ts` | API-19 … API-24, SEC-T05, SEC-T06 |
| `server/tests/lab-03/users-admin.api.test.ts` | API-25 … API-33 |
| `client/tests/lab-03/Login.test.tsx` | UI-01 … UI-03 |
| `client/tests/lab-03/ChangePassword.test.tsx` | UI-04, UI-05 |
| `client/tests/lab-03/StaffTicketQueue.test.tsx` | UI-08 … UI-10, UI-18 |
| `client/tests/lab-03/StaffTicketDetail.test.tsx` | UI-11, UI-12 |
| `client/tests/lab-03/UserManagement.test.tsx` | UI-15 … UI-17 |
| `e2e/lab-03/authentication.spec.ts` | RESP-01, E2E-01 |
| `e2e/lab-03/staff-ticket-flow.spec.ts` | RESP-02, RESP-03, E2E-02 |
| `e2e/lab-03/user-administration.spec.ts` | RESP-04, E2E-03 |

Additional delivered files beyond the labsheet's minimum are also traced explicitly:

| Additional file | Coverage |
|---|---|
| `server/tests/lab-03/app-config.unit.test.ts` | Production CORS configuration guard |
| `server/tests/lab-03/authorization.unit.test.ts` | UNIT-04 authorization matrix |
| `server/tests/lab-03/ownership.api.test.ts` | SEC-T02, SEC-T03 ownership boundaries |
| `server/tests/lab-03/password.unit.test.ts` | UNIT-01, UNIT-02 password rules |
| `server/tests/lab-03/seed-database.api.test.ts` | MIG-01 … MIG-03 |
| `server/tests/lab-03/seed-roster.unit.test.ts` | Seed roster and realistic demo data |
| `server/tests/lab-03/selector-removed.unit.test.ts` | MIG-05 selector-removal guard |
| `server/tests/lab-03/session.unit.test.ts` | UNIT-06 session expiry |
| `server/tests/lab-03/transitions.unit.test.ts` | UNIT-03 transition matrix |
| `client/tests/lab-03/AppShell.test.tsx` | UI-06, UI-07 and logout |
| `client/tests/lab-03/RequesterResolution.test.tsx` | AC-17 Requester resolution signal |
| `client/tests/lab-03/RouteGuard.test.tsx` | UI-04 authentication and password gates |
| `client/tests/lab-03/ThreadSection.test.tsx` | UI-13, UI-14 comments/notes separation |
| `e2e/lab-03/comments-and-notes.spec.ts` | Public Comments, Internal Notes, and Requester refusal |

---

## 5. Test Commands

```bash
cd server && npm test        # migrates and seeds the *_test database, then runs
cd client && npx vitest run
npm run test:e2e             # manages its own dev server
```

Connection strings live in `.env.test`, untracked; only `.env.example` is committed. The preparation script refuses any database whose name does not end in `_test` (`lab-02 §11.16`).

**New for Lab 3:** every API test authenticates through the shared login fixture established in Issue L3-3. No test sets an identity header directly — that mechanism no longer exists.

---

## 6. Final Results

Filled in after the release merge, from a run on the exact final `main` commit
`6842e3502fc2b79cc754555e26d9dc9483d0e20a` on 19 September 2026 (`lab-02 §11.25`).
The test databases were fresh disposable PostgreSQL databases whose names ended in
`_test`; no development database was used.

| Suite | Command | Tests | Result |
|---|---|---|---|
| Server (unit + API + security + migration) | `cd server && npm test` | 410 (28 files) | Pass |
| Client (UI + style) | `cd client && npm test` | 203 (24 files) | Pass |
| E2E + responsive | `npm run test:e2e` | 36 | Pass |
| Server production build | `cd server && npm run build` | — | Pass |
| Client production build | `cd client && npm run build` | — | Pass |
| Client lint | `cd client && npm run lint` | — | Pass with 3 non-blocking warnings |

**Environment**
- Branch: `main` · Commit: `6842e3502fc2b79cc754555e26d9dc9483d0e20a` · Date executed: 2026-09-19
- All three Lab 3 migrations deployed successfully before the server suite.
- The E2E run used a separate fresh disposable E2E database and one Playwright worker.
- Lint warnings are the existing Fast Refresh warnings in `SessionContext.tsx` and the
  unused `REQUESTER_B` test fixture constant in `client/tests/lab-02/MyTickets.test.tsx`;
  lint exited successfully.
- Total: **649 passed, 0 failed, 0 skipped** across the three suites.

---

## 7. Known Limitations and Deferred Tests

- **CSRF is argued, not tested.** `SameSite=Lax` plus same-origin is the position (`specification.md` §11.3); no automated test exercises a cross-site request, because the harness serves both from one origin. Recorded rather than silently omitted.
- **Rate limiting is out of scope.** Lecture 5 (p17) recommends slowing repeated login attempts. The labsheet does not require it and it is not implemented; the safe-failure requirement it supports is covered by API-02 … API-04.
- **Password hashing cost is not benchmarked.** UNIT-01 proves the hash is salted and verifiable, not that the work factor is high enough to be slow for an attacker.
- **Session fixation is not tested.** The session identifier is generated fresh at login rather than accepted from the request, so fixation is structurally prevented; no test asserts it.
- **Release-audit disclosure — migration hash.** The applied Lab 3 migration contains one bcrypt backfill value because `specification.md` §7.4 / BR-41 requires existing Lab 2 users to receive the documented initial password before `passwordHash` becomes non-null. This is a literal conflict with the broader §10 wording that forbids a hash in any committed file; it is recorded here rather than silently claimed as clean. The source, response, log, fixture, and screenshot scans found no additional credential or session-value literal.
- **Release-audit disclosure — traceability gaps.** FR-31 (editing a user) has no dedicated AC, and SEC-T09 is currently listed under AC-10 even though AC-10 names Administrator endpoints. The implementation and tests are retained; adding or rewording an AC requires the student's explicit specification decision.
- **Release-audit disclosure — AI provenance.** `ai-use.md` contains ten selected prompt renderings, while the private running log preserves three prompt entries. The rows were cross-checked against repository history and evidence, but wording not preserved in the private log is not claimed to be verbatim.
