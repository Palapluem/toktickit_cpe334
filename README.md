# TokTickIT — CPE334 Labs 1–3

## Purpose

A full-stack IT service-desk application — **React UI → Express REST API →
Prisma ORM → PostgreSQL**.

**Lab 1** proved the stack works end to end: a `[Check System]` button reporting
backend health and the four IT request categories stored in the database.

**Lab 2** builds the Requester-facing ticketing MVP on that foundation — Create
Ticket, My Tickets, Ticket Detail, and attachments — against the engineering
contract in [`docs/lab-02/`](docs/lab-02/).

**Lab 3** replaces the Development Requester selector with real authentication
and server-enforced authorization, then adds the IT Staff and Administrator
workflows, against [`docs/lab-03/`](docs/lab-03/):

- **Sign in, sign out, forced first-login password change.** Identity comes from
  a session cookie; the client can no longer assert who it is.
- **Three roles** — Requester, IT Staff, Administrator — enforced on the server
  by the authorization matrix in
  [`specification.md` §8.1](docs/lab-03/specification.md). A hidden button is
  feedback, never the control.
- **IT Staff Ticket Queue and Ticket Detail** — ownership, IT Priority, and only
  the status transitions §5.1 permits.
- **Public Comments and Internal Notes** — two tables and two components, so a
  private note cannot be posted publicly by mistake.
- **Administrator User Management** — create, edit, activate/deactivate, set a
  new initial password, with the two safety rules that stop the system locking
  everyone out.

Start with [`AGENTS.md`](AGENTS.md), which names each contract document and the
order to read them in.

## Signing in

The seed creates accounts for every role, all sharing one local-only password
provided through `LAB3_SEED_PASSWORD`. Set it in the ignored `server/.env` and
`server/.env.test`; never put the value in source, documentation, or screenshots.

| Role | Seeded account |
|---|---|
| Requester | `jennifer.anderson@example.ac.th` |
| IT Staff | `patricia.evans@example.ac.th` |
| Administrator | `margaret.hale@example.ac.th` |

One seeded account (`david.lee@example.ac.th`) is deliberately left behind the
must-change-password gate so that screen can be exercised without creating a
user first.

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

Lab 3 uses the local-only seed variable and adds two session variables, all documented in
[`.env.example`](.env.example):

| Variable | Purpose |
|---|---|
| `LAB3_SEED_PASSWORD` | Password used only to seed local/test accounts. Set the value in ignored env files; the seed refuses missing or too-short values. |
| `SESSION_COOKIE_SECURE` | `false` locally. A `Secure` cookie is never sent over plain HTTP, so setting it on a local server silently loses every session. |
| `CLIENT_ORIGIN` | The origin allowed to send the session cookie. Unset means "reflect the request's origin", which is what the split-port local setup needs — the server refuses to boot without it when `NODE_ENV=production`. |

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
cp .env.example .env         # set DATABASE_URL → toktickit_dev and LAB3_SEED_PASSWORD
cp .env.example .env.test    # set DATABASE_URL → toktickit_test and the same LAB3_SEED_PASSWORD

npx prisma generate          # generate the Prisma Client
npx prisma migrate deploy    # apply migrations to the development database
npm run db:seed              # reference data — idempotent, safe to repeat
```

`DATABASE_URL` must point at a local, disposable PostgreSQL database. The seed
password is required in the ignored env files and credentials are never
committed — only `.env.example` is tracked.

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

Server tests live in `server/tests/lab-01/`, `lab-02/` and `lab-03/`; client
tests under `client/tests/`. Every test cites the
`FR`/`BR`/`AC`/`TC`/`STY`/`SEC-T` identifier it proves
(`docs/lab-02/testing-contract.md` TCS-01).

Lab 3's authorization tests call the API **directly with the wrong role**,
never through the UI — a test that drives the interface proves the button is
hidden, not that the boundary holds. Before requesting review on anything
touching auth, roles or user data, run the audit in
`docs/lab-02/testing-contract.md` §7.

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
the isolated API port 3002. Lab 2's captures go to
`artifacts/lab-02/screenshots/` and Lab 3's to `artifacts/lab-03/screenshots/`
through a separate helper, so a Lab 3 run cannot overwrite submitted Lab 2
evidence. Set `E2E_DATABASE_URL` to override the
`.env.test` value, but never point it at a development database. `DATABASE_URL`
is a PostgreSQL URI, so percent-encode reserved credential characters such as
`@`, `:`, `/`, and `%`.

## Branch and Pull Request Rules

- `main` — stable release branch. Never develop directly on it.
- `lab2-staging`, `lab3-staging` — per-sprint integration branches. Never
  develop directly on them.
- Each Issue is implemented on its own branch from the latest staging branch,
  including follow-up branches when peer review finds a release-candidate gap.
- Every feature Pull Request targets the sprint's staging branch, links its
  Issue through the Development panel, and requires peer review and passing
  tests before the reviewer merges it (merge commit, not squash/rebase).
- After all of a sprint's PRs are merged, Issues are closed and cards moved to
  Done, one release Pull Request promotes the staging branch to `main`.

**Stacked branches.** Where one Issue's branch is cut from the previous one
rather than from staging, either delete each branch on merge so GitHub
retargets the next Pull Request, or merge in **descending** order. Merging a
stack in ascending order without deleting branches lands each PR in its
already-merged parent, and nothing reaches staging — see
`docs/lab-03/reviewer.md` §1.1.
