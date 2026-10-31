import { describe, expect, it } from 'vitest'
import { notificationFor } from './preview'

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

  it('shows links and file names', () => {
    expect(notificationFor({ kind: 'link', content: 'https://example.com', file_name: null }, 'A').body).toBe(
      'https://example.com',
    )
    expect(notificationFor({ kind: 'file', content: null, file_name: 'report.pdf' }, 'A').body).toBe('File: report.pdf')
  })
})
