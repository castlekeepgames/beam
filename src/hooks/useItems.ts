import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isVisibleTo, ITEM_LIMIT, keepChangeTo, mergeItems, removeItem } from '../lib/items'
import { classifyText } from '../lib/links'
import { removeObjects } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { ITEM_COLUMNS, type DeviceInfo, type Item } from '../lib/types'

export type Connection = 'connecting' | 'live' | 'offline'

const FRESH_MS = 4000
const REFETCH_GAP_MS = 1000
const REMOVE_BATCH = 500

interface DeviceRow {
  id: string
  name: string
  last_seen: string
  push_subscription: unknown
}

const toDeviceInfo = (d: DeviceRow): DeviceInfo => ({
  id: d.id,
  name: d.name,
  last_seen: d.last_seen,
  has_push: d.push_subscription !== null,
})

/**
 * Recent items for the signed-in user, kept current by realtime plus a full
 * refetch whenever the app regains focus, the network returns, or the realtime
 * channel (re)subscribes — so nothing is missed while the socket was down.
 * Items sent to a different device are hidden here (see isVisibleTo).
 */
export function useItems(userId: string, deviceId: string) {
  const [items, setItems] = useState<Item[]>([])
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [connection, setConnection] = useState<Connection>('connecting')
  const [freshIds, setFreshIds] = useState<ReadonlySet<string>>(new Set())

  const deviceNames = useMemo(() => Object.fromEntries(devices.map((d) => [d.id, d.name])), [devices])

  const requestSeq = useRef(0)
  const lastRefetch = useRef(0)
  const deviceNamesRef = useRef(deviceNames)
  useEffect(() => {
    deviceNamesRef.current = deviceNames
  }, [deviceNames])

  const visible = useCallback((item: Item) => isVisibleTo(item, deviceId), [deviceId])

  const refetch = useCallback(
    async (force = false) => {
      const now = Date.now()
      if (!force && now - lastRefetch.current < REFETCH_GAP_MS) return
      lastRefetch.current = now
      const seq = ++requestSeq.current

      const [itemsRes, devicesRes] = await Promise.all([
        supabase
          .from('items')
          .select(ITEM_COLUMNS)
          .or(`kept.eq.true,expires_at.gt.${new Date().toISOString()}`)
          .order('created_at', { ascending: false })
          .limit(ITEM_LIMIT),
        supabase.from('devices').select('id, name, last_seen, push_subscription').order('last_seen', { ascending: false }),
      ])
      if (seq !== requestSeq.current) return // a newer refetch has started

      if (itemsRes.error) {
        setLoadError(navigator.onLine ? 'Could not load items.' : 'You are offline.')
      } else {
        setLoadError(null)
        setItems(mergeItems([], itemsRes.data.filter(visible)))
        setLoaded(true)
      }
      if (!devicesRes.error) setDevices((devicesRes.data as DeviceRow[]).map(toDeviceInfo))
    },
    [visible],
  )

  const markFresh = useCallback((id: string) => {
    setFreshIds((cur) => new Set(cur).add(id))
    setTimeout(() => {
      setFreshIds((cur) => {
        const next = new Set(cur)
        next.delete(id)
        return next
      })
    }, FRESH_MS)
  }, [])

  // Initial load + realtime subscription.
  useEffect(() => {
    // refetch only sets state after its network await, so this doesn't cascade renders.
    // oxlint-disable-next-line react/set-state-in-effect
    void refetch(true)

    const channel = supabase
      .channel(`items:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'items', filter: `user_id=eq.${userId}` },
        (payload) => {
          const item = payload.new as Item
          if (!visible(item)) return // sent to another of your devices
          setItems((cur) => mergeItems(cur, [item]))
          if (item.source_device_id !== deviceId) markFresh(item.id)
          if (item.source_device_id && !(item.source_device_id in deviceNamesRef.current)) void refetch(true)
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'items', filter: `user_id=eq.${userId}` },
        (payload) => {
          // Keep toggled on another device (or pushed_at set by the server).
          const item = payload.new as Item
          if (!visible(item)) return
          setItems((cur) => (cur.some((i) => i.id === item.id) || item.kept ? mergeItems(cur, [item]) : cur))
        },
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'items' }, (payload) => {
        const id = (payload.old as { id?: string }).id
        if (id) setItems((cur) => removeItem(cur, id))
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnection('live')
          void refetch(true) // catch anything sent while we were disconnected
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnection('offline')
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, deviceId, refetch, markFresh, visible])

  // Refetch on focus / visibility / reconnect.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refetch()
    }
    const onOnline = () => void refetch(true)
    const onOffline = () => setConnection('offline')
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [refetch])

  /** Send text to all devices, or only to `targetDeviceId`. */
  const sendText = useCallback(
    async (text: string, targetDeviceId: string | null = null) => {
      const { kind, content } = classifyText(text)
      const { data, error } = await supabase
        .from('items')
        .insert({ kind, content, source_device_id: deviceId, target_device_id: targetDeviceId })
        .select(ITEM_COLUMNS)
        .single()
      if (error) throw new Error(error.message)
      setItems((cur) => mergeItems(cur, [data]))
    },
    [deviceId],
  )

  /** Keep or un-keep one item or a whole batch. */
  const setKept = useCallback(
    async (list: Item[], kept: boolean) => {
      const changing = list.filter((i) => i.kept !== kept)
      if (changing.length === 0) return
      const change = keepChangeTo(kept)
      setItems((cur) => mergeItems(cur, changing.map((i) => ({ ...i, ...change }))))
      const ids = changing.map((i) => i.id)
      const { data, error } = await supabase.from('items').update(change).in('id', ids).select(ITEM_COLUMNS)
      if (error) {
        void refetch(true)
        throw new Error(error.message)
      }
      setItems((cur) => mergeItems(cur, data))
    },
    [refetch],
  )

  /** Add a row we created ourselves (e.g. a finished file upload). */
  const addItem = useCallback((item: Item) => {
    setItems((cur) => mergeItems(cur, [item]))
  }, [])

  /** Delete one item or a whole batch. */
  const deleteItems = useCallback(
    async (list: Item[]) => {
      const ids = new Set(list.map((i) => i.id))
      setItems((cur) => cur.filter((i) => !ids.has(i.id)))
      const { error } = await supabase.from('items').delete().in('id', [...ids])
      if (error) {
        void refetch(true)
        throw new Error(error.message)
      }
      // Rows first so they vanish everywhere at once; leftovers are swept by the cleanup job.
      const paths = list.flatMap((i) => [i.file_path, i.thumb_path]).filter((p): p is string => !!p)
      void removeObjects(paths).catch(() => {})
    },
    [refetch],
  )

  /**
   * Delete every item on all devices (kept items too, if asked), then their
   * stored files. Returns how many items were deleted.
   */
  const clearAll = useCallback(
    async (includeKept: boolean): Promise<number> => {
      let query = supabase.from('items').delete().not('id', 'is', null)
      if (!includeKept) query = query.eq('kept', false)
      const { data, error } = await query.select('id, file_path, thumb_path')
      if (error) throw new Error(error.message)
      const deleted = new Set(data.map((d) => d.id))
      setItems((cur) => cur.filter((i) => !deleted.has(i.id)))
      const paths = data.flatMap((d) => [d.file_path, d.thumb_path]).filter((p): p is string => !!p)
      for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
        await removeObjects(paths.slice(i, i + REMOVE_BATCH)).catch(() => {}) // cleanup job catches misses
      }
      return deleted.size
    },
    [],
  )

  /** Forget another device (e.g. a leftover from reinstalling). Its items stay. */
  const removeDevice = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('devices').delete().eq('id', id)
      if (error) throw new Error(error.message)
      setDevices((cur) => cur.filter((d) => d.id !== id))
    },
    [],
  )

  const retry = useCallback(() => void refetch(true), [refetch])

  return {
    items,
    devices,
    deviceNames,
    loaded,
    loadError,
    connection,
    freshIds,
    markFresh,
    retry,
    sendText,
    addItem,
    deleteItems,
    setKept,
    clearAll,
    removeDevice,
  }
}
