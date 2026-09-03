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
- **FR-18** The system shall support filtering the requester's Tickets by Category, Requested Priority, IT Priority, and Current Status.
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

### Workflow and state transitions

Recorded as a named subsection because Lecture 4 (slide 100) lists workflow and state transitions among the required Feature-Level SDS contents. Two lifecycles exist in this sprint, and both are deliberately narrow.

**Ticket status.** The enum in §7 declares seven values because it models the whole product, but this sprint drives exactly one transition: *(none)* → `NEW`, at creation. No requester-facing action in scope changes a Ticket's status afterwards. The remaining six values are reachable only by IT Staff actions that Lab 3 introduces. A Ticket therefore has no editable state in Lab 2 — a fact that Issues implementing the detail screen must respect rather than anticipate, since a control that changes status would be outside scope and unenforced on the server.

**Attachment lifecycle.** `active` → `soft-removed`, one direction only. The transition sets `removedAt`, `removedReason`, and `removedById`, and it is not reversible in this sprint. A soft-removed attachment keeps its metadata and remains visible as a removed row; requests for its content are refused with 410 rather than 404, because the record demonstrably existed. Removal of an already-removed attachment is not an error state to model but a no-op the handler must recognise. TC-014 proves both the legal transition and the refusal that follows it.

**Requester context** is session state rather than entity state, and is not modelled here. Its behaviour is fixed by BR-12 and BR-14.

## 5. Business Rules

### System-generated values and defaults
- **BR-01** The official Ticket Number is generated by the backend and must be unique. *(mandatory)*
- **BR-02** A new Ticket begins with Current Status `New`. *(mandatory)*
- **BR-04** The Ticket Number format is `TKT-YYYY-NNNNNN`, where `YYYY` is the creation year **in the `Asia/Bangkok` calendar** and `NNNNNN` is a zero-padded sequence that restarts at 1 each calendar year. The sequence row in `TicketNumberSequence` is keyed by that same Bangkok year, so the number and its reset boundary never disagree. See §11.13.
- **BR-05** Ticket Number allocation happens inside the same database transaction as the Ticket insert, so concurrent creation cannot produce duplicates.
- **BR-06** Ticket Date is the server-side creation timestamp, stored in UTC, and is read-only to the requester. Storage remains UTC regardless of BR-04: the Bangkok calendar governs only the year *label* inside the Ticket Number, never the stored instant.
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
- **BR-34** Attachment failures during Ticket creation are handled according to **who can act on them**, and the two cases behave differently:
  - **Rule violations** — a file over the size limit (BR-27) or of a disallowed type (BR-26) — are detected before anything is written. The whole request is rejected, **no Ticket is created**, and the response names the offending file. The requester chose the file and can choose a different one, so failing fast is the shorter path back to a correct submission than creating a Ticket the requester must then repair.
  - **Storage failures** — the file was permitted but could not be written — are detected only after the Ticket row exists. The **Ticket is kept** and the failure is reported per-file in `attachmentFailures`. The requester can add the file again from Ticket Detail. Discarding a valid problem description, which the requester typed and cannot recover, in order to punish an infrastructure fault the requester did not cause would be the wrong trade.
- **BR-43** The distinction in BR-34 is drawn on **whether the requester can correct the fault**, not on when in the request it was detected. A new failure mode is classified by asking whether resubmitting the same input would succeed: if it would not, reject the request; if it might, keep the Ticket and report the failure.
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

### Permissions

Recorded as a named subsection for the same reason as the previous one — Lecture 4 slide 100 lists permissions among the required Feature-Level SDS contents. The rules themselves are not new; they are gathered here from BR-12, BR-14, BR-16, and FR-30 so that a reviewer can find the whole authorization story in one place.

This sprint has **no authentication and exactly one role.** Every actor is a Development Requester, selected rather than logged in. That makes the permission model small, and it makes stating its limits more important than stating its rules.

| Actor | May | May not |
|---|---|---|
| Development Requester | Create a Ticket; list, search, filter, sort, and page their own Tickets; open their own Ticket; add, download, and soft-remove attachments on their own Tickets | Read or modify another requester's Ticket or its attachments; change any Ticket's status, IT priority, or owner; act as an inactive requester |

**Enforcement.** Every rule above is enforced in the request handler against the requester context carried by `X-Requester-Id`, never by the presence or absence of a control in the UI. TC-003 proves this by calling each endpoint directly with a mismatched requester and no UI involved.

**Failure shape.** A cross-requester access returns 404 rather than 403 (BR-16, §11.3). A 403 would confirm that the record exists while refusing it; with UUID identifiers that are not guessable, 404 keeps existence undisclosed.

