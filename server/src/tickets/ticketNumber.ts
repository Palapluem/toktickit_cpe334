/**
 * Ticket Number formatting and the calendar the year comes from.
 *
 * Authority: `docs/lab-02/specification.md` BR-04, §11.6, §11.13.
 *
 * Deliberately pure. Allocation — locking the sequence row and incrementing it
 * inside the ticket-creation transaction (BR-05) — belongs to the ticket service
 * in Issue #17. Formatting and the calendar boundary are separated from it so
 * they can be tested without a database, which is what makes the New Year
 * boundary testable at all: the alternative is waiting for 31 December.
 */

/** Six sequence digits (§11.6), so the highest number a year can carry. */
export const MAX_TICKET_SEQUENCE = 999_999

const SEQUENCE_WIDTH = 6

/**
 * Asia/Bangkok is UTC+7 with no daylight saving, so the offset is a constant and
 * the conversion needs no timezone database at runtime.
 */
const BANGKOK_OFFSET_MINUTES = 7 * 60

/**
 * The calendar year of an instant in Bangkok local time.
 *
 * Timestamps are stored in UTC (§7) and this does not change that. It exists
 * because the year *inside a Ticket Number* is a label a person reads beside a
 * date rendered in their own timezone: deriving it from UTC would print
 * `TKT-2026-…` next to a Ticket Date of 1 January 2027, for the seven hours each
 * year when the two calendars disagree (§11.13).
 */
export function bangkokYear(instant: Date): number {
  const shifted = new Date(instant.getTime() + BANGKOK_OFFSET_MINUTES * 60_000)
  return shifted.getUTCFullYear()
}

/**
 * `TKT-YYYY-NNNNNN` (BR-04).
 *
 * The bounds are checked rather than assumed. A sequence past the six-digit
 * width would silently produce a longer, still-plausible number that no longer
 * sorts or aligns with the rest — failing loudly is the cheaper outcome, and it
 * is a condition the caller can only reach by exhausting a year.
 */
export function formatTicketNumber(year: number, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RangeError(
      `Ticket sequence must be a positive integer; received ${sequence}.`,
    )
  }
  if (sequence > MAX_TICKET_SEQUENCE) {
    throw new RangeError(
      `Ticket sequence ${sequence} exceeds the ${SEQUENCE_WIDTH}-digit width; ` +
        `the maximum is ${MAX_TICKET_SEQUENCE}.`,
    )
  }
  if (!Number.isInteger(year) || year < 1) {
    throw new RangeError(`Ticket year must be a positive integer; received ${year}.`)
  }

  return `TKT-${year}-${String(sequence).padStart(SEQUENCE_WIDTH, '0')}`
}
