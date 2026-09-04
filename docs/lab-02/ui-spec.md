# Lab 2 UI Specification — Zen Green Theme

**Version:** 1.0 — approved for implementation, 24 August 2026
**Applies to:** Development Requester Selection, Create Ticket, My Tickets, Requester Ticket Detail
**Overrides:** System-Level SDS D-09 (KMUTT palette) — see `specification.md` §11.2
**Reference screens:** Labsheet Figure 1 (Ticket Detail), §8.1 (Requester Selection), §8.4 (My Tickets)

Later labs reuse these rules rather than inventing a new visual system per screen. Modest aesthetic improvement is allowed; the interface must stay recognisably consistent with this document.

---

## 1. Colour tokens

Declared once as CSS custom properties on `:root` and referenced by name everywhere. No component hardcodes a hex value.

| Token | Value | Intended use |
|---|---|---|
| `--zen-primary` | `#006B3C` | App header, primary action background, strong emphasis |
| `--zen-secondary` | `#0B7A46` | Active tab/nav indicator, focus accent, links, hover states |
| `--zen-pale` | `#EAF6EF` | Selected rows, success surfaces, subtle section emphasis |
| `--zen-page-bg` | `#F5F7F6` | Page background |
| `--zen-surface` | `#FFFFFF` | Cards and panels |
| `--zen-border` | `#D8E0DB` | Card borders, table rules, input borders |
| `--zen-shadow` | `0 1px 2px rgba(0,0,0,.06)` | Restrained card elevation |
| `--zen-text` | `#1C2B24` | Primary text — dark charcoal-green, deliberately not pure black |
| `--zen-text-muted` | `#5B6B62` | Secondary labels, metadata, helper text |
| `--zen-field-bg` | `#FFFFFF` | Editable field background |
| `--zen-readonly-bg` | `#EDF1EE` | Read-only / system-generated field shading |
| `--zen-readonly-text` | `#3C4A43` | Read-only field text — dimmed but still readable |
| `--zen-error` | `#B3261E` | Error text and border |
| `--zen-error-bg` | `#FCEDEC` | Error callout background |
| `--zen-warning` | `#8A5A00` | Warning text |
| `--zen-warning-bg` | `#FFF4E0` | Warning callout / badge background |
| `--zen-success` | `#1E6B3A` | Success text |
| `--zen-success-bg` | `#EAF6EF` | Success callout background |
| `--zen-disabled-bg` | `#EEF1EF` | Disabled control background |
| `--zen-disabled-text` | `#8A968F` | Disabled control text |
| `--zen-focus-ring` | `0 0 0 3px rgba(11,122,70,.35)` | Keyboard focus ring |

### Priority tokens

Priority has its own scale. It is neither an error nor a warning, so it does not borrow those tokens (§11.17).

| Token | Value | Text on it | Priority |
|---|---|---|---|
| `--zen-priority-low-bg` | `#EEF1EF` | `--zen-priority-low-text` `#4A554E` | `LOW` |
| `--zen-priority-medium-bg` | `#FFF4E0` | `--zen-priority-medium-text` `#8A5A00` | `MEDIUM` |
| `--zen-priority-high-bg` | `#FDE8E3` | `--zen-priority-high-text` `#9A3412` | `HIGH` |
| `--zen-priority-urgent-bg` | `#B3261E` | `--zen-priority-urgent-text` `#FFFFFF` | `URGENT` |

The scale reads as escalating: two quiet tints, one warmer, then a filled block for `URGENT` — the only value that reverses foreground and background, so it stands out by weight rather than by hue alone. Every badge still carries its text label (§10), so a reader who cannot separate the four hues loses nothing.

**Rules**
- Warning colour is never used as ordinary decoration — only for a genuine warning.
- Success is never conveyed by colour alone; it always carries text and, where useful, an icon.
- Read-only shading must be clearly distinct from editable fields yet remain readable.
- Priority tokens are used only for priority badges, and semantic tokens are never used for priority.

## 2. Typography and spacing

