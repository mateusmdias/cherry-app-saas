import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  buildLineDescription,
  selectedOptionIdsArray,
} from '@/features/estimates/buildLineDescription'
import { estimateNumberWithEventYearSuffix } from '@/features/estimates/estimateNumberFormat'
import {
  deleteEstimate,
  deleteEstimateLine,
  fetchBusinessBranding,
  fetchEstimateForUser,
  fetchEstimateLines,
  insertEstimateLine,
  unwrapCustomerBrief,
  updateEstimate,
  updateEstimateLine,
  updateEstimateTotals,
  type EstimateLineWithProduct,
  type EstimateWithCustomer,
} from '@/features/estimates/estimateQueries'
import {
  fetchOptionGroupsWithOptions,
  fetchProducts,
  type GroupWithOptions,
} from '@/features/products/productQueries'
import { splitDescriptionTitleAndBullets } from '@/lib/estimateLineDisplay'
import {
  ESTIMATE_TEN_DAY_FREEZE_MESSAGE,
  isEstimateEditFrozenByTenDayRule,
} from '@/features/estimates/estimateTenDayFreeze'
import { ESTIMATE_STATUS_OPTIONS, normalizeEstimateStatus } from '@/lib/estimateStatusDisplay'
import type { EstimateStatus, FulfillmentType, Product } from '@/types/database'

function formatMoney(n: string | number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n))
}

function productNotesFromLine(line: EstimateLineWithProduct): string | null {
  const p = line.products
  if (!p) return null
  const row = Array.isArray(p) ? p[0] : p
  const n = row?.notes?.trim()
  return n ? n : null
}

type LineDraft = {
  id: string
  description: string
  quantity: string
  unit_price: string
  productNotes: string | null
}

function linesToDrafts(lines: EstimateLineWithProduct[]): LineDraft[] {
  return lines.map((l) => ({
    id: l.id,
    description: l.description,
    quantity: String(l.quantity),
    unit_price: String(l.unit_price),
    productNotes: productNotesFromLine(l),
  }))
}

function subtotalFromLines(lines: { line_total: string | number }[]): number {
  return Math.round(lines.reduce((s, l) => s + Number(l.line_total), 0) * 100) / 100
}

function subtotalFromDrafts(drafts: LineDraft[]): number {
  let s = 0
  for (const row of drafts) {
    const q = Number.parseFloat(row.quantity)
    const up = Number.parseFloat(row.unit_price)
    if (Number.isNaN(q) || Number.isNaN(up)) continue
    s += q * up
  }
  return Math.round(s * 100) / 100
}

/** Empty → 0. Invalid string → NaN (caller validates on save). */
function parseDiscountInput(input: string): number {
  const t = input.trim()
  if (t === '') return 0
  const n = Number.parseFloat(t)
  if (Number.isNaN(n) || n < 0) return Number.NaN
  return Math.round(n * 100) / 100
}

function discountForImmediateTotals(input: string): number {
  const n = parseDiscountInput(input)
  return Number.isNaN(n) ? 0 : n
}

/** Empty → null. Otherwise a non‑negative integer (for headcount). */
function parseGuestCountInput(raw: string): { ok: true; value: number | null } | { ok: false; message: string } {
  const t = raw.trim()
  if (t === '') return { ok: true, value: null }
  const n = Number(t)
  if (!Number.isInteger(n) || n < 0 || n > 100_000) {
    return { ok: false, message: 'Guest count must be a whole number from 0–100,000, or leave blank.' }
  }
  return { ok: true, value: n }
}

