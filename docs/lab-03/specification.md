# Lab 3 Sprint Engineering Specification

**Version:** 1.0 — approved for implementation, 11 September 2026
**Status:** All §11 decisions confirmed. Implementation proceeds against this document.
**Extends:** `docs/lab-02/specification.md`. Identifiers restart at 01 for this sprint; cross-lab references are written as `lab-02 BR-16`.

---

## 1. Sprint Goal

Replace the temporary Development Requester selector with real authentication and role-based authorization, and deliver the first operational IT Staff workflow and Administrator user management — without breaking the Requester increment already released in Lab 2.

## 2. Stakeholder Request Interpretation

The stakeholder asks for three things that are really one: identity that is real, permission that is enforced, and work that IT Staff can actually do.

The selector was a development convenience that let the product be built before authentication existed. It now has to go, and everything that trusted it — every Ticket query, every Attachment check — has to trust the authenticated session instead. That is a migration, not a feature.

Two sentences in the request carry the most weight. *"Protect every API and screen according to role and ownership"* — the boundary is the backend, and the screen is feedback. *"Hiding a button is not authorization"* — stated plainly enough that the grading asks for direct-API evidence. Everything in §8 and §11 follows from those two.

## 3. Scope

### Included

Authentication with email and password · mandatory first-login password change · logout · current-user retrieval · three roles (Requester, IT Staff, Administrator) with one role per user · server-side authorization by role, ownership, and ticket state · migration from `RequesterUser` to `User` preserving Tickets and Attachments · every Lab 2 Requester function on authenticated identity · IT Staff Ticket Queue with search, filters, sorting, pagination · IT Staff Ticket Detail with ownership, IT Priority, and permitted status transitions · Public Comments · Internal Notes · Requester "problem appears resolved" indication · Administrator User Management.

### Excluded

Taken from labsheet §4.2 and §8.5, restated here because an exclusion that is written down is a defence and one that is remembered is not:

Email invitation, password-reset email, MFA, social login, SSO · self-registration · Actions Taken (Lab 4) · SLA calculation, escalation, notifications · dashboards and KPI analytics beyond queue counts · multi-tenancy, departments, organisations · production deployment · **multiple roles per user** · user deletion · bulk user operations, import, export · account and role history · profile photos and extended profiles · account unlocking and approval workflows · **pagination on the user list** · multi-column sorting · multiple simultaneous filters · editing or deleting Comments and Notes.

## 4. Functional Requirements

### Authentication

- **FR-01** The system shall authenticate a user by email address and password.
- **FR-02** The system shall reject authentication for an inactive account, regardless of password correctness.
- **FR-03** The system shall return the authenticated user's safe profile and role, and never a password, hash, or session secret.
- **FR-04** The system shall provide a logout action that removes authenticated access.
- **FR-05** The system shall require a user flagged as needing a password change to set a new password before reaching any other part of the application.
- **FR-06** The system shall verify the current password before accepting a new one.
- **FR-07** The system shall expire authenticated sessions after a defined period.

### Authorization

- **FR-08** The system shall determine the acting user from the authenticated session, never from an identifier supplied by the client.
- **FR-09** The system shall enforce role permissions on the server for every protected operation.
- **FR-10** The system shall enforce ownership on the server for every Requester-scoped resource.
- **FR-11** The system shall present only the navigation and actions permitted for the authenticated user's role.
- **FR-12** The system shall refuse an unauthenticated request to any protected endpoint.

### Requester continuation

- **FR-13** The system shall allow an authenticated Requester to perform every Ticket and Attachment function delivered in Lab 2.
- **FR-14** The system shall no longer present the Development Requester selector or a Change Requester action.
- **FR-15** The system shall allow a Requester to post a Public Comment on a Ticket they own.
- **FR-16** The system shall allow a Requester to indicate that a reported problem appears resolved, without changing the Ticket's status.

### IT Staff operations

