import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'

export function SignupPage() {
  const { user, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: signUpError } = await signUp(email.trim(), password, {
      display_name: displayName.trim() || undefined,
      business_name: businessName.trim() || undefined,
    })

    setSubmitting(false)

    if (signUpError) {
      setError(signUpError)
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-stone-900">Check your email</h1>
          <p className="mt-2 text-sm text-stone-600">
            We sent a confirmation link to <strong>{email}</strong>. After confirming,
            sign in to continue.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block font-medium text-cherry-700 hover:underline"
          >
            Back to sign in
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-cherry-700">
          Cherry
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">Create owner account</h1>
        <p className="mt-1 text-sm text-stone-600">
          For bakery owner use only. Disable public signup in Supabase after setup.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Your name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">Business name</span>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">Password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-cherry-600 focus:ring-2 focus:ring-cherry-100"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-cherry-700 px-4 py-2.5 font-medium text-white transition hover:bg-cherry-800 disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-cherry-700 hover:underline">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  )
}
