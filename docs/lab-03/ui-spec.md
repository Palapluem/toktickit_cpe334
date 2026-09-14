# Lab 3 UI Specification

**Version:** 1.0 — approved for implementation, 11 September 2026
**Extends:** `docs/lab-02/ui-spec.md`, which remains in force. This document covers only what is **new or changed**.

Lab 2's colour tokens (§1), typography and spacing (§2), control states (§3), button hierarchy (§4), badge rules (§10), responsive rules (§11), and accessibility requirements (§12) are unchanged and binding. `style-contract.md` STY-001…030 applies without amendment.

The labsheet's instruction is the test: *"New screens must look like part of the same application rather than a second visual system."* Anything here that needs a new token or a new component shape is a finding, not a licence.

---

## 1. New tokens

Only one addition. Everything else reuses Lab 2's palette.

| Token | Value | Use |
|---|---|---|
| `--zen-forbidden-bg` | `#FFF4E0` | The forbidden state's surface — Lab 2's `--zen-warning-bg` value, aliased |
| `--zen-forbidden-text` | `#8A5A00` | Forbidden state text — Lab 2's `--zen-warning` value, aliased |

**Why an alias rather than reuse.** Forbidden is not a warning and not an error: the system is working correctly and the user is not permitted. It shares warning's palette because amber reads as "stop, but nothing is broken", which is exactly right — but it gets its own token names so that changing warning later does not silently restyle every permission refusal. Same reasoning as `lab-02 §11.17`, where priority got its own tokens rather than borrowing the semantic ones.

## 2. Role badges

Uses the existing badge component and the existing text-plus-colour rule (STY-019).

| Role | Background | Text |
|---|---|---|
| `REQUESTER` | `--zen-pale` | `--zen-primary` |
| `IT_STAFF` | `--zen-secondary` | `--zen-surface` |
| `ADMINISTRATOR` | `--zen-primary` | `--zen-surface` |

Every badge shows its role as text. The three darken in order of privilege, which is a supporting cue and never the only one.

## 3. Status badges — the four new values

Lab 2 declared eight statuses and rendered only `NEW`. All eight are now reachable and need styling:

| Status | Background | Text | Reads as |
|---|---|---|---|
| `NEW` | `--zen-pale` | `--zen-primary` | unchanged from Lab 2 |
| `OPEN` | `--zen-pale` | `--zen-secondary` | acknowledged |
| `IN_PROGRESS` | `--zen-warning-bg` | `--zen-warning` | active work |
| `WAITING_FOR_REQUESTER` | `--zen-warning-bg` | `--zen-warning` | active, blocked externally |
| `RESOLVED` | `--zen-success-bg` | `--zen-success` | done, not yet confirmed |
| `CLOSED` | `--zen-disabled-bg` | `--zen-disabled-text` | finished and quiet |
| `REOPENED` | `--zen-error-bg` | `--zen-error` | came back — worth noticing |
| `CANCELLED` | `--zen-disabled-bg` | `--zen-disabled-text` | terminal, no work owed |

`IN_PROGRESS` and `WAITING_FOR_REQUESTER` deliberately share a palette: both are live work, and their labels carry the difference. Distinguishing them by hue alone would fail AC-36's spirit anyway.

## 4. The forbidden state

New in Lab 3, and a first-class state rather than an error variant (`specification.md` §11.10).

| State | Means | Presentation |
|---|---|---|
| Empty | No records exist | Existing empty state |
| No-results | Filters match nothing | Existing no-results state, offers Clear Filters |
| **Forbidden** | **The operation is refused for this role** | `--zen-forbidden-*`, explains what is not permitted and offers a route back to a screen the user may use |
| Not found | The record does not exist *or is not yours* | Existing not-found state — deliberately identical for both cases (BR-14) |
| Failure | Something broke | Existing error state, offers Try again |

**Forbidden never offers Try again.** Retrying will not help, and offering it implies the refusal was transient. Not-found and forbidden must be visually distinct, because a user who sees the wrong one draws the wrong conclusion about whether the record exists.

## 5. Application shell — changed

The Development Requester display and Change Requester action are **removed** and replaced:

- **Right of the header:** the authenticated user's display name, a role badge, and a **Logout** action.
- **Navigation** shows only destinations the role may reach (FR-11) — an unauthorised destination is absent, not disabled. A disabled link tells the user something exists that they cannot have, which is information they did not need.

| Role | Navigation |
|---|---|
| Requester | My Tickets · Create Ticket |
| IT Staff | Ticket Queue |
| Administrator | Ticket Queue · User Management |

Active-page indication, the mobile toggle, Escape-to-close, and focus restoration all carry over from Lab 2 unchanged.

## 6. Screen: Login

**Route:** `/login` · anonymous · no shell

Centred card, max width 420 px:

1. TokTickIT identity
2. Heading **Sign in**
3. **Email** — required, `type="email"`, autofocus
4. **Password** — required, `type="password"`
5. **Sign in** — primary, full width, busy state while in flight
6. No "forgot password" link — password reset is out of scope (§3), and a link to nothing is worse than no link

