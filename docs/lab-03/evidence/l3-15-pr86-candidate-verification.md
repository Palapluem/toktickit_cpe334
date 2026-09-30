# PR #86 — Historical Candidate Verification Record

> Historical scope: this file records the integrated staging candidate as verified on
> 2026-09-29, before reviewer-approved PR #87 promoted it to `main`. The later exact-main
> results are in [`l3-16-final-main-verification.md`](l3-16-final-main-verification.md).

## Scope and status

This record covers the review-remediation candidate in
[`PR #86`](https://github.com/Palapluem/toktickit_cpe334/pull/86), branch
`feature/85-lab3-audit-remediation`. N0TAW00D requested changes on head `d620ff8`;
the follow-up was approved on `fd89126` and merged by the reviewer into `lab3-staging`
at `0e86f05`. Issue #85 is linked and was closed after the staging merge; its Project
card was moved to Done. These results remain candidate verification: they do not replace
the released-main result recorded for `da5bf4a`, and they do not establish release to
`main`.

At the time of this candidate verification, a separate release promotion had not yet
occurred. PR #87 later promoted the candidate to `main`; this file remains the record of
the earlier candidate run and is not a substitute for the exact-main verification.

## Test results

| Suite | Command | Result |
|---|---|---|
| Server: unit, API, security, migration | `cd server && npm test` | **410 passed** across 28 files |
| Client: UI and style | `cd client && npm test` | **216 passed** across 26 files |
| Playwright | `npm run test:e2e` | **40 passed**: 6 Lab 2 regression and 34 Lab 3 checks; two queue checks are fixture-backed UI evidence |
| **Executed total** | All three suites | **666 passed · 0 failed · 0 skipped** |

The total is a count of executed test cases, not a count of distinct acceptance
criteria; unit, API, UI, and E2E tests can exercise related behavior at different
layers.

## Build, lint, and isolation

- `cd server && npm run build` — passed.
- `cd client && npm run build` — passed.
- `cd client && npm run lint` — exited successfully with three warnings: two React
  Fast Refresh warnings in `SessionContext.tsx` and one unused `REQUESTER_B` fixture
  in the Lab 2 `MyTickets.test.tsx` suite.
- The E2E runs used newly created disposable PostgreSQL databases whose names ended in
  `_test`; migrations and seed completed, and the E2E and server-test databases were
  dropped after the runs. No development database was used.
- `QUEUE-04` and `QUEUE-06` stub the entire queue endpoint and are explicitly
  fixture-backed browser UI evidence, not proof of server-side queue behavior.
  `QUEUE-07` restores the prior combined-filter check against the real server and
  verifies each individual filter has a positive result before asserting the empty
  intersection.
- `git diff --check` passed for the review-remediation changes. The client style
  contract is included in the 216-test client run; it also passed when invoked from
  the repository root and from `client/`.
- GitHub reported no hosted status checks for PR #86 at the time of this verification;
  the results above are author-reported local runs, not CI results. The reviewer
  approved the follow-up but did not rerun these suites.

## Evidence note

The full E2E run refreshed screenshot files as a side effect. PR #86 added or refreshed
15 selected PNGs; they are now present on `lab3-staging`. All 15 were visually reviewed
after the merge: the images show synthetic account/ticket data, with no visible
credentials or mouse/Codex pointer. The combined-filter capture shows the live
`CANCELLED` and “Assigned to me” filters and their empty intersection. These remain
staging evidence, not final released-main evidence. Other generated screenshots are not
automatically treated as report evidence. Only the captures explicitly listed in
`tests.md` and `submission.md` should be carried into the final report after release and
verification of `main`.

## Integrated release-candidate verification — 2026-09-29

After PR #86 merged, the release candidate was assembled in an isolated temporary clone
from current `main` at `d198064` plus reviewer-merged `lab3-staging` at `0e86f05`.
Git reported six screenshot conflicts and three documentation conflicts; the candidate
uses the PR #86 screenshot versions and reconciles the text with the verified PR #84,
PR #86, Issue #85, and peer-review states. No conflict markers remain. At the time this
candidate verification was recorded on 2026-09-29, it had not yet been merged into
`main`; reviewer-approved PR #87 later completed that promotion.

The following suites were independently rerun against that integrated candidate:

| Suite | Command | Result |
|---|---|---|
| Server | `cd server && npm test` | **410 passed** (28 files) |
| Client | `cd client && npm test` | **216 passed** (26 files) |
| Playwright | `npm run test:e2e` | **40 passed** (6 Lab 2 regression + 34 Lab 3) |
| **Total** | Three suites | **666 passed · 0 failed · 0 skipped** |
| Server and client production builds | `npm run build` in each package | Passed |
| Client lint | `cd client && npm run lint` | Passed with three warnings noted above |

Both fixture-backed queue checks remain explicitly labelled as UI evidence; they do not
prove live API responses. The tests used two newly created, uniquely named disposable
databases ending in `_test`; both were confirmed absent before creation, used only for
this run, and dropped after verification. The E2E run refreshed screenshot files as a
side effect; tracked captures were restored to the reviewed staging versions afterward.
No development database, official checkout, GitHub status check, or `main`-branch test
result is implied by this candidate run. The later reviewer-led release and exact-main
verification are recorded separately in `l3-16-final-main-verification.md`.
