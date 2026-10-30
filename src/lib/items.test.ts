import { describe, expect, it } from 'vitest'
import { ITEM_LIMIT, isExpired, mergeItems, removeItem } from './items'
import type { Item } from './types'

const NOW = Date.parse('2026-10-30T12:00:00Z')

function item(id: string, createdMinutesAgo: number, overrides: Partial<Item> = {}): Item {
  const created = NOW - createdMinutesAgo * 60_000
  return {
    id,
    kind: 'text',
    content: id,
    file_path: null,
    file_name: null,
    file_size: null,
    mime_type: null,
    source_device_id: null,
    created_at: new Date(created).toISOString(),
    expires_at: new Date(created + 24 * 3600_000).toISOString(),
    ...overrides,
  }
}

describe('mergeItems', () => {
  it('sorts newest first', () => {
    const merged = mergeItems([item('old', 30)], [item('new', 1), item('mid', 10)], NOW)
    expect(merged.map((i) => i.id)).toEqual(['new', 'mid', 'old'])
  })

  it('keeps one entry per id (realtime echo of our own send)', () => {
    const sent = item('a', 0)
    const merged = mergeItems([sent], [{ ...sent }], NOW)
    expect(merged).toHaveLength(1)
  })

  it('lets the incoming copy replace the existing one', () => {
    const merged = mergeItems([item('a', 5, { content: 'old' })], [item('a', 5, { content: 'new' })], NOW)
    expect(merged[0].content).toBe('new')
  })

  it('drops expired items', () => {
    const expired = item('gone', 60, { expires_at: new Date(NOW - 1000).toISOString() })
    expect(mergeItems([], [expired, item('ok', 1)], NOW).map((i) => i.id)).toEqual(['ok'])
  })

  it('handles Postgres timestamps with microseconds and offsets', () => {
    const a = item('a', 0, { created_at: '2026-10-30T11:59:00.123456+00:00' })
    const b = item('b', 0, { created_at: '2026-10-30T13:59:30.000001+02:00' }) // 11:59:30Z
    expect(mergeItems([], [a, b], NOW).map((i) => i.id)).toEqual(['b', 'a'])
  })

  it(`caps the list at ${ITEM_LIMIT}`, () => {
    const many = Array.from({ length: ITEM_LIMIT + 5 }, (_, n) => item(`i${n}`, n))
    const merged = mergeItems([], many, NOW)
    expect(merged).toHaveLength(ITEM_LIMIT)
    expect(merged[0].id).toBe('i0')
  })
})

describe('isExpired / removeItem', () => {
  it('treats the exact expiry moment as expired', () => {
    expect(isExpired(item('a', 0, { expires_at: new Date(NOW).toISOString() }), NOW)).toBe(true)
    expect(isExpired(item('a', 0), NOW)).toBe(false)
  })

  it('removes by id', () => {
    expect(removeItem([item('a', 1), item('b', 2)], 'a').map((i) => i.id)).toEqual(['b'])
  })
})