**Known limitation, stated deliberately.** `X-Requester-Id` is client-supplied and therefore trivially forged. This is not an oversight but the accepted consequence of a sprint scoped without authentication: the labsheet defers login to Lab 3, and BR-42 records the replacement. The header is treated as an identity *claim* that the server resolves and validates against an active `RequesterUser` — it is never trusted as an authorization *decision*. The ownership check runs on every request regardless. When Lab 3 introduces sessions, the claim's source changes and every check downstream of it stays as written; that is why the requester context enters through a single middleware rather than through each endpoint's body (§11.4).

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

**Relationships:** one `RequesterUser` has many `Ticket`; one `Ticket` belongs to one `RequesterUser`; one `Ticket` has many `Attachment`; one `Category` is used by many `Ticket`; one `RelatedSystem` is used by many `Ticket`; one `RequesterUser` uploads many `Attachment`; one `RequesterUser` removes many `Attachment`.

`Attachment` holds **two** references to `RequesterUser` — `uploadedById` (required) and `removedById` (nullable) — so the two relations are named explicitly, `AttachmentUploader` and `AttachmentRemover`. Prisma cannot infer which back-reference belongs to which field when a model is referenced twice, and refuses to generate a client without the names. Recorded because the relationship list above reads as though there were one.

**Constraints and indexes:**
- Unique: `RequesterUser.email`, `Category.name`, `RelatedSystem.name`, `Ticket.ticketNo`, `Attachment.storedFilename`
- Foreign keys are restricted rather than cascading, so historical tickets are never silently destroyed
- Index `Ticket(requesterId, createdAt desc)` — every list query is requester-scoped and default-sorted this way
- Index `Ticket(requesterId, status)` and `Ticket(requesterId, categoryId)` — the filters exposed in FR-18
- Index `Attachment(ticketId, removedAt)` — the active-attachment count in BR-28
- Reference tables use `isActive` flags rather than deletion, so historical tickets keep resolvable references

**Justified design decision:** the `TicketNumberSequence` table exists instead of deriving the next number with `MAX(ticketNo)+1` or a Postgres sequence. `MAX` is not safe under concurrent creation without locking the whole table, and a plain Postgres sequence cannot restart per year without an out-of-band job. A single row per year, updated inside the creation transaction, gives both the annual reset required by BR-04 and the concurrency guarantee required by BR-05 with one row lock.

**Migration plan:** `Category` changes primary-key type, so the migration recreates the table and re-seeds the four required names. Seed data is authored idempotently by `name`, so the four categories survive with new identifiers. Lab 1's API test asserts literal integer identifiers and is rewritten to assert names and ordering (§11.1).

`GET /api/categories` changes in the same migration, and in two ways at once: its identifiers become UUID, and its response adopts the `{ "data": [...] }` envelope that `api-spec.md` requires of every endpoint. Lab 1 returned a bare array. Both changes are delivered by the schema Issue together with the rewritten test, because splitting them would leave a merged commit whose test suite is red — a state `testing-contract.md` §6 does not permit.

**Implementation order.** The schema Issue precedes the ticket-service Issue. `Ticket`, `Attachment`, `RequesterUser`, `TicketNumberSequence`, and both enums do not exist yet, so no ticket endpoint can be written, and no API test for one can fail *for the intended reason* — it would fail at the Prisma client instead, which `testing-contract.md` §5 rejects as red-phase evidence. The theme Issue touches no database and runs in parallel with either.

**Seed data (idempotent, safe to run repeatedly).** Identities are fixed here rather than left to the implementation, because they appear in the Part 5–8 screenshots: changing a name later means retaking them.

- **4 Categories** — Account and Access, Hardware, Network, Software
- **7 Related Systems** — Campus Wi-Fi, Corporate Laptop, Email, Grade Submission App, LEB2 App, Printer, VPN
- **5 Development Requesters**

| Display name | Email | Active |
|---|---|---|
| Jennifer Anderson | `jennifer.anderson@example.ac.th` | yes |
| Michael Brown | `michael.brown@example.ac.th` | yes |
| Sarah Johnson | `sarah.johnson@example.ac.th` | yes |
| David Lee | `david.lee@example.ac.th` | yes |
| Robert Wilson | `robert.wilson@example.ac.th` | **no** |

Robert Wilson exists solely to prove BR-10 and BR-11 — he must never appear in the selector, and must never become a Ticket's requester. A seed with only active rows cannot demonstrate either rule.

Both reference lists are seeded and returned in `name` order (§11.15). Seeding is idempotent by `name` for reference data and by `email` for Requesters, so a repeated run updates nothing and inserts nothing.

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

