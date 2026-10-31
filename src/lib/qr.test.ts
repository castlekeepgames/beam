import { encode } from 'uqr'
import { describe, expect, it } from 'vitest'
import { formatCountdown, qrAvailability, QR_MAX_CHARS, qrPath } from './qr'

describe('qrAvailability', () => {
  it('allows links and short text', () => {
    expect(qrAvailability({ kind: 'link', content: 'https://example.com', file_path: null })).toBe('ok')
    expect(qrAvailability({ kind: 'text', content: 'x'.repeat(QR_MAX_CHARS), file_path: null })).toBe('ok')
  })

  it('flags text that is too long to scan', () => {
    expect(qrAvailability({ kind: 'text', content: 'x'.repeat(QR_MAX_CHARS + 1), file_path: null })).toBe('too-long')
  })

  it('allows files that have a stored object', () => {
    expect(qrAvailability({ kind: 'file', content: null, file_path: 'u/i/a.pdf' })).toBe('ok')
    expect(qrAvailability({ kind: 'file', content: null, file_path: null })).toBe('none')
  })

  it('has nothing to show for empty text', () => {
    expect(qrAvailability({ kind: 'text', content: '', file_path: null })).toBe('none')
  })
})

describe('qrPath', () => {
  it('merges horizontal runs of dark modules', () => {
    expect(
      qrPath([
        [true, true, false, true],
        [false, false, false, false],
        [false, true, true, true],
      ]),
    ).toBe('M0 0h2v1h-2zM3 0h1v1h-1zM1 2h3v1h-3z')
  })

  it('draws a real code with three finder patterns (7-wide runs on the first row)', () => {
    const qr = encode('https://example.com', { ecc: 'M', border: 0 })
    const firstRow = qrPath([qr.data[0]])
    expect(firstRow.startsWith('M0 0h7v1h-7z')).toBe(true)
    expect(firstRow).toContain(`M${qr.size - 7} 0h7v1h-7z`)
  })

  it('fits a long Supabase signed download URL', () => {
    const url = `https://abcdefghijklmnopqrst.supabase.co/storage/v1/object/sign/files/${'u'.repeat(36)}/${'i'.repeat(36)}/Quarterly_report_final.pdf?token=${'t'.repeat(300)}&download=Quarterly%20report%20(final).pdf`
    expect(url.length).toBeLessThan(QR_MAX_CHARS)
    expect(encode(url, { ecc: 'M', border: 0 }).version).toBeLessThanOrEqual(20)
  })
})

describe('formatCountdown', () => {
  it('formats minutes and padded seconds, rounding up', () => {
    expect(formatCountdown(15 * 60_000)).toBe('15:00')
    expect(formatCountdown(61_500)).toBe('1:02')
    expect(formatCountdown(9_000)).toBe('0:09')
  })

  it('never goes negative', () => {
    expect(formatCountdown(-5000)).toBe('0:00')
  })
})
