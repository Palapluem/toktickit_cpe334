// Times are stored in UTC and shown in Asia/Bangkok whatever the device's own zone (lab-04 api-spec §1, BR-38).
const BANGKOK = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' })
const BANGKOK_DATE = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' })

export const formatBangkokTime = (value: string): string => BANGKOK.format(new Date(value))

/** The date alone, for a list column; it can differ from the device's own date near midnight. */
export const formatBangkokDate = (value: string): string => BANGKOK_DATE.format(new Date(value))
