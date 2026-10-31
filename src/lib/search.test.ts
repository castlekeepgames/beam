import { describe, expect, it } from 'vitest'
import { matchesSearch, normalizeForSearch } from './search'

const text = (content: string) => ({ content, file_name: null })

describe('normalizeForSearch', () => {
  it('ignores case, accents and extra spaces', () => {
    expect(normalizeForSearch('  Café   MENU ')).toBe('cafe menu')
  })
})

describe('matchesSearch', () => {
  it('matches everything for an empty search', () => {
    expect(matchesSearch(text('anything'), '   ')).toBe(true)
  })

  it('needs every word, in any order', () => {
    expect(matchesSearch(text('Meet at the cafe at 6'), 'cafe meet')).toBe(true)
    expect(matchesSearch(text('Meet at the cafe at 6'), 'cafe lunch')).toBe(false)
  })

  it('is accent- and case-insensitive both ways', () => {
    expect(matchesSearch(text('Café menu'), 'CAFE')).toBe(true)
    expect(matchesSearch(text('cafe menu'), 'café')).toBe(true)
  })

  it('searches file names and links', () => {
    expect(matchesSearch({ content: null, file_name: 'Quarterly report.pdf' }, 'report pdf')).toBe(true)
    expect(matchesSearch(text('https://github.com/castlekeepgames/beam'), 'github')).toBe(true)
  })

  it('searches the device / guest labels too', () => {
    expect(matchesSearch(text('hello'), 'pixel', ['Pixel'])).toBe(true)
    expect(matchesSearch(text('hello'), 'guest', ['Guest'])).toBe(true)
  })
})
