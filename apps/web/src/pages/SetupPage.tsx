export function SetupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold text-cherry-800">Cherry — setup required</h1>
      <p className="mt-3 text-stone-600">
        Supabase is configured via <strong className="font-medium">environment variables</strong>, not by pasting
        secrets into source. The file <code className="rounded bg-stone-200 px-1">src/config.ts</code> only re-exports
        those settings from <code className="rounded bg-stone-200 px-1">src/lib/env.ts</code> — set{' '}
        <code className="rounded bg-stone-200 px-1">VITE_SUPABASE_URL</code> and{' '}
        <code className="rounded bg-stone-200 px-1">VITE_SUPABASE_ANON_KEY</code> instead. If you see “Failed to fetch”
        in the console, the URL or key is usually missing, still a placeholder, or the last deploy was built before env
        vars were set on the host.
      </p>
      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-stone-500">Local</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-stone-700">
        <li>Create a project at supabase.com</li>
        <li>
          Copy <code className="rounded bg-stone-200 px-1">.env.example</code> to{' '}
          <code className="rounded bg-stone-200 px-1">apps/web/.env.local</code>
        </li>
        <li>
          Set <code className="rounded bg-stone-200 px-1">VITE_SUPABASE_URL</code> (must be{' '}
          <code className="rounded bg-stone-200 px-1">https://…supabase.co</code>) and{' '}
          <code className="rounded bg-stone-200 px-1">VITE_SUPABASE_ANON_KEY</code> from Supabase → Settings → API
        </li>
        <li>
          Restart: <code className="rounded bg-stone-200 px-1">npm run dev</code>
        </li>
      </ol>
      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-stone-500">Vercel (or any host)</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-stone-700">
        <li>
          Project → <strong>Settings → Environment Variables</strong>: add the same two names for{' '}
          <strong>Production</strong> (and Preview if you use it).
        </li>
        <li>
          <strong>Redeploy</strong> after saving variables — Vite bakes <code className="rounded bg-stone-200 px-1">VITE_*</code>{' '}
          values in at <em>build</em> time, not when visitors load the site.
        </li>
        <li>
          Migrations: see <code className="rounded bg-stone-200 px-1">supabase/README.md</code> in the repo.
        </li>
      </ol>
    </main>
  )
}
