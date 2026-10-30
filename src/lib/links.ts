export type TextKind = 'text' | 'link'

/**
 * If `input` is a single http(s) URL (surrounding whitespace allowed), returns
 * the normalised URL. A bare `www.` host is treated as https. Otherwise null.
 */
export function parseSingleUrl(input: string): string | null {
  const trimmed = input.trim()
  if (trimmed === '' || /\s/.test(trimmed)) return null

  const candidate = /^www\./i.test(trimmed) ? `https://${trimmed}` : trimmed
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null
  return candidate
}

/** Decide how pasted text is stored: a lone URL becomes a link item. */
export function classifyText(input: string): { kind: TextKind; content: string } {
  const url = parseSingleUrl(input)
  if (url) return { kind: 'link', content: url }
  return { kind: 'text', content: input }
}

/** Only ever open http(s) links, even if the database holds something else. */
export function isSafeHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
