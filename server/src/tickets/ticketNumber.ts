// Ticket Number formatting. BR-04, §11.6, §11.13.
// Allocation (BR-05) lives in the ticket service — Issue #20.

/** Six sequence digits (§11.6). */
export const MAX_TICKET_SEQUENCE = 999_999

const SEQUENCE_WIDTH = 6

/** Asia/Bangkok is a fixed UTC+7 with no daylight saving. */
const BANGKOK_OFFSET_MINUTES = 7 * 60

/** Calendar year in Bangkok time. Storage stays UTC; only the label uses this (§11.13). */
export function bangkokYear(instant: Date): number {
  const shifted = new Date(instant.getTime() + BANGKOK_OFFSET_MINUTES * 60_000)
  return shifted.getUTCFullYear()
}

/** `TKT-YYYY-NNNNNN` (BR-04). Throws rather than emit a number that no longer aligns. */
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
