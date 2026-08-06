# Lab 1 Test Evidence

## Environment

- Branch: `main` (final released state — release PR #12 merged `lab1-staging` into `main`)
- Commit: `d3d2725`
- Node version: v25.0.0
- npm version: 11.6.2
- PostgreSQL environment: two dedicated local databases on the same PostgreSQL 18 instance — `toktickit_dev` for manual/dev use, `toktickit_test` for automated Supertest runs (loaded via `server/.env.test`)
- Date executed: 2026-08-05 (re-confirmed against `main` on 2026-08-06 — code is byte-identical to the `lab1-staging` commit these results were originally captured from)

## Test Catalog

| ID | Test file | Tool | Description | Requirement | Result |
|---|---|---|---|---|---|
| API-01 | `server/tests/lab-01/health.test.ts` | Supertest | `GET /api/health` returns 200 and `{ status: "ok", service: "TokTickIT API" }` | Issue 2 | PASS |
| API-02 | `server/tests/lab-01/categories.test.ts` | Supertest | `GET /api/categories` returns the four seeded categories via the real Prisma/PostgreSQL path, ascending `id` order | Issue 4 | PASS |
| UI-01 | `client/tests/lab-01/App.test.tsx` | Vitest | "TokTickIT IT Service Desk" heading renders | Issue 2 | PASS |
| UI-02 | `client/tests/lab-01/App.test.tsx` | Vitest | Clicking Check System shows a loading state, then the category list, after successful mocked API responses | Issue 4 | PASS |
| UI-03 | `client/tests/lab-01/App.test.tsx` | Vitest | API failure shows "Unable to connect to TokTickIT API" — covers a basic health failure, console diagnostic logging (not swallowed), an error-detail fragment shown in the UI, and categories failing even though health succeeded | Issue 2 / Issue 4 | PASS |

## Commands and Output

```text
$ cd server && npm test

 RUN  v4.1.10 .../server
 Test Files  2 passed (2)
      Tests  2 passed (2)

$ cd server && npm run build
> tsc -p tsconfig.json
(no errors)

$ cd client && npm test

 RUN  v4.1.10 .../client
 Test Files  1 passed (1)
      Tests  6 passed (6)

$ cd client && npm run build
> tsc -b && vite build
✓ built in 339ms
```

Real (non-mocked) end-to-end confirmation, run against the seeded `toktickit_dev` database with the server actually listening:

```text
$ curl http://localhost:3001/api/health
{"status":"ok","service":"TokTickIT API"}

$ curl http://localhost:3001/api/categories
[{"id":1,"name":"Account and Access"},{"id":2,"name":"Hardware"},{"id":3,"name":"Software"},{"id":4,"name":"Network"}]
```

Idempotent seed, run twice back-to-back against `toktickit_dev` (identical `id`/`createdAt` on both runs), cross-checked independently via `psql` (not through Prisma):

```text
$ psql -c "SELECT COUNT(*), COUNT(DISTINCT name) FROM \"Category\";"
 count | count
-------+-------
     4 |     4
```

## Manual Demo Checks

- Initial state: verified — `TokTickIT IT Service Desk` heading and `[Check System]` button render on `npm run dev`.
- Loading state: verified via UI-02 (deterministic assertion using a manually-gated promise) and via the real dev server (button shows "Checking…" while the request is in flight).
- Success state: verified end-to-end against the real server + seeded database (see curl output above) — `System Status: Online` plus all four categories in the required order.
- Failure state: verified via UI-03 (mocked network rejection) and manually during Issue 2 by stopping the real server and confirming the browser-equivalent fetch fails with `Unable to connect to TokTickIT API`.
- Browser Network-tab screenshot: captured — `System Status: Online` alongside DevTools Network tab showing `/api/health` and `/api/categories` both returning 200 (Part 4 App Demo evidence, see submission PDF).
