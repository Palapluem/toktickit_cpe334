# PR #86 — Candidate Verification Record

## Scope and status

This record covers the audit-remediation candidate in
[`PR #86`](https://github.com/Palapluem/toktickit_cpe334/pull/86), branch
`feature/85-lab3-audit-remediation`, at code commit
`27101377e7d7c35661a2c66e2d3e976dc83c25ba` (`2710137`). The pull request targets
`lab3-staging` and remains subject to peer review. These results are candidate-branch
verification; they do not replace the released-main result recorded for
`da5bf4a`, and they do not establish that the candidate has been released.

The report, merge ledger, graph, and commit-history captures must be refreshed only
after the reviewer-led staging merge, the required release promotion, and verification
of the resulting `main` commit.

## Test results

| Suite | Command | Result |
|---|---|---|
| Server: unit, API, security, migration | `cd server && npm test` | **410 passed** across 28 files |
| Client: UI and style | `cd client && npm test` | **215 passed** across 26 files |
| Playwright E2E | `npm run test:e2e` | **39 passed**: 6 Lab 2 regression journeys and 33 Lab 3 journeys |
| **Executed total** | All three suites | **664 passed · 0 failed · 0 skipped** |

The total is a count of executed test cases, not a count of distinct acceptance
criteria; unit, API, UI, and E2E tests can exercise related behavior at different
layers.

## Build, lint, and isolation

- `cd server && npm run build` — passed.
- `cd client && npm run build` — passed.
- `cd client && npm run lint` — exited successfully with three warnings: two React
  Fast Refresh warnings in `SessionContext.tsx` and one unused `REQUESTER_B` fixture
  in the Lab 2 `MyTickets.test.tsx` suite.
- The E2E run used a newly created disposable PostgreSQL database whose name ended in
  `_test`; migrations and seed completed, and the database was dropped after the run.
  No development database was used. The server-test and targeted-auth audit databases
  were also removed after their runs.
- `git diff --check` passed for the candidate documentation changes. The client style
  contract is included in the 215-test client run.
- GitHub reported no hosted status checks for PR #86 at the time of this verification;
  the results above are local runs, not CI results.

## Evidence note

The full E2E run refreshed screenshot files as a side effect. Screenshots containing
run-generated user names or other transient test data are not automatically treated as
final report evidence. Only the audit-follow-up captures explicitly listed in
`tests.md` and `submission.md` should be carried into the final report, after visual
inspection and after the product fixes reach verified `main`.
