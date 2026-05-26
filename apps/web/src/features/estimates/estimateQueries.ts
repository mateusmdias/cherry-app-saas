import { supabase } from '@/lib/supabase'
import { estimateNumberWithEventYearSuffix } from '@/features/estimates/estimateNumberFormat'
import type { BusinessSettings, EstimateLine, EstimateStatus, FulfillmentType } from '@/types/database'

export type EstimateLineWithProduct = EstimateLine & {
  products?: { name: string; notes: string | null } | null
}

export type EstimateRow = {
  id: string
  user_id: string
  customer_id: string
  estimate_number?: string
  status: EstimateStatus
  event_date: string
  /** Present on full fetch; may be absent on minimal list selects. */
  guest_count?: number | null
  party_occasion?: string | null
  fulfillment_type: FulfillmentType | null
  delivery_address: string | null
  pickup_address: string | null
  delivery_fee: string | number | null
  subtotal: string | number
  discount: string | number
  total: string | number
  balance_paid: boolean
  notes: string | null
  created_at: string
}

export type CustomerBrief = {
  name: string
  phone: string | null
  address: string | null
}

export type EstimateWithCustomer = EstimateRow & {
  customers: CustomerBrief | CustomerBrief[] | null
}

export function unwrapCustomerBrief(row: EstimateWithCustomer): CustomerBrief | null {
  const c = row.customers
  if (!c) return null
  return Array.isArray(c) ? (c[0] ?? null) : c
}

function unwrapCustomerName(row: EstimateWithCustomer): string | null {
  return unwrapCustomerBrief(row)?.name ?? null
}

export async function insertEstimate(row: {
  user_id: string
  customer_id: string
  event_date: string
  notes?: string | null
  guest_count?: number | null
  party_occasion?: string | null
  fulfillment_type?: FulfillmentType | null
  delivery_address?: string | null
  pickup_address?: string | null
}) {
  const isDelivery = row.fulfillment_type === 'delivery'
  const isPickup = row.fulfillment_type === 'pickup'
  const { data, error } = await supabase
    .from('estimates')
    .insert({
      user_id: row.user_id,
      customer_id: row.customer_id,
      event_date: row.event_date,
      notes: row.notes?.trim() || null,
      guest_count: row.guest_count ?? null,
      party_occasion: row.party_occasion?.trim() || null,
      fulfillment_type: row.fulfillment_type ?? null,
      delivery_address: isDelivery ? (row.delivery_address?.trim() || null) : null,
      pickup_address: isPickup ? (row.pickup_address?.trim() || null) : null,
    })
    .select('id, estimate_number')
    .single()

  if (error || !data) {
    return { data: data as { id: string; estimate_number: string } | null, error }
  }

  const fixed = estimateNumberWithEventYearSuffix(data.estimate_number, row.event_date)
  if (fixed && fixed !== data.estimate_number) {
    const { error: e2 } = await supabase
      .from('estimates')
      .update({ estimate_number: fixed })
      .eq('id', data.id)
    if (e2) return { data, error: e2 }
    return { data: { id: data.id, estimate_number: fixed }, error: null }
  }

  return { data: data as { id: string; estimate_number: string }, error: null }
}

function subtotalFromEstimateLinesForCopy(lines: { line_total: string | number }[]): number {
  return Math.round(lines.reduce((s, l) => s + Number(l.line_total), 0) * 100) / 100
}

