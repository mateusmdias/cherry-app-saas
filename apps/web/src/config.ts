/**
 * Supabase-related settings for the web app.
 *
 * **Do not put credentials in this file.** Values come from Vite at build time:
 * `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see repo root `.env.example`,
 * local `apps/web/.env.local`, and Vercel/host env vars).
 *
 * This module exists so anything looking for a conventional `config` entry point
 * finds one; the source of truth remains `src/lib/env.ts`.
 */
export { env, isSupabaseConfigured } from '@/lib/env'
