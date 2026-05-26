import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  fetchBusinessBranding,
  fetchEstimateForUser,
  fetchEstimateLines,
  getBrandingSignedUrl,
  resolveInvoicePrintTheme,
  unwrapCustomerBrief,
  type BusinessBrandingRow,
  type EstimateLineWithProduct,
  type EstimateWithCustomer,
} from '@/features/estimates/estimateQueries'
import { InvoiceFooterWave } from '@/components/InvoiceFooterWave'
import { EstimatePaymentMethods, hasPaymentMethodsContent } from '@/components/EstimatePaymentMethods'
import { splitDescriptionTitleAndBullets } from '@/lib/estimateLineDisplay'
import { rgbaFromHex } from '@/lib/rgbaFromHex'

function formatMoney(n: string | number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n))
}

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
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

type InvoicePrintTheme = ReturnType<typeof resolveInvoicePrintTheme>

function PrintInvoiceTotalsBlock({
  t,
  borderLight,
  estimate,
  deliveryFeeNum,
}: {
  t: InvoicePrintTheme
  borderLight: string
  estimate: EstimateWithCustomer
  deliveryFeeNum: number
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between gap-6">
        <span style={{ color: t.captionColor }}>Subtotal</span>
        <span className="tabular-nums font-medium" style={{ color: t.footerValueColor }}>
          {formatMoney(estimate.subtotal)}
        </span>
      </div>
      <div className="flex justify-between gap-6">
        <span style={{ color: t.captionColor }}>Discount</span>
        <span className="tabular-nums font-medium" style={{ color: t.footerValueColor }}>
          {formatMoney(estimate.discount)}
        </span>
      </div>
      {estimate.fulfillment_type === 'delivery' ? (
        <div className="flex justify-between gap-6">
          <span style={{ color: t.captionColor }}>Delivery fee</span>
          <span className="tabular-nums font-medium" style={{ color: t.footerValueColor }}>
            {deliveryFeeNum > 0 ? formatMoney(estimate.delivery_fee ?? 0) : '—'}
          </span>
        </div>
      ) : null}
      <div
        className="flex justify-between gap-6 border-t pt-2"
        style={{ borderColor: borderLight, fontSize: t.grandTotalFs }}
      >
        <span className="font-semibold" style={{ color: t.grandTotalLabelColor }}>
          Total
        </span>
        <span className="tabular-nums font-bold" style={{ color: t.grandTotalAmountColor }}>
          {formatMoney(estimate.total)}
        </span>
      </div>
    </div>
  )
}