- **FR-17** The system shall provide IT Staff with a Ticket Queue spanning all Requesters.
- **FR-18** The system shall support searching, filtering, sorting, and paginating the Queue.
- **FR-19** The system shall allow IT Staff to open any Ticket's detail.
- **FR-20** The system shall allow IT Staff to claim an unassigned Ticket.
- **FR-21** The system shall allow IT Staff to reassign a Ticket's owner to another active IT Staff or Administrator user.
- **FR-22** The system shall allow IT Staff to change IT Priority.
- **FR-23** The system shall allow IT Staff to move a Ticket through the permitted transitions in §5's matrix.
- **FR-24** The system shall allow IT Staff to post Public Comments.
- **FR-25** The system shall allow IT Staff to create Internal Notes.
- **FR-26** The system shall present Public Comments and Internal Notes as visually distinct.

### Administrator user management

- **FR-27** The system shall list users showing name, email, role, and activation state.
- **FR-28** The system shall support searching users by name or email.
- **FR-29** The system shall support filtering users by role.
- **FR-30** The system shall allow an Administrator to create a user with one permitted role and an initial password.
- **FR-31** The system shall allow an Administrator to update a user's name, email address, role, and activation state.
- **FR-32** The system shall allow an Administrator to set a new initial password that the user must change at next login.
- **FR-33** The system shall refuse an Administrator's attempt to deactivate their own account.
- **FR-34** The system shall refuse any change that would leave no active Administrator.
- **FR-35** The system shall refuse a duplicate email address.

### Cross-cutting

- **FR-36** The system shall present loading, success, validation, empty, no-results, forbidden, not-found, and safe failure feedback for every remote operation.
- **FR-37** The system shall present every required screen usably at desktop, tablet, and mobile widths.

## 5. Business Rules

### Authentication and passwords

- **BR-01** Only an active user with valid credentials may authenticate. *(mandatory)*
- **BR-02** A user marked as requiring a password change cannot enter the normal application until a new valid password is saved. *(mandatory)*
- **BR-03** Authentication failure returns one generic message for an unknown email, a wrong password, and an inactive account. The three are indistinguishable to the caller.
- **BR-04** Passwords are stored only as a salted hash produced by a deliberately slow algorithm. Plaintext is never stored, logged, or returned.
- **BR-05** A password must be at least 10 characters, with no composition rule beyond a length floor — length outperforms forced symbol classes, and a rule the specification cannot justify is a rule tests cannot defend.
- **BR-06** Setting an initial password always sets the password-change flag. An initial password is a bridge, never a durable credential.
- **BR-07** Changing a password clears the password-change flag and invalidates every other session belonging to that user, because a password change is often a response to suspected compromise.
- **BR-08** A session expires after 8 hours of absolute lifetime — long enough for a working session, short enough to matter.
- **BR-09** Logout deletes the session server-side. A request presenting the logged-out session afterwards is unauthenticated.

### Identity and authorization

- **BR-10** The authenticated user identity, not a `requesterId` supplied by the client, determines ownership of Requester operations. *(mandatory)*
- **BR-11** Each user holds exactly one role: Requester, IT Staff, or Administrator.
- **BR-12** An operation absent from the authorization matrix in §8.1 is denied.
- **BR-13** Role is resolved server-side per request. A role value held or sent by the client is never trusted.
- **BR-14** A request for a resource belonging to another user is answered as **not found**, so the response does not disclose that the resource exists. This continues `lab-02 BR-16`.
- **BR-15** A request for an operation the authenticated role may never perform is answered as **forbidden**. BR-14 covers *whose*; BR-15 covers *what*.

### Ticket ownership, priority, status

- **BR-16** A Ticket may have zero or one Ticket Owner, who must be an **active** IT Staff or Administrator user.
- **BR-17** A Ticket created by a Requester is unassigned until claimed.
- **BR-18** Requested Priority is set by the Requester at creation and is never altered afterwards, by anyone.
- **BR-19** IT Priority initially copies Requested Priority and may afterwards be changed only by IT Staff or Administrator.
- **BR-20** Ticket status is one of `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`.
- **BR-21** Only the transitions in §5.1 are permitted. Any other transition is a validation failure, whatever the client sends.
- **BR-22** A Requester may indicate the problem appears resolved but may never set `RESOLVED` or `CLOSED`. *(mandatory)*
- **BR-23** The resolution indication is a timestamp on the Ticket, not a status. It is cleared if the Ticket is reopened.
- **BR-24** Claiming an unassigned Ticket in `NEW` moves it to `OPEN` in the same operation — a claimed ticket that is still `NEW` misrepresents the queue.
- **BR-25** `CANCELLED` and `CLOSED` are terminal except through `REOPENED`.

