import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  deleteOptionGroup,
  deleteProductOption,
  fetchOptionGroupsWithOptions,
  fetchProduct,
  insertOptionGroup,
  insertProductOption,
  updateOptionGroup,
  updateProduct,
  updateProductOption,
  type GroupWithOptions,
} from '@/features/products/productQueries'
import type { PricingType, Product } from '@/types/database'

function OptionRowEditor({
  option,
  busy,
  onSave,
  onRemove,
}: {
  option: { id: string; label: string; price_delta: string | number | null }
  busy: boolean
  onSave: (id: string, label: string, priceDelta: number) => Promise<void>
  onRemove: (id: string) => Promise<void>
}) {
  const [label, setLabel] = useState(option.label)
  const [delta, setDelta] = useState(String(option.price_delta ?? 0))

  useEffect(() => {
    setLabel(option.label)
    setDelta(String(option.price_delta ?? 0))
  }, [option.id, option.label, option.price_delta])

  return (
    <li className="flex flex-col gap-2 rounded-md border border-stone-200 bg-white p-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
      <label className="block flex-1 min-w-[8rem]">
        <span className="text-xs text-stone-500">Label</span>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={busy}
          className="mt-0.5 w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block w-full sm:w-32">
        <span className="text-xs text-stone-500">Price +/−</span>
        <input
          type="number"
          step="0.01"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          disabled={busy}
          className="mt-0.5 w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void onSave(option.id, label, Number.parseFloat(delta) || 0)
          }
          className="rounded border border-stone-300 px-2 py-1.5 text-sm hover:bg-stone-50 disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onRemove(option.id)}
          className="text-sm text-red-700 hover:underline disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </li>
  )
}

