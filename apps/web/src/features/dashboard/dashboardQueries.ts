import { supabase } from '@/lib/supabase'

/** Supabase / PostgREST / auth errors are not always plain `Error` with a useful `message`. */
function formatUnknownError(err: unknown): string {
  if (err == null) return 'Unknown error'
  if (typeof err === 'string') return err.trim() || 'Unknown error'
  if (typeof err === 'number' || typeof err === 'boolean') return String(err)

  if (err instanceof Error) {
    const m = err.message?.trim()
    if (m) return m
    // PostgrestError extends Error; `message` can be empty while details/code are set.
    const x = err as Error & { details?: string; hint?: string; code?: string }
    const fromPg = [x.details, x.hint, x.code].map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean)
    if (fromPg.length) return fromPg.join(' · ')
    if (err.name?.trim()) return err.name.trim()
  }

  if (typeof err === 'object') {
    const o = err as Record<string, unknown>
    const parts: string[] = []
    for (const key of [
      'message',
      'error_description',
      'details',
      'hint',
      'code',
      'statusCode',
      'status',
    ]) {
      const v = o[key]
      if (typeof v === 'string' && v.trim()) parts.push(v.trim())
      else if (typeof v === 'number') parts.push(`${key}: ${v}`)
    }
    if (parts.length) return [...new Set(parts)].join(' · ')

    for (const [k, v] of Object.entries(o)) {
      if (['message', 'error_description', 'details', 'hint', 'code'].includes(k)) continue
      if (typeof v === 'string' && v.trim()) parts.push(`${k}: ${v.trim()}`)
      else if (typeof v === 'number' || typeof v === 'boolean') parts.push(`${k}: ${String(v)}`)
    }
    if (parts.length) return [...new Set(parts)].join(' · ')

    const entries = Object.entries(o)
    const allVacuous = entries.every(
      ([, v]) =>
        v == null ||
        v === '' ||
        (typeof v === 'string' && !v.trim()) ||
        (typeof v === 'object' && v != null && Object.keys(v as object).length === 0),
    )
    if (entries.length > 0 && allVacuous) {
      return (
        'Empty error from API (often invalid filter such as status “order” before the DB migration, or RLS). ' +
        'Apply pending Supabase migrations, then check the failed request in DevTools → Network → Response.'
      )
    }

    try {
      const j = JSON.stringify(o)
      if (j && j !== '{}' && j !== '{"message":""}' && j !== '{"message":null}') return j
    } catch {
      /* ignore */
    }
  }

  const s = String(err)
  return s !== '[object Object]' ? s : 'Request failed (check Network tab for the failing request).'
}

function pickFirstLabeledError(
  rows: { label: string; error: unknown }[],
): { message: string } | null {
  for (const { label, error } of rows) {
    if (error == null || error === false) continue
    const detail = formatUnknownError(error)
    return { message: `${label}: ${detail}` }
  }
  return null
}

function toISODateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Monday–Sunday week in local time containing `now`; month is calendar month. */
export function getDashboardPeriodBounds(now = new Date()) {
  const today = toISODateLocal(now)

  const anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dow = anchor.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  anchor.setDate(anchor.getDate() + mondayOffset)
  const weekStart = toISODateLocal(anchor)
  const sunday = new Date(anchor)
  sunday.setDate(sunday.getDate() + 6)
  const weekEnd = toISODateLocal(sunday)

  const monthStart = toISODateLocal(new Date(now.getFullYear(), now.getMonth(), 1))
  const monthEnd = toISODateLocal(new Date(now.getFullYear(), now.getMonth() + 1, 0))

  return {
    today: { start: today, end: today },
    week: { start: weekStart, end: weekEnd },
    month: { start: monthStart, end: monthEnd },
  }
}

/**
 * Count estimates for dashboard.
 * - `status: 'estimate'` — open quotes only.
 * - `nonQuote: true` — everything that is not an open quote: works for `order` (new enum) and for
 *   legacy `in_production` / `ready` without requiring the `order` enum value in Postgres.
 */