### Comments and notes

- **BR-26** Public Comments are visible to the Requester who owns the Ticket, IT Staff, and Administrator. *(mandatory)*
- **BR-27** Internal Notes are visible only to IT Staff and Administrator. *(mandatory)*
- **BR-28** A Requester's request for Internal Notes is refused without revealing whether any note exists.
- **BR-29** Comments and Notes are append-only. No edit, no delete.
- **BR-30** Each entry records its author and a server-set creation time. Neither is accepted from the client.
- **BR-31** Content is 1–2000 characters after trimming. Whitespace-only content is empty and is rejected.
- **BR-32** Content is rendered as text, never as markup.

### Administrator and accounts

- **BR-33** Email addresses are unique across all users, compared case-insensitively.
- **BR-34** Only the three named roles are assignable. An unknown role is a validation failure.
- **BR-35** An Administrator cannot deactivate their own account.
- **BR-36** The system can never reach zero active Administrators — the last one can be neither deactivated nor demoted.
- **BR-37** Users are deactivated, never deleted.
- **BR-38** Deactivating a user does not alter Tickets they own or submitted. Historical records stay intact.
- **BR-39** A deactivated user's existing sessions are invalidated, because otherwise deactivation does not take effect until the session expires.

### Migration and transition to Lab 4

- **BR-40** Every Lab 2 `RequesterUser` becomes a `User` with the Requester role, preserving the identifier so existing Tickets keep resolving.
- **BR-41** Every migrated user receives the documented initial password and the password-change flag.
- **BR-42** Attachment ownership and soft-removal state survive the migration unchanged.
- **BR-43** Actions Taken, and the rule that would block resolution while they are incomplete, are deferred to Lab 4.

### 5.1 Status transition matrix

Rows are the current status; columns are who may move it where. A transition absent from this table is refused (BR-21).

| From | Requester may | IT Staff / Administrator may |
|---|---|---|
| `NEW` | `CANCELLED` (own ticket only) | `OPEN`, `IN_PROGRESS`, `CANCELLED` |
| `OPEN` | — | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` |
| `IN_PROGRESS` | — | `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` |
| `WAITING_FOR_REQUESTER` | — | `IN_PROGRESS`, `RESOLVED`, `CANCELLED` |
| `RESOLVED` | `REOPENED` (own ticket only) | `CLOSED`, `REOPENED` |
| `CLOSED` | — | `REOPENED` |
| `REOPENED` | — | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` |
| `CANCELLED` | — | — (terminal) |

**The two rows worth explaining:**

*A Requester may cancel their own `NEW` Ticket.* Raised in error, not yet worked — refusing costs IT Staff a chore and the Requester their agency. Once IT Staff have opened it, cancellation is theirs.

*A Requester may reopen from `RESOLVED`.* This is the counterpart to BR-22: the Requester cannot declare a problem solved, but they are the only person who genuinely knows it is not. Reopening from `CLOSED` is left to IT Staff, so a closed ticket stays closed unless staff agree.

## 6. UI Specification Summary

The full specification is in `ui-spec.md`. Lab 2's Zen Green tokens, form conventions, control states, button hierarchy, badge rules, responsive rules, and accessibility expectations carry forward **unchanged**. New screens use the existing components; a second visual system is a defect, not a style choice.

- **Shell:** the Development Requester display and Change Requester action are replaced by the authenticated user's name, a role badge, and Logout. Navigation shows only destinations the role may reach.
- **New screens:** Login · Change Password (mandatory) · IT Staff Ticket Queue · IT Staff Ticket Detail · Administrator User Management.
- **Extended screens:** Requester Ticket Detail gains Public Comments and the "problem appears resolved" action.
- **Deleted screens:** Development Requester Selection.
- **New badges:** role (Requester, IT Staff, Administrator) and the four additional statuses, using the existing badge component and text-plus-colour rule.
- **New states:** `forbidden` joins the existing loading, empty, no-results, and failure states, and needs its own visual treatment — it means something different from "not found".

