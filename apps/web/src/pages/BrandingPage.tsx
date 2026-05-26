import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  fetchBusinessBranding,
  getBrandingSignedUrl,
  resolveInvoicePrintTheme,
  updateBusinessBranding,
  type BusinessBrandingRow,
} from '@/features/estimates/estimateQueries'
import { InvoiceFooterWave } from '@/components/InvoiceFooterWave'
import { supabase } from '@/lib/supabase'

const DISCLAIMER_PLACEHOLDER =
  'This quote is valid for 14 days from the date above. Final pricing, design details, and pickup or delivery times are subject to confirmation. A deposit may be required to place your order.'

const DEFAULT_PRIMARY = '#b91c1c'
const DEFAULT_SECONDARY = '#1f2937'
const DEFAULT_TEXT = '#1c1917'
const DEFAULT_MUTED = '#57534e'
const DEFAULT_FOOTER_STRIPE = '#f472b6'
const DEFAULT_FONT_PX = 14
const DEFAULT_TABLE_HEADER_BG = '#f5f5f4'

const ACCEPT_IMG = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

async function removeBrandingFile(path: string | null | undefined) {
  const p = path?.trim()
  if (!p) return
  await supabase.storage.from('branding').remove([p])
}

function PrintColorRow({
  label,
  hint,
  value,
  onChange,
  fallbackForPicker,
}: {
  label: string
  hint?: string
  value: string
  onChange: (next: string) => void
  fallbackForPicker: string
}) {
  const picker = value.startsWith('#') ? value : fallbackForPicker
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <div className="mt-1 flex gap-2">
        <input
          type="color"
          value={picker}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded border border-stone-300 bg-white p-0.5"
          aria-label={label}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
        />
      </div>
      {hint ? <span className="mt-1 block text-xs text-stone-500">{hint}</span> : null}
    </label>
  )
}

