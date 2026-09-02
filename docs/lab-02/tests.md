# Lab 2 Test Plan and Results

**Version:** 1.0 — approved for implementation, 24 August 2026
**Status:** planned-test table derived from `specification.md` §9 acceptance criteria. Strategy in §1 is grounded in the testing taxonomy taught in Lecture 3.
**Open items closed, 25 August 2026.** All three questions this plan left pending Lecture 4 are now resolved in `testing-contract.md`:

| Question left open | Resolution |
|---|---|
| Should a test-design technique be named per test group? | Yes. Five techniques are defined as `TDT-01`…`TDT-05` in `testing-contract.md` §2, each with the groups it applies to. Name the technique in the group's header comment. |
| What is the convention for evidencing the red phase? | `testing-contract.md` §5 — a `test:` commit with the failing test alone, a capture of the assertion failure, a separate `feat:`/`fix:` commit, and a capture of the pass. |
| Does the lecture require an additional test level? | No. Lecture 4 slides 136–138 confirm the taxonomy already used here. Slide 137 adds a per-feature versus per-sprint distinction, now recorded in the level table of `testing-contract.md` §1. |

Lecture 4 does not address the Definition of Done; `specification.md` §10 is settled independently.

> This plan is written **before** implementation. It is not to be reconstructed afterwards from whatever tests the coding agent happened to generate.

---

## 1. Test Strategy

### Mapping to the course testing taxonomy

Lecture 3 defines the testing types used in large systems. This sprint's six execution levels map onto them as follows, so that each level has a named place in the taught model rather than being an ad-hoc category.

| Course type (Lecture 3) | Scope taught | This sprint's level | Tool | Boundary |
|---|---|---|---|---|
| **Unit Testing** | Smallest pieces — functions, methods, classes, verified in isolation | Unit | Vitest | Pure logic only: ticket-number formatting and sequencing, validation schemas, query-parameter parsing, attachment rule checks. No network, no database |
| **Integration Testing** | Multiple units, components, or modules interacting; verify data flows and interfaces | API integration | Vitest + Supertest | Routes, validation, ownership enforcement, transactions, and Prisma access together. Imports the Express app directly; runs against the dedicated `toktickit_test` database |
| **Integration Testing** (component level) | Same category, applied to the frontend | UI component | Vitest + Testing Library | Screen behaviour and state transitions with the network boundary mocked; no live backend or database |
| **Integration Testing** (presentation contract) | Same category, applied to the rendered contract in `ui-spec.md` | UI style | Vitest + Testing Library | Required classes, field states, labels, asterisks, message placement, and button behaviour. Assertion-based, not screenshot comparison |
| **Compatibility Testing** | Does it work across devices, browsers, and screen sizes | Responsive / visual | Playwright | Layout at desktop, tablet, and mobile viewports, plus the screenshots that feed the visual checklist. Real browser against a running local stack |
| **System / End-to-End Testing** | The entire system as a whole, checking functional and non-functional requirements | E2E | Playwright | Complete requester journeys across screens. Real browser, real backend, real database |
| **Regression Testing** | Not a stage — repeat earlier tests after each change so nothing already working breaks | Applied continuously | Vitest + Playwright | The full suite runs before every commit and before every Pull Request, as recorded in `RUNBOOK.md` step 12 |

**User Acceptance Testing** is the one taught type without an automated counterpart here. This is an individual lab with no separate business user, so its role is filled by the acceptance criteria in `specification.md` §9 together with the Manual Demo Checks recorded in §4 of this document, which the student verifies as the accepting party.

### TDD approach

Following the Red → Green → Refactor cycle: for each Issue, write the failing test derived from its acceptance criterion first, run it and confirm it fails **for the intended reason** — the required behaviour is missing, not a missing import, a configuration error, or a syntax error — then implement the smallest correct behaviour, re-run to green, and refactor only while the tests stay green.

### Two deliberate strategy choices

