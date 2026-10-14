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
- **Times:** every time and date on every screen is Asia/Bangkok whatever the device's zone (api-spec §1, BR-38), including the Lab 2 and Lab 3 screens and the date-only column of My Tickets.
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
- **A lost answer never costs what was typed (AC-36).** When a save fails without an answer (network failure or a 5xx), **Try again** resends exactly what was sent, under the same `requestId`. If the entries were changed meanwhile, the first entries are resent first, to find out whether they were saved, and the changes are then saved onto that Action as an update. Nothing is dropped and no second Action is created. If that update fails, **Try again** repeats only the update.
- **A form open when the Ticket stops taking Actions becomes read-only (BR-23).** The entries stay visible but cannot be changed, **Save Action** and **Try again** are withdrawn, and the form says "This Ticket no longer takes Actions, so these entries cannot be saved." **Cancel** stays. The edit form does the same.
- Times in the list and the panel are Asia/Bangkok whatever the device's zone (api-spec §1).

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
| Save failure (network or 500) | "The Action could not be saved. Your entries are kept." with **Try again**, which resends the same `requestId` and the same entries; changes made since are then saved as an update (see Create mode) |
| Ticket stops taking Actions while a form is open | The form turns read-only with its entries kept, and says why; Save is withdrawn (BR-23) |
| Ticket status changes | The Actions are loaded again, so a cancellation's cascade shows at once (BR-22) |
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
- **Order:** oldest first, which is also the order the changes were committed in (BR-29, specification §11.17).
- **Time:** Asia/Bangkok whatever the device's zone (api-spec §1).
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
- Errors are linked through `aria-describedby`; the first invalid field, in the order shown, receives focus on submit. When the error comes from the server, the focus moves once the controls are enabled again. The cancel dialog's Reason is such a field.
- Metric values and badges are text, so colour never carries meaning alone (STY-019).
- Card links have descriptive accessible names, not "View all" alone.
- Panels open with focus moved to their heading, and closing a panel, form or dialog gives the focus back to the control that opened it. If that control is gone (an Action that was just cancelled offers none), the focus goes to the details heading or the section heading, never to the page.
- A dialog keeps the focus while its save is in flight: with every control disabled, the dialog itself holds the focus and Tab and Shift+Tab stay inside (AC-35).
- Status changes and dashboard refreshes are announced through polite live regions.
- Lists use list semantics. Tables use `<th scope>`.
- Keyboard order follows the visual order, and focus is visibly indicated with `--zen-focus-ring` (STY-027) (AC-35).

## 10. Screenshot paths

Captures are written only when `CAPTURE_EVIDENCE=1` is set (specification §11.13). Actions Taken captures are cropped to the Actions Taken card (the cancel dialog to the visible viewport) so that they stay readable; `list-long-content-*` is the 2000-character and 120-character-name stress case of RESP-01, not the ordinary list. A normal test run writes nothing tracked. A failure, empty or loading state produced by intercepting the API is labelled `fixture` in its filename and caption.

`artifacts/lab-04/screenshots/`

```
staff-dashboard/      desktop · tablet · mobile · loading-fixture · failure-fixture ·
                      admin-no-open-actions · forbidden-requester · drilldown-unassigned
requester-dashboard/  desktop · tablet · mobile · first-use-empty-fixture · failure-fixture ·
                      drilldown-open · drilldown-needs-attention
actions-taken/        list-{desktop,tablet,mobile} · list-long-content-{desktop,tablet,mobile} ·
                      create-form-{desktop,tablet,mobile} · description-required-{desktop,tablet,mobile} ·
                      edit-reassign-{desktop,tablet,mobile} · requester-read-only-{desktop,tablet,mobile} ·
                      follow-up-required · inactive-assignee-refused · started · complete-result-required ·
                      completed · cancel-dialog · cancelled · ticket-not-workable · conflict ·
                      save-failure-fixture
ticket-workflow/      {resolve-blocked, resolved-after-work-complete, cancel-cascade, stale-status,
                      history-staff, history-requester}-{desktop,tablet,mobile}
regression/           {login, my-tickets, requester-detail-attachments-comments, staff-queue,
                      staff-detail-internal-notes, staff-ticket-not-found,
                      requester-ticket-unavailable, user-management}-{desktop,tablet,mobile}
```

