import { supabase } from '@/lib/supabase'
import type { PricingType, Product, ProductOption, ProductOptionGroup } from '@/types/database'

/** PostgREST when `products.notes` column is not migrated yet */
function isMissingProductNotesColumn(err: { message?: string } | null): boolean {
  const m = (err?.message ?? '').toLowerCase()
  return (
    m.includes('notes') &&
    (m.includes('schema cache') || m.includes('could not find') || m.includes('column'))
  )
}

export async function fetchProducts(userId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return { data: data as Product[] | null, error }
}

export async function fetchProduct(id: string) {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle()

  return { data: data as Product | null, error }
}

export async function insertProduct(row: {
  user_id: string
  name: string
  notes?: string | null
  pricing_type: PricingType
  base_price: number | null
  is_active: boolean
  sort_order: number
}) {
  const payload = {
    user_id: row.user_id,
    name: row.name,
    notes: row.notes?.trim() || null,
    pricing_type: row.pricing_type,
    base_price: row.base_price,
    is_active: row.is_active,
    sort_order: row.sort_order,
  }
  let { data, error } = await supabase.from('products').insert(payload).select('id').single()
  if (error && isMissingProductNotesColumn(error)) {
    const { notes: _omit, ...withoutNotes } = payload
    ;({ data, error } = await supabase.from('products').insert(withoutNotes).select('id').single())
  }
  return { data, error }
}

export async function updateProduct(
  id: string,
  patch: {
    name?: string
    notes?: string | null
    pricing_type?: PricingType
    base_price?: number | null
    is_active?: boolean
    sort_order?: number
  },
) {
  let { error } = await supabase.from('products').update(patch).eq('id', id)
  if (error && patch.notes !== undefined && isMissingProductNotesColumn(error)) {
    const { notes: _omit, ...rest } = patch
    if (Object.keys(rest).length > 0) {
      ;({ error } = await supabase.from('products').update(rest).eq('id', id))
    }
    /* else: nothing to update without notes column; leave original error */
  }
  return { error }
}

export type GroupWithOptions = ProductOptionGroup & {
  product_options: ProductOption[] | null
}

export async function fetchOptionGroupsWithOptions(productId: string) {
  const { data, error } = await supabase
    .from('product_option_groups')
    .select('*, product_options(*)')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })

  const rows = (data as GroupWithOptions[] | null) ?? []
  for (const g of rows) {
    if (g.product_options) {
      g.product_options.sort((a, b) => a.sort_order - b.sort_order)
    }
  }
  rows.sort((a, b) => a.sort_order - b.sort_order)

  return { data: rows, error }
}

export async function insertOptionGroup(row: {
  user_id: string
  product_id: string
  label: string
  sort_order: number
}) {
  const { data, error } = await supabase
    .from('product_option_groups')
    .insert(row)
    .select('id')
    .single()

  return { data, error }
}

export async function updateOptionGroup(id: string, label: string) {
  const { error } = await supabase.from('product_option_groups').update({ label }).eq('id', id)
  return { error }
}

export async function deleteOptionGroup(id: string) {
  const { error } = await supabase.from('product_option_groups').delete().eq('id', id)
  return { error }
}

export async function insertProductOption(row: {
  user_id: string
  group_id: string
  label: string
  price_delta: number
  sort_order: number
}) {
  const { data, error } = await supabase.from('product_options').insert(row).select('id').single()

  return { data, error }
}

export async function updateProductOption(
  id: string,
  patch: { label?: string; price_delta?: number },
) {
  const { error } = await supabase.from('product_options').update(patch).eq('id', id)
  return { error }
}

export async function deleteProductOption(id: string) {
  const { error } = await supabase.from('product_options').delete().eq('id', id)
  return { error }
}
