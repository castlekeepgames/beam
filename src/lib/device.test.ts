import { describe, expect, it } from 'vitest'
import { cleanDeviceName, MAX_DEVICE_NAME, suggestDeviceName } from './device'

describe('suggestDeviceName', () => {
  it('recognises an Android phone (Chrome reduced UA)', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
    expect(suggestDeviceName(ua)).toBe('Android phone')
  })

  it('recognises an Android tablet', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
    expect(suggestDeviceName(ua)).toBe('Android tablet')
  })

  it('recognises Windows (Edge and Chrome)', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0'
    expect(suggestDeviceName(ua)).toBe('Windows PC')
  })

  it('falls back to a generic name', () => {
    expect(suggestDeviceName('')).toBe('My device')
  })
})

describe('cleanDeviceName', () => {
  it('trims and collapses whitespace', () => {
    expect(cleanDeviceName('  My   Pixel \n')).toBe('My Pixel')
  })

  it('rejects blank names', () => {
    expect(cleanDeviceName('   ')).toBeNull()
  })

  it(`caps names at ${MAX_DEVICE_NAME} characters`, () => {
    expect(cleanDeviceName('x'.repeat(100))).toHaveLength(MAX_DEVICE_NAME)
  })
})