/** Copy an estimate and its lines for the same customer; new row is always `estimate` / not paid. */
export async function duplicateEstimateForUser(sourceEstimateId: string, userId: string) {
  const { data: est, error: e1 } = await fetchEstimateForUser(sourceEstimateId, userId)
  if (e1 || !est) {
    return { data: null as { id: string } | null, error: e1 ?? { message: 'Estimate not found' } }
  }

  const { data: lines, error: e2 } = await fetchEstimateLines(sourceEstimateId)
  if (e2) return { data: null, error: e2 }
  const L = lines ?? []
  if (L.length === 0) {
    return { data: null, error: { message: 'This estimate has no lines to copy.' } }
  }

  const fulfillment = est.fulfillment_type ?? 'pickup'
  const { data: created, error: e3 } = await insertEstimate({
    user_id: userId,
    customer_id: est.customer_id,
    event_date: est.event_date,
    notes: est.notes,
    guest_count: est.guest_count != null ? Number(est.guest_count) : null,
    party_occasion: est.party_occasion,
    fulfillment_type: fulfillment,
    delivery_address: fulfillment === 'delivery' ? est.delivery_address : undefined,
    pickup_address: fulfillment === 'pickup' ? est.pickup_address : undefined,
  })
  if (e3 || !created) {
    return { data: null, error: e3 ?? { message: 'Could not create copy' } }
  }

  const newId = created.id

  for (const line of L) {
    const q = Number(line.quantity)
    const up = Number(line.unit_price)
    const lt = Number(line.line_total)
    const { error: el } = await insertEstimateLine({
      user_id: userId,
      estimate_id: newId,
      product_id: line.product_id,
      description: line.description,
      quantity: q,
      unit_price: up,
      line_total: lt,
      selected_options: line.selected_options ?? [],
      sort_order: line.sort_order,
    })
    if (el) {
      return { data: null, error: el }
    }
  }

  const sub = subtotalFromEstimateLinesForCopy(L)
  const disc = Number(est.discount) || 0
  const feeRaw =
    fulfillment === 'delivery' && est.delivery_fee != null ? Number(est.delivery_fee) : null
  const feeNum =
    feeRaw != null && !Number.isNaN(feeRaw) && feeRaw > 0 ? feeRaw : null

  const { error: et } = await updateEstimateTotals(newId, sub, disc, feeNum)
  if (et) return { data: null, error: et }

  const { error: eu } = await updateEstimate(newId, {
    status: 'estimate',
    balance_paid: false,
  })
  if (eu) return { data: null, error: eu }

  return { data: { id: newId }, error: null }
}

export async function insertEstimateLine(row: {
  user_id: string
  estimate_id: string
  product_id: string | null
  description: string
  quantity: number
  unit_price: number
  line_total: number
  selected_options: unknown
  sort_order: number
}) {
  const { data, error } = await supabase
    .from('estimate_lines')
    .insert({
      user_id: row.user_id,
      estimate_id: row.estimate_id,
      product_id: row.product_id,
      description: row.description,
      quantity: row.quantity,
      unit_price: row.unit_price,
      line_total: row.line_total,
      selected_options: row.selected_options,
      sort_order: row.sort_order,
    })
    .select('id')
    .single()

  return { data: data as { id: string } | null, error }
}

export async function updateEstimateTotals(
  estimateId: string,
  subtotal: number,
  discount = 0,
  deliveryFee: number | null = null,
) {
  const d = Math.max(0, discount)
  const feeRaw =
    deliveryFee != null && !Number.isNaN(deliveryFee) ? Math.max(0, deliveryFee) : 0
  const feeStored = feeRaw > 0 ? feeRaw : null
  const feeNum = feeStored ?? 0
  const subRounded = Math.round(Math.max(0, subtotal) * 100) / 100
  const total = Math.round(Math.max(0, subRounded - d + feeNum) * 100) / 100
  const { error } = await supabase
    .from('estimates')
    .update({
      subtotal: subRounded,
      discount: d,
      delivery_fee: feeStored,
      total,
    })
    .eq('id', estimateId)

  return { error }
}

export async function updateEstimate(
  estimateId: string,
  patch: {
    event_date?: string
    notes?: string | null
    guest_count?: number | null
    party_occasion?: string | null
    status?: EstimateStatus
    fulfillment_type?: FulfillmentType | null
    delivery_address?: string | null
    pickup_address?: string | null
    estimate_number?: string | null
    balance_paid?: boolean
  },
) {
  const row: Record<string, unknown> = {}
  if (patch.event_date !== undefined) row.event_date = patch.event_date
  if (patch.notes !== undefined) row.notes = patch.notes?.trim() || null
  if (patch.guest_count !== undefined) row.guest_count = patch.guest_count
  if (patch.party_occasion !== undefined) row.party_occasion = patch.party_occasion?.trim() || null
  if (patch.status !== undefined) row.status = patch.status
  if (patch.estimate_number !== undefined) row.estimate_number = patch.estimate_number?.trim() || null
  if (patch.balance_paid !== undefined) row.balance_paid = patch.balance_paid
  if (patch.fulfillment_type !== undefined) {
    row.fulfillment_type = patch.fulfillment_type
    if (patch.fulfillment_type === 'delivery') {
      row.pickup_address = null
    } else {
      row.delivery_address = null
      row.delivery_fee = null
    }
  }
  if (patch.delivery_address !== undefined) row.delivery_address = patch.delivery_address?.trim() || null
  if (patch.pickup_address !== undefined) row.pickup_address = patch.pickup_address?.trim() || null
  const { error } = await supabase.from('estimates').update(row).eq('id', estimateId)
  return { error }
}

