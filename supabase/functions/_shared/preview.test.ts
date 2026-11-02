import { describe, expect, it } from 'vitest'
import { batchLabel, notificationFor, notificationPayload } from './preview'

describe('notificationPayload', () => {
  it('adds the URL to link items so the notification can offer "Open link"', () => {
    expect(
      notificationPayload({ id: 'i1', kind: 'link', content: 'https://example.com/a', file_name: null }, 'Pixel'),
    ).toEqual({ title: 'From Pixel', body: 'https://example.com/a', itemId: 'i1', kind: 'link', url: 'https://example.com/a' })
  })

  it('never includes non-http links or URLs for other kinds', () => {
    expect(notificationPayload({ id: 'i2', kind: 'link', content: 'javascript:alert(1)', file_name: null }, 'A').url).toBeUndefined()
    expect(notificationPayload({ id: 'i3', kind: 'text', content: 'https://example.com', file_name: null }, 'A').url).toBeUndefined()
    expect(notificationPayload({ id: 'i4', kind: 'file', content: null, file_name: 'a.pdf' }, 'A').url).toBeUndefined()
  })
})

describe('notificationFor', () => {
  it('names the sending device', () => {
    expect(notificationFor({ kind: 'text', content: 'hi', file_name: null }, 'Windows PC')).toEqual({
      title: 'From Windows PC',
      body: 'hi',
    })
    expect(notificationFor({ kind: 'text', content: 'hi', file_name: null }, null).title).toBe('From another device')
  })

  it('collapses whitespace and truncates long text', () => {
    const body = notificationFor({ kind: 'text', content: `line one\n\n  line two ${'x'.repeat(300)}`, file_name: null }, 'A').body
    expect(body.startsWith('line one line two')).toBe(true)
    expect(body.length).toBeLessThanOrEqual(120)
    expect(body.endsWith('…')).toBe(true)
  })

  it('labels items sent through a Receive code as from a guest', () => {
    expect(notificationFor({ kind: 'text', content: 'hello', file_name: null, from_guest: true }, null).title).toBe(
      'From a guest',
    )
  })

  it('shows links and file names', () => {
    expect(notificationFor({ kind: 'link', content: 'https://example.com', file_name: null }, 'A').body).toBe(
      'https://example.com',
    )
    expect(notificationFor({ kind: 'file', content: null, file_name: 'report.pdf' }, 'A').body).toBe('File: report.pdf')
  })
})

describe('batches', () => {
  const photo = (name: string) => ({ file_name: name, mime_type: 'image/jpeg' })

  it('labels a batch by what it holds', () => {
    expect(batchLabel([photo('a'), photo('b')])).toBe('2 photos')
    expect(batchLabel([{ mime_type: 'video/mp4' }, { mime_type: 'video/webm' }])).toBe('2 videos')
    expect(batchLabel([{ mime_type: 'image/png' }, { mime_type: 'video/mp4' }])).toBe('2 photos and videos')
    expect(batchLabel([{ mime_type: 'image/png' }, { mime_type: 'application/pdf' }, { mime_type: null }])).toBe('3 files')
    expect(batchLabel([photo('a')])).toBe('1 photo')
  })

  it('sums up the batch so far and tags it so each file replaces the last notification', () => {
    const payload = notificationPayload({ id: 'i2', kind: 'file', content: null, file_name: 'b.jpg' }, 'Pixel', {
      id: 'B',
      files: [photo('a.jpg'), photo('b.jpg')],
    })
    expect(payload).toEqual({ title: 'From Pixel', body: '2 photos: a.jpg, b.jpg', itemId: 'i2', kind: 'file', tag: 'batch-B' })
  })

  it('shows the first file of a batch like a single file, but already tagged', () => {
    const payload = notificationPayload({ id: 'i1', kind: 'file', content: null, file_name: 'a.jpg' }, 'Pixel', {
      id: 'B',
      files: [photo('a.jpg')],
    })
    expect(payload.body).toBe('File: a.jpg')
    expect(payload.tag).toBe('batch-B')
  })

  it('truncates long lists of names', () => {
    const files = Array.from({ length: 30 }, (_, n) => photo(`IMG_2026110${n}_123456.jpg`))
    const body = notificationPayload({ id: 'i', kind: 'file', content: null, file_name: 'x' }, 'A', { id: 'B', files }).body
    expect(body.startsWith('30 photos: IMG_')).toBe(true)
    expect(body.length).toBeLessThanOrEqual(120)
  })
})
