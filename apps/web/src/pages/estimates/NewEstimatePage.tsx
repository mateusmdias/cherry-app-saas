import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  fetchCustomerById,
  fetchCustomers,
  insertCustomer,
} from '@/features/customers/customerQueries'
import { fetchProducts } from '@/features/products/productQueries'
import {
  fetchBusinessBranding,
  insertEstimate,
  insertEstimateLine,
  updateEstimateTotals,
} from '@/features/estimates/estimateQueries'
import {
  buildLineDescription,
  selectedOptionIdsArray,
} from '@/features/estimates/buildLineDescription'
import type { Customer, FulfillmentType, Product } from '@/types/database'
import { NewEstimateLineBlock, type NewEstimateLineModel } from '@/pages/estimates/NewEstimateLineBlock'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

/** Empty → 0. Invalid string → NaN (caller validates before submit). */
function parseDiscountInput(input: string): number {
  const t = input.trim()
  if (t === '') return 0
  const n = Number.parseFloat(t)
  if (Number.isNaN(n) || n < 0) return Number.NaN
  return Math.round(n * 100) / 100
}

function discountForPreview(input: string): number {
  const n = parseDiscountInput(input)
  return Number.isNaN(n) ? 0 : n
}

function parseGuestCountInput(raw: string): { ok: true; value: number | null } | { ok: false; message: string } {
  const t = raw.trim()
  if (t === '') return { ok: true, value: null }
  const n = Number(t)
  if (!Number.isInteger(n) || n < 0 || n > 100_000) {
    return { ok: false, message: 'Guest count must be a whole number from 0–100,000, or leave blank.' }
  }
  return { ok: true, value: n }
}

function subtotalFromNewLines(lines: NewEstimateLineModel[], products: Product[]): number {
  let s = 0
  for (const row of lines) {
    if (!row.productId) continue
    const p = products.find((x) => x.id === row.productId)
    if (!p) continue
    const q = Number.parseFloat(row.quantity)
    const up = Number.parseFloat(row.unitPrice)
    if (Number.isNaN(q) || Number.isNaN(up)) continue
    s += q * up
  }
  return Math.round(s * 100) / 100
}

function newEmptyLine(): NewEstimateLineModel {
  return {
    rowId: crypto.randomUUID(),
    productId: '',
    groups: [],
    selection: {},
    quantity: '1',
    unitPrice: '',
  }
}

