# Lab 2 Sprint Engineering Specification

**Feature ID:** LAB2-REQUESTER-MVP
**Version:** 1.0 — approved for implementation, 24 August 2026. Section 10 is provisional pending Lecture 4; every other section is settled.
**Author:** วิศิษฐ์ สุวรรณเนาว์ (67070501042)
**Inherits:** TokTickIT System-Level SDS v1.0 (SDS-SYS-001). Deviations are recorded in §11.
**Related documents:** `api-spec.md`, `ui-spec.md`, `tests.md`

---

## 1. Sprint Goal

Deliver a working Requester-facing ticketing slice: a Requester can describe a problem, classify it, attach supporting evidence, submit it, and then find, inspect, and manage that ticket among only their own tickets. Login is not built in this sprint; a Development Requester selector stands in for the logged-in identity so that per-requester ownership can be built and tested before authentication arrives in Lab 3.

## 2. Stakeholder Request Interpretation

The IT department wants to start accepting real support requests, so the Requester experience must be complete enough to use rather than demonstrative. Four things matter to them: the request must capture enough detail to be actionable (category, affected system, priority, description, evidence); the system — not the user — must own identity-bearing data such as the Ticket Number; a Requester must never see another Requester's ticket; and the visual language established here must be reusable, because later sprints add IT Staff screens on top of it.

Because authentication is a sprint away, they accepted a temporary Requester selector for testing. This is a convenience for development, not a security boundary, and the specification treats it as such: ownership is still enforced in the backend on every request, exactly as it will be once real sessions exist.

## 3. Scope

### Included
- Development Requester selection, current-requester context, and Requester switching
- Create Ticket: form, validation, submission, generated Ticket Number, attachments on create
- My Tickets: requester-scoped list with search, filtering, sorting, and pagination
- Requester Ticket Detail: read-only ticket information
- Attachment lifecycle: add, list metadata, download, soft removal with reason
- Requester ownership enforcement on every ticket and attachment operation
- Zen Green theme, reusable form/list/badge/state components, responsive layout
- Reference data retrieval: Categories, Related Systems, active Development Requesters
- Automated tests at unit, API, UI component, UI style, responsive, and E2E levels

### Excluded
- Authentication and security: login, logout, passwords, password hashing, sessions, tokens, authenticated identity, real role-based authorization
- IT Staff workflow: staff dashboard, queue, claiming or reassigning tickets, changing IT Priority, ticket-owner functions
- Ticket collaboration and work tracking: Public Comments, Internal Notes, Actions Taken, Service Actions
- Ticket lifecycle beyond creation: any status change after the initial `New`, resolution confirmation, resolving, closing, reopening, cancelling
- Administration: managing users, Requesters, roles, or reference data through the UI
- Notifications, event/audit log UI, and SeaweedFS object storage (see §11.5)

## 4. Functional Requirements

### Requester context
- **FR-01** The system shall retrieve the list of active Development Requesters for selection.
- **FR-02** The system shall let the user select one Development Requester as the current requester context.
- **FR-03** The system shall persist the selected requester across navigation within the session.
- **FR-04** The system shall display the current requester's name in the application shell.
- **FR-05** The system shall provide a Change Requester action that returns the user to selection.
- **FR-06** The system shall reload requester-scoped data whenever the selected requester changes.
- **FR-07** The system shall prevent access to ticket screens while no requester is selected, redirecting to selection instead.

### Reference data
- **FR-08** The system shall retrieve active Ticket Categories for use in the Create Ticket form.
- **FR-09** The system shall retrieve active Related Systems for use in the Create Ticket form.

### Ticket creation
- **FR-10** The system shall allow the current requester to create a Ticket with category, related system, summary, description, and requested priority.
- **FR-11** The system shall generate the official Ticket Number on the backend when a Ticket is created.
- **FR-12** The system shall record the current requester as the Ticket's requester.
- **FR-13** The system shall allow the requester to attach permitted files during Ticket creation.
- **FR-14** The system shall display the generated Ticket Number to the requester after successful creation.
- **FR-15** The system shall reject invalid Ticket submissions with field-level messages and shall not create a Ticket.

