import { hashReceiveToken, newReceiveToken } from '../../supabase/functions/_shared/receive'
import { supabase, SUPABASE_KEY, SUPABASE_URL } from './supabase'

export { RECEIVE_MAX_ITEMS, RECEIVE_MINUTES } from '../../supabase/functions/_shared/receive'

/** Location hash of a Receive link: <Beam URL>#r=<token>. The token never reaches GitHub. */
const RECEIVE_HASH = '#r='

export function isReceiveHash(hash: string): boolean {
  return hash.startsWith(RECEIVE_HASH)
}

export function receiveTokenFromHash(hash: string): string {
  return hash.slice(RECEIVE_HASH.length)
}

export function receiveUrl(token: string, baseUrl: string): string {
  return `${baseUrl}${RECEIVE_HASH}${token}`
}

// ---- Owner side (signed in) -------------------------------------------------

export interface ReceiveCode {
  id: string
  token: string
  expiresAt: string
}

/** Start a new Receive code. Only the token's hash is stored. */
export async function createReceiveCode(): Promise<ReceiveCode> {
  const token = newReceiveToken()
  const { data, error } = await supabase
    .from('receive_codes')
    .insert({ token_hash: await hashReceiveToken(token) })
    .select('id, expires_at')
    .single()
  if (error) throw new Error(error.message)
  return { id: data.id, token, expiresAt: data.expires_at }
}

/** Stop a code early (when the dialog closes). Best effort. */
export async function stopReceiveCode(id: string): Promise<void> {
  await supabase.from('receive_codes').update({ revoked_at: new Date().toISOString() }).eq('id', id)
}

// ---- Guest side (not signed in) ---------------------------------------------

export class ReceiveError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
  /** The code is unknown, expired, stopped or used up. */
  get isGone(): boolean {
    return this.status === 404 || this.status === 410
  }
}

/** Call the `receive` Edge Function (no sign-in; the token is the permission). */
export async function callReceive<T>(token: string, action: string, payload: Record<string, unknown> = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/receive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify({ ...payload, action, token }),
    })
  } catch {
    throw new ReceiveError('Network error', 0)
  }
  const body = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) throw new ReceiveError(body.error ?? `Failed (${response.status})`, response.status)
  return body as T
}