> **Settled, 25 August 2026.** This section was previously marked provisional pending Lecture 4. Lecture 4 (*UML, SDS Features, STS Features*) does not address the Definition of Done — the term appears nowhere in its 161 slides — so no external guidance is outstanding. The items below stand on the labsheet's own requirements (§13.1 Product Completion, §13.2 Course Delivery), extended with the completion gate in `testing-contract.md` §6. Implementation proceeds against this section as written.

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
- Every Issue satisfies the completion gate in `testing-contract.md` §6, including red-phase evidence

### Part 2 — Course delivery
- Work decomposed into GitHub Issues on the Kanban board, each moved through the six statuses truthfully
- Each Issue implemented on its own feature branch and merged into `lab2-staging` through a peer-reviewed Pull Request
- Every PR linked to its Issue through the Development panel, verified in the PR sidebar
- Every review comment answered; changes fixed on the same branch; reviewer merges
- One release Pull Request from `lab2-staging` to `main`
- `docs/lab-02/` contains `specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`, `reviewer.md`, `ai-use.md`
- Submission PDF prepared in the required "Answer Part 1–9" order
- Every UI Issue audited against `style-contract.md` §9 before review was requested

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

**11.11 Section numbering follows the labsheet, not Lecture 4 slide 100.**
Lecture 4 lists eleven Feature-Level SDS contents that differ in name and order from the labsheet's eleven required sections. The labsheet governs grading, so its numbering is kept and the lecture's contents are mapped onto it. Two of the lecture's items had no home and are now named subsections — *workflow and state transitions* under §4 and *permissions* under §5 — so that nothing the lecture requires is merely implied.

| Lecture 4 slide 100 | Where it lives here |
|---|---|
| Feature purpose and scope | §1, §3 |
| Related SRS requirements | §4 |
| Workflow and state transitions | §4 — *Workflow and state transitions* |
| Business rules | §5 |
| Data model changes | §7, `diagrams.md` §1 |
| API endpoints | §8, `api-spec.md` |
| UI behaviour | §6, `ui-spec.md` |
| Permissions | §5 — *Permissions* |
| Validation and error handling | §5, `api-spec.md` |
| Acceptance criteria | §9 |
| Test considerations | `tests.md`, `testing-contract.md` |

**11.12 Two UML diagrams are produced, not four.**
Lecture 4 teaches use-case, sequence, activity, and class diagrams; the labsheet requires none. Class and activity diagrams are produced because each settles a decision the implementation Issues consume — the entity structure and the transaction boundary around ticket-number allocation. A use-case diagram covering one actor performing four operations, and a sequence diagram restating the activity diagram's flow, would add pages without deciding anything, and a diagram that decides nothing drifts from the code unnoticed. Recorded here so the omission reads as a choice rather than an oversight.

**11.13 The Ticket Number year uses the `Asia/Bangkok` calendar, while timestamps stay UTC.**
BR-04 needs a calendar year and §7 stores every timestamp in UTC, so the two must be reconciled explicitly rather than left to whichever the implementation reaches for first.

They disagree for seven hours each year. A Ticket created at 03:00 on 1 January Bangkok time is stored as 20:00 on 31 December UTC. Deriving the year from UTC would label it `TKT-2026-…` and display its Ticket Date as 1 January 2027 — two fields on the same screen contradicting each other, in the one week of the year when a reader is most likely to notice.

The stored instant is a machine fact and stays UTC; the year inside a Ticket Number is a human-readable label that sits beside a date rendered in the requester's local time. It is therefore computed in `Asia/Bangkok`, a fixed UTC+7 offset with no daylight saving, so the conversion is exact and needs no timezone database at runtime. `TicketNumberSequence.year` is keyed the same way, so the annual reset in BR-04 happens on the same boundary as the label.

The initially considered alternative — deriving the year from UTC for consistency with storage — optimised for agreement between the number and the database column. That is the wrong pair to keep consistent: nobody reads the column, and everybody reads the number.

*Test consideration:* the boundary case is fixed-clock, not wall-clock. Tests inject a known instant rather than waiting for New Year, and cover 31 December 16:59 UTC and 17:00 UTC — the two sides of the Bangkok year boundary.

**11.14 Attachment failures are classified by who can correct them.**
The labsheet and the SDS both treat "attachment failed" as a single case. Implementation revealed two, with opposite correct answers, and BR-34 now separates them: a rule violation rejects the whole request, a storage failure keeps the Ticket.