### Ticket listing
- **FR-16** The system shall list only the Tickets belonging to the current requester.
- **FR-17** The system shall support searching the requester's Tickets by Ticket Number and Summary.
- **FR-18** The system shall support filtering the requester's Tickets by Category, Requested Priority, and Current Status.
- **FR-19** The system shall support sorting the requester's Tickets on a defined set of columns.
- **FR-20** The system shall paginate the Ticket list and report pagination metadata.
- **FR-21** The system shall present distinguishable empty and no-results states.
- **FR-22** The system shall provide a Clear Filters action that returns the list to its default query.

### Ticket detail
- **FR-23** The system shall retrieve one Ticket owned by the current requester and present its information read-only.
- **FR-24** The system shall refuse to return a Ticket that belongs to a different requester.

### Attachments
- **FR-25** The system shall list a Ticket's attachment metadata, including attachments that have been removed.
- **FR-26** The system shall allow the requester to add a permitted attachment to an existing owned Ticket.
- **FR-27** The system shall allow the requester to download an active attachment of an owned Ticket.
- **FR-28** The system shall allow the requester to remove their own attachment using soft removal with a reason.
- **FR-29** The system shall refuse to serve the content of a removed attachment.
- **FR-30** The system shall refuse attachment operations on a Ticket belonging to a different requester.

### Cross-cutting UI behaviour
- **FR-31** The system shall present loading, empty, success, and failure states for every remote operation.
- **FR-32** The system shall preserve entered form values when a submission fails for a recoverable reason.
- **FR-33** The system shall present a usable layout at desktop, tablet, and mobile viewport widths.

## 5. Business Rules

### System-generated values and defaults
- **BR-01** The official Ticket Number is generated by the backend and must be unique. *(mandatory)*
- **BR-02** A new Ticket begins with Current Status `New`. *(mandatory)*
- **BR-04** The Ticket Number format is `TKT-YYYY-NNNNNN`, where `YYYY` is the creation year and `NNNNNN` is a zero-padded sequence that restarts at 1 each calendar year.
- **BR-05** Ticket Number allocation happens inside the same database transaction as the Ticket insert, so concurrent creation cannot produce duplicates.
- **BR-06** Ticket Date is the server-side creation timestamp, stored in UTC, and is read-only to the requester.
- **BR-07** A new Ticket has no Ticket Owner. Owner assignment belongs to the IT Staff workflow and is out of scope.
- **BR-08** IT Priority initially copies Requested Priority. Only IT Staff or an Administrator may change it later, so in this sprint it is read-only to the requester.
- **BR-09** Requested Priority and IT Priority use the vocabulary `LOW`, `MEDIUM`, `HIGH`, `URGENT`. Current Status uses `NEW`, `ASSIGNED`, `IN_PROGRESS`, `PENDING_REQUESTER`, `RESOLVED`, `CLOSED`, `CANCELLED`; only `NEW` is reachable in this sprint.

### Development Requester selection
- **BR-03** Lab 2 uses a Development Requester selector instead of login. The selected identity is for testing only and is not authentication. *(mandatory)*
- **BR-10** Only active Development Requesters appear in the selector. The inactive seeded Requester must never be offered.
- **BR-11** An inactive Requester cannot become the current requester and cannot be the requester of a new Ticket.
- **BR-12** A requester context is required before any ticket screen may be used.
- **BR-13** Changing the selected Requester discards requester-scoped data in the client and refetches it for the new selection.
- **BR-14** The selector is a client-side convenience. Every backend request that reads or writes requester-owned data carries the requester identifier and is authorized on the server; hiding a control in the UI is never treated as authorization.

### Ownership
- **BR-15** A Ticket belongs to exactly one Requester and is accessible only in that requester's context.
- **BR-16** A request for a Ticket owned by another Requester is answered as **not found** rather than forbidden, so the response does not disclose that the Ticket exists.
- **BR-17** Attachment operations inherit their Ticket's ownership rule.

