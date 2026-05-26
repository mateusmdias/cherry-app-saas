import { supabase } from '@/lib/supabase'

export type ReportEstimateRow = {
  id: string
  customer_id: string
  estimate_number: string | null
  status: string
  event_date: string
  guest_count?: number | null
  party_occasion?: string | null
  total: string | number
  balance_paid: boolean
  customers: { name: string } | { name: string }[] | null
}

export function unwrapReportCustomerName(row: ReportEstimateRow): string {
  const c = row.customers
  if (!c) return 'Customer'
  const first = Array.isArray(c) ? c[0] : c
  return first?.name?.trim() || 'Customer'
}

/** Estimates whose event_date falls in [start, end] (inclusive), ISO date strings `YYYY-MM-DD`. */
export async function fetchEstimatesByEventDateRange(
  userId: string,
  start: string,
  end: string,
) {
  const { data, error } = await supabase
    .from('estimates')
    .select(
      'id, customer_id, estimate_number, status, event_date, guest_count, party_occasion, total, balance_paid, customers ( name )',
    )
    .eq('user_id', userId)
    .gte('event_date', start)
    .lte('event_date', end)
    .order('event_date', { ascending: false })

  return { data: (data as ReportEstimateRow[] | null) ?? [], error }
}

/** Quotes still in `estimate` status (not yet moved to Order). */
export async function fetchOpenEstimates(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('estimates')
    .select(
      'id, customer_id, estimate_number, status, event_date, guest_count, party_occasion, total, balance_paid, customers ( name )',
    )
    .eq('user_id', userId)
    .eq('status', 'estimate')
    .order('event_date', { ascending: true })
    .limit(limit)

  return { data: (data as ReportEstimateRow[] | null) ?? [], error }
}
