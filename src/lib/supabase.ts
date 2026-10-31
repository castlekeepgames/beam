import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const SUPABASE_URL = (url ?? '').replace(/\/+$/, '')
export const SUPABASE_KEY = key ?? ''

/** Set when the build is missing its Supabase settings; the app shows it instead of crashing. */
export const configError =
  url && key ? null : 'Beam is missing its Supabase settings (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY). See docs/SETUP.md.'

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'beam.auth',
  },
})
