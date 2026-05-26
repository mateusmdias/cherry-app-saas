import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { insertProduct } from '@/features/products/productQueries'
import type { PricingType } from '@/types/database'

export function ProductNewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [productNotes, setProductNotes] = useState('')
  const [pricingType, setPricingType] = useState<PricingType>('quote_only')
  const [basePrice, setBasePrice] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user?.id) return

    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name is required')
      return
    }

    let base: number | null = null
    if (pricingType === 'fixed') {
      const n = Number.parseFloat(basePrice)
      if (Number.isNaN(n) || n < 0) {
        setError('Enter a valid base price for fixed-price products')
        return
      }
      base = n
    }

    setError(null)
    setSaving(true)
    const { data, error: err } = await insertProduct({
      user_id: user.id,
      name: trimmed,
      notes: productNotes.trim() || null,
      pricing_type: pricingType,
      base_price: base,
      is_active: isActive,
      sort_order: 0,
    })
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    if (data?.id) {
      navigate(`/products/${data.id}/edit`, { replace: true })
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link to="/products" className="text-sm font-medium text-cherry-700 hover:underline">
        ← Products
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-stone-900">New product</h1>
      <p className="mt-1 text-sm text-stone-600">
        After saving, you can add variables (e.g. size, flavor) on the next screen.
      </p>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Name *</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Custom birthday cake"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">Description / notes (for quotes)</span>
          <textarea
            value={productNotes}
            onChange={(e) => setProductNotes(e.target.value)}
            rows={4}
            placeholder="Describe this product as you want it to appear on estimates (optional)."
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
          />
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-stone-700">Pricing</legend>
          <div className="mt-2 space-y-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="pricing"
                checked={pricingType === 'quote_only'}
                onChange={() => setPricingType('quote_only')}
              />
              <span className="text-sm text-stone-800">Quote only (price set per estimate)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="pricing"
                checked={pricingType === 'fixed'}
                onChange={() => setPricingType('fixed')}
              />
              <span className="text-sm text-stone-800">Fixed base price</span>
            </label>
          </div>
        </fieldset>

        {pricingType === 'fixed' ? (
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Base price (USD) *</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
            />
          </label>
        ) : null}

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span className="text-sm text-stone-800">Active (show when adding to estimates)</span>
        </label>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-cherry-700 px-4 py-2 text-sm font-medium text-white hover:bg-cherry-800 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save & add variables'}
          </button>
          <Link
            to="/products"
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
