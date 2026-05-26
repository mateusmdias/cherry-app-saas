import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  fetchCustomerById,
  insertCustomer,
  updateCustomer,
} from '@/features/customers/customerQueries'

export function CustomerFormPage() {
  const { customerId } = useParams<{ customerId: string }>()
  const location = useLocation()
  const isEditMode = Boolean(customerId) && location.pathname.endsWith('/edit')
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(isEditMode)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const backTo = useMemo(() => {
    if (isEditMode && customerId) return `/customers/${customerId}`
    return '/customers'
  }, [isEditMode, customerId])

  useEffect(() => {
    if (!isEditMode || !customerId) return

    let cancelled = false
    void (async () => {
      const { data, error: err } = await fetchCustomerById(customerId)
      if (cancelled) return
      setLoading(false)
      if (err || !data) {
        setError(err?.message ?? 'Customer not found')
        return
      }
      setName(data.name)
      setPhone(data.phone ?? '')
      setAddress(data.address ?? '')
      setNotes(data.notes ?? '')
    })()

    return () => {
      cancelled = true
    }
  }, [isEditMode, customerId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user?.id) return

    setError(null)
    setSaving(true)

    if (isEditMode && customerId) {
      const { error: err } = await updateCustomer(customerId, {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      })
      setSaving(false)
      if (err) {
        setError(err.message)
        return
      }
      navigate(`/customers/${customerId}`, { replace: true })
      return
    }

    const { data, error: err } = await insertCustomer({
      user_id: user.id,
      name: name.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    })
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    if (data?.id) {
      navigate(`/customers/${data.id}`, { replace: true })
    }
  }

  if (loading) {
    return <p className="text-stone-600">Loading…</p>
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <Link to={backTo} className="text-sm font-medium text-cherry-700 hover:underline">
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">
          {isEditMode ? 'Edit customer' : 'New customer'}
        </h1>
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
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
          <span className="text-sm font-medium text-stone-700">Phone</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Address</span>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-cherry-700 px-4 py-2 text-sm font-medium text-white hover:bg-cherry-800 disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEditMode ? 'Save changes' : 'Create customer'}
          </button>
          <Link
            to={backTo}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
