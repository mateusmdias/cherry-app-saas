import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  duplicateEstimateForUser,
  fetchBusinessBranding,
  fetchEstimateForUser,
  fetchEstimateLines,
  resolveInvoicePrintTheme,
  unwrapCustomerBrief,
  updateEstimate,
  type BusinessBrandingRow,
  type EstimateLineWithProduct,
  type EstimateWithCustomer,
} from '@/features/estimates/estimateQueries'
import {
  EstimatePaymentMethods,
  hasPaymentMethodsContent,
  type PaymentMethodsBranding,
} from '@/components/EstimatePaymentMethods'
import { splitDescriptionTitleAndBullets } from '@/lib/estimateLineDisplay'
import {
  ESTIMATE_STATUS_OPTIONS,
  normalizeEstimateStatus,
} from '@/lib/estimateStatusDisplay'
import { rgbaFromHex } from '@/lib/rgbaFromHex'
import type { EstimateStatus } from '@/types/database'

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

function productNotesFromLine(line: EstimateLineWithProduct): string | null {
  const p = line.products
  if (!p) return null
  const row = Array.isArray(p) ? p[0] : p
  const n = row?.notes?.trim()
  return n ? n : null
}

function fulfillmentLabel(t: string | null | undefined) {
  if (t === 'delivery') return 'Delivery'
  if (t === 'pickup') return 'Pickup / takeout'
  return '—'
}

