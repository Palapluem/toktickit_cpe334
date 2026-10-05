# Lab 4 Sprint Engineering Specification

**Version:** 1.0 — approved for implementation, 3 October 2026
**Status:** Approved by the student on 3 October 2026, after the four decision rounds recorded in §11. Implementation proceeds against this document.
**Extends:** `docs/lab-03/specification.md`, which extends `docs/lab-02/specification.md`. Identifiers restart at 01 for this sprint; cross-lab references are written as `lab-03 BR-16`.

---

## 1. Sprint Goal

IT Staff record and finish the service work behind each Ticket as Actions Taken. A Ticket can be resolved only when no work is left open, every role gets a concise dashboard that leads straight to the matching detailed list, and every Lab 1–3 feature keeps working as one consistent Zen Green application.

## 2. Stakeholder Request Interpretation

The stakeholder wants the actual work on a Ticket to be planned, assigned and finished in the system, not remembered. An Action Taken is one line of that work. Three people stay distinct:

- the **Ticket Owner** coordinates the Ticket;
- the **assignee** is responsible for one Action;
- **Performed by** records who logged it.

They are often the same person, and the design never assumes they are.

The Requester's "problem appears resolved" signal stays a signal. Resolution remains a decision IT Staff make, and the backend refuses it while work is still open, whichever client asks.

Dashboards are entry points, not reports. Each number answers "where should I look?" and opens the list that produced it.

"Polish and harden" applies to the whole product, not only the new screens: every Lab 1–3 journey must still pass, and nothing obsolete may remain.

## 3. Scope

### Included

- Actions Taken with the seven labsheet fields plus an assignee and a lifecycle.
- The resolution gate and the cancellation cascade.
- An append-only Ticket history.
- Optimistic concurrency on workflow writes.
- An IT Staff dashboard (also used by Administrators) and a Requester dashboard, both with drill-down.
- A `statusGroup` filter on both Ticket lists.
- Dashboard navigation and landing.
- The additive migration, the seed increment and a tested recovery procedure.
- Final regression and hardening of Labs 1–3.

### Excluded

From labsheet §4.2: SLA clocks, escalation, on-call scheduling and breach notifications · email, SMS, LINE or push notifications · inventory, spare parts, purchasing and cost accounting · time-sheet billing and labour cost · approval workflows and e-signatures · BI tools, report builders and export warehouses · multi-tenancy and production-scale cloud operations.

By decision (§11):

- No time-windowed metrics such as "last 7 days".
- No Administrator user-count cards.
- No deleting Actions or history events, and no editing COMPLETED or CANCELLED Actions.
- No attachment upload owned by an Action.
- No user-entered Action occurrence time.
- No change to the Lab 3 owner and IT Priority request shapes.
- No new Ticket statuses.

## 4. Functional Requirements

### Actions Taken

- **FR-01** The system shall let IT Staff and Administrators create an Action Taken on a Ticket that is in a working status.
- **FR-02** The system shall list every Action Taken of a Ticket on IT Staff Ticket Detail and on the owning Requester's Ticket Detail.
- **FR-03** The system shall record Performed by and Action Date/Time automatically from the authenticated session and the server clock.
- **FR-04** The system shall let IT Staff and Administrators edit Description, Result, Follow-Up Required, Follow-up Note and Attachment Notes of an Action that is not terminal.
- **FR-05** The system shall let IT Staff and Administrators assign and reassign a non-terminal Action to an active IT Staff or Administrator user.
- **FR-06** The system shall let IT Staff and Administrators start, complete and cancel Actions through the lifecycle in §5.1.
- **FR-07** The system shall present Actions to Requesters read-only, without any mutation control.

### Ticket workflow

- **FR-08** The system shall offer and accept only the Ticket transitions permitted for the caller's role and the Ticket's state (§5.2).
- **FR-09** The system shall refuse `RESOLVED` and `CLOSED` while any Action is open, including when a client bypasses the interface.
- **FR-10** The system shall cancel a Ticket's open Actions when the Ticket is cancelled.
- **FR-11** The system shall refresh the Ticket summary status after a successful change and keep the truthful status after a refused one.
- **FR-12** The system shall record an append-only history of material Ticket and Action changes.
- **FR-13** The system shall show that history according to role.
- **FR-14** The system shall detect a stale workflow update and refuse it without overwriting the newer change.

### Dashboards

- **FR-15** The system shall provide an IT Staff dashboard, also used by Administrators, with the metrics in §5.3.
- **FR-16** The system shall show the current user's open Actions on the IT Staff dashboard.
- **FR-17** The system shall provide a Requester dashboard computed only from the Requester's own Tickets.
- **FR-18** The system shall show recently updated Tickets on both dashboards.
- **FR-19** The system shall link every metric to a list filtered by the same predicate.
- **FR-20** The system shall support `statusGroup=active` on the IT Staff Ticket Queue and My Tickets.
- **FR-21** The system shall make Dashboard the first navigation destination and the landing page after sign-in for every role.

### Hardening and regression

