import { describe, expect, it } from 'vitest'
import { base64UrlToBytes, VAPID_PUBLIC_KEY } from './push'

describe('VAPID public key', () => {
  it('decodes to an uncompressed P-256 point (65 bytes starting 0x04)', () => {
    const bytes = base64UrlToBytes(VAPID_PUBLIC_KEY)
    expect(bytes).toHaveLength(65)
    expect(bytes[0]).toBe(0x04)
  })

  it('handles base64url characters and missing padding', () => {
    expect([...base64UrlToBytes('-_8')]).toEqual([0xfb, 0xff])
  })
})