export async function deleteEstimate(estimateId: string) {
  const { error } = await supabase.from('estimates').delete().eq('id', estimateId)
  return { error }
}

export async function updateEstimateLine(
  lineId: string,
  patch: {
    description: string
    quantity: number
    unit_price: number
    line_total: number
  },
) {
  const { error } = await supabase
    .from('estimate_lines')
    .update({
      description: patch.description.trim() || 'Item',
      quantity: patch.quantity,
      unit_price: patch.unit_price,
      line_total: patch.line_total,
    })
    .eq('id', lineId)

  return { error }
}

export async function fetchBusinessName(userId: string) {
  const { data, error } = await supabase
    .from('business_settings')
    .select('business_name')
    .eq('user_id', userId)
    .maybeSingle()

  return { data: data as { business_name: string | null } | null, error }
}

export type BusinessBrandingRow = {
  business_name: string | null
  logo_path: string | null
  invoice_disclaimer: string | null
  pickup_address_default: string | null
  primary_color: string | null
  secondary_color: string | null
  invoice_font_size_px: number | null
  invoice_font_size_labels_px: number | null
  invoice_font_size_line_items_heading_px: number | null
  invoice_font_size_table_px: number | null
  invoice_font_size_customer_name_px: number | null
  invoice_font_size_business_name_px: number | null
  invoice_font_size_invoice_number_px: number | null
  invoice_font_size_disclaimer_px: number | null
  invoice_font_size_grand_total_px: number | null
  invoice_text_color: string | null
  invoice_muted_text_color: string | null
  invoice_background_image_path: string | null
  invoice_footer_stripe_color: string | null
  invoice_label_text_color: string | null
  invoice_section_title_color: string | null
  invoice_table_header_text_color: string | null
  invoice_table_header_bg_color: string | null
  invoice_customer_name_color: string | null
  invoice_business_name_color: string | null
  invoice_invoice_number_color: string | null
  invoice_footer_value_color: string | null
  invoice_grand_total_label_color: string | null
  invoice_grand_total_amount_color: string | null
  invoice_disclaimer_text_color: string | null
  invoice_product_note_color: string | null
  payment_venmo_tag: string | null
  payment_zelle_tag: string | null
  payment_zelle_recipient_name: string | null
}

function clampInt(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo
  return Math.min(hi, Math.max(lo, Math.round(n)))
}

