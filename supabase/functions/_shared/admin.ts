import { createClient } from 'jsr:@supabase/supabase-js@2'

/** Server-side key, injected by Supabase into every Edge Function. Never sent to browsers. */
function serviceKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  // Projects on the new API keys get a JSON map of secret keys instead.
  const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>
  const key = keys.default ?? Object.values(keys)[0]
  if (!key) throw new Error('No Supabase service key available')
  return key
}

/** Supabase client with full access (bypasses RLS). Only for Edge Functions. */
export function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, serviceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