| Item | Rule |
|---|---|
| Font stack | System font stack via Bootstrap default; no web font dependency |
| Page title | 1.75 rem, 600 weight |
| Section heading | 1.15 rem, 600 weight |
| Field label | 0.875 rem, 600 weight, `--zen-text`, always **above** its control |
| Body / input text | 1 rem, 400 weight |
| Helper / metadata | 0.8125 rem, `--zen-text-muted` |
| Validation message | 0.8125 rem, `--zen-error`, immediately **below** its field |
| Spacing scale | 4 / 8 / 12 / 16 / 24 / 32 px — no arbitrary values |
| Field vertical rhythm | 16 px between stacked fields; 24 px between field groups |
| Card padding | 24 px desktop, 16 px mobile |

## 3. Control states

Every form control implements all six states.

| State | Presentation |
|---|---|
| Editable | `--zen-field-bg`, 1 px `--zen-border`, 8 px radius, 40 px height |
| Focused | `--zen-secondary` border plus `--zen-focus-ring`; must stay visible for keyboard users |
| Read-only / system-generated | `--zen-readonly-bg` + `--zen-readonly-text`, no focus ring, not editable, `readonly` attribute set |
| Invalid | `--zen-error` border, `aria-invalid="true"`, message directly below the field |
| Disabled | `--zen-disabled-bg` + `--zen-disabled-text`, visually distinct, cannot be activated, `disabled` attribute set |
| Busy | Applies to the submit button only: spinner plus label change, control disabled while the request is in flight |

**Control rules**
- All inputs share one height. Description is a taller multiline control, resizable only vertically and only where resizing cannot break the layout.
- Required fields display a red asterisk after the label. **The asterisk never replaces the validation message.**
- Validation messages appear beside their field. A single mysterious error at the top of the form is not acceptable — a form-level callout may summarise, but per-field messages must still be present.
- Buttons always include visible text. Icons may support the label but never replace unclear text.
- Every icon-only control carries an accessible label and a tooltip.

## 4. Button hierarchy

| Variant | Appearance | Use |
|---|---|---|
| Primary | `--zen-primary` fill, white text | The one main action per screen (Submit Ticket, Continue) |
| Secondary | White fill, `--zen-primary` border and text | Cancel, Clear Filters, Back |
| Tertiary | Text only in `--zen-secondary` | Low-emphasis inline actions |
| Destructive | White fill, `--zen-error` border and text; confirmation dialog required | Remove attachment |
| Disabled | `--zen-disabled-bg` + `--zen-disabled-text` | Blocked action |
| Busy | Primary fill, spinner, disabled | Submission in flight |

Exactly one primary button per screen.

## 5. Application shell

- Header bar in `--zen-primary`: TokTickIT identity on the left; **My Tickets** and **Create Ticket** navigation; current Development Requester on the right with a Change Requester action.
- Active page indicated by an underline in `--zen-secondary` plus `aria-current="page"` — not colour alone.
- Below the header, a breadcrumb line for context (e.g. `My Tickets › Ticket Details`).
- Mobile (<768 px): navigation collapses into a toggle; the current requester stays visible; the menu is keyboard operable and closes on Escape.
- The shell renders on every screen except Requester Selection, which shows the identity and breadcrumb but no ticket navigation.

## 6. Screen: Development Requester Selection

**Route:** `/select-requester`

Centred card, max width 560 px, containing:
1. Person-with-gear icon in a `--zen-pale` circle
2. Heading **Select Development Requester**
3. Explanatory paragraph: *"Choose a development requester to simulate the current requester context for Lab 2. This is for testing only and is not a login screen."*
4. Divider
5. Label **Development Requester** with a red asterisk, then a select control listing active requesters loaded from PostgreSQL
6. Info callout in `--zen-pale`: *"Only active development requesters are shown."*
7. Shield callout: *"Authentication coming in Lab 3 — in Lab 3 this selection will be replaced with secure authentication so you can access the system with your own account."*
8. Footer actions: **Cancel** (secondary) and **Continue** (primary, disabled until a requester is chosen)

