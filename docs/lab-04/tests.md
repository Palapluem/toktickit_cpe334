# Lab 4 Test Plan and Results

**Version:** 1.0 — approved for implementation, 3 October 2026
**Status:** Planned before implementation. **No test in this plan has been written or run.** Every Final column reads `NOT RUN` until a real run on a named commit proves otherwise.
**Standard:** `docs/lab-02/testing-contract.md` (TC, TCS, TDT and red-phase rules) applies unchanged. Every test names the identifier it proves (TCS-01).

---

## 1. Test Strategy

| Level | Proves | Tool | Runs against |
|---|---|---|---|
| Unit | Pure rules: Action lifecycle, field validation, gate-aware transitions, ordering, event payloads, metric predicates | Vitest | No database |
| API integration | Handler + validation + Prisma + PostgreSQL over HTTP | Vitest + Supertest | `toktickit_test` |
| Security / authorization | Every new operation called **directly** as each refused role and unauthenticated | Vitest + Supertest | `toktickit_test` |
| Workflow | Every §5.2 edge, the gate, the cascade, history and concurrency, including genuinely parallel requests | Vitest + Supertest | `toktickit_test` |
| Migration / recovery / seed | Lab 3-state data survives the migration; the backup restores; the seed is idempotent | Script + Vitest | Disposable `_test` databases |
| Performance smoke | Dashboard p95 and constant query count on a local 2,000-Ticket dataset | Script | Disposable `_test` database |
| UI component and style | Rendering, validation, states, focus and token compliance; network mocked | Vitest + Testing Library | jsdom |
| Responsive, accessibility, E2E | Whole journeys at three viewports and the boundary widths | Playwright | `toktickit_e2e_test` |
| Regression | Every Lab 1–3 suite, after every change | All of the above | As each suite defines |

**Techniques** (testing contract §2):

- equivalence partitions for roles and assignees;
- boundary values for every length limit;
- decision tables for the gate-aware transition matrix and dashboard predicates;
- state transitions for both lifecycles;
- error guessing for double submission, stale screens, concurrent resolve-versus-create and cross-Ticket identifiers.

**TDD.** Each implementation Issue commits its failing tests first (`test:`), with captured assertion failures, then the implementation (`feat:`/`fix:`) and the passing run (testing contract §5). A seam needed by a test is a stub returning a neutral value, never an import error.

**Isolation.**

- Suites run one at a time on `_test` databases, never `toktickit_dev`.
- E2E runs write evidence only when `CAPTURE_EVIDENCE=1` (ui-spec §10). After every run, `git status -- artifacts` must show only intended Lab 4 captures.
- A UI failure, loading or empty state produced by API interception is labelled *fixture*. Backend behaviour is proved by the API tests, not by those captures.

---

## 2. Planned Tests

### Unit

