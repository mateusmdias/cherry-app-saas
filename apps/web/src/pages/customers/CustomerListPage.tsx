import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { fetchCustomers } from '@/features/customers/customerQueries'
import type { Customer } from '@/types/database'

export function CustomerListPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await fetchCustomers(user.id, debounced || undefined)
    setLoading(false)
    if (err) {
      setError(err.message)
      setCustomers([])
      return
    }
    setCustomers(data ?? [])
  }, [user?.id, debounced])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Customers</h1>
          <p className="mt-1 text-sm text-stone-600">
            Search by name or phone. Add customers you quote on WhatsApp.
          </p>
        </div>
        <Link
          to="/customers/new"
          className="inline-flex items-center justify-center rounded-lg bg-cherry-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cherry-800"
        >
          Add customer
        </Link>
      </div>

      <div className="mt-6">
        <label className="sr-only" htmlFor="customer-search">
          Search customers
        </label>
        <input
          id="customer-search"
          type="search"
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100 sm:max-w-lg"
        />
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-stone-600">Loading…</p>
      ) : customers.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="text-stone-600">
            {debounced ? 'No customers match your search.' : 'No customers yet.'}
          </p>
          <Link
            to="/customers/new"
            className="mt-4 inline-block text-sm font-medium text-cherry-700 hover:underline"
          >
            Add your first customer
          </Link>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white shadow-sm">
          {customers.map((c) => (
            <li key={c.id}>
              <Link
                to={`/customers/${c.id}`}
                className="flex flex-col gap-1 px-4 py-4 transition hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium text-stone-900">{c.name}</span>
                <span className="text-sm text-stone-600">{c.phone ?? '—'}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