**States**

| State | Presentation |
|---|---|
| Loading | Skeleton or spinner in the select area; Continue disabled |
| Loaded | Requesters listed alphabetically by display name |
| Empty | *"No active development requesters are available. Run the database seed to create them."* Continue stays disabled |
| API failure | Error callout with a safe message and a Retry action; Continue disabled |
| Selected | Continue enabled; on activation the requester becomes the context and the user is routed to My Tickets |

**Rules:** the inactive seeded requester must never appear. The form is fully keyboard operable. Choosing a different requester later discards requester-scoped client data and refetches.

## 7. Screen: Create Ticket

**Route:** `/tickets/new`

Page title **Create Ticket** with a one-line description. Single card, fields grouped top to bottom:

1. **System-generated group** (read-only, visually shaded): Ticket No. (*"Generated after submission"*), Ticket Date (*"Set on submission"*), Requester (populated from the selected Development Requester), Current Status (`New`)
2. **Classification group** (two columns on desktop): Category \*, Related System \*, Requested Priority \*, IT Priority (read-only, *"Set by IT Staff"*)
3. **Detail group** (full width): Summary \* (single line, 5–150), Description \* (multiline, 10–5000, minimum 6 rows)
4. **Attachments group**: file picker, permitted-types helper text (*"JPG, PNG, WEBP, or PDF · up to 5 MB each · maximum 5 files"*), selected-file list with per-file remove
5. **Actions** bottom right: Cancel (secondary), Submit Ticket (primary)

**States**

| State | Presentation |
|---|---|
| Initial | Empty editable fields; read-only group shaded with placeholder text; Submit enabled |
| Reference loading | Category and Related System selects disabled with a loading hint |
| Reference failure | Error callout; Submit disabled because valid classification is impossible |
| Validation failure | Invalid fields get an error border and a message below; focus moves to the first invalid field; **no API request is sent** |
| Submitting | Submit shows a spinner and is disabled; all fields become non-editable |
| Success | Success callout naming the generated Ticket Number, plus **View Ticket** and **Create Another** actions |
| API failure | Error callout with a safe message; **all entered values preserved**; Submit re-enabled |
| Invalid attachment | The offending file is listed with an error and is not counted toward the 5-file limit; the rest of the form stays usable |

## 8. Screen: My Tickets

**Route:** `/tickets`

Page title **My Tickets** with the line *"View and track all of your support requests."* Top-right actions: **Clear Filters** (secondary), **Create Ticket** (primary).

**Filter bar** — search box (*"Search by ticket number or summary…"*) plus selects for Category, Requested Priority, IT Priority, and Current Status, each defaulting to an "All …" option.

**Desktop table columns** (sortable columns carry a sort indicator): Ticket No. ↕, Created Date ↕, Summary ↕, Category, Requested Priority, IT Priority, Current Status, Last Updated ↕.
Ticket No. is the link into Ticket Detail. Attachment count appears as a small paperclip badge beside Summary when greater than zero.

Summary is sortable because it is included in the API sort whitelist in `api-spec.md` §3; the indicator and accessible sort state are present in the rendered table.

**Column justification:** the Requester needs to identify the ticket (Ticket No., Summary), know how it was classified (Category), know how urgently it is being treated (Requested and IT Priority), know where it stands (Current Status), and know what is recent (Created, Last Updated). Ticket Owner is present in the labsheet's illustration but is always empty in this sprint, so it is omitted rather than shown as a column of blanks.

**Mobile (<768 px)** — the table becomes stacked cards: Ticket No. as the card heading, Summary as the body, badges for priority and status in a row, Created/Updated as muted metadata. No horizontal page scrolling.

**Pagination** — footer showing *"Showing X to Y of Z tickets"* on the left and Previous / numbered pages / Next on the right. Controls remain reachable and touch-friendly at every width.

**States**