## 7. Data Changes

All identifiers remain UUID. Timestamps remain `timestamptz` in UTC.

| Model | Change |
|---|---|
| `User` | **Renamed from `RequesterUser`, keeping identifiers.** Adds `passwordHash`, `role`, `mustChangePassword`, and keeps `displayName`, `email`, `isActive`, timestamps |
| `Session` | **New.** `id`, `userId`, `expiresAt`, `createdAt` |
| `Ticket` | `ownerId` becomes a real foreign key to `User` (it was a modelled-but-unused nullable column in Lab 2, `lab-02 §7`). Adds `requesterResolvedAt` nullable |
| `PublicComment` | **New.** `id`, `ticketId`, `authorId`, `body`, `createdAt` |
| `InternalNote` | **New.** `id`, `ticketId`, `authorId`, `body`, `createdAt` |
| `Attachment` | Unchanged. `uploadedById` and `removedById` now reference `User` |
| `Category`, `RelatedSystem`, `TicketNumberSequence` | Unchanged |

**Enums:** `Role { REQUESTER, IT_STAFF, ADMINISTRATOR }`. `TicketStatus` extends Lab 2's with `OPEN` and `REOPENED` — Lab 2 declared seven values of which only `NEW` was reachable; Lab 3 makes seven of eight reachable and adds `OPEN`.

**Relationships:** one `User` has many `Ticket` as requester and many as owner — two named relations, as `Attachment` already needed in Lab 2 · one `Ticket` has many `PublicComment` and many `InternalNote` · each comment and note has one author.

**Indexes:**
- `User(email)` unique — the login lookup and BR-33
- `User(role, isActive)` — the Administrator list filter and the BR-36 count
- `Session(userId)` — invalidating a user's sessions (BR-07, BR-39)
- `Session(expiresAt)` — expiry sweeps
- `Ticket(status, itPriority, createdAt desc)` — the Queue's default ordering and filters
- `Ticket(ownerId)` — "assigned to me"
- `PublicComment(ticketId, createdAt)` and `InternalNote(ticketId, createdAt)` — thread retrieval
- Lab 2's requester-scoped Ticket indexes remain

**Migration strategy.** `RequesterUser` is **renamed**, not recreated — a rename preserves every row and every foreign key, where a drop-and-recreate would orphan every Ticket. New columns are added with defaults (`role = REQUESTER`, `mustChangePassword = true`) and `passwordHash` is backfilled with the hash of the documented initial password before the column is made non-nullable. Ticket and Attachment counts are asserted identical before and after.

**Seed (idempotent, keyed on email):** 4 active + 1 inactive Requester · 3 active + 1 inactive IT Staff · 1 active Administrator · Tickets spread across statuses, priorities, and assigned/unassigned ownership · example Comments and Notes carrying nothing sensitive. Every seeded account uses one documented development password and carries `mustChangePassword = true`.

## 8. API Contract

Full shapes are in `api-spec.md`. Capability summary:

| Capability | Endpoint | Roles |
|---|---|---|
| Log in | `POST /api/auth/login` | anonymous |
| Log out | `POST /api/auth/logout` | any authenticated |
| Current user | `GET /api/auth/me` | any authenticated |
| Change password | `POST /api/auth/change-password` | any authenticated |
| Lab 2 Requester ticket and attachment endpoints | unchanged paths | Requester (owned only) |
| Post / read Public Comments | `POST`, `GET /api/tickets/:id/comments` | Requester (owned), IT Staff, Administrator |
| Indicate problem resolved | `POST /api/tickets/:id/requester-resolution` | Requester (owned) |
| Staff queue | `GET /api/staff/tickets` | IT Staff, Administrator |
| Staff ticket detail | `GET /api/staff/tickets/:id` | IT Staff, Administrator |
| Claim / assign owner | `PATCH /api/staff/tickets/:id/owner` | IT Staff, Administrator |
| Set IT Priority | `PATCH /api/staff/tickets/:id/it-priority` | IT Staff, Administrator |
| Change status | `PATCH /api/staff/tickets/:id/status` | per §5.1 |
| Create / read Internal Notes | `POST`, `GET /api/tickets/:id/internal-notes` | IT Staff, Administrator |
| List / search / filter users | `GET /api/admin/users` | Administrator |
| Create user | `POST /api/admin/users` | Administrator |
| Update user | `PATCH /api/admin/users/:id` | Administrator |
| Set initial password | `POST /api/admin/users/:id/initial-password` | Administrator |

