/** Last two digits of the calendar year from an `YYYY-MM-DD` (or leading `YYYY`) string. */
export function eventDateYY(eventIsoDate: string): string {
  const m = /^([0-9]{4})-/.exec(eventIsoDate.trim())
  if (!m) return String(new Date().getFullYear() % 100).padStart(2, '0')
  return String(Number(m[1]) % 100).padStart(2, '0')
}

/**
 * Keeps `CH` + 5-digit core and sets the `-YY` suffix from `event_date`
 * (matches `CH12345` or `CH12345-26`).
 */
export function estimateNumberWithEventYearSuffix(
  currentNumber: string | null | undefined,
  eventDate: string,
): string | null {
  if (!currentNumber?.trim() || !eventDate?.trim()) return null
  const t = currentNumber.trim()
  const m = /^CH([0-9]{5})(?:-[0-9]{2})?$/.exec(t)
  if (!m) return null
  return `CH${m[1]}-${eventDateYY(eventDate)}`
}
