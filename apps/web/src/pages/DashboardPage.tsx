import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  fetchDashboardMetrics,
  type DashboardMetrics,
  type DashboardMetricsPayload,
} from '@/features/dashboard/dashboardQueries'
import { supabase } from '@/lib/supabase'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function formatRangeLabel(start: string, end: string) {
  if (start === end) {
    return new Date(start + 'T12:00:00').toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  const a = new Date(start + 'T12:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const b = new Date(end + 'T12:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${a} – ${b}`
}

export function DashboardPage() {
  const { profile, user } = useAuth()
  const displayName = profile?.display_name ?? user?.email ?? 'Owner'

  const [payload, setPayload] = useState<DashboardMetricsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const metrics: DashboardMetrics | null = payload?.metrics ?? null
  const bounds = payload?.bounds

  /** Always resolve uid from Supabase session (avoids context lag on first paint). */
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const uid = sessionData.session?.user?.id
      if (!uid) {
        setPayload(null)
        setError('Could not read your account. Try refreshing the page or signing in again.')
        return
      }
      const { data, error: e } = await fetchDashboardMetrics(uid)
      if (e) {
        setPayload(null)
        setError(e.message?.trim() || 'Could not load dashboard metrics.')
        return
      }
      if (!data) {
        setPayload(null)
        setError('No dashboard data was returned.')
        return
      }
      setPayload(data)
    } catch (err) {
      setPayload(null)
      setError(err instanceof Error ? err.message : 'Could not load dashboard metrics.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Welcome, {displayName}</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Snapshot of open quotes, orders, customers, and activity by{' '}
          <span className="font-medium">event date</span> (today, this calendar week Mon–Sun, this
          calendar month). Income counts estimates marked{' '}
          <span className="font-medium">balance paid in full</span>, same as Reports.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Quick shortcuts</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            to="/estimates/new"
            className="inline-flex rounded-lg bg-cherry-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cherry-800"
          >
            New estimate
          </Link>
          <Link
            to="/customers/new"
            className="inline-flex rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            New customer
          </Link>
          <Link
            to="/products/new"
            className="inline-flex rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            New product
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-900 hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-stone-600">Loading dashboard…</p>
      ) : metrics && bounds ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              to="/estimates"
              className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-cherry-200 hover:shadow"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Open estimates
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-cherry-900">
                {metrics.openEstimatesCount}
              </p>
              <p className="mt-2 text-xs text-stone-500">Status: Estimate (quotes in progress)</p>
            </Link>
            <Link
              to="/estimates"
              className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-cherry-200 hover:shadow"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Orders</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-cherry-900">
                {metrics.ordersCount}
              </p>
              <p className="mt-2 text-xs text-stone-500">
                Order status, or legacy in-production / ready (anything that is not Estimate).
              </p>
            </Link>
            <Link
              to="/customers"
              className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-cherry-200 hover:shadow"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Customers</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-cherry-900">
                {metrics.customersCount}
              </p>
              <p className="mt-2 text-xs text-stone-500">All customers on file</p>
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                Orders by event date
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                Non-quote jobs (Order or legacy statuses) with an event scheduled in each window.
              </p>
              <p className="mt-2 text-xs text-stone-400">
                Today: {formatRangeLabel(bounds.today.start, bounds.today.end)} · Week:{' '}
                {formatRangeLabel(bounds.week.start, bounds.week.end)} · Month:{' '}
                {formatRangeLabel(bounds.month.start, bounds.month.end)}
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-xs uppercase text-stone-500">
                      <th className="py-2 pr-4 font-medium">Period</th>
                      <th className="py-2 pr-4 font-medium tabular-nums">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="text-stone-800">
                    <tr className="border-b border-stone-100">
                      <td className="py-2 pr-4 font-medium">Today</td>
                      <td className="py-2 pr-4 tabular-nums">{metrics.ordersByEvent.day}</td>
                    </tr>
                    <tr className="border-b border-stone-100">
                      <td className="py-2 pr-4 font-medium">This week</td>
                      <td className="py-2 pr-4 tabular-nums">{metrics.ordersByEvent.week}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium">This month</td>
                      <td className="py-2 pr-4 tabular-nums">{metrics.ordersByEvent.month}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                Income by event date
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                Sum of invoice totals where <span className="font-medium">balance paid in full</span>{' '}
                is checked, for events in each window.
              </p>
              <p className="mt-2 text-xs text-stone-400">
                Same date ranges as the orders table.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-xs uppercase text-stone-500">
                      <th className="py-2 pr-4 font-medium">Period</th>
                      <th className="py-2 pr-4 font-medium tabular-nums">Paid total</th>
                    </tr>
                  </thead>
                  <tbody className="text-stone-800">
                    <tr className="border-b border-stone-100">
                      <td className="py-2 pr-4 font-medium">Today</td>
                      <td className="py-2 pr-4 tabular-nums font-semibold text-cherry-900">
                        {formatMoney(metrics.paidIncomeByEvent.day)}
                      </td>
                    </tr>
                    <tr className="border-b border-stone-100">
                      <td className="py-2 pr-4 font-medium">This week</td>
                      <td className="py-2 pr-4 tabular-nums font-semibold text-cherry-900">
                        {formatMoney(metrics.paidIncomeByEvent.week)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium">This month</td>
                      <td className="py-2 pr-4 tabular-nums font-semibold text-cherry-900">
                        {formatMoney(metrics.paidIncomeByEvent.month)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <p className="text-sm text-stone-600">
            <Link to="/reports" className="font-medium text-cherry-800 hover:underline">
              Open reports
            </Link>{' '}
            for date-range revenue and top customers.
          </p>
        </>
      ) : !error ? (
        <p className="text-sm text-stone-600">
          Dashboard metrics did not load.{' '}
          <button
            type="button"
            onClick={() => void load()}
            className="font-medium text-cherry-800 underline hover:text-cherry-900"
          >
            Try again
          </button>
        </p>
      ) : null}
    </section>
  )
}
