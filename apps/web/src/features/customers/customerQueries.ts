import { supabase } from '@/lib/supabase'
import type { Customer } from '@/types/database'

export type CustomerInsert = {
  user_id: string
  name: string
  phone?: string | null
  address?: string | null
  notes?: string | null
}

export async function fetchCustomers(userId: string, search?: string) {
  let q = supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true })

  const term = search?.trim()
  if (term) {
    const safe = term.replace(/%/g, '\\%').replace(/_/g, '\\_')
    q = q.or(`name.ilike.%${safe}%,phone.ilike.%${safe}%`)
  }

  const { data, error } = await q
  return { data: data as Customer[] | null, error }
}

export async function fetchCustomerById(id: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  return { data: data as Customer | null, error }
}

export async function fetchEstimatesForCustomer(customerId: string) {
  const { data, error } = await supabase
    .from('estimates')
    .select(
      'id, estimate_number, status, event_date, guest_count, party_occasion, total, balance_paid, created_at',
    )
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  return { data, error }
}

export async function insertCustomer(row: CustomerInsert) {
  const { data, error } = await supabase
    .from('customers')
    .insert({
      user_id: row.user_id,
      name: row.name,
      phone: row.phone ?? null,
      address: row.address ?? null,
      notes: row.notes ?? null,
    })
    .select('id')
    .single()

  return { data, error }
}

export async function updateCustomer(
  id: string,
  patch: Pick<Customer, 'name' | 'phone' | 'address' | 'notes'>,
) {
  const { error } = await supabase
    .from('customers')
    .update({
      name: patch.name,
      phone: patch.phone,
      address: patch.address,
      notes: patch.notes,
    })
    .eq('id', id)

  return { error }
}