- **FR-22** The system shall keep every Lab 1–3 function available to its permitted roles, unchanged except where §11 records a change.
- **FR-23** The system shall present loading, success, validation, empty, no-results, forbidden, not-found, conflict and safe-failure feedback for every new remote operation.
- **FR-24** The system shall prevent duplicate Actions caused by repeated clicks or network retry.
- **FR-25** The system shall keep entered form data after a recoverable failure.
- **FR-26** The system shall remove obsolete, placeholder or non-functional interface elements and console errors left from earlier labs.
- **FR-27** The system shall keep README setup, migration, seed, test and demonstration instructions current.
- **FR-28** The system shall present every new screen usably at desktop, tablet and mobile widths, operable by keyboard with visible focus.

## 5. Business Rules

### Actions — ownership and roles

- **BR-01** An Action Taken belongs to exactly one Ticket. *(mandatory, labsheet §4.4)*
- **BR-02** The Ticket Owner coordinates the Ticket, but an Action Taken may be created by, assigned to, or completed by a different IT Staff member. Ticket Owner, Performed by and assignee are independent. *(mandatory, labsheet §4.4)*
- **BR-03** Only IT Staff and Administrators create or change Actions. A Requester never does.
- **BR-04** An Administrator has every IT Staff Action and dashboard capability. User management stays Administrator-only (continues `lab-03 §11.8`).
- **BR-05** The server sets these fields; none is accepted from the client, and none changes afterwards:
  - Performed by: the authenticated creator.
  - Action Date/Time: the server time of creation.
  - `completedBy`/`completedAt`.
  - `cancelledBy`/`cancelledAt`.

### Assignee

- **BR-06** Every Action has exactly one assignee. It is required at creation, and the interface defaults it to the creator.
- **BR-07** An assignee must be an active IT Staff or Administrator user at the moment of assignment (parallel to `lab-03 BR-16`).
- **BR-08** Reassignment is permitted only while the Action is not terminal. An assignee who is later deactivated stays recorded and displayed.

### Lifecycle and fields

- **BR-09** Action status is `PLANNED`, `IN_PROGRESS`, `COMPLETED` or `CANCELLED`. Only the transitions in §5.1 are permitted.
- **BR-10** `COMPLETED` and `CANCELLED` are terminal: no field edit, reassignment or transition afterwards.
- **BR-11** Completing an Action requires a non-blank Result.
- **BR-12** Cancelling an Action requires a reason of 1–500 characters.
- **BR-13** Description is required, 1–2000 characters. Result is optional until completion, at most 2000.
- **BR-14** Follow-up Note is required (1–2000) when Follow-Up Required is true. The server clears it when Follow-Up Required is false. A follow-up never blocks completion or resolution; further work is recorded as a new Action.
- **BR-15** Attachment Notes are optional, at most 500 characters: free text pointing to the Ticket's existing attachments. An Action has no upload of its own.
- **BR-16** Every text field is trimmed, and whitespace-only input counts as empty. Content is rendered as text, never as markup (continues `lab-03 BR-31`, `BR-32`).

### Visibility

- **BR-17** A Requester sees every Action on their own Tickets, with all fields, read-only. People are shown by display name only. Private information belongs in Internal Notes.
- **BR-18** A Requester's call to an Action write operation is forbidden (403). Another Requester's Ticket is not found (404) (continues `lab-03 BR-14`, `BR-15`).

### Ticket workflow

- **BR-19** Ticket statuses remain the eight values of `lab-03 BR-20`. Transitions remain `lab-03 §5.1`, constrained by BR-20 to BR-24 (§5.2).
- **BR-20** A Ticket may move to `RESOLVED` or `CLOSED` only when none of its Actions is `PLANNED` or `IN_PROGRESS`. The server enforces this inside the status-change transaction. *(mandatory, labsheet §4.5)*
- **BR-21** A Ticket with no Actions may be resolved or closed. Tickets created before Lab 4 keep their status and receive no backfilled Actions.
- **BR-22** When a Ticket becomes `CANCELLED`, each `PLANNED` or `IN_PROGRESS` Action becomes `CANCELLED` in the same transaction, with the reason "Ticket cancelled" and `cancelledBy` set to the user who cancelled the Ticket.
- **BR-23** Actions may be created, edited, assigned or transitioned only while the Ticket is `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER` or `REOPENED`. Otherwise they are read-only. Reopening a Ticket leaves terminal Actions as they are.
- **BR-24** A change to an Action never changes the Ticket's status.
- **BR-25** The Requester's "problem appears resolved" indication stays advisory and does not change the status (continues `lab-03 BR-22`, `BR-23`).

### History and ordering

- **BR-26** Each material change writes one `TicketEvent` in the same transaction: status change, owner change, IT Priority change, Action created, updated, assigned, started, completed or cancelled. Cascaded cancellations are included.
- **BR-27** Ticket events are append-only. The application offers no update or delete, and the database rejects `UPDATE` and `DELETE` on the event table.
- **BR-28** IT Staff and Administrators see every event of a Ticket. A Requester sees only the status-change events of their own Tickets.
- **BR-29** Actions, Public Comments, Internal Notes and events are ordered by creation time ascending, then by identifier, so records with equal timestamps keep one stable order.
- **BR-30** An event payload holds only identifiers, statuses, priorities and the names of changed fields. It never holds free text, credentials or personal data beyond the actor reference.