| State | Presentation |
|---|---|
| Idle | Sign in enabled once both fields have content |
| Submitting | Button busy and disabled; one request only |
| Validation failure | Field-level messages for missing or malformed email |
| **Authentication failure** | **One callout: "Invalid email or password."** — identical for unknown email, wrong password, and inactive account (BR-03) |
| API failure | Safe failure callout with Try again |

**The failure message is a requirement, not copy.** It must not vary by cause, must not name the account, and must not hint that the email was recognised (BR-03). The temptation to be helpful here is exactly the vulnerability.

## 7. Screen: Change Password (mandatory)

**Route:** `/change-password` · authenticated · **no navigation in the shell**

Reached automatically when `mustChangePassword` is true. Every other route redirects here until it is done (BR-02).

1. Heading **Choose a new password**
2. Explanation: *"Your account is using an initial password. Choose a new one to continue."*
3. **Current password** — required
4. **New password** — required, minimum 10 characters, requirement stated **before** the user types, not only on failure
5. **Confirm new password** — required, must match
6. **Save and continue** — primary

The shell renders the identity and Logout but **no navigation** — there is nowhere else to go, and showing links that all redirect back here is a loop the user has to discover.

| State | Presentation |
|---|---|
| Validation failure | Field-level: too short, mismatch, same as current |
| Wrong current password | Field-level on Current password, not a page-level banner |
| Success | Redirect to the role's home screen |

## 8. Screen: IT Staff Ticket Queue

**Route:** `/staff/tickets` · IT Staff, Administrator

**Desktop table** — columns chosen against the labsheet's warning about an unreadable mega-grid:

| Column | Why it earns its place |
|---|---|
| Ticket No. | The identifier people quote |
| Summary | What it is |
| Requester | Who is waiting |
| IT Priority | The sort key; how urgent |
| Status | Where it is |
| Owner | Whose it is, or **Unassigned** |
| Updated | How stale it is |

**Excluded, deliberately:** Category and Requested Priority are filterable but not columns — Category is rarely the thing you scan for, and showing both priorities side by side invites reading the wrong one. Created Date loses to Updated: a queue asks what has gone quiet, not what is old.

**Controls above the table:** search · status filter · IT Priority filter · owner filter (`Anyone` / `Unassigned` / `Assigned to me`) · Clear Filters. One row on desktop, stacked on mobile.

**Mobile (<768 px):** cards, not a table. Ticket No. and IT Priority on the first line, summary on the second, status and owner as badges on the third. Lab 2's My Tickets already established the table-to-cards pattern; this reuses it.

**Unassigned tickets** are visually distinct — the Owner cell renders `Unassigned` in `--zen-text-muted` italic rather than an empty cell, because an empty cell reads as a loading failure.

**A `requesterResolvedAt` marker** appears next to the status when the Requester has indicated the problem appears resolved. It is the queue's most actionable signal and would be invisible otherwise.

| State | Presentation |
|---|---|
| Loading | Skeleton rows |
| Empty | "No tickets in the queue." |
| No-results | "No tickets match these filters." + Clear Filters |
| Forbidden | The forbidden state — a Requester reaching this URL directly |
| Failure | Error state with Try again |

## 9. Screen: IT Staff Ticket Detail

**Route:** `/staff/tickets/:id` · IT Staff, Administrator

Extends Lab 2's Requester Ticket Detail rather than replacing it. Same card structure, same read-only field treatment, same attachment section.

**Read-only:** Ticket No. · Ticket Date · Requester · Category · Related System · Requested Priority · Summary · Description
**Editable by role:** Owner · IT Priority · Status

**Layout, top to bottom:**

1. Header — Ticket No., status badge, IT Priority badge, and the resolution-indicated marker if present
2. **Operational strip** — Owner (with **Claim** when unassigned), IT Priority, Status. Grouped together and visually separated from the read-only body, so what can be changed is obvious at a glance
3. Ticket information — the Lab 2 card, unchanged
4. Attachments — the Lab 2 section, unchanged
5. **Public Comments**
6. **Internal Notes**

**The status control offers only permitted transitions** for the current status and role, from the API's `permittedTransitions`. An impossible transition is absent, not disabled — the client is rendering policy it was told, not policy it computed.

### Comments and Notes — the visual distinction

The one thing on this screen that can cause real harm: posting an internal remark publicly.

| | Public Comments | Internal Notes |
|---|---|---|
| Surface | `--zen-surface`, standard border | `--zen-warning-bg`, `--zen-warning` left border 3 px |
| Heading | **Public Comments** — *"Visible to the Requester"* | **Internal Notes** — *"IT Staff and Administrator only"* |
| Entry icon / label | Author name + role badge | Author name + role badge + **Internal** tag on every entry |
| Compose button | **Post Comment** (secondary) | **Add Internal Note** (secondary, on the warning surface) |

They are **never** presented as tabs of one control. Tabs make the two look like one thing in two modes, and the whole risk is a person believing they are in the mode they are not. Two separately headed sections, each with its own composer, each labelled at the point of writing.