Capture dates and runs: `staff-dashboard/` and `requester-dashboard/` on 5 October 2026 (Issue #93), `actions-taken/` on 8 October 2026 (Issue #91), `ticket-workflow/` and `regression/` on 12 October 2026 on a freshly created E2E database (Issue #94). The 12 October run also regenerated the dashboards and Actions Taken; its staff dashboard (desktop) was compared with the 5 October capture and differs only in the dates the seed writes, so the earlier, reviewed captures were kept. The Ticket workflow captures are cropped to the Operations card, the History section, or the top of the page, and each states its viewport in its name.

Lab 2 and Lab 3 capture folders are never written by a Lab 4 run.

## 11. Visual and accessibility checklist

Run against the integrated staging candidate before the release, and again on final `main` for evidence. Lab 2's and Lab 3's checklists still apply. Every row was NOT RUN until the evidence run of 12 October 2026. A row is marked only with the date, viewport or width, role and evidence that prove it.

| # | Check | Evidence required | Status |
|---|---|---|---|
| 1 | New screens use only `--zen-*` tokens; no Bootstrap colour utilities | Style-contract test output; grep audit | PASS 12 Oct 2026 — `client/tests/lab-03/StyleContract.test.tsx` (STYLE-01) scans every file of `client/src` for colour literals outside the `:root` token block and for Bootstrap colour utilities; it passes in the client suite on the release candidate (`tests.md` §6). The reviewer also read the CSS diff of #101 for literals (7 Oct review) |
| 2 | Action and Ticket status badges always show text | Component test; screenshot | PASS 12 Oct 2026 — STYLE-02 (one badge mapping, a text label for each of the four Action statuses); badges carry text in every capture of `actions-taken/` and both dashboards |
| 3 | Metric cards show label + value + descriptive link name | Component test; accessibility tree snippet | PASS 12 Oct 2026 — UI-14 and UI-16 query each card's link by its accessible name ("View 2 unassigned tickets") beside its value; `staff-dashboard/desktop` and `requester-dashboard/mobile` show label, value and link |
| 4 | Every drill-down opens a list whose total equals the card | E2E assertion; paired screenshots | PASS 12 Oct 2026 — DASH-02 and DASH-08 call each metric's returned query and compare the Tickets with SQL (API, every metric); E2E-04 follows the unassigned (staff) and both Requester links; `drilldown-unassigned`, `drilldown-open` and `drilldown-needs-attention` are the paired captures. `drilldown-needs-attention` shows My Tickets filtered to `WAITING_FOR_REQUESTER` ("Showing 1 to 1 of 1 tickets"). In both Requester captures the table is wider than its card and the last column, Last Updated, is cut at the card's edge (`tests.md` §7) |
| 5 | Editable vs read-only fields are distinct; system fields never inputs | Screenshot of create and view modes | PASS 12 Oct 2026 — STYLE-05 (system fields are text, never inputs); `create-form-{desktop,tablet,mobile}` and `requester-read-only-{desktop,tablet,mobile}` |
| 6 | Validation messages sit below their fields; input text does not turn red | Screenshot (follow-up, result, reason) | PASS 12 Oct 2026, Chromium, 1280 / 834 / 390 px — STYLE-04 (message below its field, error token, input text not red); captured for the Description (`description-required-*`), the follow-up note (`follow-up-required`) and the result (`complete-result-required`). The cancellation reason's message is asserted (UI-05, E2E-01) but not captured |
| 7 | Follow-up Note appears, is required, and clears when unticked | Component test; screenshot | PASS 12 Oct 2026 — UI-02 and E2E-01; `follow-up-required` |
| 8 | Focus is visible on every new control; tab order matches the visual order | Keyboard walk notes; screenshot with focus ring | PASS on Chromium, Firefox and Microsoft Edge, 12 Oct 2026 — A11Y-01 keyboard walks (Action form, cancel dialog, status control, dashboard drill-down) and A11Y-02 focus rules, with the focus ring visible in `create-form-*`. **WebKit: not passed** — its default Tab order skips buttons and checkboxes (`tests.md` §7) |
| 9 | Cancel dialog traps focus, closes on Escape, returns focus | Component test; E2E | PASS 12 Oct 2026 — UI-05, A11Y-01 and A11Y-02 (the dialog keeps the focus, closes on Escape, returns the focus; Tab and Shift+Tab never leave it while it is busy) |
| 10 | Status change and refresh are announced (live region) | Component test | PASS 12 Oct 2026 — UI-12 ("Status changed to Resolved." in a polite live region) and UI-28 (the dashboard refresh is announced and cleared), each failing for four injected faults |
| 11 | No clipping or overlap at 1280, 834 and 390 px | Screenshots | PASS for what was inspected, 12 Oct 2026, with one exception found on 14 Oct 2026 (last sentence) — E2E-10, RESP-01 and the Ticket workflow and regression specs assert no horizontal page scroll at 1280, 834 and 390 px. Claude Code opened an image of every kind of screen at phone width (Actions list, Add form, validation, edit panel, Requester view, cancel dialog; Ticket workflow states and both Histories; sign-in, My Tickets, Queue, Ticket Detail with attachments, comments and an Internal Note, User Management, the not-found and unavailable states; both dashboards) and found no clipping or overlap after the fix of the View button (`01c58de`). It did not open every one of the 86 images; the assertions cover the rest. **Exception, measured on `d07fefe` on 14 Oct 2026 with a throwaway probe that is not a committed test:** the Requester's My Tickets table is 1219 to 1231 px wide (by list) in a card 1150 px wide at 1600 and 1280 px, 974 px at 1024 px and 784 px at 834 px, because the status badge `WAITING_FOR_REQUESTER` does not wrap, so the last column, Last Updated, is reached by scrolling the table sideways inside its card (the container has scrolled since Lab 2; `tests.md` §7). The page itself did not scroll sideways at any width measured (1600, 1280, 1024, 834 and 390 px) on My Tickets, both dashboards, the Staff Queue and User Management; the Staff Queue table is 2 px wider than its card at 1024 px only. At 390 px no container scrolls |
| 12 | No horizontal page scroll at 767, 768, 991 and 992 px | E2E width assertions | PASS 12 Oct 2026 — RESP-01 at 767, 768, 991 and 992 px (Ticket Detail with Actions) and the dashboards' viewport and boundary checks (E2E-04) |
| 13 | 2000-character text and long names wrap without widening the page | E2E fixture; screenshot | PASS 12 Oct 2026 — RESP-01 (2000-character Description, Follow-up Note and Result, 500-character Attachment Notes, a 120-character name); `list-long-content-*`. The header of a person whose own name is 120 characters long is a known limit (`tests.md` §7) |
| 14 | Actions list becomes cards below 992 px | Tablet and mobile screenshots | PASS 12 Oct 2026 — RESP-01 asserts a table from 992 px and cards below it; `list-tablet` and `list-mobile` |
| 15 | Touch targets ≥ 44 px on mobile | E2E measurement | PASS for the Actions Taken screens, 12 Oct 2026, 390 px — E2E-10 measures every button and link of the list, Add form and edit panel; RESP-01 measures the View button. The 13 Oct review-readiness follow-up (PR #104, merged into `lab4-staging` and released to `main` by PR #103) measures every visible link on both dashboards at 390 px (E2E-04); all must be at least 44 px, and the two footer links that measured 18 px were fixed. Dashboard buttons and other non-link controls are not covered by that measurement. Runs: `tests.md` §6.3 and §6.4. |
| 16 | Forbidden, not-found and failure stay visually distinct | Screenshots | PASS 12 Oct 2026 — forbidden (`staff-dashboard/forbidden-requester`), not found (`regression/staff-ticket-not-found-*`), unavailable (`regression/requester-ticket-unavailable-*`) and failure (`failure-fixture`, `save-failure-fixture`) are four different messages and styles. A "not found" message has no heading of its own (specification §11.19, item 4) |
| 17 | Conflict and save failure keep entered values | E2E; screenshot | PASS 12 Oct 2026 — E2E-03 and UI-10; `conflict`, `save-failure-fixture` |
| 18 | Dashboard is first and active in navigation; it is the landing page for each role | E2E; screenshots | PASS 12 Oct 2026 — UI-18 and E2E-04 (each role lands on its first Dashboard item, marked current); the captures of both dashboards show the active item |
| 19 | No console error, broken link, placeholder text or no-op control in the journeys | E2E console and link audit output | PASS for what is asserted, 12 Oct 2026 — E2E-06: every Lab 4 journey runs under the audit (a console error, page error, failed request or error response it did not declare fails it), and `audit.spec.ts` follows every link on every screen of each role: no empty or `#` link, no anchor without its element, no placeholder text. Each declared exception names its status or failure, its method and its exact address, and licenses only the one console line it causes (UNIT-09); the audit found one broken anchor, fixed under UI-27. **Not asserted: a no-op control.** The audit does not click every control; a control that does nothing is caught only where a journey uses it and asserts its effect (`tests.md` §7). One declared line is common: the session check of a signed-out visit is answered 401 and Chromium logs it (specification §11.19, item 2) |
| 20 | The Lab 4 journeys also pass on Microsoft Edge, Firefox and WebKit, not only Chromium | Run output of the cross-browser command in `tests.md` §5, on the staging candidate | PASS with one limit, 12 Oct 2026 — `e2e/lab-04` on Firefox, WebKit and Microsoft Edge 154 with the throwaway cross-browser config: every test passes except A11Y-01's Tab walks on WebKit (two of them); run output in `tests.md` §6 |
| 21 | Names, roles and states are exposed to assistive technology: every input has a label; a validation message is linked to its field and the field is marked invalid; the cancel dialog is a named modal dialog; a refusal is an `alert` and a status change is announced in a polite live region | Component assertions in STYLE-03, STYLE-04, UI-05 and UI-12 (accessible name, `aria-modal`, `aria-invalid`, `aria-describedby`, `role=alert`, `aria-live`), and Playwright finding the controls by role and name in A11Y-01 and A11Y-02. No screen reader was used (`tests.md` §7) | PASS for the assertions, 12 Oct 2026, Chromium (A11Y-01 and A11Y-02 also on Firefox and Edge). **Not run:** a screen reader; a pass on these assertions says the names, roles and states are exposed, not that the speech is understandable |