### Concurrency and retries

- **BR-31** Tickets and Actions carry an integer version.
  - A Ticket's version increments when its status, owner, IT Priority or resolution indication changes.
  - An Action's version increments on every change to it.
  - A Ticket status change states the Ticket's expected version. An Action edit, reassignment or transition states the Action's expected version.
  - A mismatch is refused as a conflict and changes nothing.
- **BR-32** Owner and IT Priority changes keep their Lab 3 request shape and need no expected version.
- **BR-33** Every Ticket status change and every Action creation locks the Ticket row for the length of its transaction, so BR-20 and BR-22 hold under concurrent requests.
- **BR-34** Action creation carries a client-generated request identifier, unique per Ticket. Repeating it returns the Action already created instead of creating another.
- **BR-35** Ticket field changes and Action writes update the Ticket's `updatedAt`. Public Comments and Internal Notes do not (Lab 3 behaviour).

### Dashboards

- **BR-36** `ACTIVE` means `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER` or `REOPENED`.
- **BR-37** The backend computes every dashboard value from the same predicate that filters its drill-down list, so a count always equals the drill-down list's total.
- **BR-38** No metric depends on a calendar window. "Recently updated" means the five most recent `updatedAt` values, ties broken by identifier. Times are stored in UTC and shown in Asia/Bangkok.
- **BR-39** A Requester's dashboard covers only Tickets that Requester submitted.
- **BR-40** Dashboards return counts and bounded lists (at most 10 Actions and 5 Tickets), never whole collections. A zero is shown as 0 and still opens its list.

### Migration and data

- **BR-41** The Lab 4 migration is additive. Every User, Session, Ticket, Attachment, Public Comment, Internal Note and reference row survives, with identical counts before and after.
- **BR-42** The seed remains idempotent and adds Actions, so that Tickets with zero, one and several Actions exist across the seeded statuses.

### 5.1 Action lifecycle

| From | To | Who | Condition |
|---|---|---|---|
| — (create) | `PLANNED` | IT Staff, Administrator | Ticket in a working status (BR-23); active assignee (BR-07) |
| `PLANNED` | `IN_PROGRESS` | IT Staff, Administrator | — |
| `PLANNED`, `IN_PROGRESS` | `CANCELLED` | IT Staff, Administrator; system cascade (BR-22) | Reason 1–500 (BR-12) |
| `IN_PROGRESS` | `COMPLETED` | IT Staff, Administrator | Non-blank Result (BR-11) |
| `COMPLETED`, `CANCELLED` | — | — | Terminal (BR-10) |

A Requester may make none of these moves. `PLANNED → COMPLETED` is refused: work is started before it is finished.

### 5.2 Ticket status transitions

The rows and roles are `lab-03 §5.1` unchanged.

- **†** means the BR-20 resolution gate applies.
- **‡** means the BR-22 cascade runs.

| From | Requester may | IT Staff / Administrator may |
|---|---|---|
| `NEW` | `CANCELLED`‡ (own Ticket) | `OPEN`, `IN_PROGRESS`, `CANCELLED`‡ |
| `OPEN` | — | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`†, `CANCELLED`‡ |
| `IN_PROGRESS` | — | `WAITING_FOR_REQUESTER`, `RESOLVED`†, `CANCELLED`‡ |
| `WAITING_FOR_REQUESTER` | — | `IN_PROGRESS`, `RESOLVED`†, `CANCELLED`‡ |
| `RESOLVED` | `REOPENED` (own Ticket) | `CLOSED`†, `REOPENED` |
| `CLOSED` | — | `REOPENED` |
| `REOPENED` | — | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`†, `CANCELLED`‡ |
| `CANCELLED` | — | — (terminal) |

`RESOLVED → CLOSED` cannot normally meet an open Action, because BR-23 forbids new work on a resolved Ticket. The gate is still checked there, so data written outside the application cannot slip through.

### 5.3 Dashboard metric ledger

Predicates are written against the Ticket model. "Me" is the authenticated user. The seed-only values assume a database containing exactly the seed (§7): Staff values are as seen by Patricia Evans, Requester values by Jennifer Anderson. Tests compare against independent database counts, never against these constants.