/** Resolved typography for printed estimates (null DB fields → sensible defaults from body size). */
export function resolveInvoicePrintTheme(brand: BusinessBrandingRow | null) {
  const primary = brand?.primary_color?.trim() || '#b91c1c'
  const secondary = brand?.secondary_color?.trim() || '#1f2937'
  const text = brand?.invoice_text_color?.trim() || '#1c1917'
  const muted = brand?.invoice_muted_text_color?.trim() || '#57534e'
  const footerStripe = brand?.invoice_footer_stripe_color?.trim() || '#f472b6'

  const captionColor = brand?.invoice_label_text_color?.trim() || muted
  const sectionTitleColor = brand?.invoice_section_title_color?.trim() || secondary
  const defaultTableHeaderBg = '#f5f5f4'
  const tableHeaderTextColor =
    brand?.invoice_table_header_text_color?.trim() || sectionTitleColor
  const tableHeaderBgColor =
    brand?.invoice_table_header_bg_color?.trim() || defaultTableHeaderBg
  const customerNameColor = brand?.invoice_customer_name_color?.trim() || text
  const businessNameColor = brand?.invoice_business_name_color?.trim() || primary
  const invoiceNumberColor = brand?.invoice_invoice_number_color?.trim() || text
  const footerValueColor = brand?.invoice_footer_value_color?.trim() || text
  const grandTotalLabelColor = brand?.invoice_grand_total_label_color?.trim() || secondary
  const grandTotalAmountColor = brand?.invoice_grand_total_amount_color?.trim() || primary
  const disclaimerColor = brand?.invoice_disclaimer_text_color?.trim() || muted
  const productNoteColor = brand?.invoice_product_note_color?.trim() || muted

  const bodyFs = clampInt(Number(brand?.invoice_font_size_px) || 14, 10, 24)

  const labelsFs =
    brand?.invoice_font_size_labels_px != null
      ? clampInt(Number(brand.invoice_font_size_labels_px), 8, 24)
      : clampInt(bodyFs - 2, 8, 24)

  const lineItemsHeadingFs =
    brand?.invoice_font_size_line_items_heading_px != null
      ? clampInt(Number(brand.invoice_font_size_line_items_heading_px), 9, 28)
      : clampInt(labelsFs + 1, 9, 28)

  const tableFs =
    brand?.invoice_font_size_table_px != null
      ? clampInt(Number(brand.invoice_font_size_table_px), 7, 22)
      : clampInt(bodyFs - 3, 7, 22)

  const customerNameFs =
    brand?.invoice_font_size_customer_name_px != null
      ? clampInt(Number(brand.invoice_font_size_customer_name_px), 10, 34)
      : clampInt(bodyFs + 2, 10, 34)

  const businessNameFs =
    brand?.invoice_font_size_business_name_px != null
      ? clampInt(Number(brand.invoice_font_size_business_name_px), 9, 30)
      : clampInt(bodyFs, 9, 30)

  const invoiceNumberFs =
    brand?.invoice_font_size_invoice_number_px != null
      ? clampInt(Number(brand.invoice_font_size_invoice_number_px), 12, 44)
      : clampInt(bodyFs + 8, 12, 44)

  const disclaimerFs =
    brand?.invoice_font_size_disclaimer_px != null
      ? clampInt(Number(brand.invoice_font_size_disclaimer_px), 6, 16)
      : clampInt(tableFs - 1, 6, 16)

  const grandTotalFs =
    brand?.invoice_font_size_grand_total_px != null
      ? clampInt(Number(brand.invoice_font_size_grand_total_px), 12, 40)
      : clampInt(bodyFs + 2, 12, 40)

  return {
    primary,
    secondary,
    text,
    muted,
    footerStripe,
    captionColor,
    sectionTitleColor,
    tableHeaderTextColor,
    tableHeaderBgColor,
    customerNameColor,
    businessNameColor,
    invoiceNumberColor,
    footerValueColor,
    grandTotalLabelColor,
    grandTotalAmountColor,
    disclaimerColor,
    productNoteColor,
    bodyFs,
    labelsFs,
    lineItemsHeadingFs,
    tableFs,
    customerNameFs,
    businessNameFs,
    invoiceNumberFs,
    disclaimerFs,
    grandTotalFs,
  }
}

const BRANDING_SELECT_FULL =
  'business_name, logo_path, invoice_disclaimer, pickup_address_default, primary_color, secondary_color, invoice_font_size_px, invoice_font_size_labels_px, invoice_font_size_line_items_heading_px, invoice_font_size_table_px, invoice_font_size_customer_name_px, invoice_font_size_business_name_px, invoice_font_size_invoice_number_px, invoice_font_size_disclaimer_px, invoice_font_size_grand_total_px, invoice_text_color, invoice_muted_text_color, invoice_label_text_color, invoice_section_title_color, invoice_table_header_text_color, invoice_table_header_bg_color, invoice_customer_name_color, invoice_business_name_color, invoice_invoice_number_color, invoice_footer_value_color, invoice_grand_total_label_color, invoice_grand_total_amount_color, invoice_disclaimer_text_color, invoice_product_note_color, invoice_background_image_path, invoice_footer_stripe_color, payment_venmo_tag, payment_zelle_tag, payment_zelle_recipient_name' as const

/** Same as full select but without table-header color columns (for DBs not yet migrated). */
const BRANDING_SELECT_WITHOUT_TABLE_HEADER =
  'business_name, logo_path, invoice_disclaimer, pickup_address_default, primary_color, secondary_color, invoice_font_size_px, invoice_font_size_labels_px, invoice_font_size_line_items_heading_px, invoice_font_size_table_px, invoice_font_size_customer_name_px, invoice_font_size_business_name_px, invoice_font_size_invoice_number_px, invoice_font_size_disclaimer_px, invoice_font_size_grand_total_px, invoice_text_color, invoice_muted_text_color, invoice_label_text_color, invoice_section_title_color, invoice_customer_name_color, invoice_business_name_color, invoice_invoice_number_color, invoice_footer_value_color, invoice_grand_total_label_color, invoice_grand_total_amount_color, invoice_disclaimer_text_color, invoice_product_note_color, invoice_background_image_path, invoice_footer_stripe_color, payment_venmo_tag, payment_zelle_tag, payment_zelle_recipient_name' as const