function ProductVariablesSection({
  userId,
  productId,
  groups,
  onRefresh,
}: {
  userId: string
  productId: string
  groups: GroupWithOptions[]
  onRefresh: () => Promise<void>
}) {
  const [busy, setBusy] = useState<string | null>(null)

  async function addGroup() {
    const maxSort = groups.reduce((m, g) => Math.max(m, g.sort_order), -1)
    setBusy('add-group')
    await insertOptionGroup({
      user_id: userId,
      product_id: productId,
      label: 'New variable',
      sort_order: maxSort + 1,
    })
    setBusy(null)
    await onRefresh()
  }

  async function saveGroupLabel(id: string, label: string) {
    const g = groups.find((x) => x.id === id)
    if (!g || g.label === label) return
    setBusy(id)
    await updateOptionGroup(id, label.trim() || 'Variable')
    setBusy(null)
    await onRefresh()
  }

  async function removeGroup(id: string) {
    if (!window.confirm('Delete this variable group and all its choices?')) return
    setBusy(id)
    await deleteOptionGroup(id)
    setBusy(null)
    await onRefresh()
  }

  async function addOption(groupId: string) {
    const g = groups.find((x) => x.id === groupId)
    const opts = g?.product_options ?? []
    const maxSort = opts.reduce((m, o) => Math.max(m, o.sort_order), -1)
    setBusy(`add-opt-${groupId}`)
    await insertProductOption({
      user_id: userId,
      group_id: groupId,
      label: 'Choice',
      price_delta: 0,
      sort_order: maxSort + 1,
    })
    setBusy(null)
    await onRefresh()
  }

  async function saveOption(id: string, label: string, priceDelta: number) {
    setBusy(id)
    await updateProductOption(id, {
      label: label.trim() || 'Choice',
      price_delta: priceDelta,
    })
    setBusy(null)
    await onRefresh()
  }

  async function removeOption(id: string) {
    if (!window.confirm('Remove this choice?')) return
    setBusy(id)
    await deleteProductOption(id)
    setBusy(null)
    await onRefresh()
  }

  return (
    <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Variables</h2>
          <p className="text-sm text-stone-600">
            Optional groups (e.g. Size, Flavor). Each group has choices; price delta adds to the
            line (for fixed-price products).
          </p>
        </div>
        <button
          type="button"
          disabled={busy === 'add-group'}
          onClick={() => void addGroup()}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50"
        >
          + Add variable group
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">No variables yet. Add a group to get started.</p>
      ) : (
        <ul className="mt-6 space-y-6">
          {groups.map((g) => (
            <li
              key={g.id}
              className="rounded-lg border border-stone-200 bg-stone-50/50 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <label className="block flex-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
                    Group name
                  </span>
                  <input
                    defaultValue={g.label}
                    key={g.id + g.label}
                    disabled={busy === g.id}
                    onBlur={(e) => void saveGroupLabel(g.id, e.target.value)}
                    className="mt-1 w-full max-w-md rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy === g.id}
                  onClick={() => void removeGroup(g.id)}
                  className="text-sm text-red-700 hover:underline disabled:opacity-50"
                >
                  Delete group
                </button>
              </div>

              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                  Choices
                </p>
                <ul className="mt-2 space-y-2">
                  {(g.product_options ?? []).map((o) => (
                    <OptionRowEditor
                      key={o.id}
                      option={o}
                      busy={busy === o.id}
                      onSave={saveOption}
                      onRemove={removeOption}
                    />
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={busy === `add-opt-${g.id}`}
                  onClick={() => void addOption(g.id)}
                  className="mt-3 text-sm font-medium text-cherry-700 hover:underline disabled:opacity-50"
                >
                  + Add choice
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function ProductEditPage() {
  const { productId } = useParams<{ productId: string }>()
  const { user } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [groups, setGroups] = useState<GroupWithOptions[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [productNotes, setProductNotes] = useState('')
  const [pricingType, setPricingType] = useState<PricingType>('quote_only')
  const [basePrice, setBasePrice] = useState('')
  const [isActive, setIsActive] = useState(true)

  const refreshGroups = useCallback(async () => {
    if (!productId) return
    const { data } = await fetchOptionGroupsWithOptions(productId)
    setGroups(data ?? [])
  }, [productId])

  const load = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    setError(null)
    const { data: p, error: e1 } = await fetchProduct(productId)
    if (e1 || !p) {
      setLoading(false)
      setError(e1?.message ?? 'Product not found')
      setProduct(null)
      return
    }
    setProduct(p)
    setName(p.name)
    setProductNotes(p.notes ?? '')
    setPricingType(p.pricing_type)
    setBasePrice(p.base_price != null ? String(p.base_price) : '')
    setIsActive(p.is_active)
    const { data: g } = await fetchOptionGroupsWithOptions(productId)
    setGroups(g ?? [])
    setLoading(false)
  }, [productId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSaveBasics(e: FormEvent) {
    e.preventDefault()
    if (!productId || !product) return

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
    const { error: err } = await updateProduct(productId, {
      name: trimmed,
      notes: productNotes.trim() || null,
      pricing_type: pricingType,
      base_price: pricingType === 'fixed' ? base : null,
      is_active: isActive,
    })
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    await load()
  }

  if (loading) {
    return <p className="text-stone-600">Loading…</p>
  }

  if (error && !product) {
    return (
      <div>
        <p className="text-red-700">{error}</p>
        <Link to="/products" className="mt-4 inline-block text-cherry-700 hover:underline">
          ← Products
        </Link>
      </div>
    )
  }

  if (!product || !user?.id) return null

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/products" className="text-sm font-medium text-cherry-700 hover:underline">
        ← Products
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-stone-900">Edit product</h1>

      <form
        onSubmit={(e) => void handleSaveBasics(e)}
        className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Name *</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
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
              <span className="text-sm text-stone-800">Quote only</span>
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
          <span className="text-sm text-stone-800">Active</span>
        </label>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-cherry-700 px-4 py-2 text-sm font-medium text-white hover:bg-cherry-800 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save product'}
        </button>
      </form>

      <ProductVariablesSection
        userId={user.id}
        productId={product.id}
        groups={groups}
        onRefresh={refreshGroups}
      />
    </div>
  )
}