| ID | Label | Scope | Predicate | Drill-down | Seed-only value |
|---|---|---|---|---|---|
| MET-S01 | Unassigned | IT Staff, Administrator | `ownerId IS NULL` and `ACTIVE` | Queue `ownerId=unassigned&statusGroup=active` | 2 |
| MET-S02 | Assigned to me | IT Staff, Administrator | `ownerId = me` and `ACTIVE` | Queue `ownerId=me&statusGroup=active` | 1 |
| MET-S03 | Urgent | IT Staff, Administrator | `itPriority = URGENT` and `ACTIVE` | Queue `itPriority=URGENT&statusGroup=active` | 3 |
| MET-S04 | Waiting for Requester | IT Staff, Administrator | `status = WAITING_FOR_REQUESTER` | Queue `status=WAITING_FOR_REQUESTER` | 1 |
| MET-S05 | Tickets by status | IT Staff, Administrator | `status = X`, one count per status | Queue `status=X` | NEW 2 · OPEN 1 · IN_PROGRESS 2 · WAITING 1 · RESOLVED 1 · CLOSED 1 · REOPENED 1 · CANCELLED 1 |
| MET-S06 | My open Actions | IT Staff, Administrator | Action `assigneeId = me` and `status IN (PLANNED, IN_PROGRESS)`; total plus the 10 oldest | Each item opens its Ticket Detail | 2 |
| MET-S07 | Recently updated | IT Staff, Administrator | all Tickets, top 5 by `updatedAt desc, id desc` | Ticket Detail; View all → Queue `sort=updatedAt:desc` | 5 rows |
| MET-R01 | Open | Requester | `requesterId = me` and `ACTIVE` | My Tickets `statusGroup=active` | 2 |
| MET-R02 | Needs my attention | Requester | `requesterId = me` and `status = WAITING_FOR_REQUESTER` | My Tickets `status=WAITING_FOR_REQUESTER` | 1 |
| MET-R03 | Resolved | Requester | `requesterId = me` and `status = RESOLVED` | My Tickets `status=RESOLVED` | 0 |
| MET-R04 | Closed | Requester | `requesterId = me` and `status = CLOSED` | My Tickets `status=CLOSED` | 0 |
| MET-R05 | Recently updated | Requester | `requesterId = me`, top 5 by `updatedAt desc, id desc` | Ticket Detail; View all → My Tickets `sort=updatedAt:desc` | 3 rows |

An Administrator sees the IT Staff dashboard with the same predicates. Under the seed, Margaret Hale's MET-S06 is 0, which demonstrates the zero state.

## 6. UI Specification Summary

The full specification is in `ui-spec.md`. Lab 2 and Lab 3 tokens, components, states, responsive rules and accessibility rules carry forward unchanged.

- **Shell:** Dashboard becomes the first navigation item for every role and therefore the landing page (`routes.ts homeFor`). The Requester routes to `/dashboard`; IT Staff and Administrators to `/staff/dashboard`.
- **New screens:** IT Staff Dashboard · Requester Dashboard.
- **Extended screens:**
  - IT Staff Ticket Detail gains Actions Taken (list, create mode, view/edit mode, assign, start, complete, cancel) and History.
  - Requester Ticket Detail gains a read-only Actions Taken list and status-only History.
  - The status control shows only permitted transitions and explains a blocked resolution.
- **New states:** conflict ("changed by someone else"), Ticket not workable, and resolution blocked by open Actions, beside the inherited loading, empty, no-results, validation, forbidden, not-found and safe-failure states.

## 7. Data Changes

All identifiers remain UUID, and timestamps remain `timestamptz` in UTC.

| Model | Change |
|---|---|
| `ActionTaken` | **New.** See the field list below. |
| `TicketEvent` | **New.** `id`, `ticketId`, `actorId`, `type`, `actionId?`, `payload` (JSON, BR-30), `createdAt` |
| `Ticket` | Adds `version Int @default(1)` (BR-31). Existing rows take the default. |
| Every other model | Unchanged |

`ActionTaken` fields:

- `id`, `ticketId`, `description`, `result?`, `followUpRequired`, `followUpNote?`, `attachmentNotes?`
- `status`, `assigneeId`, `performedById`
- `completedById?`, `completedAt?`, `cancelledById?`, `cancelledAt?`, `cancellationReason?`
- `requestId`, `version`, `createdAt` (the Action Date/Time), `updatedAt`

**Enums:**

- `ActionStatus { PLANNED, IN_PROGRESS, COMPLETED, CANCELLED }`
- `TicketEventType { STATUS_CHANGED, OWNER_CHANGED, IT_PRIORITY_CHANGED, ACTION_CREATED, ACTION_UPDATED, ACTION_ASSIGNED, ACTION_STARTED, ACTION_COMPLETED, ACTION_CANCELLED }`

**Relationships:**

- One `Ticket` has many `ActionTaken` and many `TicketEvent`.
- Each Action references four users by role: assignee, performer, completer and canceller, all named relations.
- Each event references its actor and optionally its Action.

Every foreign key is `ON DELETE RESTRICT`.

**Indexes:**

- `ActionTaken(ticketId, createdAt, id)` — the ordered Action list (BR-29)
- `ActionTaken(assigneeId, status)` — "My open Actions" (MET-S06)
- `ActionTaken(ticketId, requestId)` unique — idempotent creation (BR-34)
- `TicketEvent(ticketId, createdAt, id)` — ordered history
- `Ticket(updatedAt desc, id)` — the "Recently updated" lists (MET-S07, MET-R05)
- Lab 3's `Ticket(status, itPriority, createdAt)` and `Ticket(ownerId)` serve MET-S01 to MET-S05

**Migration strategy.**