export async function fetchBusinessBranding(userId: string) {
  let { data, error } = await supabase
    .from('business_settings')
    .select(BRANDING_SELECT_FULL)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    const retryMinusHeader = await supabase
      .from('business_settings')
      .select(BRANDING_SELECT_WITHOUT_TABLE_HEADER)
      .eq('user_id', userId)
      .maybeSingle()

    if (!retryMinusHeader.error && retryMinusHeader.data) {
      const row = retryMinusHeader.data as Record<string, unknown>
      return {
        data: {
          ...row,
          invoice_table_header_text_color: null,
          invoice_table_header_bg_color: null,
        } as BusinessBrandingRow,
        error: null,
      }
    }

    const retry = await supabase
      .from('business_settings')
      .select('business_name, logo_path, invoice_disclaimer, pickup_address_default')
      .eq('user_id', userId)
      .maybeSingle()
    if (retry.error) {
      const retry2 = await supabase
        .from('business_settings')
        .select('business_name, logo_path')
        .eq('user_id', userId)
        .maybeSingle()
      if (retry2.error) return { data: null, error: retry2.error }
      return {
        data: {
          ...(retry2.data as { business_name: string | null; logo_path: string | null }),
          invoice_disclaimer: null,
          pickup_address_default: null,
          primary_color: null,
          secondary_color: null,
          invoice_font_size_px: null,
          invoice_font_size_labels_px: null,
          invoice_font_size_line_items_heading_px: null,
          invoice_font_size_table_px: null,
          invoice_font_size_customer_name_px: null,
          invoice_font_size_business_name_px: null,
          invoice_font_size_invoice_number_px: null,
          invoice_font_size_disclaimer_px: null,
          invoice_font_size_grand_total_px: null,
          invoice_text_color: null,
          invoice_muted_text_color: null,
          invoice_label_text_color: null,
          invoice_section_title_color: null,
          invoice_table_header_text_color: null,
          invoice_table_header_bg_color: null,
          invoice_customer_name_color: null,
          invoice_business_name_color: null,
          invoice_invoice_number_color: null,
          invoice_footer_value_color: null,
          invoice_grand_total_label_color: null,
          invoice_grand_total_amount_color: null,
          invoice_disclaimer_text_color: null,
          invoice_product_note_color: null,
          invoice_background_image_path: null,
          invoice_footer_stripe_color: null,
          payment_venmo_tag: null,
          payment_zelle_tag: null,
          payment_zelle_recipient_name: null,
        } as BusinessBrandingRow,
        error: null,
      }
    }
    return {
      data: {
        ...(retry.data as {
          business_name: string | null
          logo_path: string | null
          invoice_disclaimer: string | null
          pickup_address_default: string | null
        }),
        primary_color: null,
        secondary_color: null,
        invoice_font_size_px: null,
        invoice_font_size_labels_px: null,
        invoice_font_size_line_items_heading_px: null,
        invoice_font_size_table_px: null,
        invoice_font_size_customer_name_px: null,
        invoice_font_size_business_name_px: null,
        invoice_font_size_invoice_number_px: null,
        invoice_font_size_disclaimer_px: null,
        invoice_font_size_grand_total_px: null,
        invoice_text_color: null,
        invoice_muted_text_color: null,
        invoice_label_text_color: null,
        invoice_section_title_color: null,
        invoice_table_header_text_color: null,
        invoice_table_header_bg_color: null,
        invoice_customer_name_color: null,
        invoice_business_name_color: null,
        invoice_invoice_number_color: null,
        invoice_footer_value_color: null,
        invoice_grand_total_label_color: null,
        invoice_grand_total_amount_color: null,
        invoice_disclaimer_text_color: null,
        invoice_product_note_color: null,
        invoice_background_image_path: null,
        invoice_footer_stripe_color: null,
        payment_venmo_tag: null,
        payment_zelle_tag: null,
        payment_zelle_recipient_name: null,
      } as BusinessBrandingRow,
      error: null,
    }
  }

  return { data: data as BusinessBrandingRow | null, error }
}

