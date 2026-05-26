const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function isPlaceholderValue(v: string): boolean {
  const t = v.trim().toLowerCase()
  if (!t) return true
  if (t.includes('your_')) return true
  if (t.includes('your-project')) return true
  if (t.includes('placeholder')) return true
  if (t === 'anon key sample') return true
  return false
}

/** Hosted Supabase project URL (…supabase.co). Custom domains are not validated here. */
function looksLikeSupabaseProjectUrl(url: string): boolean {
  const t = url.trim()
  if (!t.startsWith('https://')) return false
  try {
    const host = new URL(t).hostname
    return host.endsWith('.supabase.co') && host.length > '.supabase.co'.length
  } catch {
    return false
  }
}

/** Reject obvious garbage; real anon keys are long JWTs or publishable keys. */
function looksLikeSupabaseAnonKey(key: string): boolean {
  const t = key.trim()
  if (t.length < 32) return false
  if (isPlaceholderValue(t)) return false
  return true
}

const urlOk = supabaseUrl && !isPlaceholderValue(supabaseUrl) && looksLikeSupabaseProjectUrl(supabaseUrl)
const keyOk = supabaseAnonKey && !isPlaceholderValue(supabaseAnonKey) && looksLikeSupabaseAnonKey(supabaseAnonKey)

export const isSupabaseConfigured = Boolean(urlOk && keyOk)

export const env = {
  supabaseUrl: (supabaseUrl ?? '').trim(),
  supabaseAnonKey: (supabaseAnonKey ?? '').trim(),
}