- One additive migration creates the two enums, the two tables, the indexes and the append-only trigger, and adds `Ticket.version` with a default.
- No existing row is rewritten beyond that default, and no Action or event is backfilled (BR-21).
- Row counts from `server/scripts/row-counts.mjs` are compared before and after (BR-41).

**Recovery.**

- Prisma provides no down migration, so recovery is a verified restore.
- A disposable `_test` database at the Lab 3 state is dumped with `pg_dump -Fc`, migrated and checked.
- The dump is then restored with `pg_restore` into a second disposable database, whose counts must equal the pre-migration counts.
- Development data is never used.

**Seed (idempotent, stable identifiers).**

- The ten Lab 3 demo Tickets stay as they are.
- Eight Actions are added (BR-42):
  - `…900003` (OPEN, owner Patricia Evans): one PLANNED Action assigned to her.
  - `…900004` (IN_PROGRESS, owner Daniel Carter), three Actions:
    - COMPLETED, by and for Daniel;
    - IN_PROGRESS, created by Daniel and assigned to Olivia Reed;
    - PLANNED, created by Olivia and assigned to Daniel, with a follow-up.
  - `…900006` (RESOLVED): one COMPLETED and one CANCELLED Action.
  - `…900007` (CLOSED): one COMPLETED Action.
  - `…900010` (IN_PROGRESS, owner Margaret Hale): one IN_PROGRESS Action assigned to Patricia Evans. This is an Administrator-owned Ticket worked by IT Staff.
- `…900001`, `…900002`, `…900005`, `…900008` and `…900009` keep zero Actions.
- The seed writes no events. History starts with the first change made through the application.

### Database-design decisions

1. **Append-only history is enforced by the database, not only by the absence of an API.** A `BEFORE UPDATE OR DELETE` trigger on `TicketEvent` raises an error. A future endpoint, script or agent mistake therefore cannot rewrite history, and the rule can be proved by a direct SQL test (BR-27). `TRUNCATE` is not blocked, on purpose (11.16): the trigger fires per row, and the test and E2E cleanups reset disposable `_test` databases by truncating the table. The application itself has no code path that truncates it.
2. **A version column plus a Ticket row lock, rather than either alone.**
   - The version detects a user acting on a screen that is out of date (BR-31).
   - The `SELECT … FOR UPDATE` on the Ticket serialises "create Action" against "resolve/close/cancel", which a version on the Ticket alone would not, because creating an Action does not change the Ticket's version (BR-33).
3. **References, not name snapshots.** Users are deactivated, never deleted (`lab-03 BR-37`). A `RESTRICT` reference therefore always resolves and always shows the current display name, without duplicating personal data into every Action.
4. **Indexes follow the actual queries.** The Action list reads by Ticket in creation order, "My open Actions" reads by assignee and status, and the recency lists read by `updatedAt`. Each has a matching composite index, and the performance smoke test (AC-40) checks the result.

## 8. API Contract

Full shapes are in `api-spec.md`.

| Capability | Endpoint | Roles |
|---|---|---|
| List a Ticket's Actions | `GET /api/tickets/:id/actions` | Requester (own), IT Staff, Administrator |
| Create Action | `POST /api/tickets/:id/actions` | IT Staff, Administrator |
| Edit / reassign Action | `PATCH /api/tickets/:id/actions/:actionId` | IT Staff, Administrator |
| Start / complete / cancel Action | `PATCH /api/tickets/:id/actions/:actionId/status` | IT Staff, Administrator |
| Ticket history | `GET /api/tickets/:id/history` | Requester (own, status events), IT Staff, Administrator |
| Change Ticket status | `PATCH /api/staff/tickets/:id/status` — **now requires `expectedVersion`**, gate and cascade | per §5.2 |
| IT Staff dashboard | `GET /api/staff/dashboard` | IT Staff, Administrator |
| Requester dashboard | `GET /api/requester/dashboard` | Requester |
| Ticket lists | `GET /api/staff/tickets`, `GET /api/tickets` — **add `statusGroup=active`** | as Lab 3 |
| Ticket detail | `GET /api/staff/tickets/:id`, `GET /api/tickets/:id` — **add `version`, `openActionCount`** | as Lab 3 |

**Status codes:** Lab 3's set is unchanged. Additions:

- **409** for a state that forbids an otherwise valid request:
  - `OPEN_ACTIONS_BLOCK_RESOLUTION`
  - `TICKET_NOT_WORKABLE`
  - `ACTION_TERMINAL`
  - `STALE_VERSION`
- **400** for:
  - `ASSIGNEE_NOT_ELIGIBLE`
  - `INVALID_ACTION_TRANSITION`

### 8.1 Authorization matrix additions

Every Lab 3 row is unchanged. An operation absent from the matrix is denied (`lab-03 BR-12`).

| Operation | Requester | IT Staff | Administrator |
|---|---|---|---|
| Read Actions | ✅ `own` | ✅ any | ✅ any |
| Create / edit / assign / transition Action | — | ✅ any | ✅ any |
| Read history | ✅ `own`, status events only | ✅ any | ✅ any |
| Read IT Staff dashboard | — | ✅ | ✅ |
| Read Requester dashboard | ✅ `own` | — | — |

