import type { Item } from './types'

/** How many recent items the list keeps. */
export const ITEM_LIMIT = 100

/** Longest text the database accepts (see the items_payload check). */
export const MAX_TEXT_LENGTH = 100_000

/** How long an item lives (also the database default). */
export const ITEM_LIFETIME_MS = 24 * 3600_000

export function isExpired(item: Item, now = Date.now()): boolean {
  return !item.kept && Date.parse(item.expires_at) <= now
}

type KeepChange = Pick<Item, 'kept'> & Partial<Pick<Item, 'expires_at'>>

/** The change to send when setting Keep. Un-keeping gives the item a fresh 24 hours. */
export function keepChangeTo(kept: boolean, now = Date.now()): KeepChange {
  return kept ? { kept: true } : { kept: false, expires_at: new Date(now + ITEM_LIFETIME_MS).toISOString() }
}

/** The change to send when toggling Keep on one item. */
export function keepChange(item: Item, now = Date.now()): KeepChange {
  return keepChangeTo(!item.kept, now)
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

/**
 * Items sent to one device show only on that device and the one that sent
 * them. Everything else (including guest items) shows everywhere.
 */
export function isVisibleTo(item: Pick<Item, 'target_device_id' | 'source_device_id'>, deviceId: string): boolean {
  return !item.target_device_id || item.target_device_id === deviceId || item.source_device_id === deviceId
}
export type ListEntry = { kind: 'item'; item: Item } | { kind: 'batch'; id: string; items: Item[] }

/**
 * Turn the (newest-first) list into cards: files that share a batch id become
 * one card, placed where its newest file is, with its files in the order they
 * were sent. A batch with only one file left shows as a normal card.
 */
export function groupItems(items: Item[]): ListEntry[] {
  const batches = new Map<string, Item[]>()
  for (const item of items) {
    if (!item.batch_id) continue
    const members = batches.get(item.batch_id)
    if (members) members.push(item)
    else batches.set(item.batch_id, [item])
  }
  const entries: ListEntry[] = []
  const placed = new Set<string>()
  for (const item of items) {
    const members = item.batch_id ? batches.get(item.batch_id) : undefined
    if (!item.batch_id || !members || members.length < 2) {
      entries.push({ kind: 'item', item })
    } else if (!placed.has(item.batch_id)) {
      placed.add(item.batch_id)
      entries.push({ kind: 'batch', id: item.batch_id, items: [...members].reverse() })
    }
  }
  return entries
}
