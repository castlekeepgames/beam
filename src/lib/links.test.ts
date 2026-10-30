import { describe, expect, it } from 'vitest'
import { classifyText, isSafeHttpUrl, parseSingleUrl } from './links'

describe('parseSingleUrl', () => {
  it('accepts http and https URLs', () => {
    expect(parseSingleUrl('https://example.com')).toBe('https://example.com')
    expect(parseSingleUrl('http://example.com/a?b=c#d')).toBe('http://example.com/a?b=c#d')
  })

  it('trims surrounding whitespace and newlines', () => {
    expect(parseSingleUrl('  https://example.com/x \n')).toBe('https://example.com/x')
  })

  it('treats a bare www. host as https', () => {
    expect(parseSingleUrl('www.example.com/page')).toBe('https://www.example.com/page')
  })

  it('accepts localhost and IP hosts', () => {
    expect(parseSingleUrl('http://localhost:5173')).toBe('http://localhost:5173')
    expect(parseSingleUrl('http://192.168.1.10:8080/')).toBe('http://192.168.1.10:8080/')
  })

  it('rejects text with spaces, even if it contains a URL', () => {
    expect(parseSingleUrl('see https://example.com')).toBeNull()
    expect(parseSingleUrl('https://a.com https://b.com')).toBeNull()
  })

  it('rejects non-http schemes', () => {
    expect(parseSingleUrl('javascript:alert(1)')).toBeNull()
    expect(parseSingleUrl('mailto:me@example.com')).toBeNull()
    expect(parseSingleUrl('ftp://example.com')).toBeNull()
  })

  it('rejects plain words, file names and empty input', () => {
    expect(parseSingleUrl('hello')).toBeNull()
    expect(parseSingleUrl('notes.txt')).toBeNull()
    expect(parseSingleUrl('http://intranet')).toBeNull()
    expect(parseSingleUrl('   ')).toBeNull()
  })
})

describe('classifyText', () => {
  it('stores a lone URL as a link', () => {
    expect(classifyText(' https://example.com ')).toEqual({ kind: 'link', content: 'https://example.com' })
  })

  it('keeps everything else as text, unmodified', () => {
    expect(classifyText('  hello\nworld ')).toEqual({ kind: 'text', content: '  hello\nworld ' })
  })
})

describe('isSafeHttpUrl', () => {
  it('allows only http(s)', () => {
    expect(isSafeHttpUrl('https://example.com')).toBe(true)
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeHttpUrl('not a url')).toBe(false)
  })
})
