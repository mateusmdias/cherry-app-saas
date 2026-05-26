# Deploy on Vercel

This repo is an npm workspace. The Vite app lives under `apps/web` and builds to **`apps/web/dist`**.

## Recommended: deploy from the repository root

1. **Root Directory** (Project → Settings → General): leave **empty** or set to `.` (repository root). Do **not** set it to `apps/web` unless you follow the alternate section below.
2. **Build & Output Settings**: click **Reset** / clear overrides so **`vercel.json`** at the repo root controls install, build, and output. If **Output Directory** is manually set to `dist`, remove it — that value is relative to the project root and would look for `./dist`, which does not exist (the bundle is in `apps/web/dist`).
3. **Environment variables**: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Production (and Preview if needed), then redeploy so Vite embeds them at build time.

Root `vercel.json` uses:

- `framework`: `null` (Vercel “Other” preset — avoids the Vite preset forcing a root `dist/` layout)
- `installCommand`: `npm install`
- `buildCommand`: `npm run build -w web`
- `outputDirectory`: `apps/web/dist`

## Alternate: Root Directory = `apps/web`

If the Vercel project **Root Directory** is **`apps/web`**, Vercel reads **`apps/web/vercel.json`** instead of the root file. That file builds with `npm run build` and publishes **`dist`** inside `apps/web`.

Still clear any **Output Directory** override in the dashboard that points at the wrong path.