export function EstimatePrintPage() {
  const { estimateId } = useParams<{ estimateId: string }>()
  const { user } = useAuth()
  const [estimate, setEstimate] = useState<EstimateWithCustomer | null>(null)
  const [lines, setLines] = useState<EstimateLineWithProduct[]>([])
  const [brand, setBrand] = useState<BusinessBrandingRow | null>(null)
  const [logoSignedUrl, setLogoSignedUrl] = useState<string | null>(null)
  const [backgroundSignedUrl, setBackgroundSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const documentTitleBeforePrintRef = useRef<string | null>(null)

  const load = useCallback(async () => {
    if (!estimateId || !user?.id) return
    setLoading(true)
    setError(null)
    setLogoSignedUrl(null)
    setBackgroundSignedUrl(null)
    const [{ data: e, error: e1 }, { data: branding }] = await Promise.all([
      fetchEstimateForUser(estimateId, user.id),
      fetchBusinessBranding(user.id),
    ])
    if (e1 || !e) {
      setEstimate(null)
      setLines([])
      setBrand(null)
      setLoading(false)
      setError(e1?.message ?? 'Estimate not found')
      return
    }
    setEstimate(e)
    setBrand(branding ?? null)
    if (branding?.logo_path?.trim()) {
      const { signedUrl } = await getBrandingSignedUrl(branding.logo_path)
      setLogoSignedUrl(signedUrl)
    } else {
      setLogoSignedUrl(null)
    }
    if (branding?.invoice_background_image_path?.trim()) {
      const { signedUrl } = await getBrandingSignedUrl(branding.invoice_background_image_path)
      setBackgroundSignedUrl(signedUrl)
    } else {
      setBackgroundSignedUrl(null)
    }
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

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  useEffect(() => {
    documentTitleBeforePrintRef.current = document.title
    return () => {
      if (documentTitleBeforePrintRef.current != null) {
        document.title = documentTitleBeforePrintRef.current
      }
    }
  }, [])

  useEffect(() => {
    if (!estimate?.estimate_number?.trim()) return
    document.title = estimate.estimate_number.trim()
  }, [estimate?.estimate_number])

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 text-stone-600 print:p-0">Loading…</div>
    )
  }

  if (error && !estimate) {
    return (
      <div className="min-h-screen bg-white p-8">
        <p className="text-red-700">{error}</p>
        <Link to="/estimates" className="mt-4 inline-block text-cherry-700 print:hidden">
          ← Estimates
        </Link>
      </div>
    )
  }

  if (!estimate) return null

  const t = resolveInvoicePrintTheme(brand)
  const invoiceDisclaimer = brand?.invoice_disclaimer?.trim() || null
  const borderSoft = rgbaFromHex(t.sectionTitleColor, 0.35)
  const borderLight = rgbaFromHex(t.captionColor, 0.45)
  const cust = unwrapCustomerBrief(estimate)
  const deliveryFeeNum = Number(estimate.delivery_fee) || 0
  const orderNotes = estimate.notes?.trim() ?? ''
  const showPaymentMethods = hasPaymentMethodsContent(brand)

  const printColorAdjust = { printColorAdjust: 'exact' as const, WebkitPrintColorAdjust: 'exact' as const }

  return (
    <div className="estimate-print-shell relative min-h-screen print:min-h-0" style={printColorAdjust}>
      <style>
        {`@media print {
          @page { margin-bottom: 16mm; }
        }`}
      </style>
      {backgroundSignedUrl ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 print:absolute"
          style={{
            ...printColorAdjust,
            backgroundImage: `url(${backgroundSignedUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ) : null}
      <div
        className="relative min-h-screen print:min-h-0"
        style={{
          ...printColorAdjust,
          backgroundColor: backgroundSignedUrl ? 'rgba(255, 255, 255, 0.92)' : '#ffffff',
        }}
      >
        <div
          className="mx-auto max-w-3xl px-6 py-8 print:px-0 print:py-0"
          style={{ ...printColorAdjust, fontSize: t.bodyFs, color: t.text }}
        >
          <div className="print:hidden mb-6 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-cherry-700 px-4 py-2 text-sm font-medium text-white hover:bg-cherry-800"
            >
              Print / Save as PDF
            </button>
            <Link
              to={`/estimates/${estimate.id}/edit`}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
            >
              Edit estimate
            </Link>
            <Link to={`/estimates/${estimate.id}`} className="text-sm text-cherry-700 hover:underline">
              ← Back
            </Link>
            </div>
            <p className="max-w-xl text-xs text-stone-500">
              PDFs use your Branding colors and logo. If you just saved Branding in another tab, switch
              back here or press Print again so this page reloads the latest settings.{' '}
              <span className="font-medium text-stone-700">
                To hide the browser’s extra lines (date, title, URL, page x/y at the edges), open Print →
                More settings and turn off “Headers and footers.”
              </span>
            </p>
          </div>

          <header
            className="flex flex-wrap items-stretch justify-between gap-6 border-b pb-6 print:break-inside-avoid"
            style={{ borderColor: borderSoft }}
          >
            <div className="flex w-44 min-w-0 shrink-0 flex-col">
              <div
                className={`flex min-h-[72px] flex-1 items-center justify-center overflow-hidden ${
                  logoSignedUrl ? 'bg-white' : ''
                }`}
                style={logoSignedUrl ? undefined : { backgroundColor: rgbaFromHex(t.captionColor, 0.08) }}
              >
                {logoSignedUrl ? (
                  <img
                    src={logoSignedUrl}
                    alt=""
                    className="h-full w-full object-contain object-left"
                  />
                ) : (
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: t.captionColor, fontSize: t.tableFs }}
                  >
                    Logo
                  </span>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1 text-right" style={{ color: t.text, fontSize: t.bodyFs }}>
              <p
                className="font-semibold uppercase tracking-wide"
                style={{ color: t.captionColor, fontSize: t.labelsFs }}
              >
                Invoice number
              </p>
              <p
                className="mt-0.5 font-mono font-bold tracking-tight"
                style={{ color: t.invoiceNumberColor, fontSize: t.invoiceNumberFs }}
              >
                {estimate.estimate_number ?? '—'}
              </p>
              <p className="mt-3 font-semibold uppercase tracking-wide" style={{ color: t.captionColor, fontSize: t.labelsFs }}>
                Event date
              </p>
              <p className="mt-0.5" style={{ color: t.text }}>
                {formatDate(estimate.event_date)}
              </p>
              {estimate.guest_count != null && !Number.isNaN(Number(estimate.guest_count)) ? (
                <>
                  <p className="mt-3 font-semibold uppercase tracking-wide" style={{ color: t.captionColor, fontSize: t.labelsFs }}>
                    Guests
                  </p>
                  <p className="mt-0.5" style={{ color: t.text }}>
                    {Math.trunc(Number(estimate.guest_count))}
                  </p>
                </>
              ) : null}
              {estimate.party_occasion?.trim() ? (
                <>
                  <p className="mt-3 font-semibold uppercase tracking-wide" style={{ color: t.captionColor, fontSize: t.labelsFs }}>
                    Occasion
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap" style={{ color: t.text }}>
                    {estimate.party_occasion.trim()}
                  </p>
                </>
              ) : null}
            </div>
          </header>

          <section
            className={`mt-8 grid gap-6 print:break-inside-avoid [&>div]:min-w-0 ${
              orderNotes ? 'sm:grid-cols-3 print:grid-cols-3' : 'sm:grid-cols-2 print:grid-cols-2'
            }`}
          >
            <div>
              <h2 className="font-semibold uppercase tracking-wide" style={{ color: t.captionColor, fontSize: t.labelsFs }}>
                Bill to
              </h2>
              <p className="mt-2 font-semibold" style={{ fontSize: t.customerNameFs, color: t.customerNameColor }}>
                {cust?.name ?? 'Customer'}
              </p>
              {cust?.phone ? (
                <p className="mt-2" style={{ color: t.text }}>
                  <span className="font-medium" style={{ color: t.captionColor }}>
                    Phone:
                  </span>{' '}
                  {cust.phone}
                </p>
              ) : (
                <p className="mt-2" style={{ color: t.captionColor, fontSize: t.tableFs }}>
                  No phone on file.
                </p>
              )}
              {cust?.address ? (
                <p className="mt-2 whitespace-pre-wrap" style={{ color: t.text }}>
                  <span className="font-medium" style={{ color: t.captionColor }}>
                    Address:
                  </span>
                  <br />
                  {cust.address}
                </p>
              ) : (
                <p className="mt-2" style={{ color: t.captionColor, fontSize: t.tableFs }}>
                  No address on file.
                </p>
              )}
            </div>

            {orderNotes ? (
              <div>
                <h2 className="font-semibold uppercase tracking-wide" style={{ color: t.captionColor, fontSize: t.labelsFs }}>
                  Order notes
                </h2>
                <p className="mt-2 whitespace-pre-wrap" style={{ fontSize: t.tableFs, color: t.text }}>
                  {orderNotes}
                </p>
              </div>
            ) : null}

            <div>
              <h2 className="font-semibold uppercase tracking-wide" style={{ color: t.captionColor, fontSize: t.labelsFs }}>
                Fulfillment
              </h2>
              <p className="mt-2 font-medium" style={{ color: t.text }}>
                {fulfillmentLabel(estimate.fulfillment_type)}
              </p>
              {estimate.fulfillment_type === 'pickup' && estimate.pickup_address?.trim() ? (
                <div className="mt-3">
                  <p className="font-semibold uppercase" style={{ color: t.captionColor, fontSize: t.labelsFs }}>
                    Pick up at
                  </p>
                  <p className="mt-1 whitespace-pre-wrap" style={{ fontSize: t.tableFs, color: t.text }}>
                    {estimate.pickup_address}
                  </p>
                </div>
              ) : null}
              {estimate.fulfillment_type === 'delivery' && estimate.delivery_address?.trim() ? (
                <div className="mt-3">
                  <p className="font-semibold uppercase" style={{ color: t.captionColor, fontSize: t.labelsFs }}>
                    Deliver to
                  </p>
                  <p className="mt-1 whitespace-pre-wrap" style={{ fontSize: t.tableFs, color: t.text }}>
                    {estimate.delivery_address}
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="mt-10 print:break-inside-avoid">
            <table
              className="w-full border-collapse"
              style={{ fontSize: t.tableFs, color: t.text }}
            >
              <thead>
                <tr
                  className="border-b-2 text-left uppercase"
                  style={{
                    borderColor: borderSoft,
                    color: t.tableHeaderTextColor,
                    backgroundColor: t.tableHeaderBgColor,
                    fontSize: t.lineItemsHeadingFs,
                  }}
                >
                  <th className="py-2 pr-3 font-medium">Description</th>
                  <th className="py-2 pr-3 font-medium">Qty</th>
                  <th className="py-2 pr-3 font-medium">Unit price</th>
                  <th className="py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const { title, bullets } = splitDescriptionTitleAndBullets(line.description)
                  const pNotes = productNotesFromLine(line)
                  return (
                    <tr key={line.id} className="align-top border-b" style={{ borderColor: borderLight, color: t.text }}>
                      <td className="py-3 pr-3">
                        <span className="font-medium" style={{ color: t.text }}>
                          {title || line.description}
                        </span>
                        {bullets.length > 0 ? (
                          <ul className="mt-1.5 list-disc pl-5" style={{ color: t.text }}>
                            {bullets.map((b, i) => (
                              <li key={`${line.id}-b-${i}`}>{b}</li>
                            ))}
                          </ul>
                        ) : null}
                        {pNotes ? (
                          <p className="mt-2 whitespace-pre-wrap" style={{ color: t.productNoteColor }}>
                            {pNotes}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3 tabular-nums" style={{ color: t.text }}>
                        {Number(line.quantity)}
                      </td>
                      <td className="py-3 pr-3 tabular-nums" style={{ color: t.text }}>
                        {formatMoney(line.unit_price)}
                      </td>
                      <td className="py-3 text-right tabular-nums font-semibold" style={{ color: t.text }}>
                        {formatMoney(line.line_total)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>

          <footer
            className="mt-10 border-t pt-6 print:break-inside-avoid"
            style={{ borderColor: borderSoft, fontSize: t.tableFs }}
          >
            {showPaymentMethods ? (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-[minmax(0,1fr)_min(100%,20rem)] sm:items-start sm:gap-10 print:grid-cols-[1fr_16rem] print:gap-8">
                <EstimatePaymentMethods
                  brand={brand}
                  variant="print"
                  embedded
                  printTheme={{
                    captionColor: t.captionColor,
                    text: t.text,
                    labelsFs: t.labelsFs,
                    tableFs: t.tableFs,
                  }}
                />
                <div className="w-full max-w-sm justify-self-end sm:max-w-none">
                  <PrintInvoiceTotalsBlock
                    t={t}
                    borderLight={borderLight}
                    estimate={estimate}
                    deliveryFeeNum={deliveryFeeNum}
                  />
                </div>
              </div>
            ) : (
              <div className="ml-auto max-w-sm">
                <PrintInvoiceTotalsBlock
                  t={t}
                  borderLight={borderLight}
                  estimate={estimate}
                  deliveryFeeNum={deliveryFeeNum}
                />
              </div>
            )}
            {invoiceDisclaimer ? (
              <p
                className="mt-8 max-w-none border-t pt-4 leading-relaxed print:break-inside-avoid whitespace-pre-wrap"
                style={{
                  borderColor: borderLight,
                  fontSize: t.disclaimerFs,
                  color: t.disclaimerColor,
                }}
              >
                {invoiceDisclaimer}
              </p>
            ) : null}
          </footer>

          <div className="mt-10 print:hidden" style={printColorAdjust}>
            <InvoiceFooterWave fill={t.footerStripe} />
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none hidden w-full print:fixed print:bottom-0 print:left-0 print:right-0 print:z-40 print:block"
        style={printColorAdjust}
        aria-hidden
      >
        <InvoiceFooterWave fill={t.footerStripe} className="h-12 w-full print:h-14" />
      </div>
    </div>
  )
}
