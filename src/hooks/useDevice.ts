import { useCallback, useEffect, useState } from 'react'
import { loadStoredDevice, storeDevice } from '../lib/device'
import { supabase } from '../lib/supabase'
import { DEVICE_COLUMNS, type Device } from '../lib/types'

type DeviceState = { status: 'loading' } | { status: 'needs-name' } | { status: 'ready'; device: Device }

const LAST_SEEN_INTERVAL = 5 * 60_000

/**
 * This browser's row in `devices`. On start we touch `last_seen` on the stored
 * device; if the row is gone (or belongs to another account) we ask for a name.
 * Mount it under `key={userId}` so a different account starts fresh.
 */
export function useDevice() {
  const [stored] = useState(loadStoredDevice)
  const [state, setState] = useState<DeviceState>(stored ? { status: 'loading' } : { status: 'needs-name' })

  useEffect(() => {
    if (!stored) return
    let cancelled = false
    supabase
      .from('devices')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', stored.id)
      .select(DEVICE_COLUMNS)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          // Probably offline: carry on with the remembered device.
          setState({ status: 'ready', device: stored })
        } else if (!data) {
          storeDevice(null)
          setState({ status: 'needs-name' })
        } else {
          storeDevice(data)
          setState({ status: 'ready', device: data })
        }
      })
    return () => {
      cancelled = true
    }
  }, [stored])

  const deviceId = state.status === 'ready' ? state.device.id : null

  // Keep last_seen roughly current while the app is in use.
  useEffect(() => {
    if (!deviceId) return
    let last = Date.now()
    const touch = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < LAST_SEEN_INTERVAL) return
      last = Date.now()
      supabase
        .from('devices')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', deviceId)
        .then(() => {})
    }
    document.addEventListener('visibilitychange', touch)
    return () => document.removeEventListener('visibilitychange', touch)
  }, [deviceId])

  const register = useCallback(async (name: string) => {
    const { data, error } = await supabase.from('devices').insert({ name }).select(DEVICE_COLUMNS).single()
    if (error) throw new Error(error.message)
    storeDevice(data)
    setState({ status: 'ready', device: data })
  }, [])

  const rename = useCallback(
    async (name: string) => {
      if (!deviceId) return
      const { data, error } = await supabase
        .from('devices')
        .update({ name })
        .eq('id', deviceId)
        .select(DEVICE_COLUMNS)
        .single()
      if (error) throw new Error(error.message)
      storeDevice(data)
      setState({ status: 'ready', device: data })
    },
    [deviceId],
  )

  return { state, register, rename }
}