**Status codes:** 200 retrieval · 201 created · 400 validation · **401 unauthenticated** · **403 authenticated but forbidden** · 404 missing *or belonging to another user* (BR-14) · 409 conflict · 410 removed attachment content · 413 too large · 415 unsupported type · 500 unexpected, with a safe message and correlation identifier.

### 8.1 Authorization matrix

Every protected operation against every role. **An operation absent from this table is denied** (BR-12). `own` means the authenticated user is the Ticket's requester; `—` means refused.

| Operation | Requester | IT Staff | Administrator |
|---|---|---|---|
| Log in, log out, read own profile, change own password | ✅ | ✅ | ✅ |
| Create Ticket | ✅ | — | — |
| List own Tickets | ✅ `own` | — | — |
| Read Ticket detail | ✅ `own` | ✅ any | ✅ any |
| Add / download / remove Attachment | ✅ `own` | ✅ any | ✅ any |
| Read Public Comments | ✅ `own` | ✅ any | ✅ any |
| Post Public Comment | ✅ `own` | ✅ any | ✅ any |
| Indicate problem appears resolved | ✅ `own` | — | — |
| Read Internal Notes | **—** | ✅ | ✅ |
| Create Internal Note | **—** | ✅ | ✅ |
| Read Staff Queue | — | ✅ | ✅ |
| Claim / reassign Ticket Owner | — | ✅ | ✅ |
| Set IT Priority | — | ✅ | ✅ |
| Change Ticket status | per §5.1 | per §5.1 | per §5.1 |
| List / search users | — | — | ✅ |
| Create / update user | — | — | ✅ |
| Set a user's initial password | — | — | ✅ |

**Administrator may perform IT Staff ticket operations.** The labsheet says the two should remain "conceptually separate" and that an Administrator "does not automatically need" ticket operations "unless the approved authorization matrix explicitly permits it." This matrix permits it explicitly, and the reason comes from the labsheet itself: BR-16 requires a Ticket Owner to be an active IT Staff **or Administrator** user. An Administrator who can be assigned a Ticket but cannot act on it is a dead end, so the grant follows from the ownership rule rather than from convenience. Conceptual separation is preserved where it carries the security weight — IT Staff never gain user-management rights.

## 9. Acceptance Criteria

### Authentication

- **AC-01** Given an active user with valid credentials, when the user logs in, then the backend establishes authenticated access and returns the permitted user identity and role.
- **AC-02** Given a user who must change the initial password, when login succeeds, then normal application screens remain unavailable until a valid new password is saved.
- **AC-03** Given an inactive account with a correct password, when login is attempted, then it fails with the same message an unknown email produces.
- **AC-04** Given an authenticated session, when the user logs out and then calls a protected endpoint, then the request is refused as unauthenticated.
- **AC-05** Given a password-change request, when the current password is wrong, then the change is refused and the old password still works.
- **AC-06** Given a new password shorter than the minimum, when it is submitted, then it is refused with a field-level message and the old password still works.
- **AC-07** Given any authentication response, when it is inspected, then it contains no password, hash, session identifier, or secret.

### Authorization

- **AC-08** Given an authenticated Requester, when the client supplies another `requesterId`, then the backend applies the authenticated identity and does not return another Requester's data.
- **AC-09** Given a Requester, when an Internal Note endpoint is requested, then the operation is rejected without exposing note content or whether notes exist.
- **AC-10** Given a Requester, when an Administrator endpoint is called directly, then it is refused with 403.
- **AC-11** Given IT Staff, when an Administrator user-management endpoint is called directly, then it is refused with 403.
- **AC-12** Given no authentication, when any protected endpoint is called, then it is refused with 401.
- **AC-13** Given a Requester, when another Requester's Ticket is requested by identifier, then the response is 404 and does not confirm the Ticket exists.

