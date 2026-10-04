// Times are stored in UTC and shown in Asia/Bangkok whatever the device's own zone (lab-04 api-spec §1, BR-38).
const BANGKOK = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' })

export const formatBangkokTime = (value: string): string => BANGKOK.format(new Date(value))
