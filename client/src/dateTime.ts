// A neutral stand-in, replaced in the next commit: it formats in the device's own zone, which UI-19 refuses.
export const formatBangkokTime = (value: string): string =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