### Validation
- **BR-18** Category, Related System, Summary, Description, and Requested Priority are required on creation. Ticket Number, Ticket Date, Requester, IT Priority, Current Status, and Ticket Owner are system-controlled and not accepted from the client.
- **BR-19** Summary is 5–150 characters after trimming. It is a single line intended to be scannable in the list, so an upper bound short enough to render in one table cell is preferred over an arbitrary large limit.
- **BR-20** Description is 10–5000 characters after trimming. The lower bound rejects placeholder text such as "help"; the upper bound is generous because a Requester pasting logs is a legitimate case.
- **BR-21** Leading and trailing whitespace is trimmed from Summary and Description before validation and storage. A field containing only whitespace is treated as empty.
- **BR-22** Category and Related System must reference existing active reference rows; an unknown or inactive identifier is a validation failure.
- **BR-23** Validation runs on both the client and the server. Client validation is for usability only and never substitutes for server validation.
- **BR-24** The submit action is disabled while a submission is in flight, so a double click cannot create two Tickets.
- **BR-25** When creation fails for a recoverable reason, the entered values remain in the form so the requester does not retype them.

### Attachments
- **BR-26** Allowed attachment types are JPG/JPEG, PNG, WEBP, and PDF. Both the declared MIME type and the file extension are checked.
- **BR-27** Maximum attachment size is 5 MB per file.
- **BR-28** A Ticket may hold at most five **active** attachments. Removed attachments do not count toward the limit.
- **BR-29** Attachment metadata records the original filename, generated stored filename, MIME type, size in bytes, uploader, and upload timestamp.
- **BR-30** Stored files are renamed to a generated identifier. The original filename is preserved as metadata only and is never used as a filesystem path.
- **BR-31** Removal is soft removal. The metadata row is retained and marked with removal timestamp, remover, and reason.
- **BR-32** Removal requires an explicit confirmation and a reason.
- **BR-33** A removed attachment remains visible as metadata but its content must not be downloadable or previewable.
- **BR-34** If attachment upload fails after the Ticket row has been written, the Ticket is kept and the failure is reported per-file. The requester can add the attachment again from Ticket Detail. Ticket creation is not rolled back because of an attachment failure.
- **BR-35** Uploaded files are stored outside version control and are never committed.

### Listing behaviour
- **BR-36** Search matches Ticket Number and Summary, case-insensitively, on a partial match.
- **BR-37** The default sort is newest first by creation time. A stable secondary sort on Ticket Number keeps ordering deterministic when timestamps tie.
- **BR-38** Only a defined whitelist of fields is sortable. A sort request outside the whitelist is a validation failure rather than a silent fallback.
- **BR-39** Default page size is 10 and the maximum accepted page size is 50. Out-of-range or non-numeric pagination values are validation failures.
- **BR-40** A page beyond the last page returns an empty result set with correct pagination metadata, not an error.
- **BR-41** The empty state ("you have no tickets yet") and the no-results state ("no tickets match these filters") are distinct, and the no-results state offers Clear Filters.

### Transition to Lab 3
- **BR-42** `RequesterUser` is a temporary Lab 2 model. In Lab 3 it is superseded by the authenticated `User` model with roles; the requester identifier carried by the API is replaced by the session-derived identity, and no client-supplied requester identifier is accepted thereafter.

## 6. UI Specification Summary

The full specification is in `ui-spec.md`. Summary of what it fixes:

- **Theme:** Zen Green tokens — primary `#006B3C`, secondary `#0B7A46`, pale `#EAF6EF`, page background `#F5F7F6`, white surfaces with restrained shadow, dark charcoal-green text, distinct read-only field shading, dark red errors, amber warnings, green success with text (never colour alone).
- **Shell:** TokTickIT identity, My Tickets and Create Ticket navigation with active-page indication, current Development Requester display, responsive mobile navigation.
- **Screens:** Development Requester Selection, Create Ticket, My Tickets, Requester Ticket Detail.
- **Components:** labels above controls; required fields marked with a red asterisk that does not replace the validation message; one consistent input height with a taller resizable Description; buttons with visible text; accessible label and tooltip on every icon-only control; visually distinct and non-activatable disabled controls; visible keyboard focus; busy submit state; validation messages beside their field.
- **States:** idle, loading, submitting, success, validation failure, API failure, empty, and no-results are specified per screen.
- **Responsive:** desktop ≥992 px multi-column; tablet 768–991 px two-column where practical; mobile <768 px stacked with touch-friendly buttons and no horizontal page scrolling. No clipped labels, overlapping messages, hidden buttons, or unreadable attachment names at any width.

## 7. Data Changes

All identifiers are UUID (§11.1). Timestamps are `timestamptz` in UTC.

| Model | Fields | Notes |
|---|---|---|
| `RequesterUser` | `id`, `displayName`, `email` unique, `isActive`, `createdAt`, `updatedAt` | Temporary Lab 2 stand-in for the authenticated user (BR-42) |
| `Category` | `id`, `name` unique, `isActive`, `createdAt` | Migrated from `Int` to UUID; `isActive` added |
| `RelatedSystem` | `id`, `name` unique, `isActive`, `createdAt` | New reference table |
| `Ticket` | `id`, `ticketNo` unique, `requesterId`, `categoryId`, `relatedSystemId`, `summary`, `description`, `requestedPriority`, `itPriority`, `status`, `ownerId` nullable, `createdAt`, `updatedAt` | Owner stays null in this sprint (BR-07) |
| `Attachment` | `id`, `ticketId`, `originalFilename`, `storedFilename` unique, `mimeType`, `sizeBytes`, `uploadedById`, `createdAt`, `removedAt` nullable, `removedReason` nullable, `removedById` nullable | Soft removal via `removedAt` (BR-31) |
| `TicketNumberSequence` | `year` primary key, `lastValue` | Supports the transactional annual sequence in BR-04/BR-05 |

**Enums:** `Priority { LOW, MEDIUM, HIGH, URGENT }`, `TicketStatus { NEW, ASSIGNED, IN_PROGRESS, PENDING_REQUESTER, RESOLVED, CLOSED, CANCELLED }`.

**Relationships:** one `RequesterUser` has many `Ticket`; one `Ticket` belongs to one `RequesterUser`; one `Ticket` has many `Attachment`; one `Category` is used by many `Ticket`; one `RelatedSystem` is used by many `Ticket`; one `RequesterUser` uploads many `Attachment`.

**Constraints and indexes:**
- Unique: `RequesterUser.email`, `Category.name`, `RelatedSystem.name`, `Ticket.ticketNo`, `Attachment.storedFilename`
- Foreign keys are restricted rather than cascading, so historical tickets are never silently destroyed
- Index `Ticket(requesterId, createdAt desc)` — every list query is requester-scoped and default-sorted this way
- Index `Ticket(requesterId, status)` and `Ticket(requesterId, categoryId)` — the filters exposed in FR-18
- Index `Attachment(ticketId, removedAt)` — the active-attachment count in BR-28
- Reference tables use `isActive` flags rather than deletion, so historical tickets keep resolvable references

**Justified design decision:** the `TicketNumberSequence` table exists instead of deriving the next number with `MAX(ticketNo)+1` or a Postgres sequence. `MAX` is not safe under concurrent creation without locking the whole table, and a plain Postgres sequence cannot restart per year without an out-of-band job. A single row per year, updated inside the creation transaction, gives both the annual reset required by BR-04 and the concurrency guarantee required by BR-05 with one row lock.

**Migration plan:** `Category` changes primary-key type, so the migration recreates the table and re-seeds the four required names. Seed data is authored idempotently by `name`, so the four categories survive with new identifiers. Lab 1's API test asserts literal integer identifiers and is rewritten to assert names and ordering (§11.1).