export async function updateBusinessBranding(
  userId: string,
  patch: {
    business_name?: string | null
    invoice_disclaimer?: string | null
    pickup_address_default?: string | null
    logo_path?: string | null
    primary_color?: string | null
    secondary_color?: string | null
    invoice_font_size_px?: number | null
    invoice_font_size_labels_px?: number | null
    invoice_font_size_line_items_heading_px?: number | null
    invoice_font_size_table_px?: number | null
    invoice_font_size_customer_name_px?: number | null
    invoice_font_size_business_name_px?: number | null
    invoice_font_size_invoice_number_px?: number | null
    invoice_font_size_disclaimer_px?: number | null
    invoice_font_size_grand_total_px?: number | null
    invoice_text_color?: string | null
    invoice_muted_text_color?: string | null
    invoice_label_text_color?: string | null
    invoice_section_title_color?: string | null
    invoice_table_header_text_color?: string | null
    invoice_table_header_bg_color?: string | null
    invoice_customer_name_color?: string | null
    invoice_business_name_color?: string | null
    invoice_invoice_number_color?: string | null
    invoice_footer_value_color?: string | null
    invoice_grand_total_label_color?: string | null
    invoice_grand_total_amount_color?: string | null
    invoice_disclaimer_text_color?: string | null
    invoice_product_note_color?: string | null
    invoice_background_image_path?: string | null
    invoice_footer_stripe_color?: string | null
    payment_venmo_tag?: string | null
    payment_zelle_tag?: string | null
    payment_zelle_recipient_name?: string | null
  },
) {
  const row: Partial<
    Pick<
      BusinessSettings,
      | 'business_name'
      | 'invoice_disclaimer'
      | 'pickup_address_default'
      | 'logo_path'
      | 'primary_color'
      | 'secondary_color'
      | 'invoice_font_size_px'
      | 'invoice_font_size_labels_px'
      | 'invoice_font_size_line_items_heading_px'
      | 'invoice_font_size_table_px'
      | 'invoice_font_size_customer_name_px'
      | 'invoice_font_size_business_name_px'
      | 'invoice_font_size_invoice_number_px'
      | 'invoice_font_size_disclaimer_px'
      | 'invoice_font_size_grand_total_px'
      | 'invoice_text_color'
      | 'invoice_muted_text_color'
      | 'invoice_label_text_color'
      | 'invoice_section_title_color'
      | 'invoice_table_header_text_color'
      | 'invoice_table_header_bg_color'
      | 'invoice_customer_name_color'
      | 'invoice_business_name_color'
      | 'invoice_invoice_number_color'
      | 'invoice_footer_value_color'
      | 'invoice_grand_total_label_color'
      | 'invoice_grand_total_amount_color'
      | 'invoice_disclaimer_text_color'
      | 'invoice_product_note_color'
      | 'invoice_background_image_path'
      | 'invoice_footer_stripe_color'
      | 'payment_venmo_tag'
      | 'payment_zelle_tag'
      | 'payment_zelle_recipient_name'
    >
  > = {}
  if (patch.business_name !== undefined) row.business_name = patch.business_name?.trim() || null
  if (patch.invoice_disclaimer !== undefined) {
    row.invoice_disclaimer = patch.invoice_disclaimer?.trim() || null
  }
  if (patch.pickup_address_default !== undefined) {
    row.pickup_address_default = patch.pickup_address_default?.trim() || null
  }
  if (patch.logo_path !== undefined) row.logo_path = patch.logo_path?.trim() || null
  if (patch.primary_color !== undefined) row.primary_color = patch.primary_color?.trim() || null
  if (patch.secondary_color !== undefined) row.secondary_color = patch.secondary_color?.trim() || null
  if (patch.invoice_font_size_px !== undefined) {
    const n = Number(patch.invoice_font_size_px)
    if (patch.invoice_font_size_px == null || Number.isNaN(n)) {
      row.invoice_font_size_px = 14
    } else {
      row.invoice_font_size_px = Math.min(24, Math.max(10, Math.round(n)))
    }
  }
  if (patch.invoice_font_size_labels_px !== undefined) {
    const n = Number(patch.invoice_font_size_labels_px)
    row.invoice_font_size_labels_px =
      patch.invoice_font_size_labels_px == null || Number.isNaN(n)
        ? null
        : clampInt(n, 8, 24)
  }
  if (patch.invoice_font_size_line_items_heading_px !== undefined) {
    const n = Number(patch.invoice_font_size_line_items_heading_px)
    row.invoice_font_size_line_items_heading_px =
      patch.invoice_font_size_line_items_heading_px == null || Number.isNaN(n)
        ? null
        : clampInt(n, 9, 28)
  }
  if (patch.invoice_font_size_table_px !== undefined) {
    const n = Number(patch.invoice_font_size_table_px)
    row.invoice_font_size_table_px =
      patch.invoice_font_size_table_px == null || Number.isNaN(n) ? null : clampInt(n, 7, 22)
  }
  if (patch.invoice_font_size_customer_name_px !== undefined) {
    const n = Number(patch.invoice_font_size_customer_name_px)
    row.invoice_font_size_customer_name_px =
      patch.invoice_font_size_customer_name_px == null || Number.isNaN(n)
        ? null
        : clampInt(n, 10, 34)
  }
  if (patch.invoice_font_size_business_name_px !== undefined) {
    const n = Number(patch.invoice_font_size_business_name_px)
    row.invoice_font_size_business_name_px =
      patch.invoice_font_size_business_name_px == null || Number.isNaN(n)
        ? null
        : clampInt(n, 9, 30)
  }
  if (patch.invoice_font_size_invoice_number_px !== undefined) {
    const n = Number(patch.invoice_font_size_invoice_number_px)
    row.invoice_font_size_invoice_number_px =
      patch.invoice_font_size_invoice_number_px == null || Number.isNaN(n)
        ? null
        : clampInt(n, 12, 44)
  }
  if (patch.invoice_font_size_disclaimer_px !== undefined) {
    const n = Number(patch.invoice_font_size_disclaimer_px)
    row.invoice_font_size_disclaimer_px =
      patch.invoice_font_size_disclaimer_px == null || Number.isNaN(n)
        ? null
        : clampInt(n, 6, 16)
  }
  if (patch.invoice_font_size_grand_total_px !== undefined) {
    const n = Number(patch.invoice_font_size_grand_total_px)
    row.invoice_font_size_grand_total_px =
      patch.invoice_font_size_grand_total_px == null || Number.isNaN(n)
        ? null
        : clampInt(n, 12, 40)
  }
  if (patch.invoice_text_color !== undefined) {
    row.invoice_text_color = patch.invoice_text_color?.trim() || null
  }
  if (patch.invoice_muted_text_color !== undefined) {
    row.invoice_muted_text_color = patch.invoice_muted_text_color?.trim() || null
  }
  if (patch.invoice_label_text_color !== undefined) {
    row.invoice_label_text_color = patch.invoice_label_text_color?.trim() || null
  }
  if (patch.invoice_section_title_color !== undefined) {
    row.invoice_section_title_color = patch.invoice_section_title_color?.trim() || null
  }
  if (patch.invoice_table_header_text_color !== undefined) {
    row.invoice_table_header_text_color = patch.invoice_table_header_text_color?.trim() || null
  }
  if (patch.invoice_table_header_bg_color !== undefined) {
    row.invoice_table_header_bg_color = patch.invoice_table_header_bg_color?.trim() || null
  }
  if (patch.invoice_customer_name_color !== undefined) {
    row.invoice_customer_name_color = patch.invoice_customer_name_color?.trim() || null
  }
  if (patch.invoice_business_name_color !== undefined) {
    row.invoice_business_name_color = patch.invoice_business_name_color?.trim() || null
  }
  if (patch.invoice_invoice_number_color !== undefined) {
    row.invoice_invoice_number_color = patch.invoice_invoice_number_color?.trim() || null
  }
  if (patch.invoice_footer_value_color !== undefined) {
    row.invoice_footer_value_color = patch.invoice_footer_value_color?.trim() || null
  }
  if (patch.invoice_grand_total_label_color !== undefined) {
    row.invoice_grand_total_label_color = patch.invoice_grand_total_label_color?.trim() || null
  }
  if (patch.invoice_grand_total_amount_color !== undefined) {
    row.invoice_grand_total_amount_color = patch.invoice_grand_total_amount_color?.trim() || null
  }
  if (patch.invoice_disclaimer_text_color !== undefined) {
    row.invoice_disclaimer_text_color = patch.invoice_disclaimer_text_color?.trim() || null
  }
  if (patch.invoice_product_note_color !== undefined) {
    row.invoice_product_note_color = patch.invoice_product_note_color?.trim() || null
  }
  if (patch.invoice_background_image_path !== undefined) {
    row.invoice_background_image_path = patch.invoice_background_image_path?.trim() || null
  }
  if (patch.invoice_footer_stripe_color !== undefined) {
    row.invoice_footer_stripe_color = patch.invoice_footer_stripe_color?.trim() || null
  }
  if (patch.payment_venmo_tag !== undefined) {
    row.payment_venmo_tag = patch.payment_venmo_tag?.trim() || null
  }
  if (patch.payment_zelle_tag !== undefined) {
    row.payment_zelle_tag = patch.payment_zelle_tag?.trim() || null
  }
  if (patch.payment_zelle_recipient_name !== undefined) {
    row.payment_zelle_recipient_name = patch.payment_zelle_recipient_name?.trim() || null
  }
  const { error } = await supabase.from('business_settings').update(row).eq('user_id', userId)
  return { error }
}