**Ownership is verified at the API level, not only through the UI.** Hiding a control proves nothing about authorization. The ownership tests call the endpoints directly with a different requester context, outside the UI entirely.

**Line coverage is not used as the completion signal.** Following the System-Level SDS, coverage is a diagnostic metric rather than a substitute for behaviour tests. A feature is not complete when its critical business rules are untested, regardless of the percentage reported.

## 2. Planned Tests

### Unit

| Test ID | Requirement / AC | What it tests | Expected result | Automated test file | Final |
|---|---|---|---|---|---|
| UNIT-01 | BR-04, AC-14 | Ticket number formatting | Returns `TKT-<year>-000001` zero-padded to six digits | `server/tests/lab-02/ticket-number.unit.test.ts` | ✅ |
| UNIT-02 | BR-04 | Annual sequence reset | First ticket of a new year restarts at `000001`; the year follows the `Asia/Bangkok` calendar (§11.13) | `server/tests/lab-02/ticket-number.unit.test.ts` | ✅ |
| UNIT-03 | BR-19, BR-20, BR-21 | Create-ticket validation schema | Trims input; rejects short/long Summary and Description; whitespace-only is empty | `server/tests/lab-02/validation.unit.test.ts` | ✅ |
| UNIT-04 | BR-26, BR-27 | Attachment rule checks | Accepts jpg/jpeg/png/webp/pdf ≤5 MB; rejects other types and oversized files | `server/tests/lab-02/attachment-rules.unit.test.ts` | ✅ |
| UNIT-05 | BR-38, BR-39 | Query-parameter parsing | Applies defaults; rejects non-whitelisted `sort`, `pageSize` >50, non-numeric `page` | `server/tests/lab-02/ticket-query.unit.test.ts` | ✅ |

### API integration

