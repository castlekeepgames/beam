import { describe, expect, it } from 'vitest'
import { composeSharedText } from './share'

describe('composeSharedText', () => {
  it('Chrome page share: title + URL in text → just the URL (becomes a link)', () => {
    expect(composeSharedText({ title: 'Example Domain', text: 'https://example.com/', url: '' })).toBe(
      'https://example.com/',
    )
  })

  it('URL in the url field only', () => {
    expect(composeSharedText({ title: 'Example', text: '', url: 'https://example.com/a' })).toBe('https://example.com/a')
  })

  it('same URL in both fields is not duplicated', () => {
    expect(composeSharedText({ text: 'https://example.com', url: 'https://example.com' })).toBe('https://example.com')
  })

  it('message text plus a separate URL keeps both', () => {
    expect(composeSharedText({ text: 'Look at this', url: 'https://example.com' })).toBe(
      'Look at this\nhttps://example.com',
    )
  })

  it('text that already contains the URL is kept as is', () => {
    expect(composeSharedText({ text: 'Look at https://example.com now', url: 'https://example.com' })).toBe(
      'Look at https://example.com now',
    )
  })

  it('plain text from a messaging app', () => {
    expect(composeSharedText({ text: '  Meet at 6?  ' })).toBe('Meet at 6?')
  })

  it('falls back to the title, and returns null when empty (e.g. files only)', () => {
    expect(composeSharedText({ title: 'Only a title' })).toBe('Only a title')
    expect(composeSharedText({ title: ' ', text: '', url: '' })).toBeNull()
  })
})
