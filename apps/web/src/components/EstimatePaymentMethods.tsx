import type { ReactNode } from 'react'

/** Branding row fields used for payment display (subset of BusinessBrandingRow). */
export type PaymentMethodsBranding = {
  payment_venmo_tag?: string | null
  payment_zelle_tag?: string | null
  payment_zelle_recipient_name?: string | null
}

export function hasPaymentMethodsContent(brand: PaymentMethodsBranding | null | undefined): boolean {
  if (!brand) return false
  return Boolean(
    brand.payment_venmo_tag?.trim() ||
      brand.payment_zelle_tag?.trim() ||
      brand.payment_zelle_recipient_name?.trim(),
  )
}

type PrintTheme = {
  captionColor: string
  text: string
  labelsFs: number
  tableFs: number
}

export function EstimatePaymentMethods({
  brand,
  variant,
  printTheme,
  dividerColor,
  embedded,
  detailStyle = 'standalone',
}: {
  brand: PaymentMethodsBranding | null | undefined
  variant: 'detail' | 'print'
  printTheme?: PrintTheme
  /** Top border for print section (e.g. rgba from caption color). */
  dividerColor?: string
  /** Print: omit outer border/margins when placed in a grid beside totals. */
  embedded?: boolean
  /** Detail: `grid` = no top margin (sits beside summary). */
  detailStyle?: 'standalone' | 'grid'
}) {
  const venmo = brand?.payment_venmo_tag?.trim() || null
  const zelleTag = brand?.payment_zelle_tag?.trim() || null
  const zelleName = brand?.payment_zelle_recipient_name?.trim() || null
  const showVenmo = Boolean(venmo)
  const showZelle = Boolean(zelleTag || zelleName)
  if (!showVenmo && !showZelle) return null

  if (variant === 'detail') {
    const wrap = (children: ReactNode) => (
      <div
        className={`rounded-xl border border-stone-200 bg-white p-4 shadow-sm print:break-inside-avoid ${
          detailStyle === 'standalone' ? 'mt-8' : ''
        } min-w-0`}
      >
        {children}
      </div>
    )
    return wrap(
      <>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Payment</h2>
        <div className="mt-3 space-y-4 text-sm text-stone-800">
          {showVenmo ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Venmo</p>
              <p className="mt-1 whitespace-pre-wrap text-stone-800">{venmo}</p>
            </div>
          ) : null}
          {showZelle ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Zelle</p>
              {zelleName ? (
                <p className="mt-1 text-stone-700">
                  <span className="font-medium text-stone-600">Recipient:</span> {zelleName}
                </p>
              ) : null}
              {zelleTag ? (
                <p className="mt-1 whitespace-pre-wrap text-stone-800">{zelleTag}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </>,
    )
  }

  const t = printTheme!
  const inner = (
    <>
      <h2
        className="font-semibold uppercase tracking-wide"
        style={{ color: t.captionColor, fontSize: t.labelsFs }}
      >
        Payment
      </h2>
      <div className="mt-2 space-y-3" style={{ color: t.text, fontSize: t.tableFs }}>
        {showVenmo ? (
          <div>
            <p className="font-semibold uppercase tracking-wide" style={{ color: t.captionColor, fontSize: t.labelsFs }}>
              Venmo
            </p>
            <p className="mt-1 whitespace-pre-wrap">{venmo}</p>
          </div>
        ) : null}
        {showZelle ? (
          <div>
            <p className="font-semibold uppercase tracking-wide" style={{ color: t.captionColor, fontSize: t.labelsFs }}>
              Zelle
            </p>
            {zelleName ? (
              <p className="mt-1">
                <span style={{ color: t.captionColor }}>Recipient: </span>
                {zelleName}
              </p>
            ) : null}
            {zelleTag ? <p className="mt-1 whitespace-pre-wrap">{zelleTag}</p> : null}
          </div>
        ) : null}
      </div>
    </>
  )

  if (embedded) {
    return <div className="min-w-0 print:break-inside-avoid">{inner}</div>
  }

  return (
    <section
      className="mt-8 border-t pt-4 print:break-inside-avoid"
      style={{ borderColor: dividerColor ?? t.captionColor }}
    >
      {inner}
    </section>
  )
}