/** Signed URL for private `branding` bucket (short-lived; enough for print/PDF). */
export async function getBrandingSignedUrl(storagePath: string, expiresInSeconds = 3600) {
  const path = storagePath.trim()
  if (!path) return { signedUrl: null as string | null, error: null as null }
  const { data, error } = await supabase.storage
    .from('branding')
    .createSignedUrl(path, expiresInSeconds)
  return { signedUrl: data?.signedUrl ?? null, error }
}

/** @deprecated Use getBrandingSignedUrl */
export async function getBrandingLogoSignedUrl(logoPath: string, expiresInSeconds = 3600) {
  return getBrandingSignedUrl(logoPath, expiresInSeconds)
}

export async function fetchEstimateForUser(estimateId: string, userId: string) {
  const { data, error } = await supabase
    .from('estimates')
    .select(
      'id, user_id, customer_id, estimate_number, status, event_date, guest_count, party_occasion, fulfillment_type, delivery_address, pickup_address, delivery_fee, subtotal, discount, total, balance_paid, notes, created_at, customers ( name, phone, address )',
    )
    .eq('id', estimateId)
    .eq('user_id', userId)
    .maybeSingle()

  return { data: data as EstimateWithCustomer | null, error }
}

export async function fetchEstimateLines(estimateId: string) {
  const { data: lines, error } = await supabase
    .from('estimate_lines')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('sort_order', { ascending: true })

  if (error) return { data: null, error }

  const asLines = (lines ?? []) as EstimateLine[]
  const ids = [...new Set(asLines.map((l) => l.product_id).filter((id): id is string => Boolean(id)))]

  const productsMap = new Map<string, { name: string; notes: string | null }>()
  if (ids.length > 0) {
    const { data: baseRows, error: baseErr } = await supabase
      .from('products')
      .select('id, name')
      .in('id', ids)
    if (!baseErr && baseRows) {
      const notesById = new Map<string, string | null>()
      const { data: noteRows, error: noteErr } = await supabase
        .from('products')
        .select('id, notes')
        .in('id', ids)
      if (!noteErr && noteRows) {
        for (const r of noteRows as { id: string; notes?: string | null }[]) {
          notesById.set(r.id, r.notes ?? null)
        }
      }
      for (const p of baseRows as { id: string; name: string }[]) {
        productsMap.set(p.id, { name: p.name, notes: notesById.get(p.id) ?? null })
      }
    }
  }

  const merged: EstimateLineWithProduct[] = asLines.map((line) => ({
    ...line,
    products: line.product_id ? (productsMap.get(line.product_id) ?? null) : null,
  }))

  return { data: merged, error: null }
}

export async function deleteEstimateLine(lineId: string) {
  const { error } = await supabase.from('estimate_lines').delete().eq('id', lineId)
  return { error }
}

export async function fetchRecentEstimates(userId: string, limit = 25) {
  const { data, error } = await supabase
    .from('estimates')
    .select(
      'id, user_id, customer_id, estimate_number, status, event_date, guest_count, party_occasion, total, balance_paid, created_at, customers ( name )',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  const rows = (data as EstimateWithCustomer[] | null) ?? []
  return {
    data: rows.map((r) => ({
      ...r,
      customer_name: unwrapCustomerName(r),
    })),
    error,
  }
}
