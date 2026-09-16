-- Lab 3: roles, credentials, sessions, comments, notes.
-- Authority: docs/lab-03/specification.md §7.
--
-- RequesterUser is RENAMED, never dropped and recreated (§11.4). Every Ticket
-- and Attachment references it; a recreate would orphan the Lab 2 increment.

-- 1. Rename the table and the objects Prisma names after it.
ALTER TABLE "RequesterUser" RENAME TO "User";
ALTER INDEX "RequesterUser_pkey" RENAME TO "User_pkey";
ALTER INDEX "RequesterUser_email_key" RENAME TO "User_email_key";

-- 2. Status values. Lab 2 declared seven of which only NEW was ever reachable,
--    so renaming in place cannot mis-label an existing row.
ALTER TYPE "TicketStatus" RENAME VALUE 'ASSIGNED' TO 'OPEN';
ALTER TYPE "TicketStatus" RENAME VALUE 'PENDING_REQUESTER' TO 'WAITING_FOR_REQUESTER';
ALTER TYPE "TicketStatus" ADD VALUE 'REOPENED' BEFORE 'CANCELLED';

-- 3. Roles (BR-11, BR-34).
CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');

-- 4. Credentials and role. passwordHash arrives nullable, is backfilled, then
--    becomes mandatory — the three steps that make a non-null column safe to add.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'REQUESTER';
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;

-- The bcrypt hash of the documented local-lab-only development password
-- (server/src/seed/roster.ts, SEC-033). Every row it touches also carries
-- mustChangePassword, so it opens exactly one screen (BR-06, BR-41).
UPDATE "User"
SET "passwordHash" = '$2b$10$XAlNRX3tdboj.xxG4od//OEChFAbFh46mGvT9x25YHWQbsbkytHjy',
    "mustChangePassword" = true
WHERE "passwordHash" IS NULL;

ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;

CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- 5. Ticket: the owner key Lab 2 modelled but never constrained, and the
--    Requester's resolution signal (§11.7).
ALTER TABLE "Ticket" ADD COLUMN "requesterResolvedAt" TIMESTAMPTZ(3);

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Ticket_status_itPriority_createdAt_idx"
  ON "Ticket"("status", "itPriority", "createdAt" DESC);
CREATE INDEX "Ticket_ownerId_idx" ON "Ticket"("ownerId");

-- 6. Sessions. The primary key is the opaque token itself (api-spec.md §1).
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Append-only threads (BR-29). Separated by table rather than by a flag,
--    so a visibility mistake cannot be a one-character bug.
CREATE TABLE "PublicComment" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InternalNote" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicComment_ticketId_createdAt_idx" ON "PublicComment"("ticketId", "createdAt");
CREATE INDEX "InternalNote_ticketId_createdAt_idx" ON "InternalNote"("ticketId", "createdAt");

ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
