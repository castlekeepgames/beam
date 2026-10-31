import { describe, expect, it } from 'vitest'
import { hashReceiveToken, isReceiveToken, newReceiveToken } from './receive'

describe('Receive tokens', () => {
  it('are 43 URL-safe characters (32 random bytes) and never repeat', () => {
    const a = newReceiveToken()
    const b = newReceiveToken()
    expect(isReceiveToken(a)).toBe(true)
    expect(a).not.toBe(b)
  })

  it('rejects anything else', () => {
    expect(isReceiveToken('short')).toBe(false)
    expect(isReceiveToken(`${'a'.repeat(42)}=`)).toBe(false)
    expect(isReceiveToken(42)).toBe(false)
    expect(isReceiveToken(undefined)).toBe(false)
  })

  it('hashes with SHA-256 to lowercase hex (matches the database check)', async () => {
    // SHA-256("abc"), a standard test vector.
    expect(await hashReceiveToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(await hashReceiveToken(newReceiveToken())).toMatch(/^[0-9a-f]{64}$/)
  })
})
