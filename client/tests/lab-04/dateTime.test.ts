// UI-19 · lab-04 api-spec §1, BR-38 — times are stored in UTC and shown in Asia/Bangkok, whatever zone the device is in.
import { afterEach, describe, expect, it } from 'vitest'
import { formatBangkokTime } from '../../src/dateTime.js'

const deviceZone = process.env.TZ
afterEach(() => {
  if (deviceZone === undefined) delete process.env.TZ
  else process.env.TZ = deviceZone
})

describe.each(['UTC', 'America/Los_Angeles', 'Asia/Bangkok', 'Pacific/Kiritimati'])('UI-19 · a device set to %s', (zone) => {
  it('shows 03:12 UTC as 10:12 on the same day in Bangkok', () => {
    process.env.TZ = zone
    expect(formatBangkokTime('2026-10-04T03:12:09.000Z')).toBe('4 Oct 2026, 10:12')
  })

  it('moves to the next date exactly at Bangkok midnight (17:00 UTC)', () => {
    process.env.TZ = zone
    expect(formatBangkokTime('2026-10-04T16:59:59.000Z')).toBe('4 Oct 2026, 23:59')
    expect(formatBangkokTime('2026-10-04T17:00:00.000Z')).toBe('5 Oct 2026, 00:00')
    expect(formatBangkokTime('2026-10-04T18:30:00.000Z')).toBe('5 Oct 2026, 01:30')
  })
})
