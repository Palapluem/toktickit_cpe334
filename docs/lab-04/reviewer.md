# Lab 4 Peer Review Log

**Status:** Started 3 October 2026. Rows are added from GitHub's actual review, merge and comment records as each Pull Request is reviewed; approval or merge is never inferred from a commit author.

## 1. Identity and policy

| Role | Name | Student ID | GitHub |
|---|---|---|---|
| Author | Wisit Suwannao (วิศิษฐ์ สุวรรณเนาว์) | 67070501042 | `Palapluem` |
| Reviewer and merger | Natthawat Primsirikunawut (นัธทวัฒน์ ปริมสิริคุณาวุฒิ) | 67070501027 | `N0TAW00D` |

Repository: [`Palapluem/toktickit_cpe334`](https://github.com/Palapluem/toktickit_cpe334). Flow: `feature/<issue>-<name>` → `lab4-staging` → one release Pull Request → `main`.

- The reviewer checks each Pull Request against its Issue's acceptance criteria and the Lab 4 contracts, and is the one who merges.
- The author replies to every comment.
- Fixes stay on the same branch and Pull Request.
- No Pull Request exists only to record that another Pull Request merged.

## 2. Merge ledger

| PR | Issue | Base ← head | Reviewed head SHA | Review state | Merged by | Merge commit | Date |
|---|---|---|---|---|---|---|---|
| [#97](https://github.com/Palapluem/toktickit_cpe334/pull/97) | #96 | `lab4-staging` ← `fix/96-stabilize-server-tests` | `0069884` | COMMENTED 16:29 UTC; [APPROVED](https://github.com/Palapluem/toktickit_cpe334/pull/97#pullrequestreview-5407190735) 16:37 UTC (submitted two minutes after the merge) | `N0TAW00D` | `63f7c55` | 2026-10-04 16:35 UTC |
| [#95](https://github.com/Palapluem/toktickit_cpe334/pull/95) | #89 | `lab4-staging` ← `feature/89-lab4-engineering-contract` | `4e62848`; fixed since at `4f49df8` | [COMMENTED](https://github.com/Palapluem/toktickit_cpe334/pull/95#pullrequestreview-5407163250) 16:29 UTC; [APPROVED](https://github.com/Palapluem/toktickit_cpe334/pull/95#pullrequestreview-5407190828) 16:37 UTC on `4e62848`; [COMMENTED](https://github.com/Palapluem/toktickit_cpe334/pull/95#pullrequestreview-5407229356) 16:50 UTC; [APPROVED](https://github.com/Palapluem/toktickit_cpe334/pull/95#pullrequestreview-5407234842) 16:52 UTC on `4f49df8` | `N0TAW00D` | `f366a47` | 2026-10-04 16:52 UTC |
| [#98](https://github.com/Palapluem/toktickit_cpe334/pull/98) | #90 | `lab4-staging` ← `feature/90-actions-taken-foundation` | `948ff56`; now `321e1c2` after the rebase and the fixes | [COMMENTED](https://github.com/Palapluem/toktickit_cpe334/pull/98#pullrequestreview-5407163434) 16:29 UTC; [CHANGES_REQUESTED](https://github.com/Palapluem/toktickit_cpe334/pull/98#pullrequestreview-5407190903) 16:37 UTC. My [reply](https://github.com/Palapluem/toktickit_cpe334/pull/98#issuecomment-5987232973) was posted 2026-10-05 02:47 UTC; no second review yet | not merged yet | | |
| [#100](https://github.com/Palapluem/toktickit_cpe334/pull/100) | #92 | `feature/90-actions-taken-foundation` ← `feature/92-ticket-workflow` (`lab4-staging` after #98 merges) | `cde6394` | [CHANGES_REQUESTED](https://github.com/Palapluem/toktickit_cpe334/pull/100#pullrequestreview-5445561130) 2026-10-07 16:52 UTC | not merged yet | | |

Times are UTC as GitHub records them (Asia/Bangkok is seven hours ahead).

## 3. Findings and responses

| PR | Reviewer finding (link) | Author response (link) | Fix commit / test | Resolution |
|---|---|---|---|---|
| [#95](https://github.com/Palapluem/toktickit_cpe334/pull/95) | [Seed count: the specification says nine, #98 seeds eight](https://github.com/Palapluem/toktickit_cpe334/pull/95#discussion_r4178445755) | [Response](https://github.com/Palapluem/toktickit_cpe334/pull/95#discussion_r4178504452) | `4f49df8` fixes "Nine Actions" to "Eight Actions" (the only occurrence); MIG-04 | Fixed; waiting for the reviewer to merge |
| [#95](https://github.com/Palapluem/toktickit_cpe334/pull/95), [#98](https://github.com/Palapluem/toktickit_cpe334/pull/98) | [Merge #95 before #98, so the specification predates the implementation (labsheet Part 2)](https://github.com/Palapluem/toktickit_cpe334/pull/95#pullrequestreview-5407163250) | Acknowledged in the response above | Merge order #97, #95, #98 | Followed |
| [#98](https://github.com/Palapluem/toktickit_cpe334/pull/98) | [Contract drift: five deviations must be written into specification §11 and `api-spec.md` in this PR](https://github.com/Palapluem/toktickit_cpe334/pull/98#pullrequestreview-5407190903) | [Response](https://github.com/Palapluem/toktickit_cpe334/pull/98#issuecomment-5987232973) | `9c06707`: specification §11.16, `api-spec.md` §1, §2 and §3, `tests.md` (API-04, API-10, API-14, API-18, MIG-04, MIG-05) | Fixed; waiting for the reviewer's second look |
| [#98](https://github.com/Palapluem/toktickit_cpe334/pull/98) | [Rebase after #97 and #95 merge](https://github.com/Palapluem/toktickit_cpe334/pull/98#pullrequestreview-5407190903) | [Response](https://github.com/Palapluem/toktickit_cpe334/pull/98#issuecomment-5987232973) | Rebased onto `lab4-staging` after #97 and #95 merged; head `321e1c2` | Done; waiting for the reviewer's second look |
| [#98](https://github.com/Palapluem/toktickit_cpe334/pull/98) | [Confirm the inactive-assignee test and its ID (labsheet Part 6)](https://github.com/Palapluem/toktickit_cpe334/pull/98#pullrequestreview-5407163434) | [Response](https://github.com/Palapluem/toktickit_cpe334/pull/98#issuecomment-5987232973) | API-03 ("an inactive IT Staff user", "deactivated after the list was fetched") and API-04 in `tests.md` | Answered; waiting for the reviewer's second look |
| [#100](https://github.com/Palapluem/toktickit_cpe334/pull/100) | [Branch flow (§11.1): retarget to `lab4-staging` once #98 merges](https://github.com/Palapluem/toktickit_cpe334/pull/100#pullrequestreview-5445561130) | PENDING (to be posted) | None yet: this PR needs the Action tables of #98. #98's commits reach `lab4-staging` through a merge commit, so the base changes without a rebase | Open until #98 is merged |
| [#100](https://github.com/Palapluem/toktickit_cpe334/pull/100) | [Add this PR's review and the response to `reviewer.md` (Part 1)](https://github.com/Palapluem/toktickit_cpe334/pull/100#pullrequestreview-5445561130) | PENDING (to be posted) | This row, and the refresh of the #95, #97 and #98 rows to GitHub's records (`d565eb5`) | Done |
| [#100](https://github.com/Palapluem/toktickit_cpe334/pull/100) | [Confirm §5.2 matches `workflowRules.ts` and the test oracle, role restrictions included (Part 7)](https://github.com/Palapluem/toktickit_cpe334/pull/100#pullrequestreview-5445561130) | PENDING (to be posted) | UNIT-08 reads the §5.2 table as text and compares each of 8 statuses × 3 roles with `transitions.ts`, the gate in `workflowRules.ts` and `transition-oracle.ts` (26 tests, 8 injected faults each caught; `79086a5`). WF-06 sends every cell through the API for the three roles; SEC-02 refuses another Requester's Ticket (404); WF-01 shows a Requester never reaches the gate (403) | Confirmed, 0 differences |
| [#100](https://github.com/Palapluem/toktickit_cpe334/pull/100) | [Shorten the PR description: list first, reasoning collapsed (AGENTS.md)](https://github.com/Palapluem/toktickit_cpe334/pull/100#pullrequestreview-5445561130) | PENDING (to be posted) | The description was rewritten: a four-line summary, then the reasoning under `<details>` | Done |

## 4. Release

| Item | Value |
|---|---|
| Staging gate evidence (commit, suites, builds, lint) | PENDING |
| Release PR, review and merge | PENDING |
| Final `main` verification record | PENDING |

## 5. Reciprocal reviews — partner repository (kept separate)

Reviews performed by `Palapluem` on [`N0TAW00D/TokTickIT`](https://github.com/N0TAW00D/TokTickIT). Their tests, commits and screenshots are never evidence for this repository.

| Partner PR | Reviewed head SHA | Review state and date | Key finding | Merge (by whom) |
|---|---|---|---|---|
| PENDING | | | | |
