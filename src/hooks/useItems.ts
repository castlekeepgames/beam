import { useCallback, useEffect, useRef, useState } from 'react'
import { ITEM_LIMIT, mergeItems, removeItem } from '../lib/items'
import { classifyText } from '../lib/links'
import { supabase } from '../lib/supabase'
import { ITEM_COLUMNS, type Item } from '../lib/types'

export type Connection = 'connecting' | 'live' | 'offline'

const FRESH_MS = 4000
const REFETCH_GAP_MS = 1000

/**
 * Recent items for the signed-in user, kept current by realtime plus a full
 * refetch whenever the app regains focus, the network returns, or the realtime
 * channel (re)subscribes — so nothing is missed while the socket was down.
 */
export function useItems(userId: string, deviceId: string) {
  const [items, setItems] = useState<Item[]>([])
  const [deviceNames, setDeviceNames] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [connection, setConnection] = useState<Connection>('connecting')
  const [freshIds, setFreshIds] = useState<ReadonlySet<string>>(new Set())

  const requestSeq = useRef(0)
  const lastRefetch = useRef(0)
  const deviceNamesRef = useRef(deviceNames)
  useEffect(() => {
    deviceNamesRef.current = deviceNames
  }, [deviceNames])

  const refetch = useCallback(async (force = false) => {
    const now = Date.now()
    if (!force && now - lastRefetch.current < REFETCH_GAP_MS) return
    lastRefetch.current = now
    const seq = ++requestSeq.current

    const [itemsRes, devicesRes] = await Promise.all([
      supabase
        .from('items')
        .select(ITEM_COLUMNS)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(ITEM_LIMIT),
      supabase.from('devices').select('id, name'),
    ])
    if (seq !== requestSeq.current) return // a newer refetch has started

    if (itemsRes.error) {
      setLoadError(navigator.onLine ? 'Could not load items.' : 'You are offline.')
    } else {
      setLoadError(null)
      setItems(mergeItems([], itemsRes.data))
      setLoaded(true)
    }
    if (!devicesRes.error) {
      setDeviceNames(Object.fromEntries(devicesRes.data.map((d) => [d.id, d.name])))
    }
  }, [])

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
          setItems((cur) => mergeItems(cur, [item]))
          if (item.source_device_id !== deviceId) markFresh(item.id)
          if (item.source_device_id && !(item.source_device_id in deviceNamesRef.current)) void refetch(true)
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
  }, [userId, deviceId, refetch, markFresh])

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

  const sendText = useCallback(
    async (text: string) => {
      const { kind, content } = classifyText(text)
      const { data, error } = await supabase
        .from('items')
        .insert({ kind, content, source_device_id: deviceId })
        .select(ITEM_COLUMNS)
        .single()
      if (error) throw new Error(error.message)
      setItems((cur) => mergeItems(cur, [data]))
    },
    [deviceId],
  )

  const deleteItem = useCallback(
    async (id: string) => {
      setItems((cur) => removeItem(cur, id))
      const { error } = await supabase.from('items').delete().eq('id', id)
      if (error) {
        void refetch(true)
        throw new Error(error.message)
      }
    },
    [refetch],
  )

  return { items, deviceNames, loaded, loadError, connection, freshIds, sendText, deleteItem }
}
