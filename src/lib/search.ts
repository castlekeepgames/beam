import type { Item } from './types'

/** Lower-case, accents removed, whitespace collapsed: "Café  Menu" -> "cafe menu". */
export function normalizeForSearch(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Does an item match the search? Every word must appear somewhere in its text,
 * link, file name, or the device/guest label shown on the card.
 */
export function matchesSearch(item: Pick<Item, 'content' | 'file_name'>, query: string, labels: string[] = []): boolean {
  const words = normalizeForSearch(query).split(' ').filter(Boolean)
  if (words.length === 0) return true
  const haystack = normalizeForSearch([item.content ?? '', item.file_name ?? '', ...labels].join(' '))
  return words.every((word) => haystack.includes(word))
}
