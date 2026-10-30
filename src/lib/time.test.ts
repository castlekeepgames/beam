import { describe, expect, it } from 'vitest'
import { formatRelative } from './time'

const NOW = Date.parse('2026-10-30T12:00:00Z')
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString()

describe('formatRelative', () => {
  it('says "just now" for the first 45 seconds', () => {
    expect(formatRelative(ago(0), NOW)).toBe('just now')
    expect(formatRelative(ago(44), NOW)).toBe('just now')
  })

  it('treats slightly-future timestamps (clock skew) as just now', () => {
    expect(formatRelative(ago(-20), NOW)).toBe('just now')
  })

  it('uses minutes under an hour', () => {
    expect(formatRelative(ago(60), NOW)).toBe('1 min ago')
    expect(formatRelative(ago(59 * 60), NOW)).toBe('59 min ago')
  })

  it('uses whole hours under a day', () => {
    expect(formatRelative(ago(60 * 60), NOW)).toBe('1 h ago')
    expect(formatRelative(ago(23 * 3600 + 59 * 60), NOW)).toBe('23 h ago')
  })

  it('falls back to a date after a day', () => {
    expect(formatRelative(ago(25 * 3600), NOW)).not.toMatch(/ago/)
  })

  it('returns empty for garbage', () => {
    expect(formatRelative('nope', NOW)).toBe('')
  })
})