| State | Presentation |
|---|---|
| Loading | Skeleton rows (desktop) or skeleton cards (mobile); filters disabled |
| Loaded | Rows rendered; pagination reflects server metadata |
| **Empty** | *"You have not created any tickets yet."* with a Create Ticket action. Shown only when the requester has no tickets at all and no filters are applied |
| **No results** | *"No tickets match these filters."* with a Clear Filters action. Shown when filters are applied and matched nothing |
| API failure | Error callout with Retry; filters keep their values |
| Requester switched | List clears and refetches for the new requester |

The empty and no-results states are deliberately different messages with different actions — offering Clear Filters to someone who simply has no tickets would be misleading.

## 9. Screen: Requester Ticket Detail

**Route:** `/tickets/:id`

Breadcrumb `My Tickets › Ticket Details`, with **Back to My Tickets** (secondary) top right.

**Ticket information card** — all fields read-only and shaded, arranged four columns on desktop, two on tablet, stacked on mobile:
Row 1 — Ticket No., Ticket Date, Category, Related System
Row 2 — Requester, Requested Priority (badge), IT Priority (badge), Current Status (badge)
Row 3 — Ticket Owner (*"Not yet assigned"*)
Row 4 — Summary (full width)
Row 5 — Description (full width, preserves line breaks)

**Attachments card** — clearly separated from the ticket information, with heading *Attachments (n of 5)* and an **Add Attachment** control (disabled with an explanatory tooltip once 5 active attachments exist). Each row shows filename, type icon, size, upload date, and actions.

| Attachment state | Presentation |
|---|---|
| Active | Filename in `--zen-secondary` as a download link; Remove action available |
| Uploading | Row with progress indicator; Remove hidden |
| Invalid | Row in error styling with the reason; not persisted; dismissible |
| Removed | Filename in `--zen-text-muted` and struck through; **no download link**; a "Removed" badge plus the removal reason and timestamp as metadata |
| Unavailable | Metadata renders but the download action reports a safe failure without exposing storage details |

**Removal flow** — Remove opens a confirmation dialog stating the filename, requiring a reason (3–200 characters), with Cancel (secondary) and Remove (destructive). The dialog traps focus and returns it to the invoking control on close.

**Out of scope on this screen:** Public Comments, Internal Notes, Service Actions, Event Log, and any status-changing control. The labsheet's Figure 1 shows those tabs; they belong to later labs and must not be implemented here.

## 10. Badge rules

| Kind | Values and presentation |
|---|---|
| Priority | `LOW` `--zen-priority-low-*` · `MEDIUM` `--zen-priority-medium-*` · `HIGH` `--zen-priority-high-*` · `URGENT` `--zen-priority-urgent-*` (§1). Requested and IT Priority use identical styling so they are visually comparable |
| Status | `NEW` `--zen-pale` with `--zen-primary` text (the only reachable value this sprint); remaining values styled for later labs |

Every badge shows its **text label**; colour is supporting information only. Badge shape, padding, and font size are identical across every screen.

## 11. Responsive rules

| Viewport | Required behaviour |
|---|---|
| Desktop ≥992 px | Multi-column layout as specified; content centred with a sensible maximum width |
| Tablet 768–991 px | Two-column layout where practical; Summary and Description keep enough width |
| Mobile <768 px | Fields stack vertically; buttons stay touch-friendly (≥44 px target); no horizontal page scrolling |
| All sizes | No clipped labels, no overlapping messages, no hidden buttons, no unreadable attachment names |

Bootstrap breakpoints are used unless a screen documents a stronger need.

## 12. Accessibility

- Every form control has a programmatic label; validation messages are associated with their field via `aria-describedby`.
- `aria-invalid` is set on invalid controls; `aria-live="polite"` announces submission success and failure.
- Keyboard focus order is logical; focus is always visible; dialogs trap focus and restore it on close.
- Status, priority, and success/failure are never conveyed by colour alone.
- Target WCAG 2.2 Level AA. Any justified exception is recorded here — none anticipated.
- Icon-only controls carry both an accessible name and a tooltip.

## 13. Visual inspection checklist