| Test ID | Requirement / AC | What it tests | Expected result | Automated test file | Final |
|---|---|---|---|---|---|
| API-01 | AC-02 | Active requesters only | 200; the inactive seeded requester is absent | `server/tests/lab-02/requesters.api.test.ts` | ☐ |
| API-02 | AC-11 | Reference data | 200; four categories and seven related systems from the database | `server/tests/lab-02/reference-data.api.test.ts` | ☐ |
| API-03 | AC-06, AC-08 | Valid ticket creation | 201; one ticket saved; `ticketNo` returned; status `NEW`; no owner | `server/tests/lab-02/create-ticket.api.test.ts` | ✅ |
| API-04 | AC-07 | Requester binding | Saved row's `requesterId` equals the `X-Requester-Id` used | `server/tests/lab-02/create-ticket.api.test.ts` | ✅ |
| API-05 | AC-10, BR-18 | Creation validation | 400 with field errors for each missing/invalid field; no ticket created | `server/tests/lab-02/create-ticket.api.test.ts` | ✅ |
| API-06 | BR-18 | Server-controlled fields rejected | 400 when `ticketNo`, `status`, or `requesterId` is supplied in the body | `server/tests/lab-02/create-ticket.api.test.ts` | ✅ |
| API-07 | AC-14, BR-05, BR-04 | Ticket-number uniqueness and calendar | Concurrent creates produce distinct numbers matching the format; a fixed-clock Bangkok-year boundary proves the year label and UTC `createdAt` (TC-024) | `server/tests/lab-02/create-ticket.api.test.ts` | ✅ |
| API-08 | AC-15 | Create with attachment | 201; attachment listed active with correct metadata; exactly five files are accepted; a storage-adapter failure keeps the Ticket and returns `attachmentFailures` (TC-015, TC-023), while a metadata-write failure removes its orphan file | `server/tests/lab-02/attachments.api.test.ts` | ✅ |
| API-09 | AC-16 | Disallowed file type | 415; read-back proves no Ticket and no attachment were stored (TC-022) | `server/tests/lab-02/attachments.api.test.ts` | ✅ |
| API-10 | AC-17 | Oversized file | 413; read-back proves no Ticket and no attachment were stored (TC-022) | `server/tests/lab-02/attachments.api.test.ts` | ✅ |
| API-11 | AC-18 | List ownership isolation | Requester A's list contains only A's tickets | `server/tests/lab-02/my-tickets.api.test.ts` | ✅ |
| API-12 | AC-19 | Cross-requester list | Requester B's list contains none of A's tickets | `server/tests/lab-02/my-tickets.api.test.ts` | ✅ |
| API-13 | AC-20, BR-36 | Search | Matches partial, case-insensitive, on ticket number and summary | `server/tests/lab-02/my-tickets.api.test.ts` | ✅ |
| API-14 | AC-21 | Filters | Category, requested priority, IT priority, and status filters each narrow correctly; combined filters AND | `server/tests/lab-02/my-tickets.api.test.ts` | ✅ |
| API-15 | AC-22, BR-37 | Sorting | Whitelisted fields sort both directions; ties broken deterministically | `server/tests/lab-02/my-tickets.api.test.ts` | ✅ |
| API-16 | AC-23, BR-40 | Pagination | Correct page slices and metadata; a page past the end returns empty data, not an error | `server/tests/lab-02/my-tickets.api.test.ts` | ✅ |
| API-17 | AC-24, BR-38, BR-39 | Invalid query parameters | 400 for invalid UUID/reference, inactive reference, `pageSize` >50, `page` 0, unknown `sort`, unknown parameter | `server/tests/lab-02/my-tickets.api.test.ts` | ✅ |
| API-18 | BR-14 | Requester context required | 400 when `X-Requester-Id` is missing, malformed, unknown, or inactive; shared error envelope also covers framework failures (TC-008) | `server/tests/lab-02/requester-context.api.test.ts`; `server/tests/lab-02/error-handler.api.test.ts` | ✅ |
| API-19 | AC-27 | Owned ticket detail | 200 with full ticket and attachment metadata | `server/tests/lab-02/ticket-detail.api.test.ts` | ✅ |
| API-20 | AC-28, BR-16 | Cross-requester detail | **404** (not 403) so existence is not disclosed | `server/tests/lab-02/ticket-detail.api.test.ts` | ✅ |
| API-21 | AC-29 | Add attachment | 201; active count increments | `server/tests/lab-02/attachments.api.test.ts` | ✅ |
| API-22 | AC-30, BR-28 | Active limit | 409 on the sixth active file; count stays at five | `server/tests/lab-02/attachments.api.test.ts` | ✅ |
| API-23 | BR-28 | Removed files do not count | After removing one of five, a new upload succeeds | `server/tests/lab-02/attachments.api.test.ts` | ✅ |
| API-24 | AC-31 | Download active | 200 with correct content type, length, and `Content-Disposition: attachment` | `server/tests/lab-02/attachments.api.test.ts` | ✅ |
| API-25 | AC-32, BR-31 | Soft removal | 200; `removedAt`, `removedReason`, `removedById` set; row retained | `server/tests/lab-02/attachments.api.test.ts` | ✅ |
| API-26 | AC-33, BR-33 | Removed download blocked | **410**; no content served | `server/tests/lab-02/attachments.api.test.ts` | ✅ |
| API-27 | BR-32 | Removal reason required | 400 when reason missing or shorter than three characters | `server/tests/lab-02/attachments.api.test.ts` | ✅ |
| API-28 | AC-34, BR-17 | Cross-requester attachment | 404 for another requester's attachment metadata, download, and removal | `server/tests/lab-02/attachments.api.test.ts` | ✅ |
| API-29 | BR-30 | Stored filename generated | Stored name is a generated identifier, not the uploaded filename | `server/tests/lab-02/attachments.api.test.ts` | ✅ |

### UI component