async function countEstimates(
  userId: string,
  opts:
    | { status: 'estimate'; eventFrom?: string; eventTo?: string }
    | { nonQuote: true; eventFrom?: string; eventTo?: string },
) {
  let q = supabase
    .from('estimates')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if ('status' in opts) q = q.eq('status', opts.status)
  if ('nonQuote' in opts && opts.nonQuote) q = q.neq('status', 'estimate')
  if (opts.eventFrom) q = q.gte('event_date', opts.eventFrom)
  if (opts.eventTo) q = q.lte('event_date', opts.eventTo)
  const { count, error } = await q
  return { count: count ?? 0, error }
}

async function sumPaidIncomeByEventDate(userId: string, start: string, end: string) {
  const { data, error } = await supabase
    .from('estimates')
    .select('total')
    .eq('user_id', userId)
    .eq('balance_paid', true)
    .gte('event_date', start)
    .lte('event_date', end)
  if (error) return { sum: 0, error }
  let s = 0
  for (const row of data ?? []) {
    s += Number((row as { total: string | number }).total) || 0
  }
  return { sum: Math.round(s * 100) / 100, error: null as null }
}

async function countCustomers(userId: string) {
  const { count, error } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  return { count: count ?? 0, error }
}

export type DashboardMetrics = {
  openEstimatesCount: number
  /** Rows that are not open quotes (`order`, or legacy `in_production` / `ready`). */
  ordersCount: number
  customersCount: number
  /** Same “not estimate” semantics, with event_date in the window */
  ordersByEvent: { day: number; week: number; month: number }
  /** Sum of `total` where balance_paid and event_date in window */
  paidIncomeByEvent: { day: number; week: number; month: number }
}

export type DashboardMetricsPayload = {
  metrics: DashboardMetrics
  /** Periods used for the queries above (local calendar). */
  bounds: ReturnType<typeof getDashboardPeriodBounds>
}

export async function fetchDashboardMetrics(userId: string): Promise<{
  data: DashboardMetricsPayload | null
  error: { message: string } | null
}> {
  const bounds = getDashboardPeriodBounds()

  const [
    openRes,
    ordersTotalRes,
    customersRes,
    ordersDayRes,
    ordersWeekRes,
    ordersMonthRes,
    incomeDayRes,
    incomeWeekRes,
    incomeMonthRes,
  ] = await Promise.all([
    countEstimates(userId, { status: 'estimate' }),
    countEstimates(userId, { nonQuote: true }),
    countCustomers(userId),
    countEstimates(userId, {
      nonQuote: true,
      eventFrom: bounds.today.start,
      eventTo: bounds.today.end,
    }),
    countEstimates(userId, {
      nonQuote: true,
      eventFrom: bounds.week.start,
      eventTo: bounds.week.end,
    }),
    countEstimates(userId, {
      nonQuote: true,
      eventFrom: bounds.month.start,
      eventTo: bounds.month.end,
    }),
    sumPaidIncomeByEventDate(userId, bounds.today.start, bounds.today.end),
    sumPaidIncomeByEventDate(userId, bounds.week.start, bounds.week.end),
    sumPaidIncomeByEventDate(userId, bounds.month.start, bounds.month.end),
  ])

  const firstErr = pickFirstLabeledError([
    { label: 'Open estimates count', error: openRes.error },
    { label: 'Orders (total) count', error: ordersTotalRes.error },
    { label: 'Customers count', error: customersRes.error },
    { label: 'Orders this day (by event date)', error: ordersDayRes.error },
    { label: 'Orders this week (by event date)', error: ordersWeekRes.error },
    { label: 'Orders this month (by event date)', error: ordersMonthRes.error },
    { label: 'Paid income this day', error: incomeDayRes.error },
    { label: 'Paid income this week', error: incomeWeekRes.error },
    { label: 'Paid income this month', error: incomeMonthRes.error },
  ])

  if (firstErr) {
    return { data: null, error: firstErr }
  }

  return {
    data: {
      bounds,
      metrics: {
        openEstimatesCount: openRes.count,
        ordersCount: ordersTotalRes.count,
        customersCount: customersRes.count,
        ordersByEvent: {
          day: ordersDayRes.count,
          week: ordersWeekRes.count,
          month: ordersMonthRes.count,
        },
        paidIncomeByEvent: {
          day: incomeDayRes.sum,
          week: incomeWeekRes.sum,
          month: incomeMonthRes.sum,
        },
      },
    },
    error: null,
  }
}
