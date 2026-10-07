# Lab 4 UI Specification

**Version:** 1.0 — approved for implementation, 3 October 2026
**Extends:** `docs/lab-03/ui-spec.md` and `docs/lab-02/ui-spec.md`, both still in force. This document covers only what is **new or changed**.

Lab 2's tokens, typography, control states, button hierarchy, badge rules, responsive rules and accessibility requirements remain binding, and so do Lab 3's forbidden state and shell. `style-contract.md` STY-001…030 applies unchanged.

The test of every new screen is the labsheet's: one coherent application, not a second visual system. A new screen that needs a new component shape or colour is a finding to justify, not a default.

---

## 1. Tokens and badges

**No new colour tokens are planned.** Action status badges reuse the existing Ticket status badge palettes through the single badge mapping (STY-018). The text label carries the meaning (STY-019).

| Action status | Label | Palette reused from |
|---|---|---|
| `PLANNED` | Planned | Ticket `OPEN` |
| `IN_PROGRESS` | In progress | Ticket `IN_PROGRESS` |
| `COMPLETED` | Completed | Ticket `RESOLVED` |
| `CANCELLED` | Cancelled | Ticket `CANCELLED` |

If implementation shows that a token is genuinely needed, it is added to the global `:root` block only, recorded here and checked by the existing style-contract test.

## 2. Application shell — changed

Dashboard becomes the first destination for every role. Because the post-login redirect uses the first navigation item (`routes.ts homeFor`), it also becomes the landing page (FR-21, AC-32).

| Role | Navigation | Dashboard route |
|---|---|---|
| Requester | **Dashboard** · My Tickets · Create Ticket | `/dashboard` |
| IT Staff | **Dashboard** · Ticket Queue | `/staff/dashboard` |
| Administrator | **Dashboard** · Ticket Queue · User Management | `/staff/dashboard` |

- Active-page indication (`--zen-secondary`, STY-007), the mobile toggle, Escape-to-close and focus restoration are unchanged.
- An unauthorised dashboard route shows the Lab 3 forbidden state, with a link to the user's own dashboard.
- **Removed (FR-26):** any leftover development-only route reference. The E2E readiness probe moves off `/select-requester`.

## 3. Screen: IT Staff Dashboard (`/staff/dashboard`)

Also used by Administrators. Every value comes from `GET /api/staff/dashboard`.

**Structure, top to bottom:**

1. **Header:** "Dashboard" (h1), the subtitle "The service desk right now.", and a secondary **Refresh** button that shows busy while it reloads.
2. **Four metric cards:** Unassigned · Assigned to me · Urgent · Waiting for Requester.
   - Each card shows a label, a large value and a link.
   - Each link names its result, for example **"View 2 unassigned tickets"**, and opens the Queue with the metric's returned `query` (BR-37).
3. **My open Actions (N):**
   - Up to 10 items, oldest first.
   - Each shows the Ticket number and summary, the Action description on one line, the Action status badge and the Action Date/Time.
   - Each item opens the Ticket Detail at its Actions section.
   - Footer when `total > 10`: "Showing the 10 oldest of N open Actions."
4. **Tickets by status:** eight rows, one per status. Each row has a status badge, a count and a link to the Queue filtered by that status. Zero rows are shown, not hidden.
5. **Recently updated:**
   - Five Tickets, each with number, summary, status and IT Priority badges, owner (or *Unassigned*) and updated time.
   - **View all** opens the Queue sorted by `updatedAt:desc`.

**Layout:**

- **≥ 992 px:** the four cards in one row. Then *My open Actions* takes two thirds of the width beside *Tickets by status*. *Recently updated* is full width below.
- **768–991 px:** cards 2 × 2; every panel full width.
- **< 768 px:** cards 2 per row with 44 px touch targets; panels stacked; lists as stacked items.

**States:**

