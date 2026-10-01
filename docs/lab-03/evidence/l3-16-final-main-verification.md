# Final `main` Verification — PR #87 Release

## Scope and provenance

This record verifies the exact reviewer-merged release commit for
[PR #87](https://github.com/Palapluem/toktickit_cpe334/pull/87):
[`a429f29872e5f8e2535fb0e16acca7016a8bfb92`](https://github.com/Palapluem/toktickit_cpe334/commit/a429f29872e5f8e2535fb0e16acca7016a8bfb92).
N0TAW00D approved the PR and performed the merge. The verification ran locally in the
isolated temporary worktree `/tmp/toktickit-postmerge-main-a429`, checked out at that
exact merge commit after promotion. It did not run in the official course checkout or
the peer's repository.

GitHub reported no hosted status checks for this PR. The results below are therefore
local verification of the exact released commit, not GitHub Actions or CI results.
The previous `main @ da5bf4a` checkpoint in §6.1 and the PR #86 candidate run in §6.2
remain historical records and are not combined with this run.

## Results

| Suite | Command | Result |
|---|---|---|
| Server (unit, API, security, and migration) | `cd server && npm test` | **410 passed** (28 files) |
| Client (UI and style) | `cd client && npm test` | **216 passed** (26 files) |
| Playwright | `npm run test:e2e` | **40 passed**: 6 Lab 2 regression + 34 Lab 3 checks |
| **Executed total** | Three suites | **666 passed · 0 failed · 0 skipped** |
| Server production build | `cd server && npm run build` | **Passed** (`tsc -p tsconfig.json`) |
| Client production build | `cd client && npm run build` | **Passed** (`tsc -b && vite build`) |
| Client lint | `cd client && npm run lint` | **Exit 0; three warnings** |

Lint emitted two React Fast Refresh warnings in `client/src/context/SessionContext.tsx`
and one unused `REQUESTER_B` warning in the Lab 2
`client/tests/lab-02/MyTickets.test.tsx`. No errors were reported. The warnings are
disclosed rather than described as a warning-free lint run.

## Test isolation and interpretation

The server test preparation created and used
`toktickit_postmerge_20260930_a1f3c8_test`. The Playwright run used its separate
disposable database, `toktickit_e2e_postmerge_20260930_b81d7a_test`. Both names end in
`_test`; no development or production database was used. After the test processes
finished, both database names were checked in `pg_stat_activity` and had zero active
sessions, then those exact two disposable databases were dropped. The runner-generated tracked
screenshot modifications were confined to the temporary verification worktree and are
not evidence of a source change. No screenshot from that run was copied into the
repository or report.

`QUEUE-04` and `QUEUE-06` stub the queue endpoint and are fixture-backed UI evidence;
they prove rendered states, not live API behavior. `QUEUE-07` is the live-server
combined-filter check. The distinction is preserved in `tests.md` and the submission.
The 666 total counts executed test cases, not distinct acceptance criteria.

## Raw log locations

The command output was retained outside the repository at:

- `/tmp/toktickit-postmerge-main-a429/server-test.log`
- `/tmp/toktickit-postmerge-main-a429/client-test.log`
- `/tmp/toktickit-postmerge-main-a429/e2e-test.log`
- `/tmp/toktickit-postmerge-main-a429/server-build.log`
- `/tmp/toktickit-postmerge-main-a429/client-build.log`
- `/tmp/toktickit-postmerge-main-a429/client-lint.log`

The temporary logs are local audit artifacts, not submitted repository files. No
credentials, connection strings, or private account data are included in this record.
