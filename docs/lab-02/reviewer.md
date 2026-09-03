# Peer Review Log — Lab 2

**Author:** วิศิษฐ์ สุวรรณเนาว์ (Wisit Suwannao), 67070501042 — GitHub [@Palapluem](https://github.com/Palapluem)
**Reviewer:** ณัฐวัฒน์ พริมศิริกุลนวุฒิ (Natthawat Primsirikunawut) — GitHub [@N0TAW00D](https://github.com/N0TAW00D)
**Repository:** [Palapluem/toktickit_cpe334](https://github.com/Palapluem/toktickit_cpe334)

Agreed rule for this sprint: **the reviewer merges, never the author.** An approval that the author then acts on themselves makes the review a formality. Every merge below was performed by the reviewer.

This file is appended to as each Pull Request closes, not reconstructed at the end. Lab 1 was assembled retrospectively and recovering what had been asked and answered cost more than writing it down would have.

---

## Summary

### Current status (4 September 2026)

| PR | Issue | Current state | Merged by |
|---|---|---|---|
| [#36](https://github.com/Palapluem/toktickit_cpe334/pull/36) | [#20](https://github.com/Palapluem/toktickit_cpe334/issues/20) | Merged at `d3c5a25`; Issue CLOSED; card Done | N0TAW00D |
| [#37](https://github.com/Palapluem/toktickit_cpe334/pull/37) | [#23](https://github.com/Palapluem/toktickit_cpe334/issues/23) | Approved and merged at `3458178`; staging audit passed | N0TAW00D |
| [#38](https://github.com/Palapluem/toktickit_cpe334/pull/38) | — | Merged at `bf994b6`; post-merge review log synchronized | N0TAW00D |
| [#39](https://github.com/Palapluem/toktickit_cpe334/pull/39) | — | Open; release review received; follow-up fixes in progress | — |

The original table below is retained as the historical review ledger. The current merge outcomes and post-merge evidence are recorded above and in the detailed sections.

| PR | Issue | Title | Reviewer verdict | Merged by |
|---|---|---|---|---|
| [#24](https://github.com/Palapluem/toktickit_cpe334/pull/24) | [#16](https://github.com/Palapluem/toktickit_cpe334/issues/16) | Sprint specification and test plan | Approved | N0TAW00D |
| [#26](https://github.com/Palapluem/toktickit_cpe334/pull/26) | [#25](https://github.com/Palapluem/toktickit_cpe334/issues/25) | Lecture 4 contracts, Definition of Done | Approved | N0TAW00D |
| [#27](https://github.com/Palapluem/toktickit_cpe334/pull/27) | [#18](https://github.com/Palapluem/toktickit_cpe334/issues/18) | Prisma schema, UUID migration, reference data | Commented → changes made → merged | N0TAW00D |
| [#28](https://github.com/Palapluem/toktickit_cpe334/pull/28) | [#19](https://github.com/Palapluem/toktickit_cpe334/issues/19) | Zen Green UI foundation and shell | Commented → changes made → merged | N0TAW00D |
| [#30](https://github.com/Palapluem/toktickit_cpe334/pull/30) | [#29](https://github.com/Palapluem/toktickit_cpe334/issues/29) | Peer review log | Commented → correction made → merged | N0TAW00D |
| [#31](https://github.com/Palapluem/toktickit_cpe334/pull/31) | [#17](https://github.com/Palapluem/toktickit_cpe334/issues/17) | Development Requester context | Commented → response/fix → merged | N0TAW00D |
| [#32](https://github.com/Palapluem/toktickit_cpe334/pull/32) | [#20](https://github.com/Palapluem/toktickit_cpe334/issues/20) | Ticket creation | Commented → responses/fixes → merged | N0TAW00D |
| [#33](https://github.com/Palapluem/toktickit_cpe334/pull/33) | [#21](https://github.com/Palapluem/toktickit_cpe334/issues/21) | My Tickets listing | Commented → responses/fixes → merged | N0TAW00D |
| [#34](https://github.com/Palapluem/toktickit_cpe334/pull/34) | [#21](https://github.com/Palapluem/toktickit_cpe334/issues/21) | My Tickets visual regressions | Commented → response/fix → merged | N0TAW00D |
| [#35](https://github.com/Palapluem/toktickit_cpe334/pull/35) | [#22](https://github.com/Palapluem/toktickit_cpe334/issues/22) | Ticket Detail attachment lifecycle | Commented → accepted → merged | N0TAW00D |
| [#38](https://github.com/Palapluem/toktickit_cpe334/pull/38) | — | Post-merge review log synchronization | Merged | N0TAW00D |
| [#39](https://github.com/Palapluem/toktickit_cpe334/pull/39) | — | Lab 2 release | Review feedback received; follow-up in progress | — |

---

## PR #24 — Sprint specification and test plan

**Issue:** #16 · **Branch:** `feature/5-lab2-spec-and-test-plan` → `lab2-staging` · **Merged:** 24 August 2026

### Comments received

> **N0TAW00D, approving:** "Nice 🫶🏻"

No changes requested.

### Comments given

Reviewed N0TAW00D's Lab 1 documentation Pull Request in the same session.

### Note

The `Closes #16` keyword did not link the Pull Request to its Issue. Verified by GraphQL that `closingIssuesReferences` was empty: the keyword only acts when the Pull Request targets the repository's default branch, and ours target `lab2-staging`. The link was made through the Development panel in the browser, and the Issue was closed by hand after the merge. Every Pull Request since has needed the same two manual steps; they are now recorded in `AGENTS.md` §2.

---

## PR #26 — Lecture 4 engineering contracts and the Definition of Done

**Issue:** #25 · **Branch:** `feature/13-lecture4-contracts` → `lab2-staging` · **Merged:** 30 August 2026

### Comments received

> **N0TAW00D, approving:** "These document provide a comprehensive detail. thanks!"

No changes requested.

### Author note posted for the reviewer

Three findings were pushed to this branch after the review was requested, each explained in a comment on the Pull Request:

1. The Ticket Number year follows the `Asia/Bangkok` calendar, not UTC (§11.13). The two disagree for seven hours each New Year, long enough to print `TKT-2026-…` beside a Ticket Date of 1 January 2027.
2. Attachment failures are two cases, not one (§11.14): a rule violation rejects the whole request, a storage failure keeps the Ticket.
3. Implementation order corrected — the schema Issue must precede the service Issue, because no API test can fail *for the intended reason* against a model that does not exist.

---

## PR #27 — Prisma schema, UUID migration, and reference-data endpoints

**Issue:** #18 · **Branch:** `feature/7-prisma-schema-and-reference-data` → `lab2-staging` · **Merged:** 30 August 2026

### Comments received

> **N0TAW00D:** "I'm not sure these are all of issue #18 that you are trying too close bc it s provide a big detail of ur move. It might be great if you can shorter your brief as list and recheck ur #18."

### Response

Both points were correct, and the second one found a real defect.

**On length.** The Pull Request description was rewritten as a list — what changed, tests, commits, decisions, checklist — with the long rationale moved into a collapsed `<details>` block. The detail was burying the thing that needed checking. The same objection later applied to code comments (see #28) and both are now rules in `AGENTS.md` §4.

**On rechecking #18.** Every acceptance criterion was verified against the code rather than against my own summary of it. Twelve of thirteen held. **AC-09 — the Ticket Number generator — had not been implemented at all**: the branch carried the `TicketNumberSequence` table and no code to produce a number.

The criterion bundled two things that cannot ship together, so it was split. The formatter and the Bangkok calendar year are pure functions and were delivered here (`ecbc923` red, `4493242` green, eleven tests). Transactional allocation needs the ticket-creation endpoint and moved to #20, recorded on both Issues.

The recheck also found that this Pull Request had delivered `RequesterUser`, its seed, and `GET /api/requesters`, which Issue #17 owned. `Ticket` holds a foreign key to `RequesterUser`, so the model could not be deferred without leaving the schema half-built. Issue #17 now marks those four criteria as delivered here, so the board does not count them twice.

**Root cause:** the contract review for #18 summarised the scope from the specification and never opened the Issue. The phase-1 review prompt now requires reading the Issue body itself and quoting its title back.

### Comments given

Reviewed N0TAW00D's corresponding Lab 2 Pull Request.

---

## PR #28 — Zen Green UI foundation and application shell

**Issue:** #19 · **Branch:** `feature/8-zen-green-foundation` → `lab2-staging` · **Open**

### Comments received

> **N0TAW00D:** "I'm not sure if this PR contains responsive CSS logic. Could you point it out to me?"

### Response

There was responsive CSS, but less than the acceptance criterion implies and — the real problem — **with no tests at all**.

The answer posted on the Pull Request lists exactly where it lives: two breakpoints at Bootstrap's `md` (768px), the shell padding change, `d-md-none` / `d-md-flex` on the navigation toggle, and the 44px touch target.

Then the nine tests that should have existed were written. **Eight passed. One failed, and it was a real accessibility defect:** pressing Escape closed the mobile menu but left keyboard focus on a link that had just been hidden, so a keyboard user lost their place entirely. Focus now returns to the toggle. Recorded as `NAV-03` in `tests.md`, along with `NAV-01`, `NAV-02`, and `NAV-04`.

The CSS also gained what `ui-spec.md` §11 asks for and the first pass had skipped: the navigation stacks as a column on mobile with the active marker moving from an underline to a left border, buttons go full width so the 44px target is easy to hit, content is centred with a maximum width on wide screens, and horizontal page scroll is disabled with an opt-in container for wide content.

Viewport rendering itself is still untested here — jsdom has no layout engine. Playwright covers the three viewports in #23, and those rows are already in `tests.md`.

### Separately on this branch

A second piece of feedback, given verbally: **code comments had grown into paragraphs.** Cut in `99deb77` — 231 lines removed, 49 added, no behaviour change. What stayed is the identifier a construct traces to and the non-obvious reason where there is one; what went is anything restating the code or re-arguing a decision the specification already records. Added to `AGENTS.md` §4 as a norm so the next Issue does not reintroduce it.

A merge conflict with `lab2-staging` was also resolved (`48abd32`). Both branches had appended new decisions to the end of `specification.md` §11 — §11.15–§11.16 from #27, §11.17–§11.19 from this branch — so git could not tell that nothing actually overlapped. Both sides kept, in numeric order.

---

## PR #30 — Peer review log

**Issue:** #29 · **Branch:** `docs/9-reviewer-log` → `lab2-staging` · **Merged:** 31 August 2026 at `a7f96ce`

### Comment received

> **N0TAW00D:** "all was great, but pls fix my name."

### Response and result

The reviewer identity in the document was corrected, and the revised commit was merged by `N0TAW00D`. No product code changed.

---

## PR #31 — Development Requester context

**Issue:** #17 · **Branch:** `feature/6-requester-context` → `lab2-staging` · **Merged:** 31 August 2026 at `acb72ae`

### Comment received and response

> **N0TAW00D, on `server/src/http/errors.ts`:** "I would like to suggest the other error handling pattern following the default from [express](https://expressjs.com/en/guide/error-handling/#the-default-error-handler). If it's work for u or easier for implementation."

> **Response:** "Thanks for the suggestion Natthawat! I followed Express’s error-middleware pattern while keeping our safe JSON envelope and `correlationId` required by `api-spec.md §1`, since the default handler can expose stack/HTML."

The shared middleware was adjusted to follow Express's error-handler shape without exposing stack traces or changing the API error envelope. The response was posted in the same inline thread before the reviewer merged the PR.

---

## PR #32 — Ticket creation

**Issue:** #20 · **Branch:** `feature/9-ticket-creation` → `lab2-staging` · **Merged:** 1 September 2026 at `57cca96`

### Comments received and responses

| Location | Reviewer comment | Response / resulting change |
|---|---|---|
| `client/src/screens/CreateTicket.tsx` | "pls check the ui constraints such as button blocking (disable) during submission." | `Cancel` is disabled while submission is in flight, and UI coverage was added for that state. |
| `server/src/tickets/createTicket.ts` | "concern this error return by to many layer of error handling." | `TicketCreationError` now flows through the shared Express error middleware instead of being translated locally in the route. |
| `server/src/app.ts` | "Im not familiar to memoryStorage, should it going to diskStorage?" | `memoryStorage` was kept intentionally: TC-022 requires validating all files before storage or Ticket creation; after commit, the storage adapter writes files and cleans up orphan files if metadata persistence fails. |

All three comments received a response and the changes were pushed before the reviewer merged the PR. The final implementation and review follow-up are recorded in `tests.md` and the private evidence index.

---

## PR #33 — My Tickets listing

**Issue:** #21 · **Branch:** `feature/10-my-tickets` → `lab2-staging` · **Merged:** 1 September 2026 at `97ac295`

### Comments received and responses

| Location | Reviewer comment | Response / resulting change |
|---|---|---|
| `client/src/screens/MyTickets.tsx` | "I think the search box is going to break once we hit a real backend. There's no debounce, so every keystroke fires a refetch." | A 300 ms debounce was added to the search input and UI coverage was added. |
| `server/src/tickets/listTickets.ts` | "validateReferenceFilters does findUnique({ where: { id } }) with no isActive check, but GET /api/categories and GET /api/related-systems only return active rows." | Category and Related System filters now validate against active reference rows, with API coverage for inactive references. |

Both comments were answered in their inline threads and the fixes were included before merge.

---

## PR #34 — My Tickets visual regressions

**Issue:** #21 · **Branch:** `fix/my-tickets-visual-regressions` → `lab2-staging` · **Merged:** 1 September 2026 at `3734b5a`

### Comment received and response

> **N0TAW00D:** "All great just beware using overflow."

> **Response:** "Thanks! I checked it—the overflow is scoped to the table container, so it doesn’t cause page-level horizontal overflow. I’ll keep it this way."

The tablet table remains reachable through its own scroll container while page-level overflow stays absent. The reviewer merged the follow-up after the response.

---

## PR #35 — Ticket Detail attachment lifecycle

**Issue:** #22 · **Branch:** `feature/11-ticket-detail-attachments` → `lab2-staging` · **Merged:** 2 September 2026 at `087379a`

### Comment received

> **N0TAW00D:** "You are in control."

No changes were requested. The reviewer merged the PR after the targeted/full test and browser evidence was available. Issue #22 was closed by hand and its card moved to Done afterwards.

---

## PR #36 — Create Ticket form-control alignment follow-up

**Issue:** #20 · **Branch:** `fix/20-ticket-form-alignment` → `lab2-staging` · **Merged:** 2 September 2026 at `d3c5a25`

The reviewer commented `lgtm` and merged this follow-up on 2 September 2026 at `d3c5a25`. Issue #20 was then closed by hand and its project card moved to **Done**. The alignment evidence is now included in the staging tree.

---

## PR #37 — E2E, responsive evidence, and release integration

**Issue:** #23 · **Branch:** `feature/12-e2e-and-release` → `lab2-staging` · **Merged:** 3 September 2026 at `3458178`

### Comment received

> **N0TAW00D:** The suite is solid and green, with seven non-blocking suggestions about the E2E server launcher, database URL parsing and fallback documentation, config-load behaviour, cleanup cost, sequence-counter wording, and Vite port handling.

### Disposition

The follow-up keeps per-test cleanup because TCS-03 requires rows to be removed after each test, but documents that `TicketNumberSequence` is intentionally retained for uniqueness. It changes the API E2E server to a non-watch command, adds Vite `--strictPort`, makes the database URL lookup optional during config inspection, uses only the documented `.env.test` fallback, and documents percent-encoding for reserved PostgreSQL URI credential characters. `reuseExistingServer: false` remains deliberate so the suite cannot attach to a server using a different database.

Follow-up commit `f7fb8ce` was pushed with these dispositions. The reviewer rechecked the updated PR, approved it, and merged it on 3 September 2026 at `3458178`.

### Post-merge verification

The merged staging tree passed the full server regression (**109/109**) and build, the full client regression (**107/107**) and build/lint, the style/security audits, and the E2E/responsive suite (**6/6**). The dedicated E2E database ended at **0 Tickets / 0 Attachments**. The nine fresh staging screenshots were visually checked and retained as private evidence; the tracked candidate screenshots remain unchanged. Issue #23 was then closed by hand and its card moved from **PR Review** to **Done**.

## PR #38 — Post-merge review-log synchronization

**Branch:** `docs/post-merge-review-log` → `lab2-staging` · **Merged:** 3 September 2026 at `bf994b6`

The reviewer log was synchronized with the merged #36 and #37 outcomes and the staging verification record. This was documentation-only; no product code changed.

## PR #39 — Lab 2 release review

**Branch:** `lab2-staging` → `main` · **Open**

The reviewer identified contract, accessibility, UI hierarchy, documentation, and traceability gaps in the release candidate. A follow-up branch is addressing the confirmed findings before the release PR is approved; the reviewer remains responsible for merging both the follow-up and #39.

### Comment received

On 4 September 2026, [N0TAW00D's release review](https://github.com/Palapluem/toktickit_cpe334/pull/39#issuecomment-5529224614) identified eleven actionable gaps: stale final-test traceability and paths, an inconsistent screenshot tree, missing requester-selection shell elements, stale Lab 1 README workflow, malformed resource IDs returning 500, the wrong active-nav token, duplicate primary actions, non-idempotent repeated removal, oversized response shapes, and missing accessibility states. The reviewer also noted minor mobile touch-target, filename, MIME, and documentation concerns.

### Follow-up disposition

Branch `fix/pr39-review-findings` adds regression coverage and fixes the confirmed contract issues, including atomic active-attachment limits, exact response mapping, UUID route validation, requester-selection shell/callouts, accessible sort/required/dialog states, and the release documentation. The final `tests.md` §6 table remains intentionally reserved for the post-merge verification run from `main` required by `specification.md` §11.25.

---

## What the review process caught

Recorded because the value of peer review is easier to argue from evidence than from principle.

| Pull Request | Found by | Consequence if missed |
|---|---|---|
| #27 | Reviewer asking whether the Issue was fully closed | An acceptance criterion would have shipped unimplemented, and two Issues would have double-counted the same work |
| #28 | Reviewer asking where the responsive CSS was | A keyboard user would have lost focus on every menu dismissal, and the responsive layer would have reached the final demo untested |
| #31 | Reviewer suggesting Express's default error-handler pattern | The response preserved the safe JSON envelope and correlation id while aligning the middleware with the framework's error flow |
| #32 | Reviewer questioning submission blocking, layered errors, and `memoryStorage` | The UI gained the missing disabled-state coverage; error translation was centralised; attachment validation remained before storage for TC-022 |
| #33 | Reviewer questioning search requests and inactive reference validation | The search gained debounce and server-side filters stopped accepting inactive references |
| #34 | Reviewer warning about overflow | Tablet table scrolling stayed inside its container and page-level overflow remained absent |
| #37 | Reviewer checking the E2E/release harness | The test runner now avoids a hot-reload API process, fails fast on a busy Vite port, and documents the database/cleanup boundaries without weakening per-test isolation |

The first two were questions rather than corrections. Neither reviewer comment asserted that something was wrong — each asked the author to show where something was, and the answer turned out not to exist. Later review threads are recorded above with their concrete fixes and responses.