| Test ID | Type | Requirement / BR / AC | What it tests | Expected result | Test file | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-09, BR-10 | Every Action (from, to) pair | Only §5.1 moves are allowed; terminal states allow none | `server/tests/lab-04/action-rules.unit.test.ts` | PASS (#98) |
| UNIT-02 | Unit | BR-12–BR-16, AC-10 | Boundaries: Description 0/1/2000/2001 · Result 2000/2001 · Follow-up Note conditional, 1/2000/2001 · Reason 0/1/500/501 · Attachment Notes 500/501 · whitespace-only | Correct field error per case; stored values trimmed | `server/tests/lab-04/action-rules.unit.test.ts` | PASS (#98) |
| UNIT-03 | Unit | BR-11, AC-07 | Effective Result at completion (stored, supplied, blank) | Completion allowed only with a non-blank effective Result | `server/tests/lab-04/action-rules.unit.test.ts` | PASS (#98) |
| UNIT-04 | Unit | BR-20, BR-23, AC-18 | Decision table: role × Ticket status × open-Action count | `RESOLVED`/`CLOSED` omitted exactly when the count > 0; blocked list reports the count | `server/tests/lab-04/workflow-rules.unit.test.ts` | NOT RUN |
| UNIT-05 | Unit | BR-29, AC-24 | Ordering comparator with equal timestamps | Deterministic `(createdAt, id)` order | `server/tests/lab-04/workflow-rules.unit.test.ts` | NOT RUN |
| UNIT-06 | Unit | BR-30 | Event payload builder for each event type | Only identifiers, statuses, priorities and field names; no free text | `server/tests/lab-04/workflow-rules.unit.test.ts` | NOT RUN |
| UNIT-07 | Unit | BR-36, BR-37 | `ACTIVE` group and each metric's query object | Exactly five statuses; each query reproduces its predicate | `server/tests/lab-04/dashboard-metrics.unit.test.ts` | PASS (9/9; mutation check failed as expected when `REOPENED` was removed) |

### API — Actions Taken

| Test ID | Type | Requirement / BR / AC | What it tests | Expected result | Test file | Final |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01, BR-05 | IT Staff creates a valid Action | 201; `PLANNED`; Performed by = caller; assignee as sent; server `actionAt`; verified by reading the row back | `server/tests/lab-04/actions-taken.api.test.ts` | PASS (#98) |
| API-02 | API | AC-03, BR-02 | Staff A owns the Ticket, Staff B creates an Action assigned to Staff C; list | All fields returned; owner, performer and assignee all differ; creation order | `server/tests/lab-04/actions-taken.api.test.ts` | PASS (#98) |
| API-03 | API | AC-04, BR-07 | Assignee inactive, a Requester, unknown, or deactivated after the list was fetched | 400 `ASSIGNEE_NOT_ELIGIBLE`; nothing stored. Also the labsheet Part 6 inactive-assignee rejection: cases "an inactive IT Staff user" and "deactivated after the list was fetched"; reassigning to an ineligible user is API-04 | `server/tests/lab-04/actions-taken.api.test.ts` | PASS (#98) |
| API-04 | API | AC-05, BR-08 | Reassign a non-terminal Action | Assignee changed; Performed by unchanged; version +1; `ACTION_ASSIGNED` written | `server/tests/lab-04/actions-taken.api.test.ts` | PASS (#98) |
| API-05 | API | AC-06 | `PLANNED → IN_PROGRESS → COMPLETED` with a Result | `COMPLETED`; `completedBy`/`completedAt` set by the server | `server/tests/lab-04/actions-taken.api.test.ts` | PASS (#98) |
| API-06 | API | AC-07, BR-11 | Complete with a blank Result | 400 with a field error on `result`; status unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | PASS (#98) |
| API-07 | API | AC-08, BR-12 | Cancel with and without a reason | `CANCELLED` with reason, `cancelledBy`, `cancelledAt` / 400 | `server/tests/lab-04/actions-taken.api.test.ts` | PASS (#98) |
| API-08 | API | AC-09, BR-10 | Edit, reassign and transition `COMPLETED` and `CANCELLED` Actions | 409 `ACTION_TERMINAL`; row unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | PASS (#98) |
| API-09 | API | AC-10, BR-14 | Follow-up required without a note; follow-up later cleared | 400 field error / stored note becomes null | `server/tests/lab-04/actions-taken.api.test.ts` | PASS (#98) |
| API-10 | API | AC-11, BR-05 | Body supplies Performed by, `createdAt`, completion fields, `status` or `version` | 400 `VALIDATION_FAILED`; nothing stored | `server/tests/lab-04/actions-taken.api.test.ts` | PASS (#98) |
| API-11 | API | AC-13, BR-23 | Every Action write on `RESOLVED`, `CLOSED` and `CANCELLED` Tickets | 409 `TICKET_NOT_WORKABLE` | `server/tests/lab-04/actions-taken.api.test.ts` | PASS (#98) |
| API-12 | API | AC-14, BR-34 | Same `requestId` sent twice, sequentially and in parallel | Exactly one Action; both responses carry its id; the repeat returns 200 | `server/tests/lab-04/actions-taken.api.test.ts` | PASS (#98) |
| API-13 | API | AC-19, BR-31 | Action edit and transition with an outdated `expectedVersion` | 409 `STALE_VERSION` with `currentVersion`; nothing changes | `server/tests/lab-04/actions-taken.api.test.ts` | PASS (#98) |
| API-14 | API | BR-01 | An `actionId` of another Ticket used under this Ticket's path | 404; nothing changes | `server/tests/lab-04/actions-taken.api.test.ts` | PASS (#98) |
| API-15 | API | BR-35 | Ticket `updatedAt` after Action writes and after a comment | Changed by Action writes; unchanged by the comment | `server/tests/lab-04/actions-taken.api.test.ts` | PASS (#98) |
| API-16 | API | AC-03, BR-17 | Requester reads their own Ticket's Actions | Requester view: display names only, no ids, emails or `isActive`, including the names of who completed or cancelled | `server/tests/lab-04/actions-taken.api.test.ts` | PASS (#98) |
| API-17 | API | BR-33 | Create an Action while another transaction holds the Ticket row, once with no change and once after the holder moved the Ticket to `RESOLVED` | The create is known to be blocked (a lock wait is visible in the database), finishes with 201 after the release, or reads the Ticket after the lock and answers 409 `TICKET_NOT_WORKABLE` | `server/tests/lab-04/actions-taken.api.test.ts` | PASS (#98) |
| API-18 | API | BR-26, BR-30 | One event per Action write; an event that cannot be written | Identifiers and field names only, no free text; the Action write is rolled back | `server/tests/lab-04/actions-taken.api.test.ts` | PASS (#98) |

### Security / authorization — called directly, never through the UI

| Test ID | Type | Requirement / BR / AC | What it tests | Expected result | Test file | Final |
|---|---|---|---|---|---|---|
| SEC-01 | Security | AC-12, BR-18 | Requester calls create, edit and status on their own Ticket's Actions | 403 `FORBIDDEN`; database unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | PASS (#98) |
| SEC-02 | Security | AC-12, AC-23 | Requester reads Actions and history of another Requester's Ticket | 404, identical to a missing Ticket | `server/tests/lab-04/actions-taken.api.test.ts` (Actions) · `server/tests/lab-04/ticket-workflow.api.test.ts` (history) | PARTIAL: Actions endpoints PASS (#98); history and dashboards follow in #92 and #93 |
| SEC-03 | Security | lab-03 BR-12 | Every new endpoint without a session | 401 for each | `server/tests/lab-04/actions-taken.api.test.ts` (Actions) · `server/tests/lab-04/ticket-workflow.api.test.ts` (history) | PARTIAL: Actions endpoints PASS (#98); history and dashboards follow in #92 and #93 |
| SEC-04 | Security | AC-30 | Requester → IT Staff dashboard; IT Staff and Administrator → Requester dashboard | 403 for each | `server/tests/lab-04/staff-dashboard.api.test.ts` | PASS (full server suite: 568/568) |
| SEC-05 | Security | AC-02, BR-39 | Requester dashboard with two Requesters' Tickets present | Counts and rows from the caller's Tickets only; no foreign ids | `server/tests/lab-04/requester-dashboard.api.test.ts` | PASS (full server suite: 568/568; ownership mutation detected) |
| SEC-06 | Security | AC-22, BR-27 | Direct SQL `UPDATE` and `DELETE` on an event row | Both rejected by the trigger; row unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | NOT RUN |
| SEC-07 | Security | BR-30; testing contract §7 | Action, history and dashboard responses scanned for hashes, session ids, other users' emails | None present | `server/tests/lab-04/actions-taken.api.test.ts` (Actions) · `server/tests/lab-04/ticket-workflow.api.test.ts` (history) | PARTIAL: Actions endpoints PASS (#98); history and dashboards follow in #92 and #93 |

### Workflow

| Test ID | Type | Requirement / BR / AC | What it tests | Expected result | Test file | Final |
|---|---|---|---|---|---|---|
| WF-01 | Workflow | AC-15, BR-20 | `RESOLVED` requested directly with a `PLANNED`, then an `IN_PROGRESS`, Action | 409 `OPEN_ACTIONS_BLOCK_RESOLUTION` with `openActionCount`; status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | NOT RUN |
| WF-02 | Workflow | AC-15, BR-20 | `CLOSED` requested on a `RESOLVED` Ticket holding an open Action inserted directly into the database | 409; the gate holds against out-of-band data | `server/tests/lab-04/ticket-workflow.api.test.ts` | NOT RUN |
| WF-03 | Workflow | AC-16 | Resolve when every Action is terminal | `RESOLVED`; `STATUS_CHANGED` written | `server/tests/lab-04/ticket-workflow.api.test.ts` | NOT RUN |
| WF-04 | Workflow | AC-16, BR-21 | Resolve a zero-Action Ticket and a seeded legacy Ticket | `RESOLVED` | `server/tests/lab-04/ticket-workflow.api.test.ts` | NOT RUN |
| WF-05 | Workflow | AC-17, BR-22 | Cancel a Ticket with two open and one completed Action; repeat with a failure injected after the cascade | Ticket `CANCELLED`; two Actions cancelled with the system reason and `cancelledBy`; completed one untouched / with the injected failure, nothing persisted | `server/tests/lab-04/ticket-workflow.api.test.ts` | NOT RUN |
| WF-06 | Workflow | AC-18, BR-19 | Every §5.2 cell for Requester, IT Staff and Administrator | Each permitted edge succeeds; each absent edge is refused (400 or 403, as in Lab 3) | `server/tests/lab-04/ticket-workflow.api.test.ts` | NOT RUN |
| WF-07 | Workflow | AC-19, BR-31 | Status change with the version read before an owner change | 409 `STALE_VERSION`; the owner change is kept | `server/tests/lab-04/ticket-workflow.api.test.ts` | NOT RUN |
| WF-08 | Workflow | AC-20, BR-33 | Create-Action and resolve sent concurrently, repeated 20 times | Never `RESOLVED` with an open Action; in each pair, one request is refused or ordered after the other | `server/tests/lab-04/ticket-workflow.api.test.ts` | NOT RUN |
| WF-09 | Workflow | AC-22, BR-26 | A scripted sequence of status, owner, priority and Action changes | One event per change, with the right type, actor and order | `server/tests/lab-04/ticket-workflow.api.test.ts` | NOT RUN |
| WF-10 | Workflow | AC-23, BR-28 | The same history read by its Requester and by IT Staff | Requester gets `STATUS_CHANGED` only; IT Staff get every event | `server/tests/lab-04/ticket-workflow.api.test.ts` | NOT RUN |
| WF-11 | Workflow | AC-24, BR-29 | Actions, comments, notes and events inserted with identical `createdAt` | Identical order across five repeated reads | `server/tests/lab-04/ticket-workflow.api.test.ts` | NOT RUN |
| WF-12 | Workflow | AC-25, BR-25 | Requester resolution indication on a Ticket with open Actions | Indication recorded; status unchanged; version +1 | `server/tests/lab-04/ticket-workflow.api.test.ts` | NOT RUN |
| WF-13 | Workflow | BR-32 | Owner and IT Priority changes in the Lab 3 request shape | Succeed without a version; version +1; event written | `server/tests/lab-04/ticket-workflow.api.test.ts` | NOT RUN |
| WF-14 | Workflow | AC-19, BR-31 | Status change without `expectedVersion` | 400 `VALIDATION_FAILED` | `server/tests/lab-04/ticket-workflow.api.test.ts` | NOT RUN |

### Dashboards and lists

| Test ID | Type | Requirement / BR / AC | What it tests | Expected result | Test file | Final |
|---|---|---|---|---|---|---|
| DASH-01 | API | AC-26, BR-37 | MET-S01–S05 against independent, hand-written SQL `COUNT` queries over a fixture set, including urgent Tickets in each terminal status | Every value equal; terminal urgent Tickets excluded from the active urgent count | `server/tests/lab-04/staff-dashboard.api.test.ts` | PASS (full server suite: 568/568) |
| DASH-02 | API | AC-27 | Queue called with each metric's returned `query`, including an urgent Ticket in each terminal status | `totalItems` equals the count; the id set equals the SQL set and excludes terminal urgent Tickets | `server/tests/lab-04/staff-dashboard.api.test.ts` | PASS (full server suite: 568/568) |
| DASH-03 | API | AC-28 | 12 open Actions assigned to me, plus terminal ones and others' | Total 12; 10 items, oldest first; terminal and others' excluded | `server/tests/lab-04/staff-dashboard.api.test.ts` | PASS (full server suite: 568/568; fixture owns all 12 open Actions) |
| DASH-04 | API | AC-29 | Administrator with no open Actions; statuses with zero Tickets | Zeros and empty arrays; all eight statuses present; 200 | `server/tests/lab-04/staff-dashboard.api.test.ts` | PASS (full server suite: 568/568) |
| DASH-05 | API | BR-38 | Recently updated, including equal `updatedAt` values | Top five by `updatedAt desc, id desc` | `server/tests/lab-04/staff-dashboard.api.test.ts` | PASS (full server suite: 568/568) |
| DASH-06 | API | AC-40, BR-40 | Response size and query count with 50 vs 500 Tickets | Same query count; at most 5 and 10 rows | `server/tests/lab-04/staff-dashboard.api.test.ts` | PASS (full server suite: 568/568) |
| DASH-07 | API | AC-02, AC-26, BR-38 | MET-R01–R04 against independent SQL with `requesterId`; all eight statuses represented; recent list checked with more than five Tickets | Every value equal; only own Tickets; exactly the five newest fixture Tickets in descending `updatedAt` order | `server/tests/lab-04/requester-dashboard.api.test.ts` | PASS (full server suite: 568/568; ownership mutation check failed as expected) |
| DASH-08 | API | AC-27 | My Tickets called with each Requester metric's `query`; all eight statuses represented | `totalItems` equals the count and the returned id set exactly matches each metric predicate | `server/tests/lab-04/requester-dashboard.api.test.ts` | PASS (full server suite: 568/568) |
| DASH-09 | API | AC-29 | Requester with no Tickets | `totalTickets = 0`; all counts 0; empty list | `server/tests/lab-04/requester-dashboard.api.test.ts` | PASS (full server suite: 568/568) |
| DASH-10 | API | AC-33, FR-20 | `statusGroup=active` on both lists; combined with `status`; unknown value | Only `ACTIVE` Tickets / 400 / 400 | `server/tests/lab-04/requester-dashboard.api.test.ts` | PASS (full server suite: 568/568) |

### Migration, recovery, seed, performance

| Test ID | Type | Requirement / BR / AC | What it tests | Expected result | Test file | Final |
|---|---|---|---|---|---|---|
| MIG-01 | Migration | AC-38, BR-41 | Disposable database at the Lab 3 state, migrated to Lab 4; counts per table and FK checks | Identical counts for every pre-existing table; no orphaned reference | `server/scripts/verify-migration.mjs` (output retained) | PASS (#98) |
| MIG-02 | Recovery | AC-38 | `pg_dump -Fc` before migrating, then `pg_restore` into a new disposable database | Restored counts equal the pre-migration counts | `server/scripts/verify-migration.mjs` | PASS (#98) |
| MIG-03 | Migration | AC-38, BR-21 | Legacy Tickets after migration | Status unchanged; zero Actions; `version = 1` | `server/tests/lab-04/migration-seed.api.test.ts` | PASS (#98) |
| MIG-04 | Seed | AC-39, BR-42 | Seed run twice | No duplicates, every Action column unchanged by the second run; Tickets with 0, 1 and several Actions exist | `server/tests/lab-04/migration-seed.api.test.ts` | PASS (#98) |
| MIG-05 | Migration | BR-27 | Direct SQL `UPDATE` and `DELETE` on an event row; then `TRUNCATE` | Both rejected by the trigger and the row is unchanged; the reset by `TRUNCATE` still works | `server/tests/lab-04/migration-seed.api.test.ts` | PASS (#98) |
| PERF-01 | Performance | AC-40 | 2,000 Tickets / 6,000 Actions; each dashboard endpoint called 20 times | p95 ≤ 300 ms; machine, dataset and command recorded | `server/scripts/perf-smoke.mjs` | PASS — Darwin 27.0.0, Apple M5, Node v26.7.0; 2,000 synthetic Tickets / 6,000 Actions + seeded baseline; p95 staff 4.50 ms, requester 1.86 ms (`server`: `./node_modules/.bin/tsx scripts/perf-smoke.mjs`; disposable `toktickit_codex93_test`) |
| PERF-02 | Performance | AC-40, BR-40 | Query count at 200 vs 2,000 Tickets | Equal | `server/scripts/perf-smoke.mjs` | PASS — staff 7→7, requester 2→2 queries/request (`./node_modules/.bin/tsx scripts/perf-smoke.mjs`; disposable `toktickit_codex93_test`) |

### UI component

| Test ID | Type | Requirement / BR / AC | What it tests | Expected result | Test file | Final |
|---|---|---|---|---|---|---|
| UI-01 | UI | AC-03 | Actions list | Every field rendered in creation order; "(inactive)" marker; table ≥ 992 px, cards below | `client/tests/lab-04/ActionsTaken.test.tsx` | NOT RUN |
| UI-02 | UI | AC-10, BR-13–BR-15 | Create form: required, conditional and boundary inputs | Field messages; API not called while invalid; note hidden and cleared when unticked | `client/tests/lab-04/ActionsTaken.test.tsx` | NOT RUN |
| UI-03 | UI | BR-06, BR-07 | Assignee control | Defaults to the current user; options are `assignableOwners` only | `client/tests/lab-04/ActionsTaken.test.tsx` | NOT RUN |
| UI-04 | UI | AC-07 | Complete without a Result | Field error under Result, focus moved there; no request | `client/tests/lab-04/ActionsTaken.test.tsx` | NOT RUN |
| UI-05 | UI | AC-08, AC-35 | Cancel dialog | Reason required; focus trapped; Escape closes; focus returns to the trigger | `client/tests/lab-04/ActionsTaken.test.tsx` | NOT RUN |
| UI-06 | UI | AC-09 | Terminal Action | Read-only, with no Edit or status buttons | `client/tests/lab-04/ActionsTaken.test.tsx` | NOT RUN |
| UI-07 | UI | AC-13 | Ticket not workable | Banner replaces Add Action; no edit controls | `client/tests/lab-04/ActionsTaken.test.tsx` | NOT RUN |
| UI-08 | UI | AC-12, BR-17 | Requester view | Read-only; no controls; display names only | `client/tests/lab-04/ActionsTaken.test.tsx` | NOT RUN |
| UI-09 | UI | FR-24, AC-14 | Busy state, double click and retry | Save disabled while in flight; one request per click burst; retry reuses `requestId` | `client/tests/lab-04/ActionsTaken.test.tsx` | NOT RUN |
| UI-10 | UI | AC-36 | Save failure and `STALE_VERSION` | Entered values kept; conflict or failure message; save possible again | `client/tests/lab-04/ActionsTaken.test.tsx` | NOT RUN |
| UI-11 | UI | AC-18, AC-21 | Status control | Only permitted transitions; blocked helper text shows the open count | `client/tests/lab-04/TicketWorkflow.test.tsx` | NOT RUN |
| UI-12 | UI | AC-21 | Status outcomes | Success refreshes badge and controls and announces; 409 open-Actions and stale messages keep the previous status | `client/tests/lab-04/TicketWorkflow.test.tsx` | NOT RUN |
| UI-13 | UI | AC-23 | History | IT Staff see every type; Requester sees status changes only; empty state | `client/tests/lab-04/TicketWorkflow.test.tsx` | NOT RUN |
| UI-14 | UI | AC-27, AC-28 | Staff dashboard content | Cards link with the returned `query`; open-Actions list and "10 oldest" footer | `client/tests/lab-04/StaffDashboard.test.tsx` | PASS (included in client suite: 227/227) |
| UI-15 | UI | AC-29, AC-31 | Staff dashboard states | Loading; failure → Try again → recovered; forbidden; zero values | `client/tests/lab-04/StaffDashboard.test.tsx` | PASS (included in client suite: 227/227) |
| UI-16 | UI | AC-02, AC-29 | Requester dashboard content | Cards and links; attention cue as text; first-use empty state | `client/tests/lab-04/RequesterDashboard.test.tsx` | PASS (included in client suite: 227/227) |
| UI-17 | UI | AC-31 | Requester dashboard states | Loading; failure → Try again; forbidden | `client/tests/lab-04/RequesterDashboard.test.tsx` | PASS (included in client suite: 227/227) |
| UI-18 | UI | AC-32, FR-21 | Navigation per role | Dashboard first and active; post-login redirect lands on it | `client/tests/lab-04/AppNavigation.test.tsx` | PASS (all 3 roles: E2E sign-in route + active first navigation link; included in client suite 227/227) |

### UI style

| Test ID | Type | Requirement / BR / AC | What it tests | Expected result | Test file | Final |
|---|---|---|---|---|---|---|
| STYLE-01 | UI style | STY-001–STY-003 | Colour literals and Bootstrap colour utilities across all of `client/src` | Literals only in the `:root` token block; no colour utilities | `client/tests/lab-03/StyleContract.test.tsx` (existing; already scans every `client/src` file) | NOT RUN |
| STYLE-02 | UI style | STY-018, STY-019 | Action status badges | Text label for each of the four values, from the single badge mapping | `client/tests/lab-04/ActionsTaken.test.tsx` | NOT RUN |
| STYLE-03 | UI style | STY-026 | Every new input | A programmatically associated label | `client/tests/lab-04/ActionsTaken.test.tsx` | NOT RUN |
| STYLE-04 | UI style | STY-012 | Validation placement | Message below its field, error token, input text not red | `client/tests/lab-04/ActionsTaken.test.tsx` | NOT RUN |
| STYLE-05 | UI style | STY-009, STY-010 | System fields | Rendered on the read-only surface, never as inputs | `client/tests/lab-04/ActionsTaken.test.tsx` | NOT RUN |

### Responsive, accessibility and E2E

| Test ID | Type | Requirement / BR / AC | What it tests | Expected result | Test file | Final |
|---|---|---|---|---|---|---|
| E2E-01 | E2E | AC-01–AC-10, AC-12, BR-02 | Daniel owns the Ticket; Olivia creates several Actions, assigns Patricia, edits, starts, completes, cancels; inactive Thomas is refused; the Requester sees everything read-only | Each step visible and persisted; captured in `actions-taken/` | `e2e/lab-04/actions-taken-flow.spec.ts` | NOT RUN |
| E2E-02 | E2E | AC-13, AC-15–AC-17, AC-21–AC-23 | Resolve blocked → work completed → resolved; cancel with cascade; history for IT Staff vs Requester | Each state visible; status refreshes; captured in `ticket-workflow/` | `e2e/lab-04/ticket-resolution.spec.ts` | NOT RUN |
| E2E-03 | E2E | AC-19, AC-36 | Two browser sessions change the same Action and the same Ticket status | Conflict message; entered values kept; save succeeds after review | `e2e/lab-04/ticket-resolution.spec.ts` | NOT RUN |
| E2E-04 | E2E | AC-26–AC-29, AC-32 | Both dashboards: values equal the API and SQL at run time; drill-downs show matching rows; zero states; landing after sign-in | Equal values; positive matches; captured in both dashboard folders | `e2e/lab-04/dashboards.spec.ts` | PASS (4 dashboard/landing tests; all three role sign-ins exercised; 6/6 dashboard E2E total) |
| E2E-05 | E2E | AC-30, AC-31 | Cross-role dashboard routes; load failure by interception (*fixture*) and retry | Forbidden state; failure then recovery | `e2e/lab-04/dashboards.spec.ts` | PASS (2 tests; failure/empty captures explicitly named `fixture`) |
| RESP-01 | Responsive | AC-34 | Dashboards and Ticket Detail with Actions at 1280, 834 and 390 px; widths 767/768/991/992; 2000-character content | No clipping or overlap; no horizontal page scroll | `e2e/lab-04/dashboards.spec.ts`, `e2e/lab-04/actions-taken-flow.spec.ts` | PARTIAL — both dashboards pass all listed viewports and boundaries; Ticket Detail with Actions and 2,000-character Action content are out of this base/scope (#91) |
| A11Y-01 | Accessibility | AC-35 | Keyboard-only: Action form, cancel dialog, status control, dashboard drill-downs | Every control reachable; focus visible; dialog focus trap and return | `e2e/lab-04/actions-taken-flow.spec.ts` | PARTIAL — Requester dashboard drill-down reachable by Tab with `:focus-visible`; Action form/dialog and status control are not in this base (#91/#92); no screen reader used |
| E2E-06 | E2E | AC-41, FR-26 | Console errors, failed requests and broken links collected across every Lab 4 journey | None | All `e2e/lab-04` specs (shared helper) | NOT RUN |

### Regression

| Test ID | Type | Requirement / BR / AC | What it tests | Expected result | Test file | Final |
|---|---|---|---|---|---|---|
| REG-01 | Regression | AC-37 | Full Lab 1–3 server suites. The only planned edit is the status request body gaining `expectedVersion` (specification §11.9) | All pass; nothing skipped | `server/tests/lab-01`, `lab-02`, `lab-03` | NOT RUN |
| REG-02 | Regression | AC-37 | Full Lab 2–3 client suites | All pass | `client/tests/lab-02`, `lab-03` | NOT RUN |
| REG-03 | Regression | AC-32, AC-37, FR-21 | Lab 2–3 E2E specs and Lab 3 sign-in/password-change flows. Besides AUTH-03, the three affected legacy landing assertions (ADMIN-04, Login, Change Password) now expect Dashboard, as required by Lab 4's role home; `/tickets` remains the plain My Tickets route. | All pass with capture disabled; no tracked screenshot modified | `e2e/lab-02`, `e2e/lab-03`, `client/tests/lab-03/Login.test.tsx`, `client/tests/lab-03/ChangePassword.test.tsx` | PASS (full E2E 46/46; client suite 227/227) |
| REG-04 | Regression | FR-22 | Representative Part 8 journeys: sign-in, My Tickets, detail with attachments and comments, Queue, Internal Notes, User Management | Each journey succeeds; captured in `regression/` | `e2e/lab-04/regression.spec.ts` | NOT RUN |

---

## 3. Acceptance-Criterion Traceability

Every criterion maps to at least one planned test and, where the rubric asks for visible proof, to a planned capture (`artifacts/lab-04/screenshots/…`).

Checked on 8 October 2026 for the dashboard criteria (AC-02, AC-26 to AC-33, AC-40): every test listed has a row in §2, its file exists, and the file contains the test ID (SEC-04 and SEC-05 are inside the `SEC-03/04` and `SEC-03/05/07` blocks).

Twelve tests prove a business or style rule rather than a criterion, and are traced through their Requirement column instead:

- business rules: UNIT-01 (BR-09/10), UNIT-06 (BR-30), UNIT-07 (BR-36/37), API-14 (BR-01), API-15 (BR-35), DASH-05 (BR-38), WF-13 (BR-32), UI-03 (BR-06/07);
- requirements: REG-04 (FR-22);
- style rules: STYLE-01, STYLE-03 and STYLE-04 (STY rules).

| AC | Planned tests | Planned visible evidence |
|---|---|---|
| AC-01 | API-01, E2E-01 | `actions-taken/create-form`, `list-multiple-desktop` |
| AC-02 | SEC-05, DASH-07, UI-16 | `requester-dashboard/desktop` |
| AC-03 | API-02, API-16, UI-01, E2E-01 | `actions-taken/list-multiple-desktop`, `requester-read-only` |
| AC-04 | API-03, E2E-01 | `actions-taken/inactive-assignee-refused` |
| AC-05 | API-04, E2E-01 | `actions-taken/edit-reassign` |
| AC-06 | API-05, E2E-01 | `actions-taken/started`, `completed` |
| AC-07 | API-06, UNIT-03, UI-04 | `actions-taken/complete-result-required` |
| AC-08 | API-07, UI-05, E2E-01 | `actions-taken/cancel-dialog`, `cancelled` |
| AC-09 | API-08, UI-06 | `actions-taken/completed` (no controls) |
| AC-10 | API-09, UNIT-02, UI-02, E2E-01 | `actions-taken/follow-up-required` |
| AC-11 | API-10 | API test output |
| AC-12 | SEC-01, SEC-02, UI-08, E2E-01 | `actions-taken/requester-read-only`; API test output |
| AC-13 | API-11, UI-07, E2E-02 | `actions-taken/ticket-not-workable` |
| AC-14 | API-12, UI-09 | API test output |
| AC-15 | WF-01, WF-02, E2E-02 | `ticket-workflow/resolve-blocked` |
| AC-16 | WF-03, WF-04, E2E-02 | `ticket-workflow/resolved-after-work-complete` |
| AC-17 | WF-05, E2E-02 | `ticket-workflow/cancel-cascade` |
| AC-18 | UNIT-04, WF-06, UI-11 | `ticket-workflow/resolve-blocked` |
| AC-19 | API-13, WF-07, WF-14, E2E-03 | `ticket-workflow/stale-status`, `actions-taken/conflict` |
| AC-20 | WF-08 | API test output (concurrent runs) |
| AC-21 | UI-12, E2E-02 | `ticket-workflow/resolved-after-work-complete` |
| AC-22 | WF-09, SEC-06, MIG-05, E2E-02 | `ticket-workflow/history-staff`; trigger test output |
| AC-23 | WF-10, SEC-02, UI-13, E2E-02 | `ticket-workflow/history-requester` |
| AC-24 | UNIT-05, WF-11 | API test output |
| AC-25 | WF-12 | API test output |
| AC-26 | DASH-01, DASH-07, E2E-04 | Dashboard capture beside the SQL count output |
| AC-27 | DASH-02, DASH-08, UI-14, E2E-04 | `staff-dashboard/drilldown-unassigned`, `requester-dashboard/drilldown-open` |
| AC-28 | DASH-03, UI-14, E2E-04 | `staff-dashboard/desktop` |
| AC-29 | DASH-04, DASH-09, UI-15, UI-16, E2E-04 | `staff-dashboard/admin-no-open-actions`, `requester-dashboard/first-use-empty-fixture` |
| AC-30 | SEC-04, E2E-05 | `staff-dashboard/forbidden-requester` |
| AC-31 | UI-15, UI-17, E2E-05 | `staff-dashboard/failure-fixture`, `requester-dashboard/failure-fixture` |
| AC-32 | UI-18, E2E-04 | Dashboard captures show the active navigation item |
| AC-33 | DASH-10 | API test output |
| AC-34 | RESP-01 | Desktop, tablet and mobile captures of every new screen |
| AC-35 | UI-05, A11Y-01 | Focus-ring capture; keyboard-walk notes in the checklist |
| AC-36 | UI-10, E2E-03 | `actions-taken/conflict`, `save-failure-fixture` |
| AC-37 | REG-01, REG-02, REG-03 | Full runner output on final `main` |
| AC-38 | MIG-01, MIG-02, MIG-03 | Script output: counts before, after and restored |
| AC-39 | MIG-04 | Seed-twice test output |
| AC-40 | PERF-01, PERF-02, DASH-06 | Performance-smoke output with machine and dataset |
| AC-41 | E2E-06 | Console and link audit output |

## 4. Coverage of the labsheet's named files

| Labsheet path (§12) | Planned tests |
|---|---|
| `server/tests/lab-04/actions-taken.api.test.ts` | API-01–API-18, SEC-01, and the Actions part of SEC-02, SEC-03 and SEC-07 |
| `server/tests/lab-04/ticket-workflow.api.test.ts` | WF-01–WF-14, SEC-02, SEC-03, SEC-06, SEC-07 |
| `server/tests/lab-04/requester-dashboard.api.test.ts` | DASH-07–DASH-10, SEC-05 |
| `server/tests/lab-04/staff-dashboard.api.test.ts` | DASH-01–DASH-06, SEC-04 |
| `client/tests/lab-04/StaffDashboard.test.tsx` | UI-14, UI-15 |
| `client/tests/lab-04/RequesterDashboard.test.tsx` | UI-16, UI-17 |
| `client/tests/lab-04/ActionsTaken.test.tsx` | UI-01–UI-10, STYLE-02–STYLE-05 |
| `client/tests/lab-04/TicketWorkflow.test.tsx` | UI-11–UI-13 |
| `e2e/lab-04/actions-taken-flow.spec.ts` | E2E-01, RESP-01, A11Y-01 |
| `e2e/lab-04/ticket-resolution.spec.ts` | E2E-02, E2E-03 |
| `e2e/lab-04/dashboards.spec.ts` | E2E-04, E2E-05, RESP-01 |

Supporting files beyond the minimum:

- `server/tests/lab-04/action-rules.unit.test.ts`, `workflow-rules.unit.test.ts`, `dashboard-metrics.unit.test.ts` and `migration-seed.api.test.ts` (MIG-03–MIG-05);
- `server/tests/lab-04/test-transport.unit.test.ts` (#96, the loopback guard behind the suite-stability fix);
- `client/tests/lab-04/AppNavigation.test.tsx`;
- `e2e/lab-04/regression.spec.ts`;
- the planned scripts `server/scripts/verify-migration.mjs` and `server/scripts/perf-smoke.mjs`.

Every path is planned until the file exists and has been verified.

## 5. Test Commands and Isolation

These commands exist today (verified on `a429f29`):

```bash
cd server && npm test        # migrate deploy + seed toktickit_test, then Vitest in one worker
cd server && npm run test:only
cd client && npm test
npm run test:e2e             # repository root; migrates and seeds toktickit_e2e_test; API :3002, client :5174
cd server && npm run build
cd client && npm run build
cd client && npm run lint    # oxlint
node scripts/row-counts.mjs .env.test   # from server/; prints table counts, never the connection string
```

Added by the contract increment (#89) and verified on 3 October 2026:

```bash
CAPTURE_EVIDENCE=1 npm run test:e2e   # writes Lab 4 captures under artifacts/lab-04/screenshots/ only
TEST_DATABASE_URL=… npm test          # from server/; a fresh database whose name ends in _test, or the run is refused
```

- A default `npm run test:e2e` writes nothing tracked: 40 passed with and without `CAPTURE_EVIDENCE=1`, and `git status -- artifacts` stayed clean both times. Lab 2 and Lab 3 captures are frozen.
- Runner output moved to the ignored `artifacts/lab-04/playwright-results/`.

Still planned: `server/scripts/verify-migration.mjs` (#90) and `server/scripts/perf-smoke.mjs` (#93).

Suites always run sequentially. `toktickit_dev` is never a target.

## 6. Final Results

**PENDING.** This section will hold separately:

1. the integrated staging-candidate run;
2. the run on the exact final `main` commit after the release merge.

Each will record the commit, environment, commands, full runner output location, and warnings. Neither exists yet.

## 7. Known Limitations

- The performance smoke result is a local measurement on one Mac, not production capacity (specification §11.14).
- Dashboard and Action failure, loading and empty captures that need a broken server are produced by API interception and labelled *fixture*. The API tests prove the backend behaviour.
- History begins with Lab 4. Seeded and legacy Tickets have no events for earlier changes (specification §7).
- **Server-suite instability, found and fixed in #96 (PR #97).** Before that fix, full runs of the unchanged Lab 1–3 server suite on fresh `_test` databases failed intermittently: in default order 4 of 5 runs failed, with 1 to 22 tests each time and a different test every time. The cause was test transport, not shared state. supertest's throwaway servers listened on every interface but were called on `127.0.0.1`, so a local program holding the same loopback port could answer. Statuses 401, 403 and 404 from other programs, and socket errors, were observed. Until PR #97 is merged, a red run of an unmodified suite may be this clash; rerun it and inspect the failing response before suspecting the product.
