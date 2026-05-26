import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  fetchCustomerById,
  fetchEstimatesForCustomer,
} from '@/features/customers/customerQueries'
import {
  estimateStatusLabel,
  normalizeEstimateStatus,
} from '@/lib/estimateStatusDisplay'
import { estimateListContextLine } from '@/lib/estimateListMeta'
import type { Customer } from '@/types/database'

type EstimateRow = {
  id: string
  estimate_number?: string
  status: string
  event_date: string
  guest_count?: number | null
  party_occasion?: string | null
  total: number
  balance_paid: boolean
  created_at: string
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number(n),
  )
}

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [estimates, setEstimates] = useState<EstimateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!customerId) return
    setLoading(true)
    setError(null)

    const { data: c, error: e1 } = await fetchCustomerById(customerId)
    if (e1 || !c) {
      setLoading(false)
      setError(e1?.message ?? 'Customer not found')
      setCustomer(null)
      setEstimates([])
      return
    }

    const { data: est, error: e2 } = await fetchEstimatesForCustomer(customerId)
    setLoading(false)
    if (e2) {
      setError(e2.message)
    }
    setCustomer(c)
    setEstimates((est as EstimateRow[] | null) ?? [])
  }, [customerId])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => {
    let totalQuoted = 0
    let totalCollected = 0
    for (const e of estimates) {
      const t = Number(e.total)
      totalQuoted += t
      if (e.balance_paid) totalCollected += t
    }
    return { totalQuoted, totalCollected, count: estimates.length }
  }, [estimates])

  if (loading) {
    return <p className="text-stone-600">Loading…</p>
  }

  if (error && !customer) {
    return (
      <div>
        <p className="text-red-700">{error}</p>
        <Link to="/customers" className="mt-4 inline-block text-cherry-700 hover:underline">
          ← Back to customers
        </Link>
      </div>
    )
  }

  if (!customer) return null

  return (
    <div>
      <Link to="/customers" className="text-sm font-medium text-cherry-700 hover:underline">
        ← Customers
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">{customer.name}</h1>
          <p className="mt-1 text-stone-600">{customer.phone ?? 'No phone'}</p>
          {customer.address ? (
            <p className="mt-2 max-w-xl text-sm text-stone-600">{customer.address}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/estimates/new?customerId=${customer.id}`}
            className="rounded-lg bg-cherry-700 px-4 py-2 text-sm font-medium text-white hover:bg-cherry-800"
          >
            New estimate
          </Link>
          <Link
            to={`/customers/${customer.id}/edit`}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Edit
          </Link>
        </div>
      </div>

      {customer.notes ? (
        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-stone-700">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-stone-600">{customer.notes}</p>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-stone-900">Totals</h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Estimates
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-stone-900">{stats.count}</dd>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Total quoted
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-stone-900">
              {formatMoney(stats.totalQuoted)}
            </dd>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Collected (paid in full)
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-cherry-800">
              {formatMoney(stats.totalCollected)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-stone-900">Estimates</h2>
        {estimates.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">
            No estimates yet. Create one when you send a quote.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white shadow-sm">
            {estimates.map((e) => {
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
                  <span className="shrink-0 text-sm text-stone-700">{formatMoney(Number(e.total))}</span>
                </Link>
              </li>
            )})}
          </ul>
        )}
      </section>
    </div>
  )
}
