# Lab 3 — TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens

**Name:** วิศิษฐ์ สุวรรณเนาว์ (Wisit Suwannao)

**Student ID:** 67070501042

**GitHub username:** [Palapluem](https://github.com/Palapluem)

**Peer reviewer:** นัธทวัฒน์ ปริมสิริคุณาวุฒิ (Natthawat Primsirikunawut)

**Student ID:** 67070501027

**GitHub username:** [N0TAW00D](https://github.com/N0TAW00D)

## Repository and Project URLs

| **What** | **URL** |
|---|---|
| Repository | [TokTickIT repository](https://github.com/Palapluem/toktickit_cpe334) |
| GitHub Project | [TokTickIT Individual Sprints](https://github.com/users/Palapluem/projects/2) |
| Release evidence | [main @ 6842e35](https://github.com/Palapluem/toktickit_cpe334/commit/6842e3502fc2b79cc754555e26d9dc9483d0e20a) |
| Submission source | [`docs/lab-03/submission.md`](https://github.com/Palapluem/toktickit_cpe334/blob/main/docs/lab-03/submission.md) |

> The PDF filename is `report_lab03_67070501042.pdf`. Headings follow the labsheet §14 order exactly.

---

## Answer Part 1: Git Use with Engineering Workflow

**Branch flow.** Feature work followed `feature/<n>-<slug>` → `lab3-staging` → `main`.
No implementation was committed directly to either release branch. The post-merge
evidence PR (#74) and the release PR (#76) targeted `main` deliberately; every PR was
merged by `N0TAW00D`, and the author never merged their own work. The review records are
listed below, including the one evidence-only PR whose submitted review record is
missing.

### Pull Requests

| PR | Issue | Base ← head | Merge commit | Merged by |
|---|---|---|---|---|
| [#55](https://github.com/Palapluem/toktickit_cpe334/pull/55) | [#44](https://github.com/Palapluem/toktickit_cpe334/issues/44) | `lab3-staging` ← `feature/13-lab3-engineering-contract` | `bfb8289` | `N0TAW00D` |
| [#56](https://github.com/Palapluem/toktickit_cpe334/pull/56) | [#45](https://github.com/Palapluem/toktickit_cpe334/issues/45) | `lab3-staging` ← `feature/14-user-model-and-migration` | `85e81aa` | `N0TAW00D` |
| [#57](https://github.com/Palapluem/toktickit_cpe334/pull/57) | [#46](https://github.com/Palapluem/toktickit_cpe334/issues/46) | `feature/14-…` ← `feature/15-authentication` | `ecd523d` | `N0TAW00D` |
| [#58](https://github.com/Palapluem/toktickit_cpe334/pull/58) | [#47](https://github.com/Palapluem/toktickit_cpe334/issues/47) | `feature/15-…` ← `feature/16-authorization` | `3473272` | `N0TAW00D` |
| [#59](https://github.com/Palapluem/toktickit_cpe334/pull/59) | [#48](https://github.com/Palapluem/toktickit_cpe334/issues/48) | `feature/16-…` ← `feature/17-requester-regression` | `008372b` | `N0TAW00D` |
| [#60](https://github.com/Palapluem/toktickit_cpe334/pull/60) | [#49](https://github.com/Palapluem/toktickit_cpe334/issues/49) | `feature/17-…` ← `feature/18-auth-screens` | `7f8ea6b` | `N0TAW00D` |
| [#61](https://github.com/Palapluem/toktickit_cpe334/pull/61) | [#50](https://github.com/Palapluem/toktickit_cpe334/issues/50) | `feature/18-…` ← `feature/19-staff-queue` | `3e5f8e9` | `N0TAW00D` |
| [#62](https://github.com/Palapluem/toktickit_cpe334/pull/62) | [#51](https://github.com/Palapluem/toktickit_cpe334/issues/51) | `feature/19-…` ← `feature/20-staff-ticket-detail` | `7100fe6` | `N0TAW00D` |
| [#63](https://github.com/Palapluem/toktickit_cpe334/pull/63) | [#52](https://github.com/Palapluem/toktickit_cpe334/issues/52) | `feature/20-…` ← `feature/21-comments-and-notes` | `d18ac83` | `N0TAW00D` |
| [#64](https://github.com/Palapluem/toktickit_cpe334/pull/64) | [#53](https://github.com/Palapluem/toktickit_cpe334/issues/53) | `feature/21-…` ← `feature/22-user-management` | `d727d28` | `N0TAW00D` |
| [#65](https://github.com/Palapluem/toktickit_cpe334/pull/65) | — | `lab3-staging` ← `feature/22-user-management` | `98ec433` | `N0TAW00D` |
| [#66](https://github.com/Palapluem/toktickit_cpe334/pull/66) | [#54](https://github.com/Palapluem/toktickit_cpe334/issues/54) | `lab3-staging` ← `feature/23-e2e-and-release` | `2cad893` | `N0TAW00D` |
| [#67](https://github.com/Palapluem/toktickit_cpe334/pull/67) | — | `lab3-staging` ← `feature/24-lab3-release-gaps` | `82b24ad` | `N0TAW00D` |
| [#68](https://github.com/Palapluem/toktickit_cpe334/pull/68) | — | `lab3-staging` ← `feature/25-lab3-final-evidence` | `7a26ce2` | `N0TAW00D` |
| [#69](https://github.com/Palapluem/toktickit_cpe334/pull/69) | — | `lab3-staging` ← `feature/26-lab3-e2e-owner-wait` | `ea15e1d` | `N0TAW00D` |
| [#70](https://github.com/Palapluem/toktickit_cpe334/pull/70) | [#54](https://github.com/Palapluem/toktickit_cpe334/issues/54) | `lab3-staging` ← `feature/54-seed-credential-env` | `53e29d0` | `N0TAW00D` |
| [#71](https://github.com/Palapluem/toktickit_cpe334/pull/71) | [#54](https://github.com/Palapluem/toktickit_cpe334/issues/54) | `lab3-staging` ← `feature/54-release-gate-concrete-auth` | `5baa344` | `N0TAW00D` |
| [#72](https://github.com/Palapluem/toktickit_cpe334/pull/72) | — | `lab3-staging` ← `feature/54-final-release-documentation` | `03ad128` | `N0TAW00D` |
| [#73](https://github.com/Palapluem/toktickit_cpe334/pull/73) | [#54](https://github.com/Palapluem/toktickit_cpe334/issues/54) | `main` ← `lab3-staging` | `b6f85b9` | `N0TAW00D` |
| [#74](https://github.com/Palapluem/toktickit_cpe334/pull/74) | — | `main` ← `docs/lab-03-final-verification` | `5360834` | `N0TAW00D` |
| [#75](https://github.com/Palapluem/toktickit_cpe334/pull/75) | — | `lab3-staging` ← `fix/lab-03-test-runner-isolation` | `de86bfa` | `N0TAW00D` |
| [#76](https://github.com/Palapluem/toktickit_cpe334/pull/76) | [#54](https://github.com/Palapluem/toktickit_cpe334/issues/54) | `main` ← `lab3-staging` | `6842e35` | `N0TAW00D` |

> The PR numbers in this table belong to `Palapluem/toktickit_cpe334`. The separate
> reciprocal review of `N0TAW00D/TokTickIT` PR #75 is recorded only in
> [`reviewer.md`](../../docs/lab-03/reviewer.md) §4 and is not part of this repository's
> release ledger.

### Issues

| **Issue** | **Title** | **State** |
|---|---|---|
| [#44](https://github.com/Palapluem/toktickit_cpe334/issues/44) | Sprint 3 engineering contract | CLOSED |
| [#45](https://github.com/Palapluem/toktickit_cpe334/issues/45) | User model, migration, and seed | CLOSED |
| [#46](https://github.com/Palapluem/toktickit_cpe334/issues/46) | Authentication foundation | CLOSED |
| [#47](https://github.com/Palapluem/toktickit_cpe334/issues/47) | Authorization middleware and matrix enforcement | CLOSED |
| [#48](https://github.com/Palapluem/toktickit_cpe334/issues/48) | Requester regression on authenticated identity | CLOSED |
| [#49](https://github.com/Palapluem/toktickit_cpe334/issues/49) | Login and mandatory Change Password screens | CLOSED |
| [#50](https://github.com/Palapluem/toktickit_cpe334/issues/50) | IT Staff Ticket Queue | CLOSED |
| [#51](https://github.com/Palapluem/toktickit_cpe334/issues/51) | IT Staff Ticket Detail: ownership, IT Priority, status | CLOSED |
| [#52](https://github.com/Palapluem/toktickit_cpe334/issues/52) | Public Comments and Internal Notes | CLOSED |
| [#53](https://github.com/Palapluem/toktickit_cpe334/issues/53) | Administrator User Management | CLOSED |
| [#54](https://github.com/Palapluem/toktickit_cpe334/issues/54) | E2E, responsive evidence, and release | CLOSED |

**A defect in this workflow, disclosed rather than hidden.** PRs #57–#64 were stacked,
each targeting the previous feature branch. They were merged in ascending order, and
because the branches were not deleted on merge, GitHub never retargeted the children —
so each merged into its already-merged parent and the increment never reached
`lab3-staging`. It was caught by the release audit, which checked the repository rather
than the PR dashboard, and corrected by PR #65. The full account and the rule that
prevents it are in [`reviewer.md`](../../docs/lab-03/reviewer.md) §1.1 and in the
README's branch rules.

PR #68 is recorded as merged by the peer, but GitHub exposes no submitted review for
that evidence-only change. It is retained as an explicit historical review-record gap;
no approval is inferred from the merge itself. The later release audit, PR #75, and PR
#76 are separately evidenced with their actual submitted approvals below.

### Kanban

All Lab 3 Issues (#44–#54) tracked on the *TokTickIT Individual Sprints* board through
Backlog → Specified → Started → PR Review → Done. GitHub confirms Issues #44–#54 are
closed after the release merge. The final GitHub Project UI check confirmed that the
#54 card is now in Done; the complementary board captures are included in the final
Google Docs submission.

The board evidence below is based on the Project UI check, not on the Issue state alone.

| Board evidence item | Status |
|---|---|
| Issues #44–#54 closed | Verified |
| Issue #54 Project card in Done | Verified in GitHub Project UI |
| Board screenshot attached to the final submission | Verified — [complementary captures are in the final Google Docs report](https://docs.google.com/document/d/1LvDrVanne23Pgj6LH7AoiacwpgOu-sGl7Hyr6pycZCo/edit?tab=t.8io2l44yp95s) |

> **Screenshot:** the [final Google Docs report](https://docs.google.com/document/d/1LvDrVanne23Pgj6LH7AoiacwpgOu-sGl7Hyr6pycZCo/edit?tab=t.8io2l44yp95s)
> contains complementary board captures showing the left-side columns and the Done
> column, including Issue #54.

### Peer review record

[`docs/lab-03/reviewer.md`](../../docs/lab-03/reviewer.md) — reviewer identity, the
merge ledger above taken from GitHub's own `mergeCommit`/`mergedBy`, every review
finding with the response to it, and §4 the reviews *given* on the reviewer's
repository, since Lab 3 review ran in both directions.

### README and .gitignore

[`README.md`](../../README.md) covers setup, the seeded accounts for each role, the
local-only `LAB3_SEED_PASSWORD`, the two new session environment variables, the test
commands, and the stacked-branch rule.
[`.gitignore`](../../.gitignore) excludes `.env` and `.env.*` (keeping only
`.env.example`), `node_modules/`, build output, uploaded files, and the Playwright
result directories for both labs. No secret, credential, or real personal password is
tracked.

### Repository structure

```
docs/lab-03/      specification.md · api-spec.md · ui-spec.md · tests.md
                  reviewer.md · ai-use.md · submission.md · evidence/
server/tests/lab-03/   auth · authorization · ownership · staff-queue · staff-ticket
                       notes · admin-users · password · session · transitions
                       seed-database · seed-roster · app-config · selector-removed
client/tests/lab-03/   Login · ChangePassword · AppShell · RouteGuard
                       StaffTicketQueue · StaffTicketDetail · ThreadSection
                       UserManagement · RequesterResolution
e2e/lab-03/       authentication · staff-ticket-flow · user-administration
                  comments-and-notes
artifacts/lab-03/screenshots/   authentication/ · staff-queue/
                                staff-ticket-detail/ · user-management/
```

---

## Answer Part 2: Spec DD

**Rendered:** [`docs/lab-03/specification.md`](../../docs/lab-03/specification.md) ·
[`api-spec.md`](../../docs/lab-03/api-spec.md) ·
[`ui-spec.md`](../../docs/lab-03/ui-spec.md)

Eleven sections in the labsheet §9 order. **FR-01…FR-37**, **BR-01…BR-43**,
**AC-01…AC-37**, decisions **§11.1…§11.10**, the authorization matrix (§8.1), the status
transition matrix (§5.1), the migration plan (§7.4), and the Definition of Done (§10).

**The authorization matrix is the centre of this sprint.** Sixteen protected operations
against three roles, held as data in `server/src/auth/matrix.ts` and transcribed
independently from the specification so the two transcriptions must agree. An operation
absent from the matrix is denied, never permitted by default — `grantFor` uses
`Object.hasOwn`, so a name like `toString` cannot resolve to a grant.

**Migration decisions (§7.4).** `RequesterUser` is **renamed**, not recreated, so every
Ticket and Attachment foreign key survives. Prisma emits `DROP TABLE` + `CREATE TABLE`
for a model rename, which would orphan the whole Lab 2 increment, so the generated SQL
was replaced by hand with `ALTER TABLE … RENAME TO …` and verified against a database
holding real Lab 2 rows.

### Evidence the specification existed before implementation

```
$ git log --reverse --format='%ci %h %s' -- docs/lab-03/specification.md
2026-09-11 16:19:28 +0700  a08e6d7  docs: add the Lab 3 sprint engineering specification
2026-09-11 16:19:28 +0700  7019b5e  docs: add the Lab 3 API and UI specifications

$ git log --reverse --format='%ci %h %s' -- server/src/auth server/src/staff
2026-09-12 00:11:08 +0700  74d38e7  test(lab-03): specify the user roster, …
2026-09-12 00:25:55 +0700  45a0f74  feat(lab-03): evolve RequesterUser into User …
```

The contract landed roughly eight hours before the first line of Lab 3 implementation,
and PR #55 carrying it merged before any implementation PR. Within that first
implementation Issue the `test:` commit also precedes the `feat:` commit — the
red-green order the testing contract requires.

**Row counts across the migration**, from
[`evidence/migration-row-counts.md`](../../docs/lab-03/evidence/migration-row-counts.md):
Attachments 4 → 4, Tickets 7 → 7, requesters 5 → 5 `User` rows. Nothing orphaned.

---

## Answer Part 3: Test DD and Traceability

**Rendered:** [`docs/lab-03/tests.md`](../../docs/lab-03/tests.md) · final-main
verification: [`evidence/l3-13-final-main-verification.md`](../../docs/lab-03/evidence/l3-13-final-main-verification.md)

88 planned tests across eight levels, each naming the identifier it proves, its expected
result, and the file it lives in. Every AC maps to at least one planned test (§3).

| Level | Planned | Result |
|---|---|---|
| Unit | 6 | Pass |
| API — authentication | 10 | Pass |
| Security / authorization | 14 | Pass |
| API — IT Staff | 8 | Pass |
| API — comments, notes, resolution | 6 | Pass |
| API — Administrator | 9 | Pass |
| Migration / regression | 5 | Pass |
| UI component | 18 | Pass |
| UI style | 5 | Pass |
| Responsive and E2E | 7 | Pass |

**Authorization tests call the API directly with the wrong role, never through the UI.**
A test that drives the interface proves a button is hidden; only a direct call proves the
boundary holds. `SEC-T01…SEC-T14` are that family. The boundary-test rule in `tests.md` §1 — remove the check
locally, watch the test fail, restore it — was applied to the authentication and
authorization middleware, with the captures in
[`evidence/l3-3-boundary-proof.md`](../../docs/lab-03/evidence/l3-3-boundary-proof.md)
and [`l3-4-boundary-proof.md`](../../docs/lab-03/evidence/l3-4-boundary-proof.md).

**The `File` column and repository structure were reconciled at release.** The six
required server suites and the user-administration E2E suite now use the exact names required by
labsheet §12. Queue and Ticket Detail checks were consolidated into
`e2e/lab-03/staff-ticket-flow.spec.ts`; the supplementary comments-and-notes suite is
also traced explicitly. Responsive checks remain in the feature specs that capture them.

**AC-14 is a deliberate suite-level trace.** The name-level citation audit reports it
outside individual test names because it is the migration/regression criterion for the
complete Lab 2 suite. `tests.md` maps it to MIG-04, and the final 410-test server run
includes that migrated suite; it is not an untested criterion.

### Final test output

The following run was performed from the exact merged `main` release at
`6842e3502fc2b79cc754555e26d9dc9483d0e20a` on 19 September 2026. The server run used
a fresh disposable PostgreSQL database whose name ended in `_test`; the E2E run used a
separate fresh disposable E2E database and one Playwright worker.

| Suite | Command | Result |
|---|---|---|
| Server - unit, API, security, migration | `cd server && npm test` | **410 passed** (28 files) |
| Client - UI component and style | `cd client && npm test` | **203 passed** (24 files) |
| E2E and responsive | `npm run test:e2e` | **36 passed** |
| **Total** | three commands above | **649 passed · 0 failed · 0 skipped** |

The final release also passed `cd server && npm run build` and `cd client && npm run
build`. `cd client && npm run lint` completed successfully with three existing
non-blocking warnings: two React Fast Refresh warnings in `SessionContext.tsx` and one
unused test fixture constant in `client/tests/lab-02/MyTickets.test.tsx`.

> **Screenshot:** terminal output of all three suites.

---

## Answer Part 4: AI Use with Reflection

**Rendered:** [`docs/lab-03/ai-use.md`](../../docs/lab-03/ai-use.md)

**LLM used:** Claude Code in a VS Code-based IDE — Claude Sonnet 5 for the
implementation Issues, Claude Opus 5 for the release audit.

Ten selected prompts, each with what the agent produced and what I took from it: the red,
green, security-audit and review-response phase templates, and the judgment prompts used
between phases and at release.

The reflection is under the literal heading **My Reflection**. Its short form: the most
valuable clause in a prompt is the one that tells the agent to attack its own output.
*"Would a stub that refuses everything also pass this test?"* caught a red phase that was
theatre. *"Read the AC text, not the label"* found 26 test names citing the wrong
criterion. *"Do not assume a merged PR reached staging"* caught the branch defect
in Part 1. *"Reproduce it before you fix it"* turned a reported vulnerability into a
permanent regression test.

---

## Answer Part 5: Working Login and Password Change UI

| Behaviour | Evidence |
|---|---|
| Valid login, authenticated shell with name and role | `login-desktop.png`, E2E `AUTH-03` |
| Invalid login — one safe message | `login-failure.png`, E2E `AUTH-02`, API `API-02` |
| Inactive account — indistinguishable from a wrong password | `API-04`, byte-identical body |
| Busy state, submit disabled, one request | `UI-03` |
| Mandatory first-login password change | `change-password-desktop.png`, E2E `AUTH-04` |
| Every other route refused until the password changes | E2E `AUTH-05`, API `API-06` |
| Logout, and direct access blocked afterwards | E2E `AUTH-06`, API `API-05` |

**The failure message is a requirement, not copy.** One constant for a wrong password, an
unknown email, and an inactive account. `authenticate()` always runs the hash comparison —
an unknown email is checked against a memoized decoy — so response *time* cannot separate
the three either.

> **Screenshots:** `artifacts/lab-03/screenshots/authentication/` — eight captures:
> login and Change Password at desktop/tablet/mobile, the login-failure state, and
> the administrator-created account's forced-change state.

---

## Answer Part 6: Working IT Staff Ticket Queue UI

| Behaviour | Evidence |
|---|---|
| Queue spans all Requesters, IT Priority desc then oldest first | `API-11`, `desktop-list.png` |
| Search on ticket number and summary | `API-12`, `UI-09` |
| Filters — status, IT Priority, owner incl. unassigned | `API-12`, `UI-09` |
| Sorting and pagination | `API-12`, `UI-09` |
| Invalid parameter is a 400, never a silent fallback | `API-13` |
| Assigned vs unassigned ownership | `OwnerCell`, `UI-08` |
| Status and priority badges | `StatusBadge`, `PriorityBadge` — text always rendered |
| Empty, no-results, forbidden, failure states | `UI-10`, `empty.png`, `no-results.png`, `forbidden.png` |
| Responsive — table at desktop/tablet, cards below 768px | `desktop-list` · `tablet-list` · `mobile-cards` |

**Empty and no-results are different components.** "The queue is empty" and "no tickets
match these filters" are different facts, and collapsing them hides which one is true.

> **Screenshots:** `artifacts/lab-03/screenshots/staff-queue/` — six captures.

---

## Answer Part 7: Working IT Staff Ticket Detail UI

| Behaviour | Evidence |
|---|---|
| Claim an unassigned Ticket; `NEW` → `OPEN` in one operation (BR-24) | `API-14`, E2E `DETAIL-02` |
| Reassign; inactive user or Requester refused (BR-16) | `API-15` |
| IT Priority changes, Requested Priority never does (BR-18) | `API-16`, `UI-11` |
| Only permitted transitions offered, and validated on arrival | `API-17`, `API-18`, `UI-12`, E2E `DETAIL-03` |
| Public Comments and Internal Notes visually distinct | `UI-13`, `comments-and-notes.png` |
| Attachment continuity from Lab 2 | Lab 2 suite, re-pointed to authenticated identity |
| Requester resolution indication visible to staff | `API-24`, E2E `DETAIL-06` |
| Safe failure and conflict feedback | E2E `DETAIL-05`, `forbidden.png` |

### Direct API authorization evidence

Every row below is an API call with a session cookie and the wrong role — no UI involved.

| Test | Attempt | Result |
|---|---|---|
| `SEC-T01` | Any protected endpoint, no session | `401` |
| `SEC-T05` | Requester reads Internal Notes | Refused, **no count, no empty array, no existence signal** |
| `SEC-T06` | Requester writes an Internal Note | Refused, nothing written |
| `SEC-T09` | Requester calls the Staff Queue | `403` |
| `SEC-T10` | Requester sends `RESOLVED`/`CLOSED` | Refused, status unchanged |
| `SEC-T11` | Client sends its own role | Ignored; the session decides |
| `SEC-T03` | Requester opens another Requester's Ticket | `404` — identical to a Ticket that does not exist |

The release-gate sweep in `server/tests/lab-03/authorization.api.test.ts` adds a
concrete route check to this matrix evidence: it enumerates the 25 protected route
registrations in `server/src/app.ts` and asserts `401` for each unauthenticated call.
It also exercises 20 concrete role-exclusive denied cells and asserts `403` with no
`data` envelope. The existing `/ops/...` checks remain the policy-level matrix proof;
the concrete sweep proves that the live Express registration applies the policy.

**BR-28 is tested by byte comparison.** The refusal a Requester receives for Internal
Notes is identical whether the Ticket has zero notes or fifty — the test asserts the
bodies match, with a positive control proving staff *do* see the difference.

**A real defect the peer review caught here.** A Requester's grant on `ticket:setStatus`
is `own`, because §5.1 lets them cancel their own `NEW` Ticket — but the handler loaded
the Ticket by id with no ownership filter, so any Requester could drive *another*
Requester's Ticket through the status endpoint. Unreachable from the UI, one request
away directly. Reproduced as a failing test first (it returned `200`), then fixed by
scoping the lookup; the reproduction is now a permanent regression test. Recorded in
`reviewer.md` §2 under PR #62.

> **Screenshots:** `artifacts/lab-03/screenshots/staff-ticket-detail/` — eight captures
> including `requester-view-no-notes.png` and `forbidden.png`.

---

## Answer Part 8: Working Administrator User Management UI

| Required functionality | Evidence |
|---|---|
| User list — Name, Email, Role, Status, Edit | `API-25`, `UI-15`, `desktop-list.png` |
| Search by name or email | `API-26` |
| Optional role filter | `API-26` |
| Create user with one role and an initial password | `API-27`, E2E `ADMIN-02`, `create-dialog.png` |
| Duplicate email rejected, naming only the field | `API-28`, `duplicate-email.png` |
| Invalid role rejected | `API-29` |
| Edit name, email, role, activation state | `FR-31` tests in `users-admin.api.test.ts`, E2E `ADMIN-04` |
| New initial password forces a change at next login | `API-32`, E2E `ADMIN-04` |
| **Administrator cannot deactivate their own account** | `API-30`, `self-deactivation-refused.png` |
| **Never zero active Administrators** | `API-31`, `last-administrator.png` |
| Non-Administrators refused | `SEC-T07`, `SEC-T08` |

**The two safety rules are separate on purpose.** `CANNOT_DEACTIVATE_SELF` fires
regardless of how many Administrators exist; `LAST_ADMINISTRATOR` fires regardless of who
is acting. A sole Administrator demoting their own *role* therefore hits the second, not
the first — which is what BR-36 governs. Both are evaluated inside a **Serializable**
transaction: under Read Committed, two concurrent deactivations would each see one other
active Administrator and both succeed.

**The client does not pre-compute the last-Administrator rule.** The count can change
between render and submit, so a client-side guard would be wrong at exactly the moment it
mattered. The attempt reaches the server and the server's message is shown.

> **Screenshots:** `artifacts/lab-03/screenshots/user-management/` — nine captures
> including both refusals.

---

## Answer Part 9: Zen Green UI and Responsive Evidence

**Rendered:** [`docs/lab-03/ui-spec.md`](../../docs/lab-03/ui-spec.md)

Lab 2's Zen Green tokens, cards, buttons, validation placement and accessibility rules
remain in force unchanged. Lab 3 adds only what is new: the eight status badges, the role
badge, the IT Priority variant, the private-note surface, and the forbidden state.

### Completed visual inspection checklist

All fifteen rows of `ui-spec.md` §13 are ticked, each carrying what was checked rather
than an unsupported tick — the token grep, the Bootstrap-utility grep, the test that
asserts each state, or the capture that shows it. Highlights:

- no hard-coded hex outside `theme.css`; no Bootstrap colour utility on any new surface
- every badge renders its text label — colour is never the only signal
- forbidden is distinguishable from not-found and from failure, and offers no *Try again*,
  because retrying a refusal cannot change its outcome
- Internal Notes carry their own surface, heading, private marker and composer
- navigation renders no unauthorised destination — absent, not merely disabled

### Screenshots at three viewports

| Screen | Desktop | Tablet | Mobile |
|---|---|---|---|
| Authentication (login, change password) | Pass | Pass | Pass |
| IT Staff Ticket Queue | Pass | Pass | Pass |
| IT Staff Ticket Detail | Pass | Pass | Pass |
| Administrator User Management | Pass | Pass | Pass |

Plus the state captures a happy path does not produce: `login-failure`,
`duplicate-email`, `self-deactivation-refused`, `last-administrator`, `forbidden`
(queue and detail), `empty`, `no-results`, `requester-view-no-notes`.

The tablet captures for authentication and user-management were added by the release
audit, which found those two screens had been captured at two viewports rather than the
three AC-34 requires.

### Screenshot attachment manifest

Every file in the manifest is tracked under
[`artifacts/lab-03/screenshots/`](https://github.com/Palapluem/toktickit_cpe334/tree/main/artifacts/lab-03/screenshots)
and was checked for readable layout and absence of passwords, tokens, database URLs, and
other credentials. The first four groups are the Lab 3 deliverables; the last three
groups are the Lab 2 authenticated-identity regression captures retained alongside the
Lab 3 evidence.

| Evidence group | Captures attached | What the captures prove |
|---|---|---|
| Authentication (8) | [`login-desktop`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/authentication/login-desktop.png), [`login-tablet`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/authentication/login-tablet.png), [`login-mobile`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/authentication/login-mobile.png), [`login-failure`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/authentication/login-failure.png), [`change-password-desktop`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/authentication/change-password-desktop.png), [`change-password-tablet`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/authentication/change-password-tablet.png), [`change-password-mobile`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/authentication/change-password-mobile.png), [`admin-created-change-password`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/authentication/admin-created-change-password.png) | Three viewports, safe login failure, mandatory password change, and the administrator-created account gate. |
| Staff queue (6) | [`desktop-list`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/staff-queue/desktop-list.png), [`tablet-list`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/staff-queue/tablet-list.png), [`mobile-cards`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/staff-queue/mobile-cards.png), [`empty`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/staff-queue/empty.png), [`no-results`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/staff-queue/no-results.png), [`forbidden`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/staff-queue/forbidden.png) | Queue data, three responsive layouts, empty versus no-results, and the Requester forbidden state. |
| Staff ticket detail (8) | [`desktop-detail`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/staff-ticket-detail/desktop-detail.png), [`tablet-detail`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/staff-ticket-detail/tablet-detail.png), [`mobile-detail`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/staff-ticket-detail/mobile-detail.png), [`comments-and-notes`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/staff-ticket-detail/comments-and-notes.png), [`requester-view-no-notes`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/staff-ticket-detail/requester-view-no-notes.png), [`forbidden`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/staff-ticket-detail/forbidden.png), [`attachments`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/staff-ticket-detail/attachments.png), [`failure`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/staff-ticket-detail/failure.png) | Claim/assignment, ticket detail, responsive layouts, comments versus notes, ownership refusal, attachments, and retryable load failure. |
| Administrator user management (9) | [`desktop-list`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/user-management/desktop-list.png), [`tablet-list`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/user-management/tablet-list.png), [`mobile-list`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/user-management/mobile-list.png), [`create-dialog`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/user-management/create-dialog.png), [`duplicate-email`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/user-management/duplicate-email.png), [`edit-dialog`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/user-management/edit-dialog.png), [`reset-confirmation`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/user-management/reset-confirmation.png), [`self-deactivation-refused`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/user-management/self-deactivation-refused.png), [`last-administrator`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/user-management/last-administrator.png) | Three responsive layouts, create/edit/reset flows, duplicate-email validation, and both Administrator safety refusals. |
| Lab 2 regression: Create Ticket (3) | [`desktop-initial`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/create-ticket/desktop-initial.png), [`tablet-initial`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/create-ticket/tablet-initial.png), [`mobile-initial`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/create-ticket/mobile-initial.png) | The existing Lab 2 Requester screen remains visually available after authenticated identity replaces the selector. |
| Lab 2 regression: My Tickets (3) | [`desktop-list`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/my-tickets/desktop-list.png), [`tablet-list`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/my-tickets/tablet-list.png), [`mobile-cards`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/my-tickets/mobile-cards.png) | Requester-owned listing and responsive regression evidence. |
| Lab 2 regression: Ticket Detail (3) | [`desktop-detail`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/ticket-detail/desktop-detail.png), [`tablet-detail`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/ticket-detail/tablet-detail.png), [`mobile-detail`](https://github.com/Palapluem/toktickit_cpe334/blob/main/artifacts/lab-03/screenshots/ticket-detail/mobile-detail.png) | Requester ticket detail and attachment continuity after the migration. |
