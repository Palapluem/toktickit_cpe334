# TokTickIT — CPE334 Labs 1–2

## Purpose

A full-stack IT service-desk application — **React UI → Express REST API →
Prisma ORM → PostgreSQL**.

**Lab 1** proved the stack works end to end: a `[Check System]` button reporting
backend health and the four IT request categories stored in the database.

**Lab 2** builds the Requester-facing ticketing MVP on that foundation — Create
Ticket, My Tickets, Ticket Detail, and attachments — against the engineering
contract in [`docs/lab-02/`](docs/lab-02/). Start with
[`AGENTS.md`](AGENTS.md), which names each contract document and the order to
read them in.

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL running locally, with a disposable local database available for
  development (`toktickit_dev`) and one for automated tests (`toktickit_test`)

## Installation

```bash
npm install                 # root Playwright runner for Lab 2 E2E
cd server && npm install
cd ../client && npm install
```

## Required Environment Variables

[`.env.example`](.env.example) documents every variable; each package also
has its own `.env.example` to copy from. Never commit the real `.env` files:

```bash
cp server/.env.example server/.env   # DATABASE_URL, PORT
cp client/.env.example client/.env   # VITE_API_BASE_URL
```

## Running the Backend

```bash
cd server
npm run dev      # starts Express on http://localhost:3001 (tsx watch)
npm run build    # type-check + compile to dist/
```

## Running the Frontend

```bash
cd client
npm run dev      # starts Vite on http://localhost:5173
npm run build    # production build
```

## Database / Prisma Setup

Two databases: one for development, one for automated tests. They are separate
on purpose — the test setup rewrites whatever it is pointed at, and that must
never be the database holding demonstration data
(`docs/lab-02/specification.md` §11.16).

```bash
createdb toktickit_dev
createdb toktickit_test

cd server
cp .env.example .env         # DATABASE_URL → toktickit_dev
cp .env.example .env.test    # DATABASE_URL → toktickit_test

npx prisma generate          # generate the Prisma Client
npx prisma migrate deploy    # apply migrations to the development database
npm run db:seed              # reference data — idempotent, safe to repeat
```

`DATABASE_URL` must point at a local, disposable PostgreSQL database. Credentials
are never committed — only `.env.example` is tracked.

The seed loads the reference data every screen depends on: four Categories,
seven Related Systems, and five Development Requesters, one of which is
deliberately inactive so the filtering rules (BR-10, BR-11) can be demonstrated
rather than assumed.

## Test Commands

```bash
cd server && npm test     # migrates + seeds toktickit_test, then runs the suite
cd client && npm test     # Vitest + Testing Library
```

`npm test` on the server prepares the test database first, so the suite is
reproducible from a clean clone rather than depending on a database somebody
prepared by hand. Use `npm run test:only` to skip that step when the test
database is already current.

Server tests live in `server/tests/lab-01/` and `server/tests/lab-02/`; every
test cites the `FR`/`BR`/`AC`/`TC`/`STY` identifier it proves
(`docs/lab-02/testing-contract.md` TCS-01).

## E2E and responsive evidence

Issue #23 runs Playwright against a separate disposable database and starts
its own API/client processes. Create a local database whose name ends in
`_test` (for example `toktickit_e2e_test`), ensure `server/.env.test` contains
the matching local credentials, then run from the repository root:

```bash
npm run test:e2e
```

The runner applies migrations and the idempotent seed automatically. It uses
the non-watch API command `tsx src/server.ts`, Vite's strict port 5174, and
the isolated API port 3002. It writes the nine reproducible viewport captures
to `artifacts/lab-02/screenshots/`. Set `E2E_DATABASE_URL` to override the
`.env.test` value, but never point it at a development database. `DATABASE_URL`
is a PostgreSQL URI, so percent-encode reserved credential characters such as
`@`, `:`, `/`, and `%`.

## Branch and Pull Request Rules

- `main` — stable release branch. Never develop directly on it.
- `lab1-staging` — Lab 1 integration branch. Never develop directly on it.
- Each Issue is implemented on its own branch, created from the latest
  `lab1-staging`: `feature/1-project-foundation`, `feature/2-health-check`,
  `feature/3-category-seed`, `feature/4-category-list`.
- Every feature Pull Request targets `lab1-staging`, links its Issue with
  `Closes #<number>`, and requires real peer review and passing tests before
  merge (merge commit, not squash/rebase).
- After all four feature PRs are merged, one release Pull Request
  (`lab1-staging` → `main`) closes out Lab 1.