| Test ID | Requirement / AC | What it tests | Expected result | Automated test file | Final |
|---|---|---|---|---|---|
| UI-01 | AC-01, BR-12 | Route guard | Opening My Tickets with no requester shows the selection screen | `client/tests/lab-02/RequesterGuard.test.tsx` | ✅ |
| UI-02 | AC-02 | Selector list | Only active requesters render | `client/tests/lab-02/RequesterSelection.test.tsx` | ✅ |
| UI-03 | AC-04 | Selector API failure | Safe failure state; Continue stays disabled | `client/tests/lab-02/RequesterSelection.test.tsx` | ✅ |
| UI-04 | AC-05 | Selector empty | Empty state explains none are available | `client/tests/lab-02/RequesterSelection.test.tsx` | ✅ |
| UI-05 | AC-03 | Shell requester display | Selected requester's name and Change Requester render | `client/tests/lab-02/AppShell.test.tsx` | ✅ |
| UI-06 | AC-09 | Submit without Summary | Field-level message shown; **the create API is not called** | `client/tests/lab-02/CreateTicket.test.tsx` | ✅ |
| UI-07 | AC-11 | Reference data states in form | Category and Related System options come from the API response; loading disables the selects and reference failure shows a callout with Submit disabled; Create Ticket renders its shell breadcrumb | `client/tests/lab-02/CreateTicket.test.tsx`, `client/tests/lab-02/AppRoutes.test.tsx` | ✅ |
| UI-08 | AC-12 | Double-submit prevention | Submit disabled while in flight; one request sent | `client/tests/lab-02/CreateTicket.test.tsx` | ✅ |
| UI-09 | AC-06 | Success state | Generated Ticket Number and next actions are displayed; storage failures are named safely without exposing internal reasons | `client/tests/lab-02/CreateTicket.test.tsx` | ✅ |
| UI-10 | AC-13, BR-25 | Create failure preserves input | Safe error shown; entered values still present | `client/tests/lab-02/CreateTicket.test.tsx` | ✅ |
| UI-11 | AC-16, AC-17 | Invalid attachment feedback | Rejected file shown with its reason; form remains usable | `client/tests/lab-02/CreateTicket.test.tsx` | ✅ |
| UI-12 | AC-18 | List renders | Loading state resolves into the requester's rows | `client/tests/lab-02/MyTickets.test.tsx` | ✅ |
| UI-13 | AC-19 | Requester switch clears list | Switching context refetches and drops the previous list | `client/tests/lab-02/MyTickets.test.tsx` | ✅ |
| UI-14 | AC-25 | Empty state | "No tickets yet" with a Create Ticket action | `client/tests/lab-02/MyTickets.test.tsx` | ✅ |
| UI-15 | AC-26, BR-41 | No-results state | Distinct message with Clear Filters | `client/tests/lab-02/MyTickets.test.tsx` | ✅ |
| UI-16 | AC-20, AC-21, AC-22 | Search, filter, sort wiring | Debounced search plus controls issue the expected search, category, requested-priority, IT-priority, status, and sort query and render results | `client/tests/lab-02/MyTickets.test.tsx` | ✅ |
| UI-17 | AC-23 | Pagination controls | Next/Previous request the right page; metadata rendered | `client/tests/lab-02/MyTickets.test.tsx` | ✅ |
| UI-18 | AC-27 | Detail read-only | Ticket fields render read-only; no editable control | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | ✅ |
| UI-19 | AC-29 | Add attachment | Uploading state then active row | `client/tests/lab-02/AttachmentSection.test.tsx` | ✅ |
| UI-20 | AC-32, AC-33 | Removed attachment presentation | Metadata and reason shown; **no download link** | `client/tests/lab-02/AttachmentSection.test.tsx` | ✅ |
| UI-21 | BR-32 | Removal confirmation | Dialog requires a reason; cancel makes no request | `client/tests/lab-02/AttachmentSection.test.tsx` | ✅ |
| UI-22 | AC-30 | Limit reached | Add control disabled with an explanatory tooltip at five active | `client/tests/lab-02/AttachmentSection.test.tsx` | ✅ |