| State | Presentation |
|---|---|
| Loading | Header visible; Lab 2 loading state in the content area |
| Safe failure | Error state, "We could not load the dashboard.", with **Try again** (AC-31) |
| Forbidden | Lab 3 forbidden state, with a link to the user's own dashboard |
| Zero metric | `0` shown; the link still opens the Queue's empty or no-results state (AC-29) |
| No open Actions | Inside the panel: "You have no open Actions." |
| Refresh in flight | Refresh disabled, labelled "Refreshing…"; current values stay visible |

## 4. Screen: Requester Dashboard (`/dashboard`)

Only the authenticated Requester's Tickets (BR-39). Values come from `GET /api/requester/dashboard`.

**Structure:**

1. **Header:** "Dashboard" (h1), "Your requests at a glance.", and the primary **Create Ticket** button.
2. **Four metric cards:** Open · Needs my attention · Resolved · Closed.
   - Each has a link with a descriptive name, for example "View 1 ticket waiting for you".
   - *Needs my attention* adds the text "Waiting for your reply" when its count is above zero, so the cue is never colour alone.
3. **Recently updated:**
   - Up to five Tickets, each with number, summary, status badge and updated time.
   - Each opens its Ticket Detail.
   - **View all** opens My Tickets sorted by `updatedAt:desc`.

**First use (`totalTickets = 0`):** the cards and list are replaced by the empty state "You have not submitted any Tickets yet." with **Create Ticket**. It is not four zeros.

**Layout:** cards 4 in a row at ≥ 992 px, 2 × 2 from 768 to 991 px, and 2 per row below 768 px. The list stacks.

**States:** loading, safe failure with Try again, and forbidden (IT Staff or Administrator opening `/dashboard` are offered their own dashboard), as in §3.

## 5. Ticket Detail — Actions Taken

### Placement

| Screen | Section order |
|---|---|
| IT Staff Ticket Detail | Operations · Ticket Information · **Actions Taken** · Attachments · Public Comments · Internal Notes · **History** |
| Requester Ticket Detail | Ticket Information · **Actions Taken** (read-only) · Attachments · Public Comments · **History** (status changes only) |

### List

- **Heading:** "Actions Taken (N)". IT Staff on a workable Ticket also see an **Add Action** button.
- **Hint under the heading (staff only):** "Actions are visible to the Requester. Use Internal Notes for private information." (BR-17)
- **≥ 992 px:** a table with the columns Date/Time · Description (two lines, then truncated) · Assignee · Performed by · Status · Follow-up.
  - Each row ends with a **View** button whose accessible name includes the Date/Time.
  - A deactivated assignee shows "(inactive)" after the name (BR-08).
- **< 992 px:** labelled cards with the same fields, matching the Lab 3 Queue's card breakpoint.
- **Order:** oldest first (BR-29).
- **Empty:** "No Actions have been recorded yet."

### Create mode (IT Staff, workable Ticket)

**Add Action** opens an inline form at the top of the section, and focus moves to its first field.

| Field | Control | Rules |
|---|---|---|
| Description * | Textarea | Required, 1–2000, with a character count |
| Assignee * | Select from `assignableOwners` | Defaults to the current user |
| Follow-Up Required? | Checkbox | Ticking reveals Follow-up Note; unticking hides and clears it (BR-14) |
| Follow-up Note * | Textarea | Required while Follow-Up Required is ticked, 1–2000 |
| Attachment Notes | Text input | Optional, ≤ 500. Helper: "Name the attached file to look at, for example relay-error.png." |
| Action Date/Time · Performed by | Read-only text | "Recorded automatically when you save" — never inputs (STY-010) |

- **Save Action** (primary) and **Cancel** (tertiary).
- While saving, the button is disabled and shows progress (STY-022). One submission carries one `requestId`, and a retry reuses it (BR-34).

### View and edit mode

**View** opens an inline detail panel, and focus moves to its heading.

- **System fields are always read-only** (STY-009, STY-010): Action Date/Time, Performed by, Status, and Completed by / at or Cancelled by / at with the reason.
- **Non-terminal Action, IT Staff:**
  - **Edit** switches Description, Result, Assignee, Follow-up and Attachment Notes into inputs, with **Save changes** and **Discard**.
  - Status buttons depend on the status:
    - **Start** (from Planned);
    - **Complete** (from In progress);
    - **Cancel Action** (destructive; never primary, STY-015).
