import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { fetchRecentEstimates } from '@/features/estimates/estimateQueries'
import {
  estimateStatusLabel,
  normalizeEstimateStatus,
} from '@/lib/estimateStatusDisplay'
import { estimateListContextLine } from '@/lib/estimateListMeta'

function formatMoney(n: string | number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n))
}

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function EstimatesIndexPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof fetchRecentEstimates>>['data']
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    const { data, error: e } = await fetchRecentEstimates(user.id)
    setLoading(false)
    if (e) {
      setError(e.message)
      setRows([])
      return
    }
    setRows(data)
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Estimates</h1>
      <p className="mt-2 max-w-xl text-sm text-stone-600">
        Use New estimate to choose an existing customer or create one on the same form. Recent
        estimates appear below.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          to="/estimates/new"
          className="inline-flex rounded-lg bg-cherry-700 px-4 py-2 text-sm font-medium text-white hover:bg-cherry-800"
        >
          New estimate
        </Link>
        <Link
          to="/customers"
          className="inline-flex rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
        >
          Go to customers
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-stone-900">Recent</h2>
        {loading ? (
          <p className="mt-3 text-sm text-stone-600">Loading…</p>
        ) : error ? (
          <p className="mt-3 text-sm text-red-700">{error}</p>
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">No estimates yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white shadow-sm">
            {rows.map((e) => {
              const meta = estimateListContextLine(e)
              return (
              <li key={e.id}>
                <Link
                  to={`/estimates/${e.id}`}
                  className="flex flex-col gap-1 px-4 py-3 hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div>
                      <span className="font-mono text-sm font-semibold text-cherry-900">
                        {e.estimate_number ?? '—'}
                      </span>
                      <span className="ml-2 font-medium text-stone-900">{formatDate(e.event_date)}</span>
                      <span className="ml-2 text-sm text-stone-600">
                        {e.customer_name ?? 'Customer'}
                      </span>
                      <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                        {estimateStatusLabel(normalizeEstimateStatus(e.status))}
                      </span>
                    </div>
                    {meta ? (
                      <p className="mt-1 truncate text-xs text-stone-500" title={meta}>
                        {meta}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-sm font-medium text-stone-800">{formatMoney(e.total)}</span>
                </Link>
              </li>
            )})}
          </ul>
        )}
      </section>
    </div>
  )
}
