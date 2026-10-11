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
| [#95](https://github.com/Palapluem/toktickit_cpe334/pull/95) | #89 | `lab4-staging` ← `feature/89-lab4-engineering-contract` | `4e62848`; fixed since at `4f49df8` | COMMENTED 16:29 UTC; [APPROVED](https://github.com/Palapluem/toktickit_cpe334/pull/95#pullrequestreview-5407190828) 16:37 UTC | not merged yet | | |
| [#98](https://github.com/Palapluem/toktickit_cpe334/pull/98) | #90 | `lab4-staging` ← `feature/90-actions-taken-foundation` | `948ff56` | COMMENTED 16:29 UTC; [CHANGES_REQUESTED](https://github.com/Palapluem/toktickit_cpe334/pull/98#pullrequestreview-5407190903) 16:37 UTC | not merged yet | | |

Times are UTC as GitHub records them (Asia/Bangkok is seven hours ahead).

## 3. Findings and responses

| PR | Reviewer finding (link) | Author response (link) | Fix commit / test | Resolution |
|---|---|---|---|---|
| [#95](https://github.com/Palapluem/toktickit_cpe334/pull/95) | [Seed count: the specification says nine, #98 seeds eight](https://github.com/Palapluem/toktickit_cpe334/pull/95#discussion_r4178445755) | [Response](https://github.com/Palapluem/toktickit_cpe334/pull/95#discussion_r4178504452) | `4f49df8` fixes "Nine Actions" to "Eight Actions" (the only occurrence); MIG-04 | Fixed; waiting for the reviewer to merge |
| [#95](https://github.com/Palapluem/toktickit_cpe334/pull/95), [#98](https://github.com/Palapluem/toktickit_cpe334/pull/98) | [Merge #95 before #98, so the specification predates the implementation (labsheet Part 2)](https://github.com/Palapluem/toktickit_cpe334/pull/95#pullrequestreview-5407163250) | Acknowledged in the response above | Merge order #97, #95, #98 | Followed |
| [#98](https://github.com/Palapluem/toktickit_cpe334/pull/98) | [Contract drift: five deviations must be written into specification §11 and `api-spec.md` in this PR](https://github.com/Palapluem/toktickit_cpe334/pull/98#pullrequestreview-5407190903) | PENDING (to be posted after the commit is pushed) | specification §11.16, `api-spec.md` §1, §2 and §3, `tests.md` (API-04, API-10, API-14, API-18, MIG-04, MIG-05) | In progress |
| [#98](https://github.com/Palapluem/toktickit_cpe334/pull/98) | [Rebase after #97 and #95 merge](https://github.com/Palapluem/toktickit_cpe334/pull/98#pullrequestreview-5407190903) | PENDING | Rebase onto `lab4-staging` | Waiting for #95 to merge |
| [#98](https://github.com/Palapluem/toktickit_cpe334/pull/98) | [Confirm the inactive-assignee test and its ID (labsheet Part 6)](https://github.com/Palapluem/toktickit_cpe334/pull/98#pullrequestreview-5407163434) | PENDING | API-03 ("an inactive IT Staff user", "deactivated after the list was fetched") and API-04 in `tests.md` | In progress |

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