The Requester's own Ticket Detail shows the Public Comments section and **no Internal Notes affordance at all** — not a disabled one (UI-14).

## 10. Screen: Administrator User Management

**Route:** `/admin/users` · Administrator

One screen, list plus a modal for create and edit. The labsheet's long "not required" list is a specification: no pagination, no multi-column sort, no multiple filters.

**Table:** Name · Email · Role (badge) · Status (Active / Inactive badge) · Edit
**Controls:** search by name or email · role filter · **New User**

**Create / Edit dialogue** — the same dialogue, differing in title and in whether the password field appears:

| Field | Create | Edit |
|---|---|---|
| Name | required | required |
| Email | required, unique | required, unique |
| Role | required, one of three | required |
| Active | default on | toggle |
| Initial password | required | **absent** — a separate action |

**Set New Initial Password** is a separate action inside Edit, with its own confirmation, because it is destructive to the user's current access in a way that renaming them is not. Its confirmation states plainly that the user must change it at next login.

### The two safety rules, in the interface

Both are enforced server-side; these are how the refusal reads.

- **Self-deactivation:** the Active toggle is *disabled* on one's own row, with a tooltip *"You cannot deactivate your own account."* Disabled here rather than absent, because the control exists for every other user and hiding it only on one row is more confusing than explaining it.
- **Last Administrator:** the attempt is allowed to be made and refused by the server, and the message says why: *"This is the only active Administrator. Assign another before changing this account."* The client does not pre-compute this — the count can change between render and submit, and a client-side guard would be wrong at exactly the moment it mattered.

## 11. Responsive

Lab 2's three viewports and rules are unchanged. Two additions:

- The Queue and User Management tables become cards below 768 px.
- The Login and Change Password cards are full-width with 16 px margins below 768 px, and never exceed 420 px above it.

## 12. Screenshot paths

`artifacts/lab-03/screenshots/`

```
authentication/     login-desktop · login-mobile · login-failure ·
                    change-password-desktop · change-password-mobile
staff-queue/        desktop-list · tablet-list · mobile-cards ·
                    empty · no-results
staff-ticket-detail/ desktop-detail · tablet-detail · mobile-detail ·
                    comments-and-notes
user-management/    desktop-list · mobile-list · create-dialog ·
                    duplicate-email · last-administrator
```

The three refusal captures — `login-failure`, `duplicate-email`, `last-administrator` — are named explicitly because Parts 5 and 8 ask for them and a happy-path-only capture session will not produce them.

## 13. Visual inspection checklist

Run before the release, in addition to Lab 2's §13 checklist which still applies.

**Completed 14 September 2026** on `feature/23-e2e-and-release`, against the merged
feature set. Each row names what was checked, so the tick is auditable rather than
asserted.

- [x] Every new screen uses only `--zen-*` tokens; the audit grep returns nothing
      — `grep -rE "#[0-9a-fA-F]{3,6}" client/src/screens client/src/components` is empty
- [x] No Bootstrap colour utility on any new themed surface
      — grep for `bg-|text-|btn-` + Bootstrap colour names is empty
- [x] Role badge renders text on all three roles
      — `RoleBadge` renders `{value}` unconditionally; colour is never the only signal
- [x] All eight status badges render text
      — `StatusBadge` renders `{value}`; `IN_PROGRESS` and `WAITING_FOR_REQUESTER`
      deliberately share a palette, and their labels carry the difference
- [x] Forbidden state is distinguishable from not-found and from failure
      — three separate components; `StaffTicketQueue.test.tsx` asserts each renders distinctly
- [x] Forbidden state does not offer Try again
      — `ForbiddenState` takes no `onRetry`; retrying a refusal cannot change its outcome
- [x] Login failure message is identical for all three causes
      — one constant, `Login.test.tsx`; the server side is `API-02` byte-for-byte
- [x] Public Comments and Internal Notes are unmistakably distinct
      — `ThreadSection.test.tsx` UI-13: own surface, own heading, own composer, private marker
- [x] Requester Ticket Detail shows no Internal Notes affordance
      — capture `staff-ticket-detail/requester-view-no-notes.png`; server side is `SEC-T05`
- [x] Navigation shows no unauthorised destination for any role
      — `AppShell.test.tsx` UI-07 asserts absent, not merely disabled
- [x] Change Password screen shows no navigation
      — `authentication.spec.ts`: `getByRole('navigation', { name: 'Main' })` has count 0
- [x] Unassigned tickets read as unassigned, not as a loading failure
      — `OwnerCell` renders the literal "Unassigned"; an empty cell would read as a failure
- [x] Every new input has a programmatic label
      — every new screen test addresses its fields through `getByLabelText`
- [x] Focus is visible on every new interactive control
      — five `:focus-visible` rules in `index.css`; no rule removes an outline without replacing it
- [x] All four new screens at three viewports: no clipping, no overlap, no horizontal page scroll
      — desktop, tablet and mobile captures committed for all four; authentication and
      user-management gained their tablet captures in the release audit
