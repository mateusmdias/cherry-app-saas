/**
 * Business rule (PRD): no edits when the event is within 10 calendar days (today → event).
 * Past events are not frozen (record corrections allowed).
 */
export function daysFromTodayToEventDate(eventDateIso: string): number {
  const t = eventDateIso.trim()
  if (!t) return Number.NaN
  const parts = t.split('-').map((x) => Number.parseInt(x, 10))
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return Number.NaN
  const [y, m, d] = parts as [number, number, number]
  const ev = new Date(y, m - 1, d)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((ev.getTime() - today.getTime()) / 86_400_000)
}

export function isEstimateEditFrozenByTenDayRule(eventDateIso: string): boolean {
  const days = daysFromTodayToEventDate(eventDateIso)
  if (Number.isNaN(days)) return false
  return days >= 0 && days <= 10
}

export const ESTIMATE_TEN_DAY_FREEZE_MESSAGE =
  'This quote’s event is within 10 days of today. Product lines, pricing, fulfillment, and most fields are locked. You can still change the event date to postpone — then save.'