function EstimateSummaryAside({
  estimate,
  deliveryFeeNum,
  showEditHint,
}: {
  estimate: EstimateWithCustomer
  deliveryFeeNum: number
  showEditHint: boolean
}) {
  return (
    <aside className="w-full shrink-0 rounded-xl border border-stone-200 bg-stone-50 p-4 lg:w-[min(100%,20rem)] lg:justify-self-end">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Summary</h3>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-stone-600">Subtotal</dt>
          <dd className="tabular-nums font-semibold text-stone-900">{formatMoney(estimate.subtotal)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-stone-600">Discount</dt>
          <dd className="tabular-nums font-semibold text-stone-900">{formatMoney(estimate.discount)}</dd>
        </div>
        {estimate.fulfillment_type === 'delivery' ? (
          <div className="flex items-baseline justify-between gap-3 border-t border-stone-200 pt-3">
            <dt className="text-stone-600">Delivery fee</dt>
            <dd className="tabular-nums font-medium text-stone-900">
              {deliveryFeeNum > 0 ? formatMoney(estimate.delivery_fee ?? 0) : '—'}
            </dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between gap-3 border-t border-stone-200 pt-3">
          <dt className="text-stone-600">Total</dt>
          <dd className="text-lg font-semibold text-cherry-900 tabular-nums">{formatMoney(estimate.total)}</dd>
        </div>
      </dl>
      {showEditHint ? (
        <p className="mt-4 text-xs text-stone-500">
          To change amounts, use{' '}
          <Link to={`/estimates/${estimate.id}/edit`} className="font-medium text-cherry-800 hover:underline">
            Edit estimate
          </Link>
          .
        </p>
      ) : null}
    </aside>
  )
}

export function EstimateDetailPage() {
  const { estimateId } = useParams<{ estimateId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [estimate, setEstimate] = useState<EstimateWithCustomer | null>(null)
  const [lines, setLines] = useState<EstimateLineWithProduct[]>([])
  const [invoiceDisclaimer, setInvoiceDisclaimer] = useState<string | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsBranding | null>(null)
  const [brandingForInvoice, setBrandingForInvoice] = useState<BusinessBrandingRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dupBusy, setDupBusy] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)

  const load = useCallback(async () => {
    if (!estimateId || !user?.id) return
    setLoading(true)
    setError(null)
    const [{ data: e, error: e1 }, { data: brand }] = await Promise.all([
      fetchEstimateForUser(estimateId, user.id),
      fetchBusinessBranding(user.id),
    ])
    if (e1 || !e) {
      setEstimate(null)
      setLines([])
      setInvoiceDisclaimer(null)
      setPaymentMethods(null)
      setBrandingForInvoice(null)
      setLoading(false)
      setError(e1?.message ?? 'Estimate not found')
      return
    }
    setEstimate(e)
    setInvoiceDisclaimer(brand?.invoice_disclaimer?.trim() || null)
    setBrandingForInvoice((brand as BusinessBrandingRow | null) ?? null)
    setPaymentMethods({
      payment_venmo_tag: brand?.payment_venmo_tag ?? null,
      payment_zelle_tag: brand?.payment_zelle_tag ?? null,
      payment_zelle_recipient_name: brand?.payment_zelle_recipient_name ?? null,
    })
    const { data: L, error: e2 } = await fetchEstimateLines(estimateId)
    if (e2) {
      setError(e2.message)
      setLines([])
    } else {
      setLines(L ?? [])
    }
    setLoading(false)
  }, [estimateId, user?.id])

  useEffect(() => {
    void load()
  }, [load])

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

  const cust = unwrapCustomerBrief(estimate)
  const deliveryFeeNum = Number(estimate.delivery_fee) || 0
  const showPaymentMethods = hasPaymentMethodsContent(paymentMethods)
  const invoiceTheme = resolveInvoicePrintTheme(brandingForInvoice)
  const tableHeaderBorder = rgbaFromHex(invoiceTheme.sectionTitleColor, 0.35)

  async function handleStatusChange(next: EstimateStatus) {
    if (!estimate) return
    const current = normalizeEstimateStatus(String(estimate.status))
    if (next === current) return
    setStatusSaving(true)
    setError(null)
    const { error: err } = await updateEstimate(estimate.id, { status: next })
    setStatusSaving(false)
    if (err) {
      setError(err.message ?? 'Could not update status')
      return
    }
    setEstimate((prev) => (prev ? { ...prev, status: next } : null))
  }

  async function handleDuplicate() {
    if (!estimate || !user?.id) return
    if (
      !window.confirm(
        'Create a new estimate for the same customer, copying all line items, totals, and fulfillment details?',
      )
    ) {
      return
    }
    setDupBusy(true)
    setError(null)
    const { data, error: err } = await duplicateEstimateForUser(estimate.id, user.id)
    setDupBusy(false)
    if (err) {
      setError(err.message ?? 'Could not duplicate estimate')
      return
    }
    if (data?.id) {
      navigate(`/estimates/${data.id}`)
    }
  }

  return (
    <div>
      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <Link to="/estimates" className="text-sm font-medium text-cherry-700 hover:underline">
        ← Estimates
      </Link>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            {estimate.estimate_number ?? '—'}
          </p>
          <div className="mt-3 inline-flex items-center rounded-lg border border-cherry-200 bg-cherry-50 px-3 py-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-cherry-800">
              Event
            </span>
            <span className="ml-2 text-sm font-semibold text-cherry-950">
              {formatDate(estimate.event_date)}
            </span>
          </div>
          {estimate.guest_count != null && !Number.isNaN(Number(estimate.guest_count)) ? (
            <p className="mt-2 text-sm text-stone-600">
              <span className="font-medium text-stone-700">Guests:</span>{' '}
              {Math.trunc(Number(estimate.guest_count))}
            </p>
          ) : null}
          {estimate.party_occasion?.trim() ? (
            <p className="mt-1 text-sm text-stone-600">
              <span className="font-medium text-stone-700">Occasion:</span>{' '}
              {estimate.party_occasion.trim()}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-600">
            <label className="inline-flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Status
              </span>
              <select
                aria-label="Estimate status"
                disabled={statusSaving || dupBusy}
                value={normalizeEstimateStatus(String(estimate.status))}
                onChange={(e) => void handleStatusChange(e.target.value as EstimateStatus)}
                className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm font-medium text-stone-800 shadow-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {ESTIMATE_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {statusSaving ? (
              <span className="text-xs text-stone-500" role="status">
                Saving…
              </span>
            ) : null}
            <span className="hidden sm:inline text-stone-300" aria-hidden>
              ·
            </span>
            <span className="sm:ml-0">{fulfillmentLabel(estimate.fulfillment_type)}</span>
            {estimate.balance_paid ? (
              <>
                <span className="text-stone-300">·</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
                  Balance paid
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-1 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/estimates/${estimate.id}/edit`}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
            >
              Edit
            </Link>
            <Link
              to={`/estimates/${estimate.id}/print`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-cherry-700 px-3 py-2 text-sm font-medium text-white hover:bg-cherry-800"
            >
              Print / PDF
            </Link>
            <button
              type="button"
              disabled={dupBusy}
              onClick={() => void handleDuplicate()}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50"
            >
              {dupBusy ? 'Copying…' : 'Duplicate'}
            </button>
          </div>
          <Link to="/branding" className="text-xs font-medium text-cherry-700 hover:underline sm:text-right">
            Customize invoice PDF (colors, logo, payment methods)
          </Link>
        </div>
      </div>

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Customer</h2>
        <p className="mt-2 text-lg font-semibold text-stone-900">
          <Link
            to={`/customers/${estimate.customer_id}`}
            className="text-cherry-900 hover:underline"
          >
            {cust?.name ?? 'Customer'}
          </Link>
        </p>
        {cust?.phone ? (
          <p className="mt-2 text-sm text-stone-700">
            <span className="font-medium text-stone-600">Phone:</span> {cust.phone}
          </p>
        ) : (
          <p className="mt-2 text-sm text-stone-500">No phone on file.</p>
        )}
        {cust?.address ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">
            <span className="font-medium text-stone-600">Address:</span>
            <br />
            {cust.address}
          </p>
        ) : (
          <p className="mt-2 text-sm text-stone-500">No address on file.</p>
        )}
        {estimate.fulfillment_type === 'delivery' && estimate.delivery_address ? (
          <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase text-stone-500">Deliver to</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-stone-800">
              {estimate.delivery_address}
            </p>
          </div>
        ) : null}
        {estimate.fulfillment_type === 'pickup' && estimate.pickup_address?.trim() ? (
          <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase text-stone-500">Takeout / pickup</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-stone-800">
              {estimate.pickup_address}
            </p>
          </div>
        ) : null}
      </section>

      {estimate.notes ? (
        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-stone-700">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-stone-600">{estimate.notes}</p>
        </section>
      ) : null}

      <section className="mt-8">
        {lines.length === 0 ? (
          <div className="mt-3 space-y-6">
            <p className="text-sm text-stone-600">No lines on this estimate.</p>
            {showPaymentMethods ? (
              <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_min(100%,20rem)] sm:items-start print:grid-cols-[1fr_18rem]">
                <EstimatePaymentMethods brand={paymentMethods} variant="detail" detailStyle="grid" />
                <EstimateSummaryAside
                  estimate={estimate}
                  deliveryFeeNum={deliveryFeeNum}
                  showEditHint={false}
                />
              </div>
            ) : (
              <div className="flex justify-end">
                <EstimateSummaryAside
                  estimate={estimate}
                  deliveryFeeNum={deliveryFeeNum}
                  showEditHint={false}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-6">
            <div className="min-w-0 overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead>
                  <tr
                    className="border-b-2 text-left text-xs uppercase"
                    style={{
                      borderColor: tableHeaderBorder,
                      color: invoiceTheme.tableHeaderTextColor,
                      backgroundColor: invoiceTheme.tableHeaderBgColor,
                      fontSize: invoiceTheme.lineItemsHeadingFs,
                    }}
                  >
                    <th className="px-4 py-2 font-medium">Description</th>
                    <th className="px-4 py-2 font-medium">Qty</th>
                    <th className="px-4 py-2 font-medium">Unit price</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const { title, bullets } = splitDescriptionTitleAndBullets(line.description)
                    const pNotes = productNotesFromLine(line)
                    return (
                      <tr key={line.id} className="border-b border-stone-100 last:border-0">
                        <td className="px-4 py-3 text-stone-900">
                          <div className="font-medium">{title || line.description}</div>
                          {bullets.length > 0 ? (
                            <ul className="mt-1.5 list-disc pl-5 text-sm text-stone-600">
                              {bullets.map((b, i) => (
                                <li key={`${line.id}-v-${i}`}>{b}</li>
                              ))}
                            </ul>
                          ) : null}
                          {pNotes ? (
                            <p className="mt-2 whitespace-pre-wrap text-sm text-stone-500">{pNotes}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-stone-700">{Number(line.quantity)}</td>
                        <td className="px-4 py-3 tabular-nums text-stone-700">
                          {formatMoney(line.unit_price)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-stone-900">
                          {formatMoney(line.line_total)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {showPaymentMethods ? (
              <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_min(100%,20rem)] sm:items-start print:grid-cols-[1fr_18rem]">
                <EstimatePaymentMethods brand={paymentMethods} variant="detail" detailStyle="grid" />
                <EstimateSummaryAside
                  estimate={estimate}
                  deliveryFeeNum={deliveryFeeNum}
                  showEditHint
                />
              </div>
            ) : (
              <div className="flex justify-end">
                <EstimateSummaryAside estimate={estimate} deliveryFeeNum={deliveryFeeNum} showEditHint />
              </div>
            )}
          </div>
        )}
      </section>

      {invoiceDisclaimer ? (
        <section className="mt-8 rounded-xl border border-stone-200 bg-white p-4 shadow-sm print:break-inside-avoid">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Disclaimer</h2>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-stone-600">
            {invoiceDisclaimer}
          </p>
        </section>
      ) : null}
    </div>
  )
}