## 9. Acceptance Criteria

### Actions Taken

- **AC-01** Given a permitted IT Staff user and valid data, when an Action Taken is created, then it is saved under the correct Ticket with the authenticated creator as Performed by, the approved assignee, status `PLANNED` and a server-set Action Date/Time. *(labsheet §9.1)*
- **AC-02** Given an authenticated Requester, when dashboard data is retrieved, then only metrics and recent Tickets owned by that Requester are returned. *(labsheet §9.1)*
- **AC-03** Given a Ticket with several Actions created by different IT Staff, when its detail is opened by IT Staff or by its Requester, then every Action is listed with all seven fields, assignee and status, in creation order.
- **AC-04** Given an Action create or update naming an inactive, Requester or unknown assignee, when it is submitted, then it is refused with `ASSIGNEE_NOT_ELIGIBLE` and nothing changes.
- **AC-05** Given a non-terminal Action, when IT Staff reassign it to another active IT Staff or Administrator user, then the assignee changes and Performed by does not.
- **AC-06** Given a `PLANNED` Action, when it is started and then completed with a Result, then it is `COMPLETED` with server-set `completedBy` and `completedAt`.
- **AC-07** Given an `IN_PROGRESS` Action, when completion is requested with a blank Result, then it is refused with a field error on Result and the Action stays `IN_PROGRESS`.
- **AC-08** Given a non-terminal Action, when it is cancelled with a reason, then it is `CANCELLED` with the reason, `cancelledBy` and `cancelledAt` recorded; without a reason, the request is refused.
- **AC-09** Given a `COMPLETED` or `CANCELLED` Action, when an edit, reassignment or transition is requested, then it is refused with 409 `ACTION_TERMINAL` and nothing changes.
- **AC-10** Given Follow-Up Required set without a Follow-up Note, when the Action is saved, then it is refused with a field error on the note. Given Follow-Up Required cleared, the stored note is empty.
- **AC-11** Given a create or update body that supplies Performed by, Action Date/Time, completion or cancellation fields, when it is processed, then it is refused with 400 and nothing is stored.
- **AC-12** Given a Requester, when any Action write endpoint is called directly, then it is refused with 403 and nothing changes. Given another Requester's Ticket, when its Actions or history are requested, then the response is 404.
- **AC-13** Given a Ticket in `RESOLVED`, `CLOSED` or `CANCELLED`, when an Action write is requested, then it is refused with 409 `TICKET_NOT_WORKABLE`.
- **AC-14** Given the same create request sent twice with the same request identifier, when both are processed, then exactly one Action exists and both responses identify it.

### Ticket workflow

- **AC-15** Given a Ticket with a `PLANNED` or `IN_PROGRESS` Action, when `RESOLVED` or `CLOSED` is requested, including directly against the API, then it is refused with 409 `OPEN_ACTIONS_BLOCK_RESOLUTION`, the open-Action count is reported, and the status is unchanged.
- **AC-16** Given a Ticket whose Actions are all `COMPLETED` or `CANCELLED`, or that has no Actions, when IT Staff resolve it, then it becomes `RESOLVED`.
- **AC-17** Given a Ticket with open Actions, when it is cancelled, then the Ticket is `CANCELLED` and every open Action is `CANCELLED` with the system reason, in one transaction.
- **AC-18** Given any role and Ticket state, when Ticket detail is loaded, then the permitted transitions are exactly those §5.2 allows, excluding `RESOLVED` and `CLOSED` while Actions are open.
- **AC-19** Given a Ticket status change, or an Action edit, reassignment or transition, sent with an outdated expected version, when it is processed, then it is refused with 409 `STALE_VERSION`, nothing changes, and the response carries the current version.
- **AC-20** Given an Action creation and a resolution request on the same Ticket at the same time, when both finish, then the Ticket is never `RESOLVED` or `CLOSED` while holding an open Action.
- **AC-21** Given a status change in the interface, when it succeeds, then the Ticket summary status and the permitted controls refresh. When it is refused, the previous status stays shown with the reason.
- **AC-22** Given material changes to a Ticket and its Actions, when its history is read, then each change appears once, in order, with actor, type and time, and the database rejects any update or deletion of an event.
- **AC-23** Given a Requester, when the history of their Ticket is read, then only status-change events are returned. IT Staff and Administrators receive every event.
- **AC-24** Given records with identical creation times, when Actions, comments, notes or events are listed repeatedly, then their order is identical every time.
- **AC-25** Given a Ticket with open Actions, when its Requester indicates the problem appears resolved, then the indication is recorded and the status is unchanged.

### Dashboards