- **Complete without a Result:** the Result field shows "Enter the result before completing this Action." below it and receives focus. The server enforces the same rule (BR-11).
- **Cancel Action:** opens a dialog with a required **Reason** field (1–500), **Cancel Action** (destructive) and **Keep Action**.
  - The dialog follows Lab 3's modal rules: labelled, focus trapped, Escape closes, and focus returns to the trigger.
- **Terminal Action:** everything is read-only. The badge and completion or cancellation details are shown, with no Edit or status buttons.
- **Requester:** the same panel, entirely read-only, with no buttons. People appear by display name only.

### Feedback states

| Situation | Presentation |
|---|---|
| Validation | Field-level messages below each field (STY-012); the form stays open |
| Inactive or ineligible assignee (`ASSIGNEE_NOT_ELIGIBLE`) | Under Assignee: "Choose an active IT Staff member or Administrator." The assignee list is refetched |
| Ticket not workable | Banner replacing Add Action: "This Ticket is Resolved. Actions are read-only — reopen the Ticket to record more work." |
| Conflict (`STALE_VERSION`) | "Someone else changed this Action. The latest version is shown; your unsaved entries are kept in the form." The user can review and save again (AC-36) |
| Terminal (`ACTION_TERMINAL`) | "This Action is already completed or cancelled." The panel refreshes to read-only |
| Save failure (network or 500) | "The Action could not be saved. Your entries are kept." with **Try again**, which resends the same `requestId` |
| Load failure | Section-level error state with Try again; the rest of the Ticket stays usable |

## 6. Ticket status control and resolution feedback

- The **Move to…** control lists only `permittedTransitions` (AC-18).
- When `blockedTransitions` is present, a helper line explains the omission, for example "Resolved and Closed become available when the 2 open Actions are completed or cancelled." It links to the Actions section.
- Cancelling a Ticket asks for confirmation, and states the cascade when one applies: "Cancel this Ticket? 2 open Actions will also be cancelled."
- **On success:**
  - the header status badge, Operations and permitted transitions refresh from the response;
  - a polite live region announces "Status changed to Resolved." (AC-21).
- **On `OPEN_ACTIONS_BLOCK_RESOLUTION`:** an inline message shows the open-Action count, the Ticket refetches, and the previous status remains shown.
- **On `STALE_VERSION`:** "This Ticket changed since you opened it. The latest status is shown — review and try again." The Ticket refetches.

## 7. History

- **IT Staff and Administrators:** every event as one line: time · actor · readable description.
  - Examples: "Status changed from In progress to Resolved", "Action assigned from Daniel Carter to Olivia Reed".
  - Action events link to their Action.
- **Requester:** status changes only (BR-28).
- **Order:** oldest first (BR-29).
- **Empty:** "No changes have been recorded since Actions Taken were introduced." This is true for every seeded or legacy Ticket until its first change.
- Event text is generated from the event type and identifiers only. No free text from users appears in history (BR-30).

## 8. Responsive

Lab 2's three viewports are unchanged: desktop ≥ 992, tablet 768–991, mobile < 768.

- **Representative captures:** 1280 × 900, 834 × 1112 and 390 × 844.
- **Boundary checks:** automated no-horizontal-overflow assertions at 767, 768, 991 and 992 px for both dashboards and for Ticket Detail with Actions (AC-34).
- **Long content:**
  - A 2000-character Description, Result or Follow-up Note wraps inside its cell or card, never widening the page.
  - Long display names and Ticket summaries wrap.
  - Dashboard descriptions are truncated to one line, with the full text one click away.
- **Touch targets:** every control keeps the 44 px minimum on mobile (`lab-02 §11.26`).

## 9. Accessibility