export function EstimateEditPage() {
  const { estimateId } = useParams<{ estimateId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [estimate, setEstimate] = useState<EstimateWithCustomer | null>(null)
  const [lineDrafts, setLineDrafts] = useState<LineDraft[]>([])
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lineActionBusy, setLineActionBusy] = useState(false)

  const [eventDate, setEventDate] = useState('')
  const [notes, setNotes] = useState('')
  const [guestCountInput, setGuestCountInput] = useState('')
  const [partyOccasion, setPartyOccasion] = useState('')
  const [status, setStatus] = useState<EstimateStatus>('estimate')
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryFeeInput, setDeliveryFeeInput] = useState('')
  const [discountInput, setDiscountInput] = useState('')
  const [pickupAddress, setPickupAddress] = useState('')
  const [brandingPickupDefault, setBrandingPickupDefault] = useState('')
  const [balancePaid, setBalancePaid] = useState(false)

  const [addProductId, setAddProductId] = useState('')
  const [addGroups, setAddGroups] = useState<GroupWithOptions[]>([])
  const [addSelection, setAddSelection] = useState<Record<string, string>>({})
  const [addQty, setAddQty] = useState('1')
  const [addUnitPrice, setAddUnitPrice] = useState('')

  const load = useCallback(async () => {
    if (!estimateId || !user?.id) return
    setLoading(true)
    setError(null)
    const { data: e, error: e1 } = await fetchEstimateForUser(estimateId, user.id)
    if (e1 || !e) {
      setEstimate(null)
      setLoading(false)
      setError(e1?.message ?? 'Estimate not found')
      return
    }
    setEstimate(e)
    setEventDate(e.event_date)
    setNotes(e.notes ?? '')
    const gc = e.guest_count
    setGuestCountInput(
      gc != null && Number.isFinite(Number(gc)) ? String(Math.trunc(Number(gc))) : '',
    )
    setPartyOccasion(e.party_occasion ?? '')
    setStatus(normalizeEstimateStatus(String(e.status)))
    setFulfillmentType(e.fulfillment_type ?? 'pickup')
    setDeliveryAddress(e.delivery_address ?? '')
    const df = Number(e.delivery_fee)
    setDeliveryFeeInput(df > 0 && !Number.isNaN(df) ? String(df) : '')
    const disc = Number(e.discount)
    setDiscountInput(!Number.isNaN(disc) && disc > 0 ? String(disc) : '')
    setBalancePaid(Boolean(e.balance_paid))

    const [{ data: L, error: e2 }, { data: plist, error: e3 }, { data: brand }] = await Promise.all([
      fetchEstimateLines(estimateId),
      fetchProducts(user.id),
      fetchBusinessBranding(user.id),
    ])
    const pickupDef = (brand?.pickup_address_default ?? '').trim() || 'Cherry Bakehouse'
    setBrandingPickupDefault((brand?.pickup_address_default ?? '').trim())
    setPickupAddress(
      e.fulfillment_type === 'pickup' ? ((e.pickup_address ?? '').trim() || pickupDef) : '',
    )
    if (e2) {
      setError(e2.message)
      setLineDrafts([])
    } else {
      setLineDrafts(linesToDrafts(L ?? []))
    }
    if (e3) {
      setError((prev) => prev ?? e3.message)
      setCatalogProducts([])
    } else {
      setCatalogProducts((plist ?? []).filter((p) => p.is_active))
    }
    setLoading(false)
  }, [estimateId, user?.id])

  useEffect(() => {
    void load()
  }, [load])

  const addSelectedProduct = useMemo(
    () => catalogProducts.find((p) => p.id === addProductId) ?? null,
    [catalogProducts, addProductId],
  )

  useEffect(() => {
    if (!addProductId) {
      setAddGroups([])
      setAddSelection({})
      setAddUnitPrice('')
      return
    }
    let cancelled = false
    void (async () => {
      const { data: g } = await fetchOptionGroupsWithOptions(addProductId)
      if (cancelled) return
      const list = g ?? []
      setAddGroups(list)
      const nextSel: Record<string, string> = {}
      for (const gr of list) {
        const opts = gr.product_options ?? []
        if (opts.length === 1) nextSel[gr.id] = opts[0]!.id
      }
      setAddSelection(nextSel)
      const p = catalogProducts.find((x) => x.id === addProductId)
      if (p?.pricing_type === 'fixed' && p.base_price != null) {
        setAddUnitPrice(String(p.base_price))
      } else {
        setAddUnitPrice('')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [addProductId, catalogProducts])

  const addLineDescription = useMemo(() => {
    if (!addSelectedProduct) return ''
    return buildLineDescription(addSelectedProduct.name, addGroups, addSelection)
  }, [addSelectedProduct, addGroups, addSelection])

  const addLineValidation = useMemo(() => {
    if (!addProductId) return 'Select a product to add a line.'
    for (const g of addGroups) {
      const opts = g.product_options ?? []
      if (opts.length === 0) continue
      if (!addSelection[g.id]) return `Choose an option for “${g.label}”.`
    }
    const q = Number.parseFloat(addQty)
    if (Number.isNaN(q) || q <= 0) return 'Enter a valid quantity for the new line.'
    const up = Number.parseFloat(addUnitPrice)
    if (Number.isNaN(up) || up < 0) return 'Enter a valid unit price for the new line.'
    return null
  }, [addProductId, addGroups, addSelection, addQty, addUnitPrice])

  const lineValidation = useMemo(() => {
    for (const row of lineDrafts) {
      const q = Number.parseFloat(row.quantity)
      const up = Number.parseFloat(row.unit_price)
      if (Number.isNaN(q) || q <= 0) return 'Each line needs a valid quantity greater than zero.'
      if (Number.isNaN(up) || up < 0) return 'Each line needs a valid unit price (zero or more).'
      if (!row.description.trim()) return 'Each line needs a description.'
    }
    return null
  }, [lineDrafts])

  const draftSubtotal = useMemo(() => subtotalFromDrafts(lineDrafts), [lineDrafts])

  const deliveryFeePreview = useMemo(() => {
    if (fulfillmentType !== 'delivery') return 0
    if (deliveryFeeInput.trim() === '') return 0
    const n = Number.parseFloat(deliveryFeeInput)
    return !Number.isNaN(n) && n > 0 ? Math.round(n * 100) / 100 : 0
  }, [fulfillmentType, deliveryFeeInput])

  const previewTotal = useMemo(() => {
    const d = discountForImmediateTotals(discountInput)
    const sub = draftSubtotal
    const raw = sub - d + deliveryFeePreview
    return Math.round(Math.max(0, raw) * 100) / 100
  }, [discountInput, draftSubtotal, deliveryFeePreview])

  const freezeActive = useMemo(
    () => isEstimateEditFrozenByTenDayRule(eventDate.trim()),
    [eventDate],
  )

  async function syncTotalsFromServerLines(
    estSnap: EstimateWithCustomer,
    discountForTotals: number,
  ) {
    if (!estimateId) return { error: null as null }
    const { data: L, error: e1 } = await fetchEstimateLines(estimateId)
    if (e1) return { error: e1 }
    if (!L) return { error: { message: 'Could not load lines' } }
    const sub = subtotalFromLines(L)
    const feeParsed =
      estSnap.fulfillment_type === 'delivery' && deliveryFeeInput.trim() !== ''
        ? Number.parseFloat(deliveryFeeInput)
        : estSnap.fulfillment_type === 'delivery'
          ? Number(estSnap.delivery_fee)
          : null
    const feeNum =
      feeParsed != null && !Number.isNaN(feeParsed) && feeParsed > 0 ? feeParsed : null
    return updateEstimateTotals(estimateId, sub, Math.max(0, discountForTotals), feeNum)
  }

  async function handleRemoveLine(lineId: string) {
    if (!estimateId || !estimate || !user?.id) return
    if (freezeActive) {
      setError(ESTIMATE_TEN_DAY_FREEZE_MESSAGE)
      return
    }
    if (lineDrafts.length <= 1) {
      setError('An estimate must keep at least one line. Add another line before removing this one.')
      return
    }
    if (!window.confirm('Remove this line from the estimate?')) return
    setLineActionBusy(true)
    setError(null)
    const { error: err } = await deleteEstimateLine(lineId)
    if (err) {
      setLineActionBusy(false)
      setError(err.message)
      return
    }
    const { error: eTot } = await syncTotalsFromServerLines(
      estimate,
      discountForImmediateTotals(discountInput),
    )
    setLineActionBusy(false)
    if (eTot) {
      setError(eTot.message ?? 'Line removed but totals may be stale; refresh the page.')
    }
    await load()
  }

  async function handleAddLine() {
    if (!estimateId || !estimate || !user?.id || !addSelectedProduct) return
    if (freezeActive) {
      setError(ESTIMATE_TEN_DAY_FREEZE_MESSAGE)
      return
    }
    const msg = addLineValidation
    if (msg) {
      setError(msg)
      return
    }
    setLineActionBusy(true)
    setError(null)

    const q = Number.parseFloat(addQty)
    const up = Number.parseFloat(addUnitPrice)
    const lineTotal = Math.round(q * up * 100) / 100
    const selected_options = selectedOptionIdsArray(addGroups, addSelection)

    const { data: existing } = await fetchEstimateLines(estimateId)
    const sortOrder = (existing?.reduce((m, l) => Math.max(m, l.sort_order), -1) ?? -1) + 1

    const { error: eLine } = await insertEstimateLine({
      user_id: user.id,
      estimate_id: estimateId,
      product_id: addSelectedProduct.id,
      description: addLineDescription,
      quantity: q,
      unit_price: up,
      line_total: lineTotal,
      selected_options,
      sort_order: sortOrder,
    })
    if (eLine) {
      setLineActionBusy(false)
      setError(eLine.message)
      return
    }

    const { error: eTot } = await syncTotalsFromServerLines(
      estimate,
      discountForImmediateTotals(discountInput),
    )
    setLineActionBusy(false)
    if (eTot) {
      setError(eTot.message ?? 'Line added but totals may be wrong; open the estimate and save.')
    }

    setAddProductId('')
    setAddGroups([])
    setAddSelection({})
    setAddQty('1')
    setAddUnitPrice('')
    await load()
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!estimateId || !estimate || !user?.id) return
    if (!eventDate.trim()) {
      setError('Event date is required')
      return
    }

    if (freezeActive) {
      if (eventDate.trim() === estimate.event_date) {
        setError(
          'This event is within 10 days of today. Change the event date to postpone (more than 10 days out), then save to unlock editing.',
        )
        return
      }
      setSaving(true)
      setError(null)
      const nextEstimateNumber =
        estimateNumberWithEventYearSuffix(estimate.estimate_number, eventDate.trim()) ?? undefined
      const { error: eEst } = await updateEstimate(estimateId, {
        event_date: eventDate.trim(),
        ...(nextEstimateNumber && nextEstimateNumber !== estimate.estimate_number
          ? { estimate_number: nextEstimateNumber }
          : {}),
      })
      setSaving(false)
      if (eEst) {
        setError(eEst.message)
        return
      }
      await load()
      return
    }

    const lv = lineValidation
    if (lv) {
      setError(lv)
      return
    }

    const cust = unwrapCustomerBrief(estimate)
    if (fulfillmentType === 'delivery') {
      const addr = deliveryAddress.trim() || cust?.address?.trim() || ''
      if (!addr) {
        setError('Delivery needs an address (enter below or save one on the customer).')
        return
      }
    }
    if (fulfillmentType === 'pickup' && !pickupAddress.trim()) {
      setError('Takeout / pickup address is required (or set a default in Branding).')
      return
    }
    if (fulfillmentType === 'delivery' && deliveryFeeInput.trim() !== '') {
      const df = Number.parseFloat(deliveryFeeInput)
      if (Number.isNaN(df) || df < 0) {
        setError('Delivery fee must be a valid amount (or leave blank for no fee).')
        return
      }
    }
    const discount = parseDiscountInput(discountInput)
    if (Number.isNaN(discount)) {
      setError('Discount must be a valid amount (zero or more), or leave blank.')
      return
    }

    const guestParsed = parseGuestCountInput(guestCountInput)
    if (!guestParsed.ok) {
      setError(guestParsed.message)
      return
    }

    setSaving(true)
    setError(null)

    const deliveryAddrResolved =
      fulfillmentType === 'delivery'
        ? (deliveryAddress.trim() || cust?.address?.trim() || null)
        : null

    const nextEstimateNumber =
      estimateNumberWithEventYearSuffix(estimate.estimate_number, eventDate.trim()) ?? undefined
    const { error: eEst } = await updateEstimate(estimateId, {
      event_date: eventDate.trim(),
      notes: notes.trim() || null,
      guest_count: guestParsed.value,
      party_occasion: partyOccasion.trim() || null,
      status,
      fulfillment_type: fulfillmentType,
      delivery_address: deliveryAddrResolved,
      pickup_address: fulfillmentType === 'pickup' ? pickupAddress.trim() || null : null,
      balance_paid: balancePaid,
      ...(nextEstimateNumber && nextEstimateNumber !== estimate.estimate_number
        ? { estimate_number: nextEstimateNumber }
        : {}),
    })
    if (eEst) {
      setSaving(false)
      setError(eEst.message)
      return
    }

    let subtotal = 0
    for (const row of lineDrafts) {
      const q = Number.parseFloat(row.quantity)
      const up = Number.parseFloat(row.unit_price)
      const lineTotal = Math.round(q * up * 100) / 100
      subtotal += lineTotal
      const { error: eLine } = await updateEstimateLine(row.id, {
        description: row.description.trim(),
        quantity: q,
        unit_price: up,
        line_total: lineTotal,
      })
      if (eLine) {
        setSaving(false)
        setError(eLine.message)
        return
      }
    }

    subtotal = Math.round(subtotal * 100) / 100
    const feeParsed =
      fulfillmentType === 'delivery' && deliveryFeeInput.trim() !== ''
        ? Number.parseFloat(deliveryFeeInput)
        : null
    const deliveryFeeNum =
      feeParsed != null && !Number.isNaN(feeParsed) && feeParsed > 0 ? feeParsed : null
    const { error: eTot } = await updateEstimateTotals(
      estimateId,
      subtotal,
      discount,
      deliveryFeeNum,
    )
    setSaving(false)
    if (eTot) {
      setError(eTot.message)
      return
    }

    await load()
  }

  async function handleDelete() {
    if (!estimateId || !estimate) return
    if (freezeActive) {
      setError(ESTIMATE_TEN_DAY_FREEZE_MESSAGE)
      return
    }
    if (
      !window.confirm(
        `Delete estimate ${estimate.estimate_number ?? ''}? This cannot be undone.`,
      )
    ) {
      return
    }
    setDeleting(true)
    setError(null)
    const { error: err } = await deleteEstimate(estimateId)
    setDeleting(false)
    if (err) {
      setError(err.message)
      return
    }
    navigate(`/customers/${estimate.customer_id}`, { replace: true })
  }

  if (loading) {
    return <p className="text-stone-600">Loading…</p>
  }

  if (error && !estimate) {
    return (
      <div>
        <p className="text-red-700">{error}</p>
        <Link to="/estimates" className="mt-4 inline-block text-cherry-700 hover:underline">
          ← Estimates
        </Link>
      </div>
    )
  }

  if (!estimate) return null

  return (
    <div>
      <Link to={`/estimates/${estimate.id}`} className="text-sm font-medium text-cherry-700 hover:underline">
        ← View estimate
      </Link>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Edit estimate</h1>
          <p className="mt-1 font-mono text-lg text-cherry-900">{estimate.estimate_number ?? '—'}</p>
          <p className="mt-1 text-sm text-stone-600">
            Customer:{' '}
            <Link
              to={`/customers/${estimate.customer_id}`}
              className="font-medium text-cherry-800 hover:underline"
            >
              {unwrapCustomerBrief(estimate)?.name ?? 'Customer'}
            </Link>
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-1 sm:items-end print:hidden">
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/estimates/${estimate.id}/print`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
            >
              Print / PDF
            </Link>
            <button
              type="button"
              disabled={deleting || freezeActive}
              onClick={() => void handleDelete()}
              className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete estimate'}
            </button>
          </div>
          <Link to="/branding" className="text-xs font-medium text-cherry-700 hover:underline sm:text-right">
            Customize invoice PDF (colors, logo, background)
          </Link>
        </div>
      </div>

      <form
        onSubmit={(e) => void handleSave(e)}
        className="mt-6 space-y-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        {freezeActive ? (
          <p
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
            role="status"
          >
            {ESTIMATE_TEN_DAY_FREEZE_MESSAGE}
          </p>
        ) : null}
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-stone-800">Details</legend>
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
          <label className="block max-w-md">
            <span className="text-sm font-medium text-stone-700">Status</span>
            <select
              value={status}
              disabled={freezeActive}
              onChange={(e) => setStatus(e.target.value as EstimateStatus)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
            >
              {ESTIMATE_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Notes</span>
            <textarea
              value={notes}
              disabled={freezeActive}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
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
                disabled={freezeActive}
                onChange={(e) => setGuestCountInput(e.target.value)}
                placeholder="—"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
              />
              <span className="mt-1 block text-xs text-stone-500">Optional. Whole number.</span>
            </label>
            <label className="block min-w-[12rem] max-w-md flex-1">
              <span className="text-sm font-medium text-stone-700">Occasion</span>
              <input
                type="text"
                value={partyOccasion}
                disabled={freezeActive}
                onChange={(e) => setPartyOccasion(e.target.value)}
                placeholder="e.g. Birthday, wedding"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
              />
            </label>
          </div>
          <label className="flex cursor-pointer items-center gap-2 pt-1">
            <input
              type="checkbox"
              checked={balancePaid}
              disabled={freezeActive}
              onChange={(e) => setBalancePaid(e.target.checked)}
              className="rounded border-stone-300 text-cherry-700 focus:ring-cherry-500"
            />
            <span className="text-sm text-stone-800">Balance paid in full (Zelle / Venmo / cash)</span>
          </label>
          <p className="text-xs text-stone-500">
            Used for income reports. No payment processing in the app — this is your manual record.
          </p>
        </fieldset>

        <fieldset className="space-y-4 border-t border-stone-100 pt-6">
          <legend className="text-sm font-semibold text-stone-800">Fulfillment</legend>
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="fulfillEdit"
                disabled={freezeActive}
                checked={fulfillmentType === 'pickup'}
                onChange={() => {
                  setFulfillmentType('pickup')
                  setDeliveryFeeInput('')
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
                name="fulfillEdit"
                disabled={freezeActive}
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
                  disabled={freezeActive}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  rows={3}
                  placeholder={
                    brandingPickupDefault.trim() || 'Cherry Bakehouse — street, hours, notes…'
                  }
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                />
                <span className="mt-1 block text-xs text-stone-500">
                  Prefilled from Branding; edit here for this quote only.
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
                  disabled={freezeActive}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block max-w-xs">
                <span className="text-sm font-medium text-stone-700">Delivery fee (optional)</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={deliveryFeeInput}
                  disabled={freezeActive}
                  onChange={(e) => setDeliveryFeeInput(e.target.value)}
                  placeholder="No fee"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          ) : null}
        </fieldset>

        <div className="border-t border-stone-100 pt-6">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1 space-y-8">
              <fieldset className="space-y-4">
                <legend className="sr-only">Products on this estimate</legend>
                {lineDrafts.length === 0 ? (
                  <p className="text-sm text-stone-600">No lines to edit.</p>
                ) : (
                  <ul className="space-y-6">
                    {lineDrafts.map((row, idx) => {
                      const { title, bullets } = splitDescriptionTitleAndBullets(row.description)
                      return (
                        <li
                          key={row.id}
                          className="rounded-lg border border-stone-200 bg-stone-50/50 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="text-xs font-medium uppercase text-stone-500">
                              Line {idx + 1}
                            </p>
                            <button
                              type="button"
                              disabled={lineActionBusy || lineDrafts.length <= 1 || freezeActive}
                              onClick={() => void handleRemoveLine(row.id)}
                              className="text-sm text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Remove line
                            </button>
                          </div>
                          <div className="mt-2 rounded-md border border-stone-100 bg-white px-3 py-2 text-sm">
                            <p className="font-medium text-stone-900">{title || row.description}</p>
                            {bullets.length > 0 ? (
                              <ul className="mt-1.5 list-disc pl-5 text-stone-600">
                                {bullets.map((b, i) => (
                                  <li key={`${row.id}-b-${i}`}>{b}</li>
                                ))}
                              </ul>
                            ) : null}
                            {row.productNotes ? (
                              <p className="mt-2 whitespace-pre-wrap text-xs text-stone-500">
                                {row.productNotes}
                              </p>
                            ) : null}
                          </div>
                          <label className="mt-3 block">
                            <span className="text-sm font-medium text-stone-700">
                              Description (full text)
                            </span>
                            <textarea
                              value={row.description}
                              disabled={freezeActive}
                              onChange={(e) =>
                                setLineDrafts((prev) =>
                                  prev.map((r) =>
                                    r.id === row.id ? { ...r, description: e.target.value } : r,
                                  ),
                                )
                              }
                              rows={2}
                              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                            />
                          </label>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label className="block">
                              <span className="text-sm font-medium text-stone-700">Quantity</span>
                              <input
                                type="number"
                                min={0.01}
                                step={0.01}
                                value={row.quantity}
                                disabled={freezeActive}
                                onChange={(e) =>
                                  setLineDrafts((prev) =>
                                    prev.map((r) =>
                                      r.id === row.id ? { ...r, quantity: e.target.value } : r,
                                    ),
                                  )
                                }
                                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                              />
                            </label>
                            <label className="block">
                              <span className="text-sm font-medium text-stone-700">Unit price (USD)</span>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={row.unit_price}
                                disabled={freezeActive}
                                onChange={(e) =>
                                  setLineDrafts((prev) =>
                                    prev.map((r) =>
                                      r.id === row.id ? { ...r, unit_price: e.target.value } : r,
                                    ),
                                  )
                                }
                                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                              />
                            </label>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </fieldset>

              <fieldset className="space-y-4 border-t border-stone-100 pt-8 lg:border-t-0 lg:pt-0">
                <legend className="text-sm font-semibold text-stone-800">Add line</legend>
                <p className="text-sm text-stone-600">
                  Pick a product and options, then add the line. Line totals sync immediately; use Save to
                  persist header fields and the summary below.
                </p>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <label className="block min-w-[12rem] flex-1">
                    <span className="text-sm font-medium text-stone-700">Product</span>
                    <select
                      value={addProductId}
                      disabled={freezeActive}
                      onChange={(e) => setAddProductId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                    >
                      <option value="">Select…</option>
                      {catalogProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.pricing_type === 'quote_only' ? ' (quote-only)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="text-sm text-stone-600">
                    <Link to="/products/new" className="font-medium text-cherry-700 hover:underline">
                      New product
                    </Link>
                    <span className="text-stone-500"> · reload after saving</span>
                  </p>
                </div>

                {addGroups.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Variables</p>
                    {addGroups.map((g) => {
                      const opts = g.product_options ?? []
                      if (opts.length === 0) return null
                      return (
                        <label key={g.id} className="block">
                          <span className="text-sm font-medium text-stone-700">{g.label}</span>
                          <select
                            value={addSelection[g.id] ?? ''}
                            disabled={freezeActive}
                            onChange={(e) =>
                              setAddSelection((prev) => ({ ...prev, [g.id]: e.target.value }))
                            }
                            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                          >
                            <option value="">Select…</option>
                            {opts.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      )
                    })}
                  </div>
                ) : null}

                {addProductId ? (
                  <div className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">
                    <span className="font-medium text-stone-600">New line preview:</span>{' '}
                    {addLineDescription || addSelectedProduct?.name}
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-stone-700">Quantity</span>
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={addQty}
                      disabled={freezeActive}
                      onChange={(e) => setAddQty(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-stone-700">Unit price (USD)</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={addUnitPrice}
                      disabled={freezeActive}
                      onChange={(e) => setAddUnitPrice(e.target.value)}
                      placeholder={
                        addSelectedProduct?.pricing_type === 'quote_only' ? 'Quote amount' : ''
                      }
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  disabled={lineActionBusy || !!addLineValidation || freezeActive}
                  onClick={() => void handleAddLine()}
                  className="rounded-lg border border-cherry-600 bg-cherry-50 px-3 py-2 text-sm font-medium text-cherry-900 hover:bg-cherry-100 disabled:opacity-50"
                >
                  {lineActionBusy ? 'Working…' : 'Add line to estimate'}
                </button>
                {addLineValidation && addProductId ? (
                  <p className="text-xs text-stone-500">{addLineValidation}</p>
                ) : null}
              </fieldset>
            </div>

            <aside className="w-full shrink-0 rounded-xl border border-stone-200 bg-stone-50 p-4 lg:sticky lg:top-6 lg:w-[min(100%,20rem)] lg:self-start">
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
                      disabled={freezeActive}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      placeholder="0"
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                    />
                  </label>
                  <p className="mt-1 text-xs text-stone-500">Applied before delivery fee. Save to persist.</p>
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
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 border-t border-stone-100 pt-4">
          <button
            type="submit"
            disabled={
              saving ||
              (!freezeActive && !!lineValidation) ||
              (freezeActive && eventDate.trim() === estimate.event_date)
            }
            className="rounded-lg bg-cherry-700 px-4 py-2 text-sm font-medium text-white hover:bg-cherry-800 disabled:opacity-60"
          >
            {saving ? 'Saving…' : freezeActive ? 'Save new event date' : 'Save changes'}
          </button>
          {lineValidation && !freezeActive ? (
            <p className="self-center text-xs text-stone-500">{lineValidation}</p>
          ) : null}
        </div>
      </form>
    </div>
  )
}
