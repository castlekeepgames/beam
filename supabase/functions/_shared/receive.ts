// Receive codes: shared by the app and the `receive` Edge Function.
// Only WebCrypto is used, so this runs in browsers, Node (tests) and Deno.

/** How long a new Receive code works (the database default matches). */
export const RECEIVE_MINUTES = 10

/** How many items one code accepts (the database default matches). */
export const RECEIVE_MAX_ITEMS = 20

/** 32 random bytes, base64url: 43 characters. */
const TOKEN = /^[A-Za-z0-9_-]{43}$/

export function isReceiveToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN.test(value)
}

/** A new unguessable token for a Receive code. */
export function newReceiveToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** SHA-256 of the token as lowercase hex. Only this is stored in the database. */
export async function hashReceiveToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