Completed against real screenshots, not memory, and compared with this document plus the labsheet illustrations.

**Final inspection (4 September 2026):** All sixteen checks below pass against
the nine RESP captures regenerated from the released `main` tree at `189335e`
and the state-specific figures indexed in
`_private/evidence/lab-02/figures/INDEX.md`. The tablet My Tickets table is an
intentional horizontal scroll region rather than page overflow; its right-side
priority, status, and Last Updated columns were verified in the supplemental
`my-tickets/tablet-list-right-viewport.png` capture. The final images were read
against this contract and the labsheet illustrations, not accepted merely
because the Playwright test passed.

| # | Check | Desktop | Tablet | Mobile |
|---|---|---|---|---|
| 1 | Header, navigation, and active-page indicator render correctly | ✅ | ✅ | ✅ |
| 2 | Current Development Requester and Change Requester are visible | ✅ | ✅ | ✅ |
| 3 | Zen Green tokens used; no stray off-palette colour | ✅ | ✅ | ✅ |
| 4 | Editable and read-only fields are clearly distinguishable | ✅ | ✅ | ✅ |
| 5 | Required-field asterisks present on every required field | ✅ | ✅ | ✅ |
| 6 | Validation messages sit beside their own field | ✅ | ✅ | ✅ |
| 7 | Exactly one primary button per screen; hierarchy correct | ✅ | ✅ | ✅ |
| 8 | Submit busy state visible and control disabled | ✅ | ✅ | ✅ |
| 9 | No clipped labels or truncated attachment names | ✅ | ✅ | ✅ |
| 10 | No overlapping text or controls | ✅ | ✅ | ✅ |
| 11 | No unintended horizontal page scrolling | ✅ | ✅ | ✅ |
| 12 | Priority and status badges consistent across screens | ✅ | ✅ | ✅ |
| 13 | Filters, sorting, and pagination usable | ✅ | ✅ | ✅ |
| 14 | Empty and no-results states distinct and correctly worded | ✅ | ✅ | ✅ |
| 15 | Attachment controls usable; removed attachments show no download link | ✅ | ✅ | ✅ |
| 16 | Keyboard focus visible throughout; dialog focus trapped | ✅ | ✅ | ✅ |

## 13a. Component state gallery

`/style-guide` renders every control state this document requires on one page: editable, read-only, invalid, and disabled fields; all four button variants plus disabled and busy; all four priority and all seven status badges; and the loading, empty, and error states.

It exists so the visual checklist in §13 can be walked, and the three viewport captures taken, without waiting for the screens that consume these components. A state absent from this page is a state that never gets photographed, so `client/tests/lab-02/style/style-guide.test.tsx` asserts each one is present.

## 14. Screenshot paths

Captured by Playwright at desktop 1280×900, tablet 834×1112, mobile 390×844.

```
artifacts/lab-02/screenshots/
├── create-ticket/
│   ├── desktop-initial.png
│   ├── mobile-initial.png
│   └── tablet-initial.png
├── my-tickets/
│   ├── desktop-list.png
│   ├── mobile-cards.png
│   └── tablet-list.png
├── ticket-detail/
│   ├── desktop-detail.png
│   ├── mobile-detail.png
│   └── tablet-detail.png
```

These nine files are the tracked canonical captures. State-specific captures
remain supplemental private evidence under `_private/evidence/lab-02/figures/`.

## 15. Open questions for review

1. **Ticket Owner column on My Tickets** — omitted because it is always empty this sprint. Confirm, or include it as a blank column to match the labsheet illustration more literally.
2. **IT Priority visible to the Requester** — shown read-only per `specification.md` §11.8. Confirm the Requester should see it at all in Lab 2.
3. **Mobile ticket list: cards versus a scrollable responsive table** — cards are specified. Confirm.
4. **Success behaviour after creation** — stay on the form with a success callout and both actions, versus redirecting straight to the new Ticket Detail. Current choice keeps the generated Ticket Number on screen, which Part 6 must evidence.
