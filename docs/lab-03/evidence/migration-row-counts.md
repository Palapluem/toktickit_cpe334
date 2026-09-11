# L3-2 migration evidence — row counts

Issue #45. The question this answers: **did the Lab 2 increment survive?**

Captured with `node scripts/row-counts.mjs .env` from `server/`, against the
development database that holds the Lab 2 data (7 Tickets, 4 Attachments,
5 requesters created through the running application).

## Before — Lab 2 schema

```
database: toktickit_dev
  Attachment             4
  Category               4
  RelatedSystem          7
  RequesterUser          5
  Ticket                 7
  TicketNumberSequence   1
  _prisma_migrations     2
```

## After `prisma migrate deploy`, before the seed

```
database: toktickit_dev
  Attachment             4
  Category               4
  InternalNote           0
  PublicComment          0
  RelatedSystem          7
  Session                0
  Ticket                 7
  TicketNumberSequence   1
  User                   5
  _prisma_migrations     3
```

**`RequesterUser` 5 → `User` 5. `Ticket` 7 → 7. `Attachment` 4 → 4.**
Nothing was recreated, so nothing was lost — the table was renamed (§11.4) and
every foreign key travelled with it. `MIG-02` asserts the same property as a
test, by scanning the columns directly for orphans and checking the four
foreign keys still exist.

## After the seed

```
database: toktickit_dev
  Attachment             4
  Category               4
  InternalNote           5
  PublicComment          9
  RelatedSystem          7
  Session                0
  Ticket                17
  TicketNumberSequence   1
  User                  10
  _prisma_migrations     3
```

`Ticket` 7 → 17 is the ten demo Tickets, which occupy the reserved `TKT-YYYY-9xxxxx`
band and so cannot collide with a runtime allocation. `User` 5 → 10 is the five
migrated Lab 2 requesters plus four IT Staff and one Administrator.

## Idempotency

The seed was run three times in succession. Every count above is the count after
each run:

```
Seeded 4 categories, 7 related systems, 10 users (1 active administrator), 17 tickets, 9 public comments, 5 internal notes.
Seeded 4 categories, 7 related systems, 10 users (1 active administrator), 17 tickets, 9 public comments, 5 internal notes.
Seeded 4 categories, 7 related systems, 10 users (1 active administrator), 17 tickets, 9 public comments, 5 internal notes.
```

`SEED-07` asserts this in the suite rather than by eye: it seeds, counts, seeds
again, counts again, and compares the two.

## Development credentials

The seeded password is defined once, in `server/src/seed/roster.ts`, and is
local-lab-only (SEC-033). It is not repeated here — one place means one place.
Every migrated and seeded account carries `mustChangePassword`, so it opens
exactly one screen (BR-06, BR-41), which `MIG-03` asserts.
