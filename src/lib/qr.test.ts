import { encode } from 'uqr'
import { describe, expect, it } from 'vitest'
import {
  formatCountdown,
  isSharedTextHash,
  QR_COMFORT_CHARS,
  qrErrorCorrection,
  QR_MAX_CHARS,
  qrPath,
  qrPayload,
  readSharedText,
  textViewUrl,
} from './qr'

const BASE = 'https://castlekeepgames.github.io/beam/'

// A realistic ~600-character message (the kind that was rejected before compression).
const MESSAGE =
  'Hi! Quick update for tomorrow: the meeting has moved to 10:30 in the small conference room on the second floor, ' +
  'not the usual one. Please bring the printed copies of the quarterly report and the notes from last week. ' +
  'If you are running late, send me a message and I will start without you and fill you in afterwards. ' +
  'Also, the parking garage on Main Street is closed for repairs this week, so use the one behind the library instead. ' +
  'Lunch will be provided after the meeting, so no need to bring anything. Let me know if you have any questions ' +
  'before then, otherwise see you there. Thanks!'

describe('shared-text links', () => {
  it('round-trips text, including accents, emoji and new lines', async () => {
    const text = 'Meet at 6 by the café 🔌\nbring the charger'
    const url = await textViewUrl(text, BASE)
    expect(isSharedTextHash(new URL(url).hash)).toBe(true)
    expect(await readSharedText(new URL(url).hash)).toBe(text)
  })

  it('keeps very short text uncompressed (compression would make it longer)', async () => {
    expect(await textViewUrl('hi', BASE)).toBe(`${BASE}#t=aGk`)
  })

  it('compresses longer text so a ~600-character message fits', async () => {
    expect(MESSAGE.length).toBeGreaterThan(580)
    const url = await textViewUrl(MESSAGE, BASE)
    expect(url).toContain('#z=')
    expect(url.length).toBeLessThanOrEqual(QR_MAX_CHARS)
    expect(await readSharedText(new URL(url).hash)).toBe(MESSAGE)
  })

  it('uses only URL-safe characters after the #', async () => {
    expect((await textViewUrl(MESSAGE, BASE)).split('#')[1].slice(2)).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('ignores other hashes and corrupt data', async () => {
    expect(isSharedTextHash('#item=1')).toBe(false)
    expect(await readSharedText('')).toBeNull()
    expect(await readSharedText('#item=1')).toBeNull()
    expect(await readSharedText('#t=%%%')).toBeNull()
    expect(await readSharedText('#t=_w')).toBeNull() // not valid UTF-8
    expect(await readSharedText('#z=AAAA')).toBeNull() // not valid deflate
  })
})

describe('qrPayload', () => {
  it('links encode as themselves; text becomes a shared-text link', async () => {
    expect(await qrPayload({ kind: 'link', content: 'https://example.com' }, BASE)).toEqual({
      status: 'ok',
      value: 'https://example.com',
    })
    expect(await qrPayload({ kind: 'text', content: 'hi' }, BASE)).toEqual({ status: 'ok', value: `${BASE}#t=aGk` })
  })

  it('accepts the ~600-character message', async () => {
    expect((await qrPayload({ kind: 'text', content: MESSAGE }, BASE)).status).toBe('ok')
  })

  it('rejects text that will not fit even compressed', async () => {
    // Pseudo-random text (xorshift) barely compresses.
    let seed = 2463534242
    const noise = Array.from({ length: 900 }, () => {
      seed ^= seed << 13
      seed ^= seed >>> 17
      seed ^= seed << 5
      return String.fromCharCode(33 + ((seed >>> 0) % 90))
    }).join('')
    expect(await qrPayload({ kind: 'text', content: noise }, BASE)).toEqual({ status: 'too-long', length: 900 })
  })

  it('has nothing to show for empty text', async () => {
    expect(await qrPayload({ kind: 'text', content: '' }, BASE)).toEqual({ status: 'none' })
  })
})

describe('qrErrorCorrection', () => {
  it('uses medium correction while comfortable, low for long payloads', () => {
    expect(qrErrorCorrection('x'.repeat(QR_COMFORT_CHARS))).toBe('M')
    expect(qrErrorCorrection('x'.repeat(QR_COMFORT_CHARS + 1))).toBe('L')
  })

  it('a maximum-length payload still fits in a version 25 code or smaller', () => {
    const value = 'x'.repeat(QR_MAX_CHARS)
    expect(encode(value, { ecc: qrErrorCorrection(value), border: 0 }).version).toBeLessThanOrEqual(25)
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
