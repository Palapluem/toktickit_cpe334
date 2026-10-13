-- Lab 4: Actions Taken, append-only Ticket history, Ticket version.
-- Authority: docs/lab-04/specification.md §7. Additive only: no existing row is rewritten
-- beyond the version default, and nothing is backfilled (BR-21, BR-41).

-- 1. Enums.
CREATE TYPE "ActionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TYPE "TicketEventType" AS ENUM (
    'STATUS_CHANGED',
    'OWNER_CHANGED',
    'IT_PRIORITY_CHANGED',
    'ACTION_CREATED',
    'ACTION_UPDATED',
    'ACTION_ASSIGNED',
    'ACTION_STARTED',
    'ACTION_COMPLETED',
    'ACTION_CANCELLED'
);

-- 2. Ticket: the concurrency counter and the recency index (BR-31).
ALTER TABLE "Ticket" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
CREATE INDEX "Ticket_updatedAt_id_idx" ON "Ticket"("updatedAt" DESC, "id");

-- 3. Actions Taken. Assignee, performer, completer and canceller are four separate
--    references, so none of them is ever inferred from the Ticket Owner (BR-02).
CREATE TABLE "ActionTaken" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "result" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNote" TEXT,
    "attachmentNotes" TEXT,
    "status" "ActionStatus" NOT NULL DEFAULT 'PLANNED',
    "assigneeId" UUID NOT NULL,
    "performedById" UUID NOT NULL,
    "completedById" UUID,
    "cancelledById" UUID,
    "completedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "cancellationReason" TEXT,
    "requestId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ActionTaken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActionTaken_ticketId_requestId_key" ON "ActionTaken"("ticketId", "requestId");
CREATE INDEX "ActionTaken_ticketId_createdAt_id_idx" ON "ActionTaken"("ticketId", "createdAt", "id");
CREATE INDEX "ActionTaken_assigneeId_status_idx" ON "ActionTaken"("assigneeId", "status");

ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_assigneeId_fkey"
  FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_performedById_fkey"
  FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_completedById_fkey"
  FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_cancelledById_fkey"
  FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Ticket history. Rows are written in the same transaction as the change they record (BR-26).
CREATE TABLE "TicketEvent" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "type" "TicketEventType" NOT NULL,
    "actionId" UUID,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TicketEvent_ticketId_createdAt_id_idx" ON "TicketEvent"("ticketId", "createdAt", "id");

ALTER TABLE "TicketEvent" ADD CONSTRAINT "TicketEvent_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketEvent" ADD CONSTRAINT "TicketEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketEvent" ADD CONSTRAINT "TicketEvent_actionId_fkey"
  FOREIGN KEY ("actionId") REFERENCES "ActionTaken"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Append-only is enforced by the database, not only by the absence of an API (BR-27).
--    TRUNCATE is deliberately not blocked, so disposable test databases can be reset.
CREATE FUNCTION "ticket_event_append_only"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'TicketEvent is append-only: % is not allowed.', TG_OP
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "TicketEvent_append_only"
  BEFORE UPDATE OR DELETE ON "TicketEvent"
  FOR EACH ROW EXECUTE FUNCTION "ticket_event_append_only"();