**Seed data (idempotent, safe to run repeatedly):**
- 4 Categories: Account and Access, Hardware, Software, Network
- 7 Related Systems: Email, Campus Wi-Fi, VPN, LEB2 App, Grade Submission App, Printer, Corporate Laptop
- 4 active Development Requesters and 1 inactive Development Requester

## 8. API Contract

Full request and response shapes are in `api-spec.md`. Capability summary:

| Capability | Endpoint | Success |
|---|---|---|
| Retrieve active Categories | `GET /api/categories` | 200 |
| Retrieve active Related Systems | `GET /api/related-systems` | 200 |
| Retrieve active Development Requesters | `GET /api/requesters` | 200 |
| Create a Ticket | `POST /api/tickets` | 201 |
| Retrieve the requester's Tickets | `GET /api/tickets` | 200 |
| Retrieve one owned Ticket | `GET /api/tickets/:id` | 200 |
| Retrieve Attachment metadata | `GET /api/tickets/:id/attachments` | 200 |
| Upload an Attachment | `POST /api/tickets/:id/attachments` | 201 |
| Download an active Attachment | `GET /api/attachments/:id/download` | 200 |
| Soft-remove an Attachment | `DELETE /api/attachments/:id` | 200 |

**Status codes:** 200 retrieval, 201 created, 400 validation failure, 404 missing resource or ownership failure (BR-16), 409 conflict, 410 removed attachment content, 413 payload too large, 415 unsupported media type, 500 unexpected error with a safe message and correlation identifier.

## 9. Acceptance Criteria

### Requester context
- **AC-01** Given no Development Requester is selected, when the user attempts to open My Tickets, then the Requester Selection screen is shown.
- **AC-02** Given the seed contains one inactive Requester, when the selection screen loads, then that Requester does not appear in the list.
- **AC-03** Given a Requester is selected, when any application screen is shown, then the shell displays that Requester's name and offers Change Requester.
- **AC-04** Given the requester API fails, when the selection screen loads, then a safe failure state is shown and no requester is selected.
- **AC-05** Given no active Requesters exist, when the selection screen loads, then an empty state explains that none are available.

### Ticket creation
- **AC-06** Given valid Ticket data, when the Requester submits the form, then one Ticket is saved and the official Ticket Number is displayed.
- **AC-07** Given a saved Ticket, when its stored row is inspected, then `requesterId` matches the Development Requester selected before entering the application.
- **AC-08** Given a saved Ticket, when it is retrieved, then its status is `New`, its Ticket Date is the server creation time, and it has no Ticket Owner.
- **AC-09** Given Summary is empty, when the Requester submits, then a message appears beside the Summary field and no create request is sent.
- **AC-10** Given Summary is shorter than the minimum, when the Requester submits, then the request is rejected with a field-level message and no Ticket is created.
- **AC-11** Given the Create Ticket screen is open, when reference data has loaded, then Category and Related System options come from the database.
- **AC-12** Given a submission is in flight, when the Requester clicks Submit again, then the control is disabled and only one Ticket is created.
- **AC-13** Given the backend is unavailable, when the Requester submits, then a safe failure message is shown and the entered values remain in the form.
- **AC-14** Given two Tickets are created in the same year, when their Ticket Numbers are compared, then both match `TKT-YYYY-NNNNNN` and differ from each other.

### Attachments on creation
- **AC-15** Given a 2 MB PNG is selected, when the Ticket is submitted, then the Ticket is created and the attachment is listed as active.
- **AC-16** Given a file of a disallowed type is selected, when the Requester attempts to submit, then the file is rejected with a message naming the permitted types.
- **AC-17** Given a file larger than 5 MB is selected, when the Requester attempts to submit, then the file is rejected with a message stating the size limit.

