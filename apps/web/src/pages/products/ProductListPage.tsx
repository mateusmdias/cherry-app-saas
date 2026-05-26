import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { fetchProducts } from '@/features/products/productQueries'
import type { PricingType, Product } from '@/types/database'

function formatPrice(n: string | number | null, currency = 'USD') {
  if (n === null || n === '') return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(n))
}

function pricingLabel(t: PricingType) {
  return t === 'fixed' ? 'Fixed price' : 'Quote only'
}

export function ProductListPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await fetchProducts(user.id)
    setLoading(false)
    if (err) {
      setError(err.message)
      setProducts([])
      return
    }
    setProducts(data ?? [])
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Products</h1>
          <p className="mt-1 text-sm text-stone-600">
            Catalog items for estimates — fixed price or quote-only, plus optional variables (size,
            flavor, etc.).
          </p>
        </div>
        <Link
          to="/products/new"
          className="inline-flex items-center justify-center rounded-lg bg-cherry-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cherry-800"
        >
          Add product
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-stone-600">Loading…</p>
      ) : products.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="text-stone-600">No products yet.</p>
          <Link
            to="/products/new"
            className="mt-4 inline-block text-sm font-medium text-cherry-700 hover:underline"
          >
            Add your first product
          </Link>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white shadow-sm">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                to={`/products/${p.id}/edit`}
                className={`flex flex-col gap-2 px-4 py-4 transition hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between ${
                  !p.is_active ? 'opacity-60' : ''
                }`}
              >
                <div>
                  <span className="font-medium text-stone-900">{p.name}</span>
                  {!p.is_active ? (
                    <span className="ml-2 text-xs text-stone-500">(inactive)</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-700">
                    {pricingLabel(p.pricing_type)}
                  </span>
                  {p.pricing_type === 'fixed' ? (
                    <span className="text-stone-600">{formatPrice(p.base_price)}</span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
