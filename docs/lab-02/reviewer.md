# Peer Review Log — Lab 2

**Author:** วิศิษฐ์ สุวรรณเนาว์ (Wisit Suwannao), 67070501042 — GitHub [@Palapluem](https://github.com/Palapluem)
**Reviewer:** ณัฐวัฒน์ พริมศิริกุลนวุฒิ (Natthawat Primsirikunawut) — GitHub [@N0TAW00D](https://github.com/N0TAW00D)
**Repository:** [Palapluem/toktickit_cpe334](https://github.com/Palapluem/toktickit_cpe334)

Agreed rule for this sprint: **the reviewer merges, never the author.** An approval that the author then acts on themselves makes the review a formality. Every merge below was performed by the reviewer.

This file is appended to as each Pull Request closes, not reconstructed at the end. Lab 1 was assembled retrospectively and recovering what had been asked and answered cost more than writing it down would have.

---

## Summary

| PR | Issue | Title | Reviewer verdict | Merged by |
|---|---|---|---|---|
| [#24](https://github.com/Palapluem/toktickit_cpe334/pull/24) | [#16](https://github.com/Palapluem/toktickit_cpe334/issues/16) | Sprint specification and test plan | Approved | N0TAW00D |
| [#26](https://github.com/Palapluem/toktickit_cpe334/pull/26) | [#25](https://github.com/Palapluem/toktickit_cpe334/issues/25) | Lecture 4 contracts, Definition of Done | Approved | N0TAW00D |
| [#27](https://github.com/Palapluem/toktickit_cpe334/pull/27) | [#18](https://github.com/Palapluem/toktickit_cpe334/issues/18) | Prisma schema, UUID migration, reference data | Commented → changes made → merged | N0TAW00D |
| [#28](https://github.com/Palapluem/toktickit_cpe334/pull/28) | [#19](https://github.com/Palapluem/toktickit_cpe334/issues/19) | Zen Green UI foundation and shell | Commented → changes made → open | — |

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

## What the review process caught

Recorded because the value of peer review is easier to argue from evidence than from principle.

| Pull Request | Found by | Consequence if missed |
|---|---|---|
| #27 | Reviewer asking whether the Issue was fully closed | An acceptance criterion would have shipped unimplemented, and two Issues would have double-counted the same work |
| #28 | Reviewer asking where the responsive CSS was | A keyboard user would have lost focus on every menu dismissal, and the responsive layer would have reached the final demo untested |

Both were questions rather than corrections. Neither reviewer comment asserted that something was wrong — each asked the author to show where something was, and the answer turned out not to exist.