### My Tickets
- **AC-18** Given Requester A has tickets, when Requester A opens My Tickets, then only Requester A's tickets are listed.
- **AC-19** Given Requester A's list is displayed, when the context is switched to Requester B, then Requester A's tickets are no longer shown.
- **AC-20** Given a search term matching one Summary, when the search is applied, then only matching tickets are listed.
- **AC-21** Given a Category filter is applied, when the list reloads, then every listed ticket has that Category.
- **AC-22** Given a sortable column is chosen, when the list reloads, then rows are ordered by that column in the requested direction.
- **AC-23** Given more tickets exist than one page holds, when the next page is requested, then the following set is returned with correct pagination metadata.
- **AC-24** Given a page size above the maximum is requested, when the list is retrieved, then the request is rejected as invalid.
- **AC-25** Given the Requester has no tickets at all, when My Tickets loads, then the empty state is shown.
- **AC-26** Given filters that match nothing, when the list reloads, then the no-results state is shown together with Clear Filters.

### Ticket detail and attachment lifecycle
- **AC-27** Given Requester A owns a Ticket, when Requester A opens it, then the ticket information is displayed read-only.
- **AC-28** Given Requester B is selected, when a Ticket belonging to Requester A is requested directly, then the ticket data is not returned.
- **AC-29** Given an owned Ticket with fewer than five active attachments, when a permitted file is added, then it appears as an active attachment.
- **AC-30** Given an owned Ticket with five active attachments, when another file is added, then the request is rejected and the count stays at five.
- **AC-31** Given an active attachment, when it is downloaded, then its content is returned.
- **AC-32** Given an attachment is removed with a reason, when the attachment list is retrieved, then it is still listed as metadata and marked removed.
- **AC-33** Given a removed attachment, when its content is requested, then the content is not served.
- **AC-34** Given Requester B is selected, when an attachment belonging to Requester A's Ticket is requested, then the request is refused.

### Presentation
- **AC-35** Given each screen at desktop, tablet, and mobile widths, when it is rendered, then no label is clipped, no message overlaps, no button is hidden, and the page does not scroll horizontally.
- **AC-36** Given every priority and status value, when it is displayed, then it is conveyed by text as well as colour.
- **AC-37** Given keyboard-only navigation, when focus moves through a form, then the focused control is visibly indicated and every control is reachable.

*Traceability from each criterion to its planned tests is maintained in `tests.md`.*

## 10. Definition of Done

> **Provisional.** The items below are derived from the labsheet's own Definition of Done requirements (§13.1 Product Completion, §13.2 Course Delivery). Lecture 4 (Test Design, TDD, Verification, and Definition of Done, 25 Aug) covers this topic directly; its guidance will be folded in as an amendment to this section. Everything else in this specification is settled and implementation may proceed against it.

### Part 1 — Product completion
- All approved scope in §3 is implemented; nothing from the excluded list was added
- Every acceptance criterion in §9 is satisfied and linked to passing test evidence in `tests.md`
- All required tests pass from documented commands on the final `main` branch
- No required test is skipped, disabled, or commented out
- Implemented screens and endpoints conform to `ui-spec.md` and `api-spec.md`
- Data, validation, ownership, and responsive rules behave as specified, including failure and boundary cases
- Ticket Number uniqueness holds under concurrent creation
- Ownership is enforced server-side and verified by tests that call the API outside the UI
- Soft-removed attachments retain metadata and refuse content
- Seed remains idempotent
- No secret, `.env`, credential, uploaded file, or `node_modules` is tracked
- README setup, run, and test instructions are current

### Part 2 — Course delivery
- Work decomposed into GitHub Issues on the Kanban board, each moved through the six statuses truthfully
- Each Issue implemented on its own feature branch and merged into `lab2-staging` through a peer-reviewed Pull Request
- Every PR linked to its Issue through the Development panel, verified in the PR sidebar
- Every review comment answered; changes fixed on the same branch; reviewer merges
- One release Pull Request from `lab2-staging` to `main`
- `docs/lab-02/` contains `specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`, `reviewer.md`, `ai-use.md`
- Submission PDF prepared in the required "Answer Part 1–9" order

