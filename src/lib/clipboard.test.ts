import { describe, expect, it } from 'vitest'
import { nameForPastedFile, pickImageType, screenshotName } from './clipboard'

const NOW = new Date(2026, 9, 31, 14, 32, 5) // local time

describe('pickImageType', () => {
  it('prefers PNG, then other image types', () => {
    expect(pickImageType(['text/html', 'image/jpeg', 'image/png'])).toBe('image/png')
    expect(pickImageType(['image/webp'])).toBe('image/webp')
  })

  it('ignores text-only clipboards', () => {
    expect(pickImageType(['text/plain', 'text/html'])).toBeNull()
  })
})

describe('screenshotName', () => {
  it('uses a readable local timestamp and the right extension', () => {
    expect(screenshotName('image/png', NOW)).toBe('Screenshot 2026-10-31 14-32-05.png')
    expect(screenshotName('image/jpeg', NOW)).toBe('Screenshot 2026-10-31 14-32-05.jpg')
  })
})

describe('nameForPastedFile', () => {
  it('renames generic pasted screenshots', () => {
    const renamed = nameForPastedFile(new File(['x'], 'image.png', { type: 'image/png' }), NOW)
    expect(renamed.name).toBe('Screenshot 2026-10-31 14-32-05.png')
    expect(renamed.type).toBe('image/png')
  })

  it('keeps real file names', () => {
    const file = new File(['x'], 'holiday.jpg', { type: 'image/jpeg' })
    expect(nameForPastedFile(file, NOW)).toBe(file)
  })
})