- Every input has a programmatic label (STY-026).
- Errors are linked through `aria-describedby`; the first invalid field receives focus on submit.
- Metric values and badges are text, so colour never carries meaning alone (STY-019).
- Card links have descriptive accessible names, not "View all" alone.
- Panels open and close with focus moved to their heading and back to the trigger.
- Status changes and dashboard refreshes are announced through polite live regions.
- Lists use list semantics. Tables use `<th scope>`.
- Keyboard order follows the visual order, and focus is visibly indicated with `--zen-focus-ring` (STY-027) (AC-35).

## 10. Screenshot paths

Captures are written only when `CAPTURE_EVIDENCE=1` is set (specification §11.13). A normal test run writes nothing tracked. A failure, empty or loading state produced by intercepting the API is labelled `fixture` in its filename and caption.

`artifacts/lab-04/screenshots/`

```
staff-dashboard/      desktop · tablet · mobile · loading-fixture · failure-fixture ·
                      admin-no-open-actions · forbidden-requester · drilldown-unassigned
requester-dashboard/  desktop · tablet · mobile · first-use-empty-fixture · failure-fixture ·
                      drilldown-open · drilldown-needs-attention
actions-taken/        list-multiple-desktop · list-tablet · list-mobile · create-form ·
                      follow-up-required · inactive-assignee-refused · edit-reassign ·
                      started · complete-result-required · completed · cancel-dialog ·
                      cancelled · requester-read-only · ticket-not-workable ·
                      conflict · save-failure-fixture
ticket-workflow/      resolve-blocked · resolved-after-work-complete · cancel-cascade ·
                      stale-status · history-staff · history-requester
regression/           login · my-tickets · requester-detail-attachments-comments ·
                      staff-queue · staff-detail-internal-notes · user-management
```

Lab 2 and Lab 3 capture folders are never written by a Lab 4 run.

## 11. Visual and accessibility checklist

Run against the integrated staging candidate before the release, and again on final `main` for evidence. Lab 2's and Lab 3's checklists still apply. **Every row starts NOT RUN.** A row is marked only with the date, viewport or width, role and evidence that prove it.

| # | Check | Evidence required | Status |
|---|---|---|---|
| 1 | New screens use only `--zen-*` tokens; no Bootstrap colour utilities | Style-contract test output; grep audit | NOT RUN |
| 2 | Action and Ticket status badges always show text | Component test; screenshot | NOT RUN |
| 3 | Metric cards show label + value + descriptive link name | Component test; accessibility tree snippet | NOT RUN |
| 4 | Every drill-down opens a list whose total equals the card | E2E assertion; paired screenshots | NOT RUN |
| 5 | Editable vs read-only fields are distinct; system fields never inputs | Screenshot of create and view modes | NOT RUN |
| 6 | Validation messages sit below their fields; input text does not turn red | Screenshot (follow-up, result, reason) | NOT RUN |
| 7 | Follow-up Note appears, is required, and clears when unticked | Component test; screenshot | NOT RUN |
| 8 | Focus is visible on every new control; tab order matches the visual order | Keyboard walk notes; screenshot with focus ring | NOT RUN |
| 9 | Cancel dialog traps focus, closes on Escape, returns focus | Component test; E2E | NOT RUN |
| 10 | Status change and refresh are announced (live region) | Component test | NOT RUN |
| 11 | No clipping or overlap at 1280, 834 and 390 px | Screenshots | NOT RUN |
| 12 | No horizontal page scroll at 767, 768, 991 and 992 px | E2E width assertions | NOT RUN |
| 13 | 2000-character text and long names wrap without widening the page | E2E fixture; screenshot | NOT RUN |
| 14 | Actions list becomes cards below 992 px | Tablet and mobile screenshots | NOT RUN |
| 15 | Touch targets ≥ 44 px on mobile | E2E measurement | NOT RUN |
| 16 | Forbidden, not-found and failure stay visually distinct | Screenshots | NOT RUN |
| 17 | Conflict and save failure keep entered values | E2E; screenshot | NOT RUN |
| 18 | Dashboard is first and active in navigation; it is the landing page for each role | E2E; screenshots | NOT RUN |
| 19 | No console error, broken link, placeholder text or no-op control in the journeys | E2E console and link audit output | NOT RUN |