The line is drawn on **whether the requester can act on the failure**, not on where in the request it surfaced. A 6 MB file is the requester's own choice and resubmitting it would fail again, so creating a Ticket that the requester must then repair adds a step without adding a possible outcome. A disk write that failed might well succeed on retry, and the description the requester typed is the valuable part of the submission — the labsheet's own framing of the Ticket as the record of the problem.

This extends SDS §11.9 rather than contradicting it. §11.9 established that an attachment failure does not roll back Ticket creation; that reasoning holds for faults outside the requester's control and was never meant to shield an input the requester supplied and can fix. BR-43 states the test to apply when a new failure mode appears.

*Consequence for `api-spec.md`:* `413 FILE_TOO_LARGE` and `415 UNSUPPORTED_FILE_TYPE` on `POST /api/tickets` reject the entire request, and `attachmentFailures` carries only post-creation storage faults. Both paths are separately tested; a suite that exercises only one of them would pass against an implementation that collapses the two.

**11.15 Presentation order is a rule, not a property of the data.**
`api-spec.md` stated that reference lists are ordered by `name`, while its own Categories example listed *Software* before *Network* — the order the labsheet happens to write the four names in. The Related Systems example, by contrast, was alphabetical. The rule is authoritative and the example was corrected.

The alternative was to preserve the labsheet's sequence, which would require either a `sortOrder` column that §7 does not have, or an implicit dependence on insertion order. Insertion order is not a guarantee any database makes without an `ORDER BY`, so a list that looked right in development would reorder itself the first time a row was updated or the seed ran differently — a defect that appears late, intermittently, and in a screenshot.

Ordering by `name` is also what the rewritten Lab 1 test can assert without asserting identifiers, which §11.1 requires.

**11.16 Automated tests run against a dedicated database, reset and seeded once per run.**
Lab 1 left this undefined: `tests/lab-01/setup.ts` points at `.env.test`, but nothing documented how that database came to exist, and the Categories test simply assumed a pre-seeded one. That assumption does not survive this sprint — `testing-contract.md` TCS-03 requires each test to seed what it needs, and Lab 2 adds cases needing two distinct requesters, removed attachments, and specific ticket counts.

The strategy is split by what the data is for:

- **Reference data** — Categories, Related Systems, Requesters — is migrated and seeded **once** before the suite. It is read-only to every test, and re-seeding it per test would cost time to restore something nothing mutates.
- **Transactional data** — Tickets and Attachments — is created by the test that needs it and removed afterwards. No test may depend on a Ticket another test created, and none may assume an empty Ticket table it did not empty itself.

`.env.test` stays untracked, and `.env.example` documents the variable so the database is reproducible from a clean clone. Test and development databases are separate: a suite that truncates tables must never be one command away from the database holding the screenshots.

**11.17 Priority badges get their own colour tokens.**
`ui-spec.md` §10 described priority as "grey, amber, orange-red, dark red" while §1 defined no token for any of them. Every way of implementing it as written broke a rule: reusing `--zen-error` for `URGENT` violates STY-004, which reserves semantic tokens for their semantics, and writing the hex values inline violates STY-001.

Four token pairs are added instead. Priority is a domain vocabulary with its own ordering, not a severity signal about the application's state — a ticket marked `URGENT` is not an error. Borrowing the error token would also couple them: changing the error colour later would silently restyle every badge.

`URGENT` is the only value that fills its background and reverses its text. It separates by weight as well as hue, so the scale stays legible when the four tints are hard to tell apart — and every badge carries its text label regardless (AC-36).

**11.18 The Lab 1 demonstration screen becomes a route rather than being deleted.**
Issue #19 replaces `App.tsx` with the application shell, and the Lab 1 screen it contained uses `navbar-dark`, `bg-dark`, and `btn-primary` — Bootstrap colour utilities that STY-003 forbids on themed surfaces. Its six tests assert that screen's behaviour.

The screen moves to `/system-check` under the new shell. Deleting it would discard passing Lab 1 evidence to satisfy a Lab 2 style rule, and rewriting the six tests to assert nothing would be worse. Keeping it as a route restyles it into the theme while every test stays meaningful — the same treatment §11.1 gave the Lab 1 categories test.

**11.19 Routing uses `react-router-dom`.**
No document named a router and the client had none. `react-router-dom` is the default for a React single-page application, and its `NavLink` supplies the active-page state that STY-007 requires as `aria-current="page"` rather than leaving it to be hand-rolled and forgotten.

**11.20 The requester context lives in `sessionStorage`, and is revalidated on load.**
FR-03 requires the selection to persist "across navigation within the session" without saying how. Three options were weighed.