export function BrandingPage() {
  const { user } = useAuth()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const bgInputRef = useRef<HTMLInputElement>(null)

  const [businessName, setBusinessName] = useState('')
  const [invoiceDisclaimer, setInvoiceDisclaimer] = useState('')
  const [paymentVenmoTag, setPaymentVenmoTag] = useState('')
  const [paymentZelleTag, setPaymentZelleTag] = useState('')
  const [paymentZelleRecipientName, setPaymentZelleRecipientName] = useState('')
  const [pickupAddressDefault, setPickupAddressDefault] = useState('')

  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY)
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY)
  const [invoiceTextColor, setInvoiceTextColor] = useState(DEFAULT_TEXT)
  const [invoiceMutedColor, setInvoiceMutedColor] = useState(DEFAULT_MUTED)
  const [printCaptionColor, setPrintCaptionColor] = useState('')
  const [printSectionTitleColor, setPrintSectionTitleColor] = useState('')
  const [printTableHeaderTextColor, setPrintTableHeaderTextColor] = useState('')
  const [printTableHeaderBgColor, setPrintTableHeaderBgColor] = useState('')
  const [printCustomerNameColor, setPrintCustomerNameColor] = useState('')
  const [printBusinessNameColor, setPrintBusinessNameColor] = useState('')
  const [printInvoiceNumberColor, setPrintInvoiceNumberColor] = useState('')
  const [printFooterValueColor, setPrintFooterValueColor] = useState('')
  const [printGrandTotalLabelColor, setPrintGrandTotalLabelColor] = useState('')
  const [printGrandTotalAmountColor, setPrintGrandTotalAmountColor] = useState('')
  const [printDisclaimerColor, setPrintDisclaimerColor] = useState('')
  const [printProductNoteColor, setPrintProductNoteColor] = useState('')
  const [footerStripeColor, setFooterStripeColor] = useState(DEFAULT_FOOTER_STRIPE)
  const [invoiceFontSizePx, setInvoiceFontSizePx] = useState(DEFAULT_FONT_PX)
  const [fontLabelsPx, setFontLabelsPx] = useState(12)
  const [fontLineItemsHeadingPx, setFontLineItemsHeadingPx] = useState(13)
  const [fontTablePx, setFontTablePx] = useState(11)
  const [fontBusinessNamePx, setFontBusinessNamePx] = useState(14)
  const [fontCustomerNamePx, setFontCustomerNamePx] = useState(16)
  const [fontInvoiceNumberPx, setFontInvoiceNumberPx] = useState(22)
  const [fontDisclaimerPx, setFontDisclaimerPx] = useState(10)
  const [fontGrandTotalPx, setFontGrandTotalPx] = useState(16)

  const [logoPath, setLogoPath] = useState<string | null>(null)
  const [backgroundPath, setBackgroundPath] = useState<string | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assetBusy, setAssetBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await fetchBusinessBranding(user.id)
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setBusinessName(data?.business_name?.trim() ?? '')
    setInvoiceDisclaimer(data?.invoice_disclaimer?.trim() ?? '')
    setPaymentVenmoTag(data?.payment_venmo_tag?.trim() ?? '')
    setPaymentZelleTag(data?.payment_zelle_tag?.trim() ?? '')
    setPaymentZelleRecipientName(data?.payment_zelle_recipient_name?.trim() ?? '')
    setPickupAddressDefault(data?.pickup_address_default?.trim() ?? '')

    setPrimaryColor(data?.primary_color?.trim() || DEFAULT_PRIMARY)
    setSecondaryColor(data?.secondary_color?.trim() || DEFAULT_SECONDARY)
    setInvoiceTextColor(data?.invoice_text_color?.trim() || DEFAULT_TEXT)
    setInvoiceMutedColor(data?.invoice_muted_text_color?.trim() || DEFAULT_MUTED)
    setFooterStripeColor(data?.invoice_footer_stripe_color?.trim() || DEFAULT_FOOTER_STRIPE)
    const row = data as BusinessBrandingRow | null
    const t = resolveInvoicePrintTheme(row)
    setInvoiceFontSizePx(t.bodyFs)
    setFontLabelsPx(t.labelsFs)
    setFontLineItemsHeadingPx(t.lineItemsHeadingFs)
    setFontTablePx(t.tableFs)
    setFontBusinessNamePx(t.businessNameFs)
    setFontCustomerNamePx(t.customerNameFs)
    setFontInvoiceNumberPx(t.invoiceNumberFs)
    setFontDisclaimerPx(t.disclaimerFs)
    setFontGrandTotalPx(t.grandTotalFs)
    setPrintCaptionColor(row?.invoice_label_text_color?.trim() ?? '')
    setPrintSectionTitleColor(row?.invoice_section_title_color?.trim() ?? '')
    setPrintTableHeaderTextColor(row?.invoice_table_header_text_color?.trim() ?? '')
    setPrintTableHeaderBgColor(row?.invoice_table_header_bg_color?.trim() ?? '')
    setPrintCustomerNameColor(row?.invoice_customer_name_color?.trim() ?? '')
    setPrintBusinessNameColor(row?.invoice_business_name_color?.trim() ?? '')
    setPrintInvoiceNumberColor(row?.invoice_invoice_number_color?.trim() ?? '')
    setPrintFooterValueColor(row?.invoice_footer_value_color?.trim() ?? '')
    setPrintGrandTotalLabelColor(row?.invoice_grand_total_label_color?.trim() ?? '')
    setPrintGrandTotalAmountColor(row?.invoice_grand_total_amount_color?.trim() ?? '')
    setPrintDisclaimerColor(row?.invoice_disclaimer_text_color?.trim() ?? '')
    setPrintProductNoteColor(row?.invoice_product_note_color?.trim() ?? '')
    setLogoPath(data?.logo_path?.trim() || null)
    setBackgroundPath(data?.invoice_background_image_path?.trim() || null)

    if (data?.logo_path?.trim()) {
      const { signedUrl } = await getBrandingSignedUrl(data.logo_path)
      setLogoPreviewUrl(signedUrl)
    } else {
      setLogoPreviewUrl(null)
    }
    if (data?.invoice_background_image_path?.trim()) {
      const { signedUrl } = await getBrandingSignedUrl(data.invoice_background_image_path)
      setBackgroundPreviewUrl(signedUrl)
    } else {
      setBackgroundPreviewUrl(null)
    }
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  async function uploadBrandingImage(file: File, prefix: 'logo' | 'invoice-bg') {
    if (!user?.id) throw new Error('Not signed in')
    if (!ACCEPT_IMG.includes(file.type as (typeof ACCEPT_IMG)[number])) {
      throw new Error('Please use a JPEG, PNG, WebP, or GIF image.')
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error('Image must be 5 MB or smaller.')
    }
    const rawExt = (file.name.split('.').pop() || 'png').toLowerCase()
    const ext = /^[a-z0-9]+$/.test(rawExt) ? rawExt : 'png'
    const path = `${user.id}/${prefix}-${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage.from('branding').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (upErr) throw upErr
    return path
  }

  async function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user?.id) return
    setAssetBusy(true)
    setError(null)
    try {
      const old = logoPath
      const path = await uploadBrandingImage(file, 'logo')
      const { error: err } = await updateBusinessBranding(user.id, { logo_path: path })
      if (err) throw err
      if (old && old !== path) void removeBrandingFile(old)
      await load()
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not upload logo.')
    } finally {
      setAssetBusy(false)
    }
  }

  async function handleBackgroundFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user?.id) return
    setAssetBusy(true)
    setError(null)
    try {
      const old = backgroundPath
      const path = await uploadBrandingImage(file, 'invoice-bg')
      const { error: err } = await updateBusinessBranding(user.id, {
        invoice_background_image_path: path,
      })
      if (err) throw err
      if (old && old !== path) void removeBrandingFile(old)
      await load()
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not upload background.')
    } finally {
      setAssetBusy(false)
    }
  }

  async function clearLogo() {
    if (!user?.id || !logoPath) return
    setAssetBusy(true)
    setError(null)
    try {
      const { error: err } = await updateBusinessBranding(user.id, { logo_path: null })
      if (err) throw err
      void removeBrandingFile(logoPath)
      await load()
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not remove logo.')
    } finally {
      setAssetBusy(false)
    }
  }

  async function clearBackground() {
    if (!user?.id || !backgroundPath) return
    setAssetBusy(true)
    setError(null)
    try {
      const { error: err } = await updateBusinessBranding(user.id, {
        invoice_background_image_path: null,
      })
      if (err) throw err
      void removeBrandingFile(backgroundPath)
      await load()
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not remove background.')
    } finally {
      setAssetBusy(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setSaving(true)
    setError(null)
    setSaved(false)
    const { error: err } = await updateBusinessBranding(user.id, {
      business_name: businessName.trim() || null,
      invoice_disclaimer: invoiceDisclaimer.trim() || null,
      payment_venmo_tag: paymentVenmoTag.trim() || null,
      payment_zelle_tag: paymentZelleTag.trim() || null,
      payment_zelle_recipient_name: paymentZelleRecipientName.trim() || null,
      pickup_address_default: pickupAddressDefault.trim() || null,
      primary_color: primaryColor.trim() || null,
      secondary_color: secondaryColor.trim() || null,
      invoice_text_color: invoiceTextColor.trim() || null,
      invoice_muted_text_color: invoiceMutedColor.trim() || null,
      invoice_label_text_color: printCaptionColor.trim() || null,
      invoice_section_title_color: printSectionTitleColor.trim() || null,
      invoice_table_header_text_color: printTableHeaderTextColor.trim() || null,
      invoice_table_header_bg_color: printTableHeaderBgColor.trim() || null,
      invoice_customer_name_color: printCustomerNameColor.trim() || null,
      invoice_business_name_color: printBusinessNameColor.trim() || null,
      invoice_invoice_number_color: printInvoiceNumberColor.trim() || null,
      invoice_footer_value_color: printFooterValueColor.trim() || null,
      invoice_grand_total_label_color: printGrandTotalLabelColor.trim() || null,
      invoice_grand_total_amount_color: printGrandTotalAmountColor.trim() || null,
      invoice_disclaimer_text_color: printDisclaimerColor.trim() || null,
      invoice_product_note_color: printProductNoteColor.trim() || null,
      invoice_footer_stripe_color: footerStripeColor.trim() || null,
      invoice_font_size_px: invoiceFontSizePx,
      invoice_font_size_labels_px: fontLabelsPx,
      invoice_font_size_line_items_heading_px: fontLineItemsHeadingPx,
      invoice_font_size_table_px: fontTablePx,
      invoice_font_size_business_name_px: fontBusinessNamePx,
      invoice_font_size_customer_name_px: fontCustomerNamePx,
      invoice_font_size_invoice_number_px: fontInvoiceNumberPx,
      invoice_font_size_disclaimer_px: fontDisclaimerPx,
      invoice_font_size_grand_total_px: fontGrandTotalPx,
    })
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setSaved(true)
    await load()
  }

  const previewTheme = resolveInvoicePrintTheme({
    business_name: businessName || null,
    logo_path: logoPath,
    invoice_disclaimer: null,
    pickup_address_default: null,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    invoice_font_size_px: invoiceFontSizePx,
    invoice_font_size_labels_px: fontLabelsPx,
    invoice_font_size_line_items_heading_px: fontLineItemsHeadingPx,
    invoice_font_size_table_px: fontTablePx,
    invoice_font_size_business_name_px: fontBusinessNamePx,
    invoice_font_size_customer_name_px: fontCustomerNamePx,
    invoice_font_size_invoice_number_px: fontInvoiceNumberPx,
    invoice_font_size_disclaimer_px: fontDisclaimerPx,
    invoice_font_size_grand_total_px: fontGrandTotalPx,
    invoice_text_color: invoiceTextColor,
    invoice_muted_text_color: invoiceMutedColor,
    invoice_label_text_color: printCaptionColor.trim() || null,
    invoice_section_title_color: printSectionTitleColor.trim() || null,
    invoice_table_header_text_color: printTableHeaderTextColor.trim() || null,
    invoice_table_header_bg_color: printTableHeaderBgColor.trim() || null,
    invoice_customer_name_color: printCustomerNameColor.trim() || null,
    invoice_business_name_color: printBusinessNameColor.trim() || null,
    invoice_invoice_number_color: printInvoiceNumberColor.trim() || null,
    invoice_footer_value_color: printFooterValueColor.trim() || null,
    invoice_grand_total_label_color: printGrandTotalLabelColor.trim() || null,
    invoice_grand_total_amount_color: printGrandTotalAmountColor.trim() || null,
    invoice_disclaimer_text_color: printDisclaimerColor.trim() || null,
    invoice_product_note_color: printProductNoteColor.trim() || null,
    invoice_footer_stripe_color: footerStripeColor.trim() || null,
    invoice_background_image_path: backgroundPath,
    payment_venmo_tag: null,
    payment_zelle_tag: null,
    payment_zelle_recipient_name: null,
  })

  if (loading) {
    return <p className="text-stone-600">Loading…</p>
  }

  return (
    <div>
      <Link to="/" className="text-sm font-medium text-cherry-700 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-stone-900">Branding</h1>
      <p className="mt-1 text-sm text-stone-600">
        Business name and logo appear on printed estimates. Set your usual takeout address here — it
        prefills new pickup quotes (you can still change it on each estimate). The disclaimer appears on
        every estimate screen and the invoice footer. Use the print template section to control colors,
        fonts, logo, and an optional background on PDFs.
      </p>
      <p className="mt-2 text-xs text-stone-500">
        To preview the full layout, open{' '}
        <Link to="/estimates" className="font-medium text-cherry-700 hover:underline">
          any estimate
        </Link>{' '}
        and use <span className="font-medium text-stone-700">Print / PDF</span> (opens in a new tab).
      </p>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-8 max-w-3xl space-y-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Business name</span>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
          />
          <span className="mt-1 block text-xs text-stone-500">
            Shown next to your logo on printed estimates.
          </span>
        </label>

        <div className="border-t border-stone-100 pt-6">
          <h2 className="text-base font-semibold text-stone-900">Estimate print template</h2>
          <p className="mt-1 text-xs text-stone-500">
            These settings apply to the printable invoice / PDF. Save the form to store colors and font
            sizes. Logo and background upload immediately.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-1">
              <span className="text-sm font-medium text-stone-700">Accent color</span>
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  value={primaryColor.startsWith('#') ? primaryColor : DEFAULT_PRIMARY}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-stone-300 bg-white p-0.5"
                  aria-label="Accent color"
                />
                <input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                  placeholder={DEFAULT_PRIMARY}
                />
              </div>
              <span className="mt-1 block text-xs text-stone-500">Business name and total on the invoice.</span>
            </label>
            <label className="block sm:col-span-1">
              <span className="text-sm font-medium text-stone-700">Secondary color</span>
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  value={secondaryColor.startsWith('#') ? secondaryColor : DEFAULT_SECONDARY}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-stone-300 bg-white p-0.5"
                  aria-label="Secondary color"
                />
                <input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                  placeholder={DEFAULT_SECONDARY}
                />
              </div>
              <span className="mt-1 block text-xs text-stone-500">Borders and strong headings.</span>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Body text color</span>
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  value={invoiceTextColor.startsWith('#') ? invoiceTextColor : DEFAULT_TEXT}
                  onChange={(e) => setInvoiceTextColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-stone-300 bg-white p-0.5"
                  aria-label="Body text color"
                />
                <input
                  value={invoiceTextColor}
                  onChange={(e) => setInvoiceTextColor(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Label / muted text color</span>
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  value={invoiceMutedColor.startsWith('#') ? invoiceMutedColor : DEFAULT_MUTED}
                  onChange={(e) => setInvoiceMutedColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-stone-300 bg-white p-0.5"
                  aria-label="Muted text color"
                />
                <input
                  value={invoiceMutedColor}
                  onChange={(e) => setInvoiceMutedColor(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                />
              </div>
            </label>
            <div className="sm:col-span-2">
              <h3 className="text-sm font-semibold text-stone-900">Invoice text colors (optional)</h3>
              <p className="mt-1 text-xs text-stone-500">
                Leave a field empty to use the accent, secondary, body, or label colors above. Set a hex
                color only where you want an override on the printed invoice.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <PrintColorRow
                  label="Captions & row labels"
                  hint="Section labels, “Phone:”, subtotal labels (defaults to label / muted)."
                  value={printCaptionColor}
                  onChange={setPrintCaptionColor}
                  fallbackForPicker={
                    invoiceMutedColor.startsWith('#') ? invoiceMutedColor : DEFAULT_MUTED
                  }
                />
                <PrintColorRow
                  label="Section titles"
                  hint="Bill to, Fulfillment, and other section headings (defaults to secondary)."
                  value={printSectionTitleColor}
                  onChange={setPrintSectionTitleColor}
                  fallbackForPicker={
                    secondaryColor.startsWith('#') ? secondaryColor : DEFAULT_SECONDARY
                  }
                />
                <PrintColorRow
                  label="Table header text"
                  hint="Printed invoice column titles (Description, Qty, …). Empty = same as section titles."
                  value={printTableHeaderTextColor}
                  onChange={setPrintTableHeaderTextColor}
                  fallbackForPicker={
                    secondaryColor.startsWith('#') ? secondaryColor : DEFAULT_SECONDARY
                  }
                />
                <PrintColorRow
                  label="Table header background"
                  hint="Printed invoice thead fill. Empty = light neutral #f5f5f4."
                  value={printTableHeaderBgColor}
                  onChange={setPrintTableHeaderBgColor}
                  fallbackForPicker={DEFAULT_TABLE_HEADER_BG}
                />
                <PrintColorRow
                  label="Customer name (bill-to)"
                  hint="Defaults to body text color."
                  value={printCustomerNameColor}
                  onChange={setPrintCustomerNameColor}
                  fallbackForPicker={
                    invoiceTextColor.startsWith('#') ? invoiceTextColor : DEFAULT_TEXT
                  }
                />
                <PrintColorRow
                  label="Business name under logo"
                  hint="Defaults to accent."
                  value={printBusinessNameColor}
                  onChange={setPrintBusinessNameColor}
                  fallbackForPicker={
                    primaryColor.startsWith('#') ? primaryColor : DEFAULT_PRIMARY
                  }
                />
                <PrintColorRow
                  label="Invoice #"
                  hint="Large mono quote number (defaults to body text)."
                  value={printInvoiceNumberColor}
                  onChange={setPrintInvoiceNumberColor}
                  fallbackForPicker={
                    invoiceTextColor.startsWith('#') ? invoiceTextColor : DEFAULT_TEXT
                  }
                />
                <PrintColorRow
                  label="Totals row amounts"
                  hint="Currency in subtotal / discount / delivery rows (defaults to body text)."
                  value={printFooterValueColor}
                  onChange={setPrintFooterValueColor}
                  fallbackForPicker={
                    invoiceTextColor.startsWith('#') ? invoiceTextColor : DEFAULT_TEXT
                  }
                />
                <PrintColorRow
                  label="Grand total label (“Total”)"
                  hint="Defaults to secondary."
                  value={printGrandTotalLabelColor}
                  onChange={setPrintGrandTotalLabelColor}
                  fallbackForPicker={
                    secondaryColor.startsWith('#') ? secondaryColor : DEFAULT_SECONDARY
                  }
                />
                <PrintColorRow
                  label="Grand total amount"
                  hint="Defaults to accent."
                  value={printGrandTotalAmountColor}
                  onChange={setPrintGrandTotalAmountColor}
                  fallbackForPicker={
                    primaryColor.startsWith('#') ? primaryColor : DEFAULT_PRIMARY
                  }
                />
                <PrintColorRow
                  label="Disclaimer"
                  hint="Footer disclaimer text (defaults to label / muted)."
                  value={printDisclaimerColor}
                  onChange={setPrintDisclaimerColor}
                  fallbackForPicker={
                    invoiceMutedColor.startsWith('#') ? invoiceMutedColor : DEFAULT_MUTED
                  }
                />
                <PrintColorRow
                  label="Product notes under lines"
                  hint="Small text under a line item (defaults to label / muted)."
                  value={printProductNoteColor}
                  onChange={setPrintProductNoteColor}
                  fallbackForPicker={
                    invoiceMutedColor.startsWith('#') ? invoiceMutedColor : DEFAULT_MUTED
                  }
                />
              </div>
            </div>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-stone-700">Footer wave (printed invoice)</span>
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  value={
                    footerStripeColor.startsWith('#') ? footerStripeColor : DEFAULT_FOOTER_STRIPE
                  }
                  onChange={(e) => setFooterStripeColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-stone-300 bg-white p-0.5"
                  aria-label="Footer wave color"
                />
                <input
                  value={footerStripeColor}
                  onChange={(e) => setFooterStripeColor(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                  placeholder={DEFAULT_FOOTER_STRIPE}
                />
              </div>
              <span className="mt-1 block text-xs text-stone-500">
                Wavy footer band under the disclaimer on printed estimates (default pink).
              </span>
            </label>
          </div>

          <div className="mt-6 border-t border-stone-100 pt-6">
            <h3 className="text-sm font-semibold text-stone-900">Font sizes (printed invoice)</h3>
            <p className="mt-1 text-xs text-stone-500">
              All values are in pixels. Each control maps to a part of the PDF layout; save the form to
              apply.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Body text</span>
                <input
                  type="number"
                  min={10}
                  max={24}
                  value={invoiceFontSizePx}
                  onChange={(e) => setInvoiceFontSizePx(Number(e.target.value) || DEFAULT_FONT_PX)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                />
                <span className="mt-1 block text-xs text-stone-500">
                  Main copy: dates, status, addresses, phone lines.
                </span>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Section labels</span>
                <input
                  type="number"
                  min={8}
                  max={24}
                  value={fontLabelsPx}
                  onChange={(e) => setFontLabelsPx(Number(e.target.value) || 8)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                />
                <span className="mt-1 block text-xs text-stone-500">
                  Uppercase captions: Bill to, Invoice number, Fulfillment, …
                </span>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Table heading (invoice)</span>
                <input
                  type="number"
                  min={9}
                  max={28}
                  value={fontLineItemsHeadingPx}
                  onChange={(e) => setFontLineItemsHeadingPx(Number(e.target.value) || 9)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                />
                <span className="mt-1 block text-xs text-stone-500">
                  Column header row on the printed invoice (section title color).
                </span>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Table & subtotals</span>
                <input
                  type="number"
                  min={7}
                  max={22}
                  value={fontTablePx}
                  onChange={(e) => setFontTablePx(Number(e.target.value) || 7)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                />
                <span className="mt-1 block text-xs text-stone-500">
                  Table body rows, column headers, Subtotal / Discount / Delivery block.
                </span>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Business name (under logo)</span>
                <input
                  type="number"
                  min={9}
                  max={30}
                  value={fontBusinessNamePx}
                  onChange={(e) => setFontBusinessNamePx(Number(e.target.value) || 9)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Customer name (Bill to)</span>
                <input
                  type="number"
                  min={10}
                  max={34}
                  value={fontCustomerNamePx}
                  onChange={(e) => setFontCustomerNamePx(Number(e.target.value) || 10)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Invoice number (large)</span>
                <input
                  type="number"
                  min={12}
                  max={44}
                  value={fontInvoiceNumberPx}
                  onChange={(e) => setFontInvoiceNumberPx(Number(e.target.value) || 12)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                />
                <span className="mt-1 block text-xs text-stone-500">Mono estimate / invoice # in the header.</span>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Disclaimer</span>
                <input
                  type="number"
                  min={6}
                  max={16}
                  value={fontDisclaimerPx}
                  onChange={(e) => setFontDisclaimerPx(Number(e.target.value) || 6)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                />
                <span className="mt-1 block text-xs text-stone-500">Fine print under totals.</span>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-stone-700">Grand total row</span>
                <input
                  type="number"
                  min={12}
                  max={40}
                  value={fontGrandTotalPx}
                  onChange={(e) => setFontGrandTotalPx(Number(e.target.value) || 12)}
                  className="mt-1 w-full max-w-xs rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
                />
                <span className="mt-1 block text-xs text-stone-500">
                  The emphasized “Total” line (label + amount).
                </span>
              </label>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <span className="text-sm font-medium text-stone-700">Logo</span>
              <div className="mt-2 flex h-24 w-40 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-stone-300 bg-stone-50">
                {logoPreviewUrl ? (
                  <img src={logoPreviewUrl} alt="" className="max-h-24 max-w-full object-contain" />
                ) : (
                  <span className="px-2 text-center text-xs text-stone-400">No logo</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={assetBusy}
                  onClick={() => logoInputRef.current?.click()}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50"
                >
                  {logoPath ? 'Replace…' : 'Upload…'}
                </button>
                {logoPath ? (
                  <button
                    type="button"
                    disabled={assetBusy}
                    onClick={() => void clearLogo()}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                ) : null}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept={ACCEPT_IMG.join(',')}
                  className="hidden"
                  onChange={(ev) => void handleLogoFile(ev)}
                />
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-stone-700">Background image</span>
              <p className="mt-0.5 text-xs text-stone-500">
                Shown faintly behind the invoice when printing. Use a light or subtle image for readability.
              </p>
              <div
                className="mt-2 flex h-24 w-full max-w-xs items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 bg-cover bg-center"
                style={
                  backgroundPreviewUrl
                    ? { backgroundImage: `url(${backgroundPreviewUrl})` }
                    : undefined
                }
              >
                {!backgroundPreviewUrl ? (
                  <span className="px-2 text-center text-xs text-stone-400">No background</span>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={assetBusy}
                  onClick={() => bgInputRef.current?.click()}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50"
                >
                  {backgroundPath ? 'Replace…' : 'Upload…'}
                </button>
                {backgroundPath ? (
                  <button
                    type="button"
                    disabled={assetBusy}
                    onClick={() => void clearBackground()}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                ) : null}
                <input
                  ref={bgInputRef}
                  type="file"
                  accept={ACCEPT_IMG.join(',')}
                  className="hidden"
                  onChange={(ev) => void handleBackgroundFile(ev)}
                />
              </div>
            </div>
          </div>

          <div
            className="mt-6 rounded-lg border p-4"
            style={{
              borderColor: previewTheme.captionColor + '55',
              fontSize: previewTheme.bodyFs,
              color: previewTheme.text,
              backgroundImage: backgroundPreviewUrl ? `url(${backgroundPreviewUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div
              className="overflow-hidden rounded-md p-3"
              style={{
                backgroundColor: backgroundPreviewUrl ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.96)',
              }}
            >
              <p
                style={{
                  fontSize: previewTheme.labelsFs,
                  color: previewTheme.captionColor,
                  fontWeight: 600,
                }}
              >
                PREVIEW
              </p>
              <p
                className="mt-1 font-semibold"
                style={{
                  color: previewTheme.businessNameColor,
                  fontSize: previewTheme.businessNameFs,
                }}
              >
                {businessName.trim() || 'Your business name'}
              </p>
              <p
                className="mt-2 font-mono font-bold"
                style={{
                  color: previewTheme.invoiceNumberColor,
                  fontSize: previewTheme.invoiceNumberFs,
                }}
              >
                CH-2026-0001
              </p>
              <p
                className="mt-2 inline-block rounded px-2 py-1 font-semibold uppercase tracking-wide"
                style={{
                  color: previewTheme.tableHeaderTextColor,
                  backgroundColor: previewTheme.tableHeaderBgColor,
                  fontSize: previewTheme.lineItemsHeadingFs,
                }}
              >
                Description · Qty · Total
              </p>
              <p className="mt-2" style={{ color: previewTheme.text, fontSize: previewTheme.bodyFs }}>
                Sample body text and{' '}
                <span style={{ color: previewTheme.captionColor }}>caption-style labels</span>.
              </p>
              <p
                className="mt-1"
                style={{ color: previewTheme.productNoteColor, fontSize: previewTheme.tableFs }}
              >
                Product note under a line — smaller muted style.
              </p>
              <p
                className="mt-2 flex flex-wrap items-baseline gap-2 tabular-nums"
                style={{ fontSize: previewTheme.bodyFs }}
              >
                <span style={{ color: previewTheme.captionColor }}>Subtotal</span>
                <span style={{ color: previewTheme.footerValueColor }}>$12.00</span>
              </p>
              <p
                className="mt-2 font-bold tabular-nums"
                style={{ fontSize: previewTheme.grandTotalFs }}
              >
                <span style={{ color: previewTheme.grandTotalLabelColor }}>Total </span>
                <span style={{ color: previewTheme.grandTotalAmountColor }}>$0.00</span>
              </p>
              <p
                className="mt-2"
                style={{ color: previewTheme.disclaimerColor, fontSize: previewTheme.disclaimerFs }}
              >
                Disclaimer preview — fine print at the bottom of the invoice.
              </p>
              <InvoiceFooterWave fill={previewTheme.footerStripe} className="mt-4 h-10 w-full" />
            </div>
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">Default takeout / pickup address</span>
          <textarea
            value={pickupAddressDefault}
            onChange={(e) => setPickupAddressDefault(e.target.value)}
            rows={4}
            placeholder={'Cherry Bakehouse\n123 Baker Street\nCity, ST ZIP\nPickup hours: …'}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
          />
          <span className="mt-1 block text-xs text-stone-500">
            Shown when you choose pickup / takeout on a new estimate. Edit per quote on the estimate if
            needed.
          </span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">Invoice disclaimer</span>
          <textarea
            value={invoiceDisclaimer}
            onChange={(e) => setInvoiceDisclaimer(e.target.value)}
            rows={6}
            placeholder={DISCLAIMER_PLACEHOLDER}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
          />
          <span className="mt-1 block text-xs text-stone-500">
            Plain text. Appears at the bottom of the estimate page and on the printed invoice under totals.
          </span>
        </label>

        <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-4">
          <h2 className="text-sm font-semibold text-stone-900">Payment methods (estimate & PDF)</h2>
          <p className="mt-1 text-xs text-stone-500">
            Shown on each estimate page and the printed invoice after totals. Leave a field blank to hide
            that line.
          </p>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-stone-700">Venmo</span>
            <textarea
              value={paymentVenmoTag}
              onChange={(e) => setPaymentVenmoTag(e.target.value)}
              rows={2}
              placeholder="@YourBusiness or venmo.com/…"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-stone-700">Zelle — email or phone</span>
            <input
              value={paymentZelleTag}
              onChange={(e) => setPaymentZelleTag(e.target.value)}
              type="text"
              placeholder="name@email.com or +1…"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-stone-700">Zelle — recipient name</span>
            <input
              value={paymentZelleRecipientName}
              onChange={(e) => setPaymentZelleRecipientName(e.target.value)}
              type="text"
              placeholder="Legal name as it appears for the Zelle recipient"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
            />
            <span className="mt-1 block text-xs text-stone-500">
              Shown as “Recipient: …” so customers match the name their bank shows for Zelle.
            </span>
          </label>
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        {saved ? (
          <p className="text-sm font-medium text-cherry-800">Saved.</p>
        ) : null}

        <button
          type="submit"
          disabled={saving || assetBusy}
          className="rounded-lg bg-cherry-700 px-4 py-2 text-sm font-medium text-white hover:bg-cherry-800 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save branding'}
        </button>
      </form>
    </div>
  )
}
