/**
 * UNIT-01 and UNIT-02 — Ticket Number formatting and the annual reset.
 *
 * Proves: BR-04, AC-14, and the calendar decision in `specification.md` §11.13.
 *
 * Test design techniques (`testing-contract.md` §2):
 *   TDT-02 boundary-value analysis — the sequence is padded at 1, at 999999, and
 *          past the width; the year boundary is tested on both of its sides.
 *   TDT-04 state transition — the annual reset is the one transition this
 *          allocator makes, so the last number of one year and the first of the
 *          next are asserted as a pair.
 *
 * These are pure functions taking an explicit instant. Nothing here reads the
 * system clock: a test that waits for a real 31 December proves nothing today,
 * and a test that mocks `Date` globally leaks into every other suite.
 */
import { describe, expect, it } from 'vitest'
import {
  bangkokYear,
  formatTicketNumber,
  MAX_TICKET_SEQUENCE,
} from '../../src/tickets/ticketNumber.js'

describe('UNIT-01 · BR-04, AC-14 · Ticket Number formatting', () => {
  it('pads the sequence to six digits', () => {
    expect(formatTicketNumber(2026, 1)).toBe('TKT-2026-000001')
  })

  it('pads consistently across every width up to the maximum', () => {
    expect(formatTicketNumber(2026, 42)).toBe('TKT-2026-000042')
    expect(formatTicketNumber(2026, 1234)).toBe('TKT-2026-001234')
    expect(formatTicketNumber(2026, 999_999)).toBe('TKT-2026-999999')
  })

  /**
   * The labsheet's reference screen shows `TKT-2025-001234`. The System-Level
   * SDS writes five digits. Six is the recorded decision (§11.6), and this is
   * the assertion that keeps it.
   */
  it('uses six sequence digits, not the five the SDS wrote', () => {
    expect(formatTicketNumber(2025, 1234)).toBe('TKT-2025-001234')
    expect(formatTicketNumber(2025, 1234)).not.toBe('TKT-2025-01234')
  })

  it('rejects a sequence that would overflow the six-digit width', () => {
    expect(() => formatTicketNumber(2026, MAX_TICKET_SEQUENCE + 1)).toThrow(
      /sequence/i,
    )
  })

  it('rejects a sequence below the first valid value', () => {
    expect(() => formatTicketNumber(2026, 0)).toThrow(/sequence/i)
  })
})

describe('UNIT-02 · BR-04 · annual sequence reset', () => {
  it('restarts at 000001 in a new year', () => {
    expect(formatTicketNumber(2026, 999_999)).toBe('TKT-2026-999999')
    expect(formatTicketNumber(2027, 1)).toBe('TKT-2027-000001')
  })

  it('carries the year into the label, so two years never collide', () => {
    expect(formatTicketNumber(2026, 7)).not.toBe(formatTicketNumber(2027, 7))
  })
})

/**
 * §11.13. The stored instant is UTC; the year inside a Ticket Number follows the
 * Bangkok calendar, because it is a label a person reads beside a date rendered
 * in local time. The two disagree for seven hours each year, and this is that
 * window.
 *
 * Asia/Bangkok is a fixed UTC+7 offset with no daylight saving, so the boundary
 * is exactly 17:00 UTC on 31 December.
 */
describe('UNIT-02 · §11.13 · the year follows the Asia/Bangkok calendar', () => {
  it('is still the old year one minute before the Bangkok boundary', () => {
    // 31 Dec 2026 16:59 UTC = 31 Dec 2026 23:59 Bangkok
    expect(bangkokYear(new Date('2026-12-31T16:59:00.000Z'))).toBe(2026)
  })

  it('becomes the new year exactly at the Bangkok boundary', () => {
    // 31 Dec 2026 17:00 UTC = 1 Jan 2027 00:00 Bangkok
    expect(bangkokYear(new Date('2026-12-31T17:00:00.000Z'))).toBe(2027)
  })

  /**
   * The failure this guards against: deriving the year from UTC would label a
   * Ticket created at 03:00 Bangkok on 1 January with the previous year, and
   * print it beside a Ticket Date showing 1 January. Two fields on one screen
   * contradicting each other.
   */
  it('does not fall back to the UTC year inside the seven-hour window', () => {
    const instant = new Date('2026-12-31T20:00:00.000Z') // 1 Jan 2027, 03:00 Bangkok
    expect(instant.getUTCFullYear()).toBe(2026)
    expect(bangkokYear(instant)).toBe(2027)
  })

  it('agrees with UTC everywhere outside that window', () => {
    for (const iso of [
      '2026-01-01T00:00:00.000Z',
      '2026-06-15T12:00:00.000Z',
      '2026-12-31T00:00:00.000Z',
    ]) {
      const instant = new Date(iso)
      expect(bangkokYear(instant)).toBe(instant.getUTCFullYear())
    }
  })
})
