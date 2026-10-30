import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { inputClass } from './styles'
import { Button, CenteredCard } from './ui'

function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password.'
  if (/failed to fetch|network/i.test(message)) return "Can't reach the server. Check your connection."
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Wait a minute and try again.'
  return message
}

export function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    // On success useSession picks up the new session and this screen unmounts.
    if (error) {
      setError(friendlyAuthError(error.message))
      setBusy(false)
    }
  }

  return (
    <CenteredCard title="Sign in to Beam">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <input
            className={inputClass}
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Password
          <input
            className={inputClass}
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="mt-2">
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </CenteredCard>
  )
}
