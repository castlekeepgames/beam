import type { Item } from './types'

/** How many recent items the list keeps. */
export const ITEM_LIMIT = 100

/** Longest text the database accepts (see the items_payload check). */
export const MAX_TEXT_LENGTH = 100_000

export function isExpired(item: Item, now = Date.now()): boolean {
  return Date.parse(item.expires_at) <= now
}

/**
 * Combine the current list with new rows (from a send, a realtime event or a
 * refetch): one entry per id, newer rows win, expired rows dropped, newest first.
 */
export function mergeItems(current: Item[], incoming: Item[], now = Date.now()): Item[] {
  const byId = new Map(current.map((item) => [item.id, item]))
  for (const item of incoming) byId.set(item.id, item)
  return [...byId.values()]
    .filter((item) => !isExpired(item, now))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id))
    .slice(0, ITEM_LIMIT)
}

export function removeItem(current: Item[], id: string): Item[] {
  return current.filter((item) => item.id !== id)
}