## 11. Assumptions and Decisions

Recorded because they either deviate from the System-Level SDS or resolve something the labsheet left open. Per the SDS conflict rule, a feature specification may extend the SDS but may not silently contradict it, so each contradiction is stated with its reason.

**11.1 Identifiers are UUID; `Category` migrates from `Int`.**
The SDS requires UUID for all primary entities. The labsheet's partial example shows `"requesterId": 1`, but the labsheet explicitly labels that JSON incomplete and instructs students to define the final contract, so it is illustrative rather than binding. UUID is adopted, which also means ticket identifiers appearing in URLs are not guessable — a second layer behind the ownership check that Part 8 must demonstrate. Consequence: Lab 1's `Category` migrates from `Int`, and Lab 1's API test, which asserts literal identifiers `1`–`4`, is rewritten to assert names and ordering. Lab 1 was submitted with integer-identifier evidence and is unaffected retroactively; this is deliberate schema evolution, not a silent break.

**11.2 The Zen Green theme overrides SDS decision D-09.**
SDS D-09 fixes the KMUTT palette (orange `#FA4616`, yellow `#FFC72C`, blue grey `#7B8189`). The Lab 2 labsheet §7 instead specifies Zen Green with exact hex values and grades conformance to it in Part 9. The labsheet governs this sprint, so Zen Green is implemented and the deviation is recorded here rather than resolved silently.

**11.3 API paths stay under `/api`, not `/api/v1`.**
The SDS roots all endpoints at `/api/v1`. Lab 1 shipped `/api/health` and `/api/categories`, and the labsheet's examples use `/api/tickets`. Keeping `/api` avoids breaking existing endpoints and matches the graded examples. Versioning can be introduced as a single prefix change when it earns its cost.

**11.4 Validation failures return 400, not 422.**
The SDS specifies 422 for validation errors. The labsheet §6.4 lists 400 for invalid input. The labsheet is followed.

**11.5 Attachments are stored on the local filesystem behind an adapter.**
SDS D-06 specifies SeaweedFS with S3-compatible access. The labsheet does not require object storage, and running SeaweedFS adds an external service that nothing in this sprint's acceptance criteria depends on. Files are written to a local directory that is excluded from version control, reached through a small storage interface (`put`, `getStream`, `delete`) so that a SeaweedFS implementation can replace it without touching the attachment service. Stored filenames are generated, never derived from user input.

**11.6 Ticket Number uses six sequence digits.**
SDS D-10 writes the format as `TKT-YYYY-NNNNN` (five digits), while the labsheet's screenshots show `TKT-2025-001234` (six digits). Six digits are used to match the visual reference the UI is checked against.

**11.7 Cross-requester access answers 404 rather than 403.**
Returning 403 would confirm that a Ticket exists while refusing it. Because ticket identifiers are otherwise opaque, answering 404 keeps existence undisclosed. This is stricter than the SDS authorization table, which lists 403 for authorization failures generally, and is documented as a deliberate hardening choice for requester-owned resources.

**11.8 IT Priority is displayed read-only to the Requester.**
The labsheet's reference screen shows IT Priority on the ticket, and the SDS states that only IT Staff or an Administrator may change it. It is therefore shown but never editable in this sprint, initialised by copying Requested Priority (BR-08).

**11.9 Attachment failure does not roll back ticket creation.**
A Ticket carries the requester's problem description and is the valuable record; a failed file upload is recoverable from Ticket Detail. Keeping the Ticket and reporting the per-file failure is preferred over discarding a valid submission. The SDS's compensating-cleanup guidance is applied in the other direction: an orphaned stored file is deleted if its metadata row cannot be written.

**11.10 Event/audit records are out of scope for this sprint.**
The SDS requires a `TicketEvent` written in the same transaction as material changes. This sprint's only material change is ticket creation and attachment addition/removal, and the labsheet excludes the event log from Lab 2 scope. The transaction boundaries are structured so that adding event writes later does not require reshaping the services.
