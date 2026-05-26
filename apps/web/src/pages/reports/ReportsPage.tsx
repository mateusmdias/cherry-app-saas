import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  fetchEstimatesByEventDateRange,
  fetchOpenEstimates,
  unwrapReportCustomerName,
  type ReportEstimateRow,
} from '@/features/reports/reportQueries'
import { estimateListContextLine } from '@/lib/estimateListMeta'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function toISODateLocal(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function calendarMonthBounds(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return { start: toISODateLocal(start), end: toISODateLocal(end) }
}

function sumPaidTotals(rows: ReportEstimateRow[]): number {
  let s = 0
  for (const r of rows) {
    if (!r.balance_paid) continue
    s += Number(r.total) || 0
  }
  return Math.round(s * 100) / 100
}

type CustomerSpend = { customerId: string; name: string; paidTotal: number }

function topCustomersByPaidRevenue(rows: ReportEstimateRow[], limit = 10): CustomerSpend[] {
  const map = new Map<string, { name: string; paidTotal: number }>()
  for (const r of rows) {
    if (!r.balance_paid) continue
    const t = Number(r.total) || 0
    const name = unwrapReportCustomerName(r)
    const prev = map.get(r.customer_id)
    if (prev) {
      prev.paidTotal = Math.round((prev.paidTotal + t) * 100) / 100
    } else {
      map.set(r.customer_id, { name, paidTotal: Math.round(t * 100) / 100 })
    }
  }
  return [...map.entries()]
    .map(([customerId, v]) => ({ customerId, name: v.name, paidTotal: v.paidTotal }))
    .sort((a, b) => b.paidTotal - a.paidTotal)
    .slice(0, limit)
}

export function ReportsPage() {
  const { user } = useAuth()
  const bounds = useMemo(() => calendarMonthBounds(), [])
  const [start, setStart] = useState(bounds.start)
  const [end, setEnd] = useState(bounds.end)
  const [rangeRows, setRangeRows] = useState<ReportEstimateRow[]>([])
  const [openRows, setOpenRows] = useState<ReportEstimateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user?.id) return
    if (start > end) {
      setError('Start date must be on or before end date.')
      setRangeRows([])
      setOpenRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const [{ data: inRange, error: e1 }, { data: open, error: e2 }] = await Promise.all([
      fetchEstimatesByEventDateRange(user.id, start, end),
      fetchOpenEstimates(user.id),
    ])
    if (e1) {
      setError(e1.message)
      setRangeRows([])
    } else {
      setRangeRows(inRange)
    }
    if (e2) {
      setError((prev) => prev ?? e2.message)
      setOpenRows([])
    } else {
      setOpenRows(open)
    }
    setLoading(false)
  }, [user?.id, start, end])

  useEffect(() => {
    void load()
  }, [load])

  const paidRevenueInRange = useMemo(() => sumPaidTotals(rangeRows), [rangeRows])
  const topCustomers = useMemo(() => topCustomersByPaidRevenue(rangeRows), [rangeRows])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Reports</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Revenue uses estimates marked <span className="font-medium">balance paid</span> (on the edit
        screen) in the selected period (by <span className="font-medium">event date</span>). Open
        estimates are quotes still in <span className="font-medium">Estimate</span> status.
      </p>

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Date range</h2>
        <p className="mt-1 text-xs text-stone-500">
          Filters the sections below (except “Open estimates”, which is always current pipeline).
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">From</span>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-1 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">To</span>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-1 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || !start || !end}
            className="rounded-lg border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </section>

      {error ? (
        <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Paid revenue (in range)
          </h2>
          {loading ? (
            <p className="mt-3 text-sm text-stone-600">Loading…</p>
          ) : (
            <>
              <p className="mt-3 text-3xl font-semibold tabular-nums text-cherry-900">
                {formatMoney(paidRevenueInRange)}
              </p>
              <p className="mt-2 text-xs text-stone-500">
                Sum of invoice totals where “balance paid” is checked on the estimate, for events in
                this date range.
              </p>
            </>
          )}
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Open estimates
          </h2>
          {loading ? (
            <p className="mt-3 text-sm text-stone-600">Loading…</p>
          ) : openRows.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">No quotes in Estimate status.</p>
          ) : (
            <>
              <p className="mt-2 text-2xl font-semibold text-stone-900">{openRows.length}</p>
              <p className="text-xs text-stone-500">Still in Estimate status (not Order)</p>
              <ul className="mt-4 max-h-64 divide-y divide-stone-100 overflow-y-auto text-sm">
                {openRows.map((r) => {
                  const meta = estimateListContextLine(r)
                  return (
                    <li key={r.id} className="py-2">
                      <Link
                        to={`/estimates/${r.id}`}
                        className="font-medium text-cherry-800 hover:underline"
                      >
                        {r.estimate_number ?? '—'}
                      </Link>
                      <span className="text-stone-600"> · {unwrapReportCustomerName(r)}</span>
                      <span className="block text-xs text-stone-500">
                        Event {formatDate(r.event_date)} · {formatMoney(Number(r.total) || 0)}
                      </span>
                      {meta ? (
                        <span className="mt-0.5 block truncate text-xs text-stone-500" title={meta}>
                          {meta}
                        </span>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>
      </div>

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Top customers by paid revenue (in range)
        </h2>
        {loading ? (
          <p className="mt-3 text-sm text-stone-600">Loading…</p>
        ) : topCustomers.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">
            No paid estimates in this period. Open an estimate → Edit, check <span className="font-medium">Balance paid in full</span> after you collect payment, then save.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase text-stone-500">
                  <th className="py-2 pr-4 font-medium">Customer</th>
                  <th className="py-2 pr-4 font-medium">Paid in period</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((row) => (
                  <tr key={row.customerId} className="border-b border-stone-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-stone-900">{row.name}</td>
                    <td className="py-2 pr-4 tabular-nums text-stone-800">
                      {formatMoney(row.paidTotal)}
                    </td>
                    <td className="py-2">
                      <Link
                        to={`/customers/${row.customerId}`}
                        className="text-cherry-700 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