### UI style

| Test ID | Requirement / AC | What it tests | Expected result | Automated test file | Final |
|---|---|---|---|---|---|
| STYLE-01 | ui-spec §3 | Required-field marker | Every required field renders an asterisk **and** can still show a message | `client/tests/lab-02/style/form-fields.test.tsx` | ✅ |
| STYLE-02 | ui-spec §3 | Read-only distinction | System-generated fields carry the read-only class and the `readonly` attribute | `client/tests/lab-02/style/form-fields.test.tsx` | ✅ |
| STYLE-03 | ui-spec §3 | Message placement | Validation message is associated with its field via `aria-describedby`, not only a page-level banner | `client/tests/lab-02/style/form-fields.test.tsx` | ✅ |
| STYLE-04 | ui-spec §4 | Button hierarchy | One primary per screen; disabled controls are non-activatable | `client/tests/lab-02/style/buttons.test.tsx` | ✅ |
| STYLE-05 | ui-spec §3 | Busy state | Submit shows the busy indicator and is disabled during submission | `client/tests/lab-02/style/buttons.test.tsx` | ✅ |
| STYLE-06 | ui-spec §10, AC-36 | Badges not colour-alone | Every priority and status badge renders its text label | `client/tests/lab-02/style/badges.test.tsx` | ✅ |
| STYLE-07 | ui-spec §5 | Active navigation | Active page marked with `aria-current="page"`, not colour alone | `client/tests/lab-02/style/app-shell.test.tsx` | ✅ |
| STYLE-08 | AC-37, ui-spec §12 | Accessible labelling | Every control has a programmatic label; icon-only controls have accessible names | `client/tests/lab-02/style/a11y.test.tsx` | ✅ |

### Mobile navigation (component level)

Viewport rendering is verified with Playwright in Issue #23. These cover the behaviour *behind* the breakpoint, which a component test can prove and a screenshot cannot.

| Test ID | Requirement / AC | What it tests | Expected result | Automated test file | Final |
|---|---|---|---|---|---|
| NAV-01 | ui-spec §5 | Toggle contract | Starts collapsed; `aria-expanded` tracks state; `aria-controls` names a real element | `client/tests/lab-02/style/mobile-nav.test.tsx` | ✅ |
| NAV-02 | ui-spec §5, AC-37 | Keyboard operation | Menu opens from the keyboard alone and closes on Escape, including when focus is on a nav link | `client/tests/lab-02/style/mobile-nav.test.tsx` | ✅ |
| NAV-03 | ui-spec §12 | Focus restoration | Escape returns focus to the toggle rather than leaving it on a hidden link | `client/tests/lab-02/style/mobile-nav.test.tsx` | ✅ |
| NAV-04 | ui-spec §5 | Requester stays visible | The current requester renders on mobile without opening the menu | `client/tests/lab-02/style/mobile-nav.test.tsx` | ✅ |

**Issue #21 implementation result (1 September 2026):** UNIT-05, API-11–API-17, and UI-12–UI-17 are green. The full regression run on `feature/10-my-tickets` is **97 server tests / 100 client tests**; the captured outputs are `_private/evidence/lab-02/test-output/issue-21-full-server.txt` and `_private/evidence/lab-02/test-output/issue-21-full-client.txt`. The final Part 3 result remains pending the release run from `main`.

**Issue #21 visual follow-up (1 September 2026):** The post-merge regression adds coverage for the tablet table scroll container and the header-safe action treatment. The targeted run is **18/18**, and the full client regression is **102/102**; the output is `_private/evidence/lab-02/test-output/issue-21-visual-followup-full-client.txt`. Browser verification confirms no page-level horizontal overflow at 834px/390px, the tablet table's wide columns remain reachable through its own scroll container, and header actions render with readable token colours.

