# L3-12 final verification from `main`

**Run date:** 2026-09-17 (Asia/Bangkok)

**Repository:** `Palapluem/toktickit_cpe334`

**Commit:** `b6f85b93e82b2758aa5f266bf51c522764e4f497`

The release verification was run from a clean checkout of `main` at the exact merge
commit above. Server tests used a new disposable PostgreSQL database ending in `_test`;
the existing shared test database was not used.

| Command | Result |
|---|---|
| `cd server && npm test` | 410 passed (28 files) |
| `cd client && npm test` | 203 passed (24 files) |
| `cd client && npm run build` | Passed |
| `cd client && npm run lint` | Passed with 3 non-failing warnings |
| `cd server && npm run build` | Passed |
| `npm run test:e2e` | 36 passed |
| `git diff --check` | Passed |
| tracked-runtime-file audit | Only `.env.example` files matched; no real `.env`, credentials, uploads, or test output were tracked |

**Combined test result:** 749 passed, 0 failed, 0 skipped.

Non-failing runtime warnings were the existing PostgreSQL client deprecation warning,
the Prisma update notice, and Playwright's colour-environment warning. No test failed.
