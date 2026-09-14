# Peer Review Log — Lab 3

**Author:** วิศิษฐ์ สุวรรณเนาว์ (Wisit Suwannao), 67070501042 — GitHub [@Palapluem](https://github.com/Palapluem)
**Reviewer:** นัธทวัฒน์ ปริมสิริคุณาวุฒิ (Natthawat Primsirikunawut) — GitHub [@N0TAW00D](https://github.com/N0TAW00D)
**Repository:** [Palapluem/toktickit_cpe334](https://github.com/Palapluem/toktickit_cpe334)

The Lab 2 rule holds unchanged: **the reviewer merges, never the author.** Every merge below was performed by `N0TAW00D`.

Unlike Lab 2, review in Lab 3 ran **in both directions** — §4 records the comments this author gave on the reviewer's own repository.

---

## 1. Merge ledger

`Merge commit` is GitHub's `mergeCommit.oid` abbreviated to seven characters and `Merged by` is `mergedBy.login`; neither is inferred from the commit author.

| PR | Issue | Base ← head | State | Merge commit | Merged by |
|---|---|---|---|---|---|
| [#55](https://github.com/Palapluem/toktickit_cpe334/pull/55) | [#44](https://github.com/Palapluem/toktickit_cpe334/issues/44) | `lab3-staging` ← `feature/13-lab3-engineering-contract` | `MERGED` | `bfb8289` | `N0TAW00D` |
| [#56](https://github.com/Palapluem/toktickit_cpe334/pull/56) | [#45](https://github.com/Palapluem/toktickit_cpe334/issues/45) | `lab3-staging` ← `feature/14-user-model-and-migration` | `MERGED` | `85e81aa` | `N0TAW00D` |
| [#57](https://github.com/Palapluem/toktickit_cpe334/pull/57) | [#46](https://github.com/Palapluem/toktickit_cpe334/issues/46) | `feature/14-…` ← `feature/15-authentication` | `MERGED` | `ecd523d` | `N0TAW00D` |
| [#58](https://github.com/Palapluem/toktickit_cpe334/pull/58) | [#47](https://github.com/Palapluem/toktickit_cpe334/issues/47) | `feature/15-…` ← `feature/16-authorization` | `MERGED` | `3473272` | `N0TAW00D` |
| [#59](https://github.com/Palapluem/toktickit_cpe334/pull/59) | [#48](https://github.com/Palapluem/toktickit_cpe334/issues/48) | `feature/16-…` ← `feature/17-requester-regression` | `MERGED` | `008372b` | `N0TAW00D` |
| [#60](https://github.com/Palapluem/toktickit_cpe334/pull/60) | [#49](https://github.com/Palapluem/toktickit_cpe334/issues/49) | `feature/17-…` ← `feature/18-auth-screens` | `MERGED` | `7f8ea6b` | `N0TAW00D` |
| [#61](https://github.com/Palapluem/toktickit_cpe334/pull/61) | [#50](https://github.com/Palapluem/toktickit_cpe334/issues/50) | `feature/18-…` ← `feature/19-staff-queue` | `MERGED` | `3e5f8e9` | `N0TAW00D` |
| [#62](https://github.com/Palapluem/toktickit_cpe334/pull/62) | [#51](https://github.com/Palapluem/toktickit_cpe334/issues/51) | `feature/19-…` ← `feature/20-staff-ticket-detail` | `MERGED` | `7100fe6` | `N0TAW00D` |
| [#63](https://github.com/Palapluem/toktickit_cpe334/pull/63) | [#52](https://github.com/Palapluem/toktickit_cpe334/issues/52) | `feature/20-…` ← `feature/21-comments-and-notes` | `MERGED` | `d18ac83` | `N0TAW00D` |
| [#64](https://github.com/Palapluem/toktickit_cpe334/pull/64) | [#53](https://github.com/Palapluem/toktickit_cpe334/issues/53) | `feature/21-…` ← `feature/22-user-management` | `MERGED` | `d727d28` | `N0TAW00D` |
| [#65](https://github.com/Palapluem/toktickit_cpe334/pull/65) | [#54](https://github.com/Palapluem/toktickit_cpe334/issues/54) | `lab3-staging` ← `feature/22-user-management` | open at time of writing | — | — |

Every PR received a substantive `COMMENTED` review before its `APPROVED` one.

### 1.1 The stacked-branch merge defect, and PR #65

PRs #57–#64 were stacked: each targeted the previous feature branch rather than `lab3-staging`. They were merged in ascending order, and because the branches were not deleted on merge, GitHub never retargeted the children — so each merged into its already-merged parent and **the work never reached `lab3-staging`**.

This was caught during the release audit, not during review. It is recorded here rather than quietly repaired because the ledger above would otherwise read as though ten merges delivered an increment that staging did not actually hold. PR #65 merges the stack tip into `lab3-staging`; it introduces no code that was not already approved in #57–#64.

The rule that would have prevented it: with stacked PRs, either delete each branch on merge so GitHub retargets the next one, or merge in **descending** order.

---

## 2. Comments received, and the response to each

### PR #55 — Sprint 3 engineering contract

**Received.** The reviewer accepted the required contract set but challenged `docs/lab-03/security-contract.md` as scope creep: not one of the required files, `SEC-001…037` largely restating business rules already stated in `specification.md` and `api-spec.md`, and the same "invented gate document" pattern as Lab 2's `style-contract.md` and `testing-contract.md`. Asked whether `SEC-###` could be inline callouts instead of a sixth file.

**Response.** Conceded the duplication rather than defending the file whole: SEC-006/007 restate BR-04/BR-05, the cookie and CSRF rules restate `api-spec.md` §1, the 401/403/404 discipline restates §2. Pushed back only on §9 (the rule that every authorization test calls the API directly, never through the UI) and §10 (the pre-review audit checklist), neither of which is stated anywhere else. Offered two options and let the reviewer choose.

**Outcome.** The reviewer chose the stronger option: fold §10 into `testing-contract.md` as its own section, drop §9 as already covered by `tests.md` plus `TC-003`, and delete the file. Done in `d9df3dc`, which also removed `security-contract.md` from `specification.md` §10's required-file list and updated the three references in `AGENTS.md` — a dependency the deletion would otherwise have left dangling, and one the review had not asked about.

### PR #56 — User model, migration, and seed

**Received.** Scope accepted; the migration verified as a rename rather than a recreate, with row counts and a raw-SQL orphan scan. One question before merge: the migration runs two `RENAME VALUE` statements and then `ADD VALUE 'REOPENED'` on `TicketStatus` inside one transaction, which is safe only if the new value is not *read* in the same transaction — and that class of failure surfaces at real Postgres execution, not against a mock. Asked for confirmation that `prisma migrate deploy` had actually run against Postgres.

**Response.** Confirmed with evidence rather than assertion: `db:test:setup` runs `prisma migrate deploy` through `server/scripts/prepare-test-db.mjs`, and the row-count evidence in `docs/lab-03/evidence/migration-row-counts.md` was captured the same way against `toktickit_dev`. `db push` is not used anywhere.

### PR #57 — Authentication foundation

**Received.** Two findings. The timing-safe login path was accepted as real (an unknown email still hashes against a memoized decoy, so response time cannot separate "no such user" from "wrong password"). The blocking one: `cors({ origin: process.env.CLIENT_ORIGIN ?? true, credentials: true })` — with `credentials: true`, the `?? true` fallback reflects whatever `Origin` the browser sends, so any site could make a cookie-carrying request and read the response.

**Response.** Accepted. `createApp()` now throws at startup when `CLIENT_ORIGIN` is unset and `NODE_ENV` is `production`; outside production the dev fallback is unchanged, because `.env.example` documents it deliberately for the split-port local setup. Fixed in `d44ede7` with three unit tests covering both directions.

### PR #58 — Authorization middleware and matrix enforcement

**Received.** The matrix-as-data design was accepted, including `Object.hasOwn` guarding against `toString` resolving as an operation, and the Administrator column being derived from IT Staff's rather than duplicated. One nitpick, explicitly labelled not blocking: `SEC-T14`'s path-traversal case sends `'../../user:list'` through `encodeURIComponent`, which escapes the slashes — so the test cannot exercise what its name claims.

**Response.** Agreed the name overpromises. Left the router unchanged, because nothing downstream of that route table resolves a filesystem path, and recorded the naming cleanup rather than making an unrelated edit on a branch under review. The reviewer had labelled it optional; treating an optional note as a requirement spends review time the review did not ask for.

### PR #59 — Requester regression on authenticated identity

**Received.** No defect. The reviewer verified the `X-Requester-Id` removal by grepping the diff independently rather than trusting the PR's own evidence, and confirmed every Lab 2 test change is a mechanical cookie-for-header swap with assertions untouched. One observation raised deliberately as "worth acknowledging rather than flagging": the attachment and ticket-detail routes now carry an `'any'` grant for IT Staff that the handlers below still ignore, since they hard-filter by `requesterId` until #62 replaces them.

**Response.** Confirmed as disclosed intent, already stated in the code comment, and pointed at #62 as the place it gets reconciled. Nothing changed on this branch.

### PR #60 — Login and mandatory Change Password screens

**Received.** Two small things. `void (error instanceof ApiRequestError)` in `Login.tsx`'s catch block evaluates and discards the check, affecting nothing, and could mislead a reader into thinking it is load-bearing. Separately, `--zen-forbidden-bg` / `--zen-forbidden-text` are added to `theme.css` here but referenced by nothing in this PR — the forbidden state they style belongs to the Staff Queue screen.

**Response.** Both accepted. The dead expression and the then-unused `ApiRequestError` import were removed; the two tokens were moved forward to #61, where `index.css`'s forbidden-state rule actually consumes them. Fixed in `613f98c` and `0748be2`.

### PR #61 — IT Staff Ticket Queue

**Received.** The deny-by-default query whitelist and the 400-rather-than-silent-fallback on a bad sort were accepted. One real discrepancy, found by checking the code against its own comment: the header comment claims Category and Requested Priority are "filterable but not columns", but `requestedPriority` is absent from `QUERY_FIELDS` entirely — sending it is a `400` — and Category, while genuinely accepted by the server, has no `<select>` on the screen.

**Response.** Accepted as written — the comment was wrong, not the code. Rewrote it to say what is actually wired rather than adding a control no acceptance criterion asks for. Fixed in `0748be2`.

### PR #62 — IT Staff Ticket Detail: ownership, IT Priority, status

**Received — the most serious finding of the sprint.** A Requester could change the status of a Ticket they do not own. The matrix grants `REQUESTER` the `ticket:setStatus` operation with scope `own`, as it must (§5.1 permits `NEW → CANCELLED` and `RESOLVED → REOPENED` on one's own Ticket), but `requireOperation` only checks that the grant is non-null and never consults the scope, while `setTicketStatus`'s `loadTicket` did an unfiltered `findUnique` by id. The reviewer traced it through the code rather than inferring it from the tests, and noted why the suite missed it: `API-16` drives every transition cell, but always against a fixture seeded as the calling Requester's own Ticket, so the cross-tenant case is never exercised.

**Response.** Confirmed real and reproduced it before fixing: a test issuing the cross-tenant `PATCH` returned `200` against the old code. `loadTicket` now takes an optional `{ requesterId }` scope, applied whenever the grant is `own` — the same pattern `findTicketForCaller` and `indicateRequesterResolution` already used, which the reviewer had correctly identified as the reference implementation. Fixed in `a71eece`; the reproduction is now a permanent regression test.

### PR #63 — Public Comments and Internal Notes

**Received.** The ownership scoping was accepted as correct here — the reviewer noted this file as the pattern #62 was missing. One finding: `logInternalNoteRefusal` is defined with a docstring promising a distinct signal for a Requester reaching for Internal Notes, but nothing calls it, so that refusal was being logged identically to every other forbidden call.

**Response.** Wired it into `requireOperation`'s refusal branch for `note:read` and `note:create` rather than deleting it — the intent behind the function was worth keeping, and the reviewer had offered both options. Fixed in `96e9845`, with a test that spies on the log to confirm the specific signal fires and the generic one does not.

### PR #64 — Administrator User Management

**Received.** The reviewer answered the PR's own checklist question — whether `CANNOT_DEACTIVATE_SELF` and `LAST_ADMINISTRATOR` should collapse into one code — with **keep them separate**, on the grounds that BR-35 fires regardless of Administrator count and BR-36 regardless of who is acting. The Serializable placement of the BR-36 check was verified as re-reading inside the transaction. One asymmetry noted: `setInitialPassword` deletes every session including the caller's own, unlike `changePassword`, which preserves the calling session.

**Response.** The separation was deliberate for exactly the stated reason, so nothing changed. The session asymmetry was accepted as-is with the reviewer's agreement — an Administrator resetting their own initial password is a rare, self-inflicted path — and recorded here so the inconsistency is known rather than forgotten.

---

## 3. What the review actually caught

Three findings changed behaviour rather than wording:

| PR | Finding | Class |
|---|---|---|
| #62 | Cross-tenant status change through a scope the handler never read | Access control |
| #57 | Credentialed CORS open to any origin when `CLIENT_ORIGIN` is unset | Configuration |
| #63 | A security signal that was written but never fired | Observability |

The remainder were accuracy findings — a comment describing filters that do not exist, a test named for a case it cannot reach, a contract file duplicating rules it cites. Those are worth recording because a specification that lies is harder to fix later than one that is merely incomplete.

The #62 finding is the one worth keeping. It was invisible to the test suite, invisible in the UI, and reachable in one request. It was found by reading the authorization path against the matrix rather than by reading the tests — which is the review method this sprint should carry forward.

---

## 4. Comments given on the reviewer's repository

Review ran in both directions this sprint. Both reviews below were performed on [N0TAW00D/TokTickIT](https://github.com/N0TAW00D/TokTickIT).

### PR #65 — Lab 2 final audit pass (`reviewer.md`, `tests.md`, `submission.typ`)

Cross-checked the document's claims against the repository rather than reading it for plausibility: the 44-PR count and 42/2 merged/closed split against `gh pr list`, the per-PR review round counts against `gh api .../reviews`, the 88-row planned-test table against `tests.md` itself, and the WCAG contrast ratios recomputed from the hex values — the `5.55:1` and rejected `4.40:1` figures both reproduced exactly.

One finding: `reviewer.md` stated "Feature PRs #21–#63 targeted `lab2-staging`", but `#62`'s base branch is `main` and it merged after the release PR `#64`, so it was never part of the pre-release staging set. Reported with the command that shows it.

### PR #75 — Lab 3 sprint specification

Verified the identifier sets are contiguous (FR-01…36, BR-01…42, AC-01…70, D-01…15 with no gaps or duplicates), that all 70 acceptance criteria appear in the traceability matrix, that the 120-test total reconciles with its per-level breakdown, and that every colour token clears WCAG AA — recomputed, not trusted.

One finding: `api-spec.md` §9 claimed deleting `GET /api/requesters` "Repeals `L2-BR-35`", but `specification.md` §7.4 item 8 lists a different repeal set that excludes BR-35, and BR-35 also governs two endpoints that survive. Two authoritative documents disagreeing about the same rule. Fixed by the author in `06b2433` before merge, and re-verified.

---

## 5. Direction of review

| Lab | Direction |
|---|---|
| Lab 1 | Reciprocal |
| Lab 2 | One-way — `N0TAW00D` authored, `Palapluem` reviewed |
| Lab 3 | Reciprocal — each authored their own repository and reviewed the other's |

This file records both halves: §2 holds the comments received and answered, §4 the comments given.