- **AC-26** Given IT Staff, when the dashboard is retrieved, then every §5.3 metric equals an independent database count using the same predicate.
- **AC-27** Given any dashboard metric, when its drill-down is followed, then the list shows exactly the Tickets counted, and its total equals the metric.
- **AC-28** Given IT Staff with open assigned Actions, when the dashboard opens, then the total and at most 10 open Actions, oldest first, are shown, and each opens its Ticket Detail.
- **AC-29** Given a user with no matching records, when the dashboard opens, then zeros and empty states are shown, not errors.
- **AC-30** Given a Requester, when the IT Staff dashboard endpoint is called, then it is refused with 403. Given IT Staff or an Administrator, when the Requester dashboard endpoint is called, then it is refused with 403.
- **AC-31** Given a dashboard load failure, when it happens, then a safe failure with Try again is shown, and a successful retry shows the dashboard.
- **AC-32** Given a successful sign-in by any role, when it completes, then the user lands on the Dashboard, which is first and active in the navigation.
- **AC-33** Given `statusGroup=active` on the Queue or My Tickets, when listed, then only `ACTIVE` Tickets are returned. Combined with `status`, the request is refused with 400.

### Hardening and regression

- **AC-34** Given each new or changed screen at desktop, tablet and mobile widths, when rendered, then nothing is clipped or overlapping and the page does not scroll horizontally.
- **AC-35** Given keyboard-only use, when the Action form, status control, dialogs and dashboard drill-downs are operated, then every control is reachable with visible focus, and a dialog traps focus and returns it on close.
- **AC-36** Given a recoverable save failure or a conflict on the Action form, when it occurs, then the entered values remain and the user can retry.
- **AC-37** Given the complete Lab 1–3 automated suites, when run against the Lab 4 code, then they pass with no skipped, focused or disabled test.
- **AC-38** Given a database at the Lab 3 state, when the Lab 4 migration runs, then every pre-existing table keeps its row count and valid foreign keys, and restoring the pre-migration backup reproduces the original counts.
- **AC-39** Given the seed run twice, when counts are compared, then nothing is duplicated and Tickets with zero, one and several Actions exist.
- **AC-40** Given about 2,000 Tickets and 6,000 Actions locally, when each dashboard endpoint is called 20 times, then p95 latency is at most 300 ms and the number of queries does not grow with the data.
- **AC-41** Given the E2E journeys, when they run, then no console error, broken link, placeholder text or no-op control is observed.

*Traceability from each criterion to its planned tests and evidence is maintained in `tests.md`.*

## 10. Definition of Done

### Part 1 — Product completion

- All approved scope in §3 is implemented, and nothing from the excluded list was added.
- Every acceptance criterion in §9 is linked to a passing automated test or recorded observable evidence.
- Every new protected operation in §8.1 has a test that calls it directly as each refused role and unauthenticated.
- BR-20, BR-22 and BR-33 are proved by real PostgreSQL tests, including a genuinely concurrent request pair.
- The migration preserves every row count, and the documented recovery restore has been executed successfully on a disposable database.
- The seed is idempotent across two runs.
- All server, client and E2E suites pass from the documented commands on the final `main`, with no skipped, focused or disabled test.
- Both production builds pass. Client lint has no errors, and any warning is disclosed.
- The performance smoke result (AC-40) is recorded with machine, dataset and command.
- No password, hash, session identifier or secret appears in any response, log, fixture, screenshot or committed file. `.env` and `.env.test` remain untracked.
- Screens conform to `ui-spec.md` and `style-contract.md`, and the §13 visual and accessibility checklist is completed with real results.
- An E2E run never rewrites committed Lab 2 or Lab 3 screenshots; evidence capture is explicit (`CAPTURE_EVIDENCE=1`).
- README, `AGENTS.md` and the test commands describe Lab 4 accurately.

### Part 2 — Course delivery

- Issues exist on the six-column board before their implementation and move through it truthfully, one active Issue at a time.
- Each Issue is implemented on its own branch and enters `lab4-staging` through a reviewed Pull Request linked through the Development panel. The reviewer merges, and the author answers every comment.
- One release Pull Request goes from `lab4-staging` to `main`, opened only after the staging gate passes.
- No Pull Request exists only to record that another Pull Request merged.
- `docs/lab-04/` contains `specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`, `reviewer.md` and `ai-use.md`.
- The report itself is governed separately and is not part of the product's Definition of Done.

## 11. Assumptions and Decisions

All decisions below were approved by the student on 3 October 2026 in four rounds, each answered "ตามที่แนะนำ" ("as recommended"). The student's private planning notes record the exact wording.

**11.1 Actions have an assignee and a lifecycle the labsheet field list does not name.**
Labsheet §4.1 lists seven fields. Part 6 and example AC-01, however, require assignment, status transitions, completion, cancellation and inactive-assignee rejection. The lifecycle `PLANNED → IN_PROGRESS → COMPLETED`, with cancellation, is taken from the System-Level SDS (pp. 7, 12) because it is the course's own design baseline for service work.

**11.2 Any active IT Staff or Administrator may act on any non-terminal Action.**
Lab 3 lets every IT Staff member act on every Ticket. Restricting completion to the assignee would block work when that person is away, and would multiply the permission tests, without a stakeholder need. Accountability comes from Performed by, `completedBy`, `cancelledBy` and the history.

**11.3 Action Date/Time is the server's creation time.**
Labsheet §8.3 names it "Action create date/time". A user-entered occurrence time would need rules for past and future values that nothing in the request asks for.

