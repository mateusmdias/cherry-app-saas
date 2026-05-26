# Technical constraints

Constraints agreed for implementation. Update this document when stakeholders or the team change decisions.

## Frontend

| Constraint | Detail |
|--------------|--------|
| Framework | React |
| Language | TypeScript (strict mode recommended) |
| HTTP | Use the **native `fetch` API** (or wrappers built on `fetch`). **Axios must not be used** in this project under any circumstance. |

### Rationale for no axios

- Smaller dependency surface and bundle size
- Align with platform standards (`fetch` is built into modern browsers and Node 18+)
- Encourage a thin, typed API client layer (e.g. shared error handling, auth headers) in project code

### Suggested pattern

```typescript
// Example: typed wrapper around fetch (not a library requirement)
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json() as Promise<T>;
}
```

## Backend & infrastructure

| Layer | Choice |
|-------|--------|
| Repository | GitHub |
| Database + Auth | Supabase (Postgres, Auth, Storage, RLS) |
| Hosting | Vercel (React SPA) |
| API (MVP) | Supabase client (`@supabase/supabase-js`) — no separate Node server for v1 |
| CI | GitHub Actions (lint, typecheck, test) |
| CD | Vercel (preview + production) |
| DB migrations | Supabase CLI in `supabase/migrations/` |

See [implementation-plan.md](implementation-plan.md) for phased delivery.