React state alone loses the selection on every refresh, which makes the screen unusable for the repeated reloading that screenshot capture involves. `localStorage` survives browser restarts, which reads as "remember me" — precisely the impression BR-03 forbids, since this is a testing mechanism and not a login. `sessionStorage` lasts for the life of the tab and is discarded when it closes, which is what "within the session" describes.

Only the requester's identifier is stored. Display name and email are refetched, so a renamed requester is never shown from a stale copy.

**The stored identifier is validated against `GET /api/requesters` when the application loads.** Re-seeding the database regenerates every UUID, so an identifier held from before a reseed refers to nothing. Without the check, every request returns a `400` requester-context error (`REQUESTER_NOT_FOUND` or `REQUESTER_INACTIVE`) and the route guard bounces the user out of each screen in turn, with no way to reach the selection screen and fix it. This is not a hypothetical: the database is reset frequently while preparing evidence. If the stored identifier is not among the active requesters, it is cleared and the user is returned to selection.

**11.21 `X-Requester-Id` is validated by one middleware, not by each handler.**
The header is checked once, before any requester-scoped handler runs: present, well-formed UUID, resolves to a row, and that row is active. Failure returns 400 with the shared error envelope, never a fallback to some default requester.

Concentrating it in one place is what makes BR-42 cheap. Lab 3 replaces the claim's source with a session and deletes this middleware; every ownership check downstream keeps reading the same resolved requester and needs no edit. Spreading the same four checks through each handler would mean four opportunities per endpoint to forget one, and the one most easily forgotten — the active check — is the one BR-11 depends on.

The middleware resolves the requester and attaches it to the request. Handlers read the resolved row rather than the raw header, so a handler cannot accidentally trust an unvalidated value.

**11.22 IT Priority is an explicit My Tickets filter.**
`ui-spec.md` §8 requires an IT Priority select, while the first listing wording in FR-18 and `api-spec.md` omitted it. The filter is added to FR-18 and the `GET /api/tickets` query contract rather than silently mapping it to Requested Priority. BR-08 makes the two values equal when a Ticket is created, but IT Staff may change IT Priority later; a client-side alias would therefore return incorrect results. The server owns the filter and combines it with the other filters using AND.

**11.23 Issue #23 uses a dedicated E2E database and a non-destructive setup.**
Playwright runs against a disposable PostgreSQL database whose name ends in `_test`, separate from both the development and API-integration databases. The harness accepts `E2E_DATABASE_URL`, or derives `toktickit_e2e_test` from the credentials in `server/.env.test` when that file points at `toktickit_test`. PostgreSQL URI credentials must percent-encode reserved characters. Global setup applies committed migrations with `prisma migrate deploy` and runs the idempotent seed; it never resets a database automatically. Each test registers the unique summary it creates, and its fixture removes only those Tickets and their stored attachment files during teardown. E2E data therefore does not depend on test order or leave E2E Ticket/Attachment rows or files behind after a run; the shared TicketNumberSequence counter is intentionally retained for uniqueness.

**11.24 Issue #23 owns the canonical responsive screenshot set.**
The RESP tests capture full-page screenshots at the fixed widths in `ui-spec.md` §11: 1280×900 desktop, 834×1112 tablet, and 390×844 mobile. They write the nine main-screen captures to `artifacts/lab-02/screenshots/{create-ticket,my-tickets,ticket-detail}/`. State-specific captures from Issues #20–#22 remain in the private evidence figures and are indexed there; the checked-in RESP set is the reproducible viewport evidence for the completed sprint.

**11.25 Candidate evidence is distinct from final release evidence.**
Issue #23 may record a green run on its feature branch and on the integrated `lab2-staging` release candidate. The `tests.md` §6 final-results table and the final acceptance of the visual checklist are completed only after the release Pull Request has merged into `main`, because the Definition of Done requires the documented suite to pass from the final branch.

**11.26 The 44px mobile touch target applies to every control, not only buttons.**
`ui-spec.md` §11 named buttons explicitly ("buttons stay touch-friendly, ≥44 px target") while §3 fixed every editable control at 40px with no mobile exception. PR #40's release review asked whether that 40px height still held up on a touch device, and reading the two sections side by side showed the target was never written for inputs and selects at all — not a rule that was violated, a rule that was silent.

WCAG 2.5.5 and the platform guidance both size the target by finger contact, not by control type: a 40px `<select>` is exactly as hard to tap accurately as a 40px button. §3's 40px stands on desktop, where the input device is a pointer with pixel precision. Below 768px, `.zen-field__control` now matches the button's 44px, alongside the existing full-width buttons from §11.20's mobile block.

Textareas and the file input are unaffected — both already exceed 44px for reasons unrelated to touch sizing (BR-20's content length, file-picker affordance).
