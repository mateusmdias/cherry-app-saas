export function SetupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold text-cherry-800">Cherry — setup required</h1>
      <p className="mt-3 text-stone-600">
        Add your Supabase credentials to run the app locally.
      </p>
      <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-stone-700">
        <li>Create a project at supabase.com</li>
        <li>
          Copy <code className="rounded bg-stone-200 px-1">.env.example</code> to{' '}
          <code className="rounded bg-stone-200 px-1">apps/web/.env.local</code>
        </li>
        <li>
          Set <code className="rounded bg-stone-200 px-1">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-stone-200 px-1">VITE_SUPABASE_ANON_KEY</code>
        </li>
        <li>
          Run migrations: see{' '}
          <code className="rounded bg-stone-200 px-1">docs/setup.md</code>
        </li>
        <li>
          Restart: <code className="rounded bg-stone-200 px-1">npm run dev</code>
        </li>
      </ol>
    </main>
  )
}