### Requester continuation

- **AC-14** Given an authenticated Requester, when they use any Lab 2 Ticket or Attachment function, then it behaves as it did in Lab 2, scoped to their own records.
- **AC-15** Given the application, when any screen is opened, then no Development Requester selector or Change Requester action is present.
- **AC-16** Given a Requester on their own Ticket, when they post a Public Comment, then it is stored with their identity and a server-set time and is visible to IT Staff.
- **AC-17** Given a Requester on their own Ticket, when they indicate the problem appears resolved, then the indication is recorded and the Ticket's status is unchanged.

### IT Staff

- **AC-18** Given IT Staff, when the Queue is opened, then Tickets from all Requesters are listed with ownership and status visible.
- **AC-19** Given the Queue, when search, filters, sorting, and pagination are combined, then results and pagination metadata are correct.
- **AC-20** Given an unassigned Ticket, when IT Staff claim it, then they become its owner and it moves to `OPEN`.
- **AC-21** Given an assigned Ticket, when IT Staff reassign it to an inactive user, then the change is refused.
- **AC-22** Given a Ticket, when IT Staff change IT Priority, then Requested Priority is unchanged.
- **AC-23** Given a Ticket in any status, when a transition outside §5.1 is requested, then it is refused and the status is unchanged.
- **AC-24** Given a Requester, when `RESOLVED` or `CLOSED` is sent directly to the status endpoint, then it is refused.
- **AC-25** Given IT Staff on a Ticket, when an Internal Note is created, then it is visible to IT Staff and Administrator and never to the Requester.

### Administrator

- **AC-26** Given an Administrator, when the user list is opened, then name, email, role, and status are shown for each user.
- **AC-27** Given the user list, when searched by name or email and optionally filtered by role, then only matching users are returned.
- **AC-28** Given an Administrator, when a user is created with one role and an initial password, then the user can log in and is required to change the password.
- **AC-29** Given an existing email address, when a user is created with it, then the request is refused with a conflict.
- **AC-30** Given an unknown role value, when a user is created or updated with it, then the request is refused.
- **AC-31** Given an Administrator, when they attempt to deactivate their own account, then it is refused.
- **AC-32** Given exactly one active Administrator, when deactivation or demotion of that account is attempted, then it is refused.
- **AC-33** Given a user whose initial password was reset, when they next log in, then a password change is required before anything else.

### Presentation

- **AC-34** Given each new screen at desktop, tablet, and mobile widths, when rendered, then nothing is clipped, overlapping, or hidden, and the page does not scroll horizontally.
- **AC-35** Given any role, when the shell is rendered, then the authenticated user's name and role are shown and no unauthorised destination appears in navigation.
- **AC-36** Given a forbidden operation, when it is attempted from the interface, then a forbidden state is shown that is distinguishable from not-found and from a failure.
- **AC-37** Given Public Comments and Internal Notes on one screen, when both are present, then they are visually distinct enough that a note cannot be mistaken for a comment.

*Traceability from each criterion to its planned tests is maintained in `tests.md`.*

## 10. Definition of Done

### Part 1 — Product completion

- All approved scope in §3 is implemented; nothing from the excluded list was added
- Every acceptance criterion in §9 is satisfied and linked to passing test evidence
- **Every protected operation in §8.1 has a test calling the API directly as a refused role, and unauthenticated**
- All required tests pass from documented commands on the final `main` branch
- No required test is skipped, disabled, or commented out
- The Lab 2 Requester suite passes on authenticated identity, asserting what it asserted before
- Ticket and Attachment row counts are identical before and after migration
- No password, hash, session identifier, or secret appears in any response, log, fixture, screenshot, or committed file
- `.env` and `.env.test` remain untracked; only `.env.example` is committed
- Seeded credentials are documented in one place and labelled local-only
- Screens conform to `ui-spec.md` and `style-contract.md`; no second visual system
- Seed remains idempotent
- README setup, run, and test instructions are current