**Issue #22 implementation result (2 September 2026):** API-19–API-29 are green (**19/19**) and UI-18–UI-22 are green (**5/5**). The full regression is **109 server tests / 107 client tests**; outputs are `_private/evidence/lab-02/test-output/issue-22-full-server.txt` and `_private/evidence/lab-02/test-output/issue-22-full-client.txt`. Targeted green outputs are `_private/evidence/lab-02/test-output/issue-22-api-green.txt` and `_private/evidence/lab-02/test-output/issue-22-ui-green.txt`. The browser evidence report is `_private/evidence/lab-02/test-output/issue-22-browser-detail.txt`; the four required figures are indexed under `ticket-detail/`.

### Responsive and E2E

| Test ID | Requirement / AC | What it tests | Expected result | Automated test file | Final |
|---|---|---|---|---|---|
| RESP-01 | AC-35 | Create Ticket at three viewports | No horizontal overflow, clipping, or overlap; screenshots captured | `e2e/lab-02/responsive.spec.ts` | ☐ |
| RESP-02 | AC-35 | My Tickets at three viewports | Desktop table, mobile cards; controls reachable; screenshots captured | `e2e/lab-02/responsive.spec.ts` | ☐ |
| RESP-03 | AC-35 | Ticket Detail at three viewports | Attachment names readable; no overflow; screenshots captured | `e2e/lab-02/responsive.spec.ts` | ☐ |
| E2E-01 | AC-01, AC-06, AC-15, AC-18 | Full creation journey | Select requester → create ticket with attachment → confirmation shows the official number → ticket found in My Tickets | `e2e/lab-02/requester-ticket-flow.spec.ts` | ☐ |
| E2E-02 | AC-19, AC-28 | Requester isolation journey | Switch requester; the first requester's tickets are gone; direct navigation to their ticket is refused | `e2e/lab-02/requester-isolation.spec.ts` | ☐ |
| E2E-03 | AC-29, AC-31, AC-32, AC-33 | Attachment lifecycle journey | Add, download, soft-remove with reason; removed entry retains metadata with no download | `e2e/lab-02/attachment-lifecycle.spec.ts` | ☐ |

**Issue #23 candidate verification (2 September 2026):** The complete Playwright run on `feature/12-e2e-and-release` passes **6/6**: RESP-01, RESP-02, RESP-03, E2E-01, E2E-02, and E2E-03. The output is `_private/evidence/lab-02/test-output/issue-23-green.txt`. The initial red capture is `_private/evidence/lab-02/test-output/issue-23-red.txt`; its two failures were corrected test selectors (a duplicate accessible `My Tickets` text and a summary nested with the attachment count), not product changes. The nine reproducible viewport captures are under `artifacts/lab-02/screenshots/`. These are candidate results; the `Final` column and §6 final-results table remain pending the release run from `main`.

## 3. Acceptance-Criterion Traceability

Every acceptance criterion maps to at least one planned test.

| AC | Tests | AC | Tests |
|---|---|---|---|
| AC-01 | UI-01, E2E-01 | AC-20 | API-13, UI-16 |
| AC-02 | API-01, UI-02 | AC-21 | API-14, UI-16 |
| AC-03 | UI-05 | AC-22 | API-15, UI-16 |
| AC-04 | UI-03 | AC-23 | API-16, UI-17 |
| AC-05 | UI-04 | AC-24 | API-17 |
| AC-06 | API-03, UI-09, E2E-01 | AC-25 | UI-14 |
| AC-07 | API-04 | AC-26 | UI-15 |
| AC-08 | API-03 | AC-27 | API-19, UI-18 |
| AC-09 | UI-06 | AC-28 | API-20, E2E-02 |
| AC-10 | API-05 | AC-29 | API-21, UI-19, E2E-03 |
| AC-11 | API-02, UI-07 | AC-30 | API-22, UI-22 |
| AC-12 | UI-08 | AC-31 | API-24, E2E-03 |
| AC-13 | UI-10 | AC-32 | API-25, UI-20, E2E-03 |
| AC-14 | UNIT-01, API-07 | AC-33 | API-26, UI-20, E2E-03 |
| AC-15 | API-08, E2E-01 | AC-34 | API-28 |
| AC-16 | API-09, UI-11 | AC-35 | RESP-01, RESP-02, RESP-03 |
| AC-17 | API-10, UI-11 | AC-36 | STYLE-06 |
| AC-18 | API-11, UI-12, E2E-01 | AC-37 | STYLE-08 |
| AC-19 | API-12, UI-13, E2E-02 | | |

