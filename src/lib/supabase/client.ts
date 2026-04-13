import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// These values are inlined at build time by Next.js.
// If either is missing, the Vercel deployment is missing environment variables.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Missing environment variables.\n' +
    '  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ?? 'MISSING',
    '\n  NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '(set)' : 'MISSING',
    '\nAdd these in Vercel → Settings → Environment Variables, then redeploy.'
  )
}

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel → Settings → Environment Variables, ' +
      'then trigger a new deployment.'
    )
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