### Part 2 — Course delivery

- Work decomposed into GitHub Issues on the Kanban board, each moved through the six statuses truthfully
- Each Issue implemented on its own feature branch and merged into `lab3-staging` through a peer-reviewed Pull Request
- Every PR linked to its Issue through the Development panel
- Every review comment answered; changes fixed on the same branch; the reviewer merges
- One release Pull Request from `lab3-staging` to `main`
- `docs/lab-03/` contains `specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`, `reviewer.md`, `ai-use.md`
- Submission PDF prepared in the required "Answer Part 1–9" order

## 11. Assumptions and Decisions

**11.1 Session identity is an opaque token in an httpOnly cookie, backed by a `Session` table.**
Lecture 5 presents both cookie sessions and JWTs. JWT's advantages — statelessness, mobile clients, third-party APIs — are things this application does not have, and its central weakness is exactly what BR-09 requires: a stateless token cannot be revoked without adding the server-side list that made it stateless in the first place. A random opaque token with a database row gives logout as a row deletion, expiry as a column, and per-user invalidation as a `WHERE userId =` — every rule in §5 becomes directly testable. The cost is a database read per request, which at this scale is not a cost.

**11.2 Passwords are hashed with bcrypt.**
Deliberately slow, per-password salt built in, one mature dependency. Argon2 is stronger on paper and would also satisfy Lecture 5's requirements; bcrypt is chosen for maturity and the smaller install surface. The hashing call sits behind one module so the algorithm can be changed in one place.

**11.3 CSRF is addressed by `SameSite=Lax` plus same-origin enforcement.**
The cookie is `httpOnly`, `SameSite=Lax`, and `Secure` where the transport allows. Client and API are same-origin in this deployment, and no state-changing request is issued cross-site. This is stated rather than assumed because Lecture 5 asks for the CSRF position explicitly; a token-based defence would be the next step if the client were ever served from a different origin.

**11.4 `RequesterUser` is renamed to `User`, not recreated.**
Lab 2's `Category` migration dropped and recreated a table because Postgres offered no cast — acceptable there because nothing referenced it. Here every Ticket references this table. A rename preserves rows and foreign keys; a recreate would orphan the entire Lab 2 increment. The new columns are added with defaults and `passwordHash` is backfilled before being made non-nullable.

**11.5 Identifiers restart at 01 for Lab 3.**
The labsheet asks for `BR-01, BR-02, …` in `docs/lab-03/specification.md`. A separate document is a separate namespace. Cross-lab references are written explicitly as `lab-02 BR-16` so the two cannot be confused.

**11.6 A Requester may cancel their own `NEW` Ticket and reopen their own `RESOLVED` Ticket.**
Argued in §5.1. Both stay inside BR-22, which forbids a Requester *declaring a problem solved*; neither of these does that.

**11.7 The resolution indication is a timestamp, not a status.**
BR-22 forbids a Requester setting `RESOLVED`, and modelling the indication as a status would either violate that or require a parallel status nobody asked for. A nullable `requesterResolvedAt` records the signal, surfaces in the Queue, and is cleared on reopen — with no effect on the transition matrix.

**11.8 Administrator inherits IT Staff ticket operations.**
Argued in §8.1, and confirmed. It follows from the labsheet's own wording: a Ticket Owner must be an active IT Staff **or Administrator** user, so an Administrator must be able to act on a Ticket they can be assigned. The labsheet's "conceptually separate" instruction is honoured in the direction that carries the security weight — IT Staff never gain user-management rights.

**11.9 A password change invalidates the user's other sessions; deactivation invalidates all of them.**
Neither is required by the labsheet. Both follow from Lecture 5's session lifecycle: a password change is often a response to compromise, and a deactivation that leaves a live session has not actually deactivated anything.

**11.10 The `forbidden` state is a first-class UI state.**
Lab 2's screens had loading, empty, no-results, and failure. Lab 3 introduces operations a user may legitimately reach and legitimately not be allowed to perform, and "forbidden" means something different from "not found" and from "something broke". It gets its own treatment in `ui-spec.md` rather than being folded into the error state.
