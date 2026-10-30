import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/** Current auth session; `loading` until Supabase has read the saved session. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fires INITIAL_SESSION straight away, then on every sign-in/out/refresh.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return { session, loading }
}
