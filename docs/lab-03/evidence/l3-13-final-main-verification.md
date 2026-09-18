# Lab 3 final `main` verification — 19 September 2026

This record is the post-merge verification for the release that GitHub identifies as
`6842e3502fc2b79cc754555e26d9dc9483d0e20a`.

## Release identity

| Item | Verified value |
|---|---|
| Repository | `Palapluem/toktickit_cpe334` |
| Branch | `main` |
| Commit | `6842e3502fc2b79cc754555e26d9dc9483d0e20a` |
| Parent commits | `5360834994fe22483fa7768bd0b3e7d3d67117c8`, `de86bfa622d5b31833cfecfecb54e0a6be9fa9f0` |
| Release PR | [#76](https://github.com/Palapluem/toktickit_cpe334/pull/76) |
| Release reviewer and merger | `N0TAW00D` |
| Release review | `APPROVED` — `lgtm` |
| Verification date | 19 September 2026, Asia/Bangkok |

PR #76 was approved and merged by the peer. The checkout used for this verification
was created directly from `origin/main` at the commit above, not from the author's
dirty feature checkout.

## Server

The clean checkout generated the local Prisma client, created a new disposable
PostgreSQL database with a name ending in `_test`, applied all three migrations, and
seeded it before running the suite. No existing development or previously contaminated
test database was reset or deleted.

| Command / phase | Result |
|---|---|
| `npx prisma generate` | Passed — Prisma Client 7.9.1 generated |
| `npx prisma migrate deploy` | Passed — all 3 migrations applied |
| `npx tsx prisma/seed.ts` | Passed — 4 categories, 7 related systems, 10 users, 10 tickets, 9 public comments, 5 internal notes |
| `npx vitest run` | **28 files passed; 410 tests passed; 0 failed** |
| `npm run build` | Passed — TypeScript build |

The server suite emitted a non-failing PostgreSQL adapter deprecation warning about a
query issued while another query was executing. It did not change the result: all 410
tests passed.

## Client

| Command | Result |
|---|---|
| `npm test` | **24 files passed; 203 tests passed; 0 failed** |
| `npm run build` | Passed — TypeScript and Vite production build |
| `npm run lint` | Passed with 3 non-blocking warnings |

The lint warnings are the two existing `react(only-export-components)` warnings in
`src/context/SessionContext.tsx` and the unused `REQUESTER_B` fixture in
`tests/lab-02/MyTickets.test.tsx`. Lint exited successfully.

## E2E and responsive

The run used a separate fresh disposable E2E database, the repository's one-worker
Playwright configuration, and the repository-managed API and Vite processes.

| Command | Result |
|---|---|
| `npm run test:e2e` | **36 passed; 0 failed** |

The 36 tests include Lab 2 attachment, requester-isolation, requester journey, and
responsive checks, plus Lab 3 authentication, comments/notes, staff queue/detail,
responsive, and administrator journeys. The run also regenerated local screenshot
files; those runtime outputs were restored in the verification checkout and were not
included accidentally in the documentation change.

## Repository hygiene checks

| Check | Result |
|---|---|
| `git diff --check` | Passed |
| Final release commit contains `.env`, credentials, `node_modules`, or build output | None tracked |
| Test-runner change in PR #75 | `server/vitest.config.ts` serializes database-backed files with one worker |
| Final release tree | Clean before documentation edits |

The exact suite counts are repeated in `docs/lab-03/tests.md` §6 and in the submission
report's Answer Part 3. This evidence file intentionally records the final release
state separately from the historical `l3-12-final-main-verification.md` record.