**11.4 Requesters see every Action field.**
Labsheet §8.3 says Requesters "will see all Actions Taken items". Internal Notes already provide a private channel, and the form says so.

**11.5 The resolution gate means "no open work", not "work was recorded".**
Requiring at least one completed Action would need an exception for every legacy Ticket, and would turn trivial or duplicate Tickets into busywork.

**11.6 Ticket cancellation cascades to open Actions without a new mandatory reason.**
The SDS (p. 11) requires a cancellation reason and the cascade. The cascade is adopted, because open work on a cancelled Ticket would pollute "My open Actions". The new reason field is not adopted, because it would change the Lab 3 request shape and screens for every role.

**11.7 Actions are writable only while the Ticket is in a working status, and never change the Ticket status.**
This keeps BR-20 true by construction and avoids hidden status changes that the "permitted transitions only" rule (labsheet §8.4) could not show.

**11.8 History is a new append-only `TicketEvent`.**
`lab-02 §11.10` deferred the SDS event log. Lab 4's Part 7 asks for append-only behaviour and stable ordering in the workflow itself, so the deferral ends here, scoped to the events in BR-26.

**11.9 Optimistic concurrency is required on status changes and Action writes only.**
Labsheet §6.1 asks that a user never unknowingly overwrite another's workflow change. The Lab 3 owner and IT Priority endpoints keep their request shape to protect the existing contract and tests, but their changes increment the version, so a stale status change after them is still detected. The status endpoint's new required `expectedVersion` is a recorded change to `lab-03` `api-spec.md` §8; its Lab 3 UI and tests are updated in the same increment.

**11.10 Dashboards have no time-windowed metrics.**
Every labsheet example can be expressed as a state count or a "five most recent" list. That removes calendar-boundary and time-zone edge cases from correctness while keeping the dashboards useful.

**11.11 Both Ticket lists gain `statusGroup=active`.**
Lab 2 and Lab 3 accept a single `status`. An "Open" metric spans five statuses, and its drill-down must show exactly the counted Tickets (BR-37).

**11.12 Dashboard is the landing page for every role, and Administrators reuse the IT Staff dashboard.**
Labsheet §8.1 calls the dashboard "a concise operational starting point", and §4.6 allows the reuse. One E2E assertion from Lab 3 (landing on My Tickets) changes accordingly.

**11.13 Evidence capture is explicit.**
Every Lab 3 E2E run rewrote 48 committed screenshots. From Lab 4, a normal run writes only to ignored runner output, and captures go to `artifacts/lab-04/screenshots/` only with `CAPTURE_EVIDENCE=1`.

**11.14 Quality targets are local and measurable.**
The performance smoke test (AC-40) runs on the student's Mac against a disposable dataset. It is reported as a local measurement, not as production capacity.

**11.15 Supersessions of the System-Level SDS recorded by this sprint.**

- Ticket vocabulary and the Requester's cancel and reopen rights follow `lab-03 BR-20` and `§5.1`, not D-02.
- Ticket cancellation carries no new reason field (11.6).
- Reopening goes to `REOPENED` (Lab 3), not to In Progress or New.
- The API prefix `/api` and validation status 400 follow `lab-02 §11.3–§11.4`.
- Attachments remain on the local filesystem (`lab-02 §11.5`).

**11.16 Gaps in this contract found while building the Action API (#90), recorded in the Pull Request that closes them.**
Each is covered by a test; the test IDs are in `tests.md`.

1. **An edit that changes nothing is a success, not an error.** When every supplied field equals the stored value and the assignee is unchanged, `PATCH /api/tickets/:id/actions/:actionId` answers 200 with the unchanged Action: no new version and no event (BR-31 counts changes). A request that supplies no editable field at all stays 400 `VALIDATION_FAILED`. Test API-04, API-10.
2. **Event payloads are stored as identifiers.** BR-30 already limits a payload to identifiers, statuses, priorities and field names. The `details` examples in `api-spec.md` §2 show display names because the history endpoint (#92) resolves identifiers to current display names when it reads, so a renamed person shows the current name. Test API-18.
3. **An Action addressed under the wrong Ticket is not found.** Any Action write or status change whose `:actionId` does not belong to `:id`, does not exist, or is not a UUID answers 404 `ACTION_NOT_FOUND`, the same in every case, and changes nothing (BR-01). The code is new in `api-spec.md` §1. Test API-14.
4. **The seed has eight Actions, not nine.** The list in §7 always summed to eight (1 + 3 + 2 + 1 + 1) and the seed and its test agree; the word "Nine" was a drafting error, corrected in #95. A second seed run now also leaves every Action column as it was, including `updatedAt`. Test MIG-04.
5. **`TRUNCATE` of the history table is allowed.** The append-only trigger rejects row `UPDATE` and `DELETE` (BR-27) but not `TRUNCATE`, so that disposable test databases can be reset (§7, decision 1). Test MIG-05 proves the trigger rejects `UPDATE` and `DELETE`, leaves the row alone, and still allows the reset.