export function NewEstimatePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const customerIdFromUrl = params.get('customerId')

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customersList, setCustomersList] = useState<Customer[]>([])
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>(
    customerIdFromUrl ? 'existing' : 'existing',
  )
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerIdFromUrl ?? '')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerAddress, setNewCustomerAddress] = useState('')

  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryFee, setDeliveryFee] = useState('')
  const [pickupAddress, setPickupAddress] = useState('')
  const [brandingPickupDefault, setBrandingPickupDefault] = useState('')

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [eventDate, setEventDate] = useState('')
  const [notes, setNotes] = useState('')
  const [guestCountInput, setGuestCountInput] = useState('')
  const [partyOccasion, setPartyOccasion] = useState('')
  const [discountInput, setDiscountInput] = useState('')
  const [lines, setLines] = useState<NewEstimateLineModel[]>(() => [newEmptyLine()])

  const effectiveCustomer = useMemo(() => {
    if (customerIdFromUrl && customer) return customer
    if (!customerIdFromUrl && customerMode === 'existing' && selectedCustomerId) {
      return customersList.find((c) => c.id === selectedCustomerId) ?? null
    }
    return null
  }, [customerIdFromUrl, customer, customerMode, selectedCustomerId, customersList])

  const loadInitial = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)

    const { data: plist, error: eProducts } = await fetchProducts(user.id)
    const { data: brand, error: eBrand } = await fetchBusinessBranding(user.id)
    if (eBrand) {
      setError((prev) => prev ?? eBrand.message)
    }
    const pickupDef = (brand?.pickup_address_default ?? '').trim() || 'Cherry Bakehouse'
    setBrandingPickupDefault((brand?.pickup_address_default ?? '').trim())
    setPickupAddress((prev) => (prev.trim() ? prev : pickupDef))

    if (eProducts) {
      setError(eProducts.message)
      setProducts([])
    } else {
      setProducts((plist ?? []).filter((p) => p.is_active))
    }

    if (customerIdFromUrl) {
      const { data: c, error: e1 } = await fetchCustomerById(customerIdFromUrl)
      if (e1 || !c) {
        setCustomer(null)
        setError(e1?.message ?? 'Customer not found')
      } else {
        setCustomer(c)
        setSelectedCustomerId(customerIdFromUrl)
      }
    } else {
      const { data: list, error: e2 } = await fetchCustomers(user.id)
      if (e2) {
        setError((prev) => prev ?? e2.message)
        setCustomersList([])
      } else {
        setCustomersList(list ?? [])
      }
    }

    setLoading(false)
  }, [user?.id, customerIdFromUrl])

  useEffect(() => {
    void loadInitial()
  }, [loadInitial])

  const patchLine = useCallback((rowId: string, patch: Partial<Omit<NewEstimateLineModel, 'rowId'>>) => {
    setLines((prev) => prev.map((l) => (l.rowId === rowId ? { ...l, ...patch } : l)))
  }, [])

  const validationMessage = useMemo(() => {
    if (!customerIdFromUrl) {
      if (customerMode === 'existing' && !selectedCustomerId) {
        return 'Select a customer or create a new one.'
      }
      if (customerMode === 'new' && !newCustomerName.trim()) {
        return 'New customer name is required.'
      }
    }
    if (!eventDate.trim()) return 'Event date is required.'
    if (fulfillmentType === 'delivery') {
      const addr =
        deliveryAddress.trim() || effectiveCustomer?.address?.trim() || newCustomerAddress.trim()
      if (!addr) return 'Delivery needs an address (enter below or on the customer).'
    }
    if (fulfillmentType === 'pickup' && !pickupAddress.trim()) {
      return 'Takeout / pickup address is required (set your default in Branding, or type it here).'
    }
    if (lines.length === 0) return 'Add at least one product line.'
    for (let i = 0; i < lines.length; i++) {
      const row = lines[i]!
      const selectedProduct = products.find((p) => p.id === row.productId) ?? null
      if (!row.productId || !selectedProduct) {
        return `Line ${i + 1}: select a catalog product.`
      }
      for (const g of row.groups) {
        const opts = g.product_options ?? []
        if (opts.length === 0) continue
        if (!row.selection[g.id]) return `Line ${i + 1}: choose an option for “${g.label}”.`
      }
      const q = Number.parseFloat(row.quantity)
      if (Number.isNaN(q) || q <= 0) return `Line ${i + 1}: enter a valid quantity (greater than zero).`
      const up = Number.parseFloat(row.unitPrice)
      if (Number.isNaN(up) || up < 0) return `Line ${i + 1}: enter a valid unit price (zero or more).`
    }
    if (fulfillmentType === 'delivery') {
      const df = deliveryFee.trim() === '' ? 0 : Number.parseFloat(deliveryFee)
      if (deliveryFee.trim() !== '' && (Number.isNaN(df) || df < 0)) {
        return 'Delivery fee must be a valid amount (or leave blank for no fee).'
      }
    }
    if (Number.isNaN(parseDiscountInput(discountInput))) {
      return 'Discount must be a valid amount (zero or more), or leave blank.'
    }
    const guestParsed = parseGuestCountInput(guestCountInput)
    if (!guestParsed.ok) return guestParsed.message
    return null
  }, [
    customerIdFromUrl,
    customerMode,
    selectedCustomerId,
    newCustomerName,
    eventDate,
    fulfillmentType,
    deliveryAddress,
    effectiveCustomer,
    newCustomerAddress,
    lines,
    products,
    deliveryFee,
    discountInput,
    guestCountInput,
    pickupAddress,
  ])

  const draftSubtotal = useMemo(
    () => subtotalFromNewLines(lines, products),
    [lines, products],
  )

  const deliveryFeePreview = useMemo(() => {
    if (fulfillmentType !== 'delivery') return 0
    if (deliveryFee.trim() === '') return 0
    const n = Number.parseFloat(deliveryFee)
    return !Number.isNaN(n) && n > 0 ? Math.round(n * 100) / 100 : 0
  }, [fulfillmentType, deliveryFee])

  const previewTotal = useMemo(() => {
    const d = discountForPreview(discountInput)
    const raw = draftSubtotal - d + deliveryFeePreview
    return Math.round(Math.max(0, raw) * 100) / 100
  }, [discountInput, draftSubtotal, deliveryFeePreview])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    const msg = validationMessage
    if (msg) {
      setError(msg)
      return
    }

    setSaving(true)
    setError(null)

    let customerIdResolved: string
    if (customerIdFromUrl) {
      customerIdResolved = customerIdFromUrl
    } else if (customerMode === 'new') {
      const { data: created, error: eCreate } = await insertCustomer({
        user_id: user.id,
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || null,
        address: newCustomerAddress.trim() || null,
      })
      if (eCreate || !created?.id) {
        setSaving(false)
        setError(eCreate?.message ?? 'Could not create customer')
        return
      }
      customerIdResolved = String(created.id)
    } else {
      customerIdResolved = selectedCustomerId
    }

    const cust =
      customerIdFromUrl && customer
        ? customer
        : customersList.find((c) => c.id === customerIdResolved) ?? null

    const addrForDelivery =
      fulfillmentType === 'delivery'
        ? (deliveryAddress.trim() ||
            cust?.address?.trim() ||
            newCustomerAddress.trim() ||
            null)
        : null

    const feeParsed =
      fulfillmentType === 'delivery' && deliveryFee.trim() !== ''
        ? Number.parseFloat(deliveryFee)
        : null
    const deliveryFeeNum =
      feeParsed != null && !Number.isNaN(feeParsed) && feeParsed > 0 ? feeParsed : null

    const guestRes = parseGuestCountInput(guestCountInput)
    if (!guestRes.ok) {
      setSaving(false)
      setError(guestRes.message)
      return
    }

    const { data: est, error: eEst } = await insertEstimate({
      user_id: user.id,
      customer_id: customerIdResolved,
      event_date: eventDate.trim(),
      notes: notes.trim() || null,
      guest_count: guestRes.value,
      party_occasion: partyOccasion.trim() || null,
      fulfillment_type: fulfillmentType,
      delivery_address: addrForDelivery,
      pickup_address: fulfillmentType === 'pickup' ? pickupAddress.trim() : null,
    })
    if (eEst || !est) {
      setSaving(false)
      setError(eEst?.message ?? 'Could not create estimate')
      return
    }

    let subtotal = 0
    for (let i = 0; i < lines.length; i++) {
      const row = lines[i]!
      const selectedProduct = products.find((p) => p.id === row.productId)!
      const q = Number.parseFloat(row.quantity)
      const up = Number.parseFloat(row.unitPrice)
      const lineTotal = Math.round(q * up * 100) / 100
      subtotal += lineTotal
      const selected_options = selectedOptionIdsArray(row.groups, row.selection)
      const description = buildLineDescription(selectedProduct.name, row.groups, row.selection)

      const { error: eLine } = await insertEstimateLine({
        user_id: user.id,
        estimate_id: est.id,
        product_id: selectedProduct.id,
        description,
        quantity: q,
        unit_price: up,
        line_total: lineTotal,
        selected_options,
        sort_order: i,
      })
      if (eLine) {
        setSaving(false)
        setError(eLine.message)
        return
      }
    }

    subtotal = Math.round(subtotal * 100) / 100
    const discount = parseDiscountInput(discountInput)
    if (Number.isNaN(discount)) {
      setSaving(false)
      setError('Discount must be a valid amount (zero or more), or leave blank.')
      return
    }
    const { error: eTot } = await updateEstimateTotals(est.id, subtotal, discount, deliveryFeeNum)
    setSaving(false)
    if (eTot) {
      setError(eTot.message)
      return
    }

    navigate(`/estimates/${est.id}`, { replace: true })
  }

  if (loading) {
    return <p className="text-stone-600">Loading…</p>
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-1 sm:px-0 md:max-w-6xl">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/estimates" className="text-sm font-medium text-cherry-700 hover:underline">
          ← Estimates
        </Link>
        {customerIdFromUrl && customer ? (
          <Link
            to={`/customers/${customer.id}`}
            className="text-sm font-medium text-cherry-700 hover:underline"
          >
            ← {customer.name}
          </Link>
        ) : (
          <Link to="/customers" className="text-sm font-medium text-cherry-700 hover:underline">
            Customers
          </Link>
        )}
      </div>
      <h1 className="mt-2 text-2xl font-semibold text-stone-900">New estimate</h1>
      <p className="mt-1 text-sm text-stone-600">
        Customer, fulfillment, event date, then one or more catalog products. Print or PDF from the
        estimate screen.
      </p>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-6 space-y-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        {!customerIdFromUrl ? (
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-stone-800">Customer</legend>
            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="custMode"
                  checked={customerMode === 'existing'}
                  onChange={() => setCustomerMode('existing')}
                />
                <span className="text-sm text-stone-800">Existing customer</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="custMode"
                  checked={customerMode === 'new'}
                  onChange={() => setCustomerMode('new')}
                />
                <span className="text-sm text-stone-800">New customer</span>
              </label>
            </div>
            {customerMode === 'existing' ? (
              <label className="block max-w-lg">
                <span className="text-sm font-medium text-stone-700">Customer *</span>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                >
                  <option value="">Select…</option>
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.phone ? ` · ${c.phone}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-stone-700">Name *</span>
                  <input
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-700">Phone</span>
                  <input
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-stone-700">Address</span>
                  <textarea
                    value={newCustomerAddress}
                    onChange={(e) => setNewCustomerAddress(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            )}
          </fieldset>
        ) : (
          <p className="text-sm text-stone-600">
            Customer: <span className="font-medium">{customer?.name ?? '…'}</span>
          </p>
        )}

        <fieldset className="space-y-4 border-t border-stone-100 pt-6">
          <legend className="text-sm font-semibold text-stone-800">Fulfillment</legend>
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="fulfill"
                checked={fulfillmentType === 'pickup'}
                onChange={() => {
                  setFulfillmentType('pickup')
                  setDeliveryFee('')
                  setPickupAddress((p) => {
                    if (p.trim()) return p
                    return brandingPickupDefault.trim() || 'Cherry Bakehouse'
                  })
                }}
              />
              <span className="text-sm text-stone-800">Pickup / takeout</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="fulfill"
                checked={fulfillmentType === 'delivery'}
                onChange={() => setFulfillmentType('delivery')}
              />
              <span className="text-sm text-stone-800">Delivery</span>
            </label>
          </div>
          {fulfillmentType === 'pickup' ? (
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Takeout / pickup address *</span>
                <textarea
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  rows={3}
                  placeholder={
                    brandingPickupDefault.trim() || 'Cherry Bakehouse — add street, hours, notes…'
                  }
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                />
                <span className="mt-1 block text-xs text-stone-500">
                  Prefilled from Branding (Settings → default takeout address). Edit here for this quote
                  only.
                </span>
              </label>
            </div>
          ) : null}
          {fulfillmentType === 'delivery' ? (
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Delivery address *</span>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder={
                    effectiveCustomer?.address ||
                    newCustomerAddress ||
                    'Street, city, instructions…'
                  }
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                />
                <span className="mt-1 block text-xs text-stone-500">
                  Pre-filled from the customer when available; you can edit before saving.
                </span>
              </label>
              <label className="block max-w-xs">
                <span className="text-sm font-medium text-stone-700">Delivery fee (optional)</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  placeholder="0 = no charge"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          ) : null}
        </fieldset>

        <fieldset className="space-y-4 border-t border-stone-100 pt-6">
          <legend className="text-sm font-semibold text-stone-800">Estimate</legend>
          <label className="block max-w-xs">
            <span className="text-sm font-medium text-stone-700">Event date *</span>
            <input
              type="date"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
            />
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="block max-w-[10rem]">
              <span className="text-sm font-medium text-stone-700">Guest count</span>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={guestCountInput}
                onChange={(e) => setGuestCountInput(e.target.value)}
                placeholder="—"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
              />
              <span className="mt-1 block text-xs text-stone-500">Optional.</span>
            </label>
            <label className="block min-w-[12rem] max-w-md flex-1">
              <span className="text-sm font-medium text-stone-700">Occasion</span>
              <input
                type="text"
                value={partyOccasion}
                onChange={(e) => setPartyOccasion(e.target.value)}
                placeholder="e.g. Birthday, wedding"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t border-stone-100 pt-6">
          <legend className="text-sm font-semibold text-stone-800">Products</legend>
          <div className="flex flex-col gap-8 md:flex-row md:items-start">
            <div className="min-w-0 flex-1 space-y-4">
              <ul className="space-y-4">
                {lines.map((line, idx) => (
                  <NewEstimateLineBlock
                    key={line.rowId}
                    lineIndex={idx}
                    products={products}
                    line={line}
                    onPatch={(patch) => patchLine(line.rowId, patch)}
                    canRemove={lines.length > 1}
                    onRemove={() =>
                      setLines((prev) => prev.filter((l) => l.rowId !== line.rowId))
                    }
                  />
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setLines((prev) => [...prev, newEmptyLine()])}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
              >
                Add another product line
              </button>
            </div>

            <aside className="w-full shrink-0 rounded-xl border border-stone-200 bg-stone-50 p-4 md:sticky md:top-6 md:w-[min(100%,20rem)] md:self-start">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Summary</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-stone-600">Subtotal</dt>
                  <dd className="tabular-nums font-semibold text-stone-900">
                    {formatMoney(draftSubtotal)}
                  </dd>
                </div>
                <div>
                  <label className="block">
                    <span className="text-stone-600">Discount</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      placeholder="0"
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                    />
                  </label>
                  <p className="mt-1 text-xs text-stone-500">
                    Applied before delivery fee when you create the estimate.
                  </p>
                </div>
                {fulfillmentType === 'delivery' ? (
                  <div className="flex items-baseline justify-between gap-3 border-t border-stone-200 pt-3">
                    <dt className="text-stone-600">Delivery fee</dt>
                    <dd className="tabular-nums font-medium text-stone-900">
                      {deliveryFeePreview > 0 ? formatMoney(deliveryFeePreview) : '—'}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-baseline justify-between gap-3 border-t border-stone-200 pt-3">
                  <dt className="text-stone-600">Total (preview)</dt>
                  <dd className="text-base font-semibold text-cherry-900 tabular-nums">
                    {formatMoney(previewTotal)}
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </fieldset>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving || !!validationMessage}
          className="rounded-lg bg-cherry-700 px-4 py-2 text-sm font-medium text-white hover:bg-cherry-800 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Create estimate'}
        </button>
        {validationMessage && !saving ? (
          <p className="text-xs text-stone-500">{validationMessage}</p>
        ) : null}
      </form>
    </div>
  )
}