**Business rules covered without a dedicated AC:** BR-05 (API-07), BR-14 (API-18), BR-16 (API-20), BR-18 (API-06), BR-28 (API-23), BR-30 (API-29), BR-32 (API-27, UI-21), BR-37 (API-15), BR-38/39 (UNIT-05, API-17), BR-40 (API-16), BR-41 (UI-15).

## 4. Responsive and Visual Checklist

The 16-row checklist across three viewports is maintained in `ui-spec.md` §13 and completed from the screenshots produced by RESP-01 to RESP-03. Screenshot paths are listed in `ui-spec.md` §14.

## 5. Test Commands

```bash
# Server: unit + API integration (against toktickit_test)
cd server && npm test

# Client: UI component + UI style
cd client && npm test

# E2E + responsive screenshots (starts an isolated local stack)
npm run test:e2e
```

The E2E runner needs a dedicated local database, for example `toktickit_e2e_test`, and reads its connection credentials from `server/.env.test` unless `E2E_DATABASE_URL` is supplied. The URL must name a database ending in `_test`; the harness applies migrations and seeds reference data before the run. It starts the API on port 3002 and the client on port 5174, so it does not use the normal development ports.

Database preparation for API integration tests is no longer a manual step. `npm test` runs it, so the suite is reproducible from a clean clone rather than depending on a database somebody prepared by hand (`specification.md` §11.16):

```bash
cd server
cp .env.example .env.test   # point DATABASE_URL at a database whose name ends in _test
npm test                    # migrates, seeds, then runs the suite
npm run test:only           # skip preparation when the test database is current
```

Connection strings are never written into a command or a document. They live in `.env.test`, which is untracked; only `.env.example` is committed. The preparation script refuses any `DATABASE_URL` whose database name does not end in `_test`, because `migrate deploy` rewrites whatever it is pointed at.

## 6. Final Results

> Filled in after the release merge, from a run on the final `main` branch.

| Suite | Command | Tests | Result |
|---|---|---|---|
| Server (unit + API) | `cd server && npm test` | — | ☐ |
| Client (UI + style) | `cd client && npm test` | — | ☐ |
| E2E + responsive | `npx playwright test` | — | ☐ |

**Environment**
- Branch: `main`
- Commit: —
- Node / npm: v25.0.0 / 11.6.2
- PostgreSQL: 18 — `toktickit_dev` for manual use, `toktickit_test` for automated runs
- Date executed: —

## 7. Known Limitations and Deferred Tests

- **No authentication tests.** The requester context is a header, not a session. Session, CSRF, and role-authorization tests arrive with Lab 3.
- **Status-transition tests deferred.** Only `NEW` is reachable this sprint; the remaining `TicketStatus` values belong to the IT Staff workflow.
- **No event/audit assertions.** `TicketEvent` is out of scope for Lab 2 (`specification.md` §11.10).
- **Concurrency test is bounded.** API-07 issues a small number of parallel creates — enough to catch a non-transactional generator, not a load test.
- **Object-storage behaviour untested.** Attachments use local filesystem storage behind an adapter (`specification.md` §11.5); a SeaweedFS implementation would need its own tests.
- **Visual checks are human-verified.** Playwright captures the screenshots and asserts no horizontal overflow, but colour and spacing judgement against `ui-spec.md` is manual.
