# TokTickIT — CPE334 Lab 1

## Purpose

A tiny full-stack vertical slice — **React UI → Express REST API → Prisma ORM → PostgreSQL** —
proving the required technology stack works together end-to-end. The app shows a
`[Check System]` button that reports backend health and the four IT request
categories stored in the database.

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL running locally, with a disposable local database available for
  development (`toktickit_dev`) and one for automated tests (`toktickit_test`)

## Installation

```bash
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

```bash
cd server
npx prisma generate       # generate the Prisma Client
npx prisma migrate dev    # apply migrations (added starting Issue 3)
```

`DATABASE_URL` must point at a local, disposable PostgreSQL database. Credentials
are never committed — only `.env.example` is tracked.

## Test Commands

```bash
cd server && npm test     # Vitest + Supertest — server/tests/lab-01/
cd client && npm test     # Vitest + Testing Library — client/tests/lab-01/
```

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
