import type { Device } from './types'

export const MAX_DEVICE_NAME = 40
const STORAGE_KEY = 'beam.device'

/** A sensible default name from the browser's user agent. */
export function suggestDeviceName(userAgent: string): string {
  if (/Android/i.test(userAgent)) return /Mobile/i.test(userAgent) ? 'Android phone' : 'Android tablet'
  if (/iPhone/i.test(userAgent)) return 'iPhone'
  if (/iPad/i.test(userAgent)) return 'iPad'
  if (/CrOS/i.test(userAgent)) return 'Chromebook'
  if (/Windows/i.test(userAgent)) return 'Windows PC'
  if (/Macintosh|Mac OS X/i.test(userAgent)) return 'Mac'
  if (/Linux/i.test(userAgent)) return 'Linux PC'
  return 'My device'
}

/** Trim and collapse whitespace; null if nothing usable is left. */
export function cleanDeviceName(input: string): string | null {
  const name = input.replace(/\s+/g, ' ').trim().slice(0, MAX_DEVICE_NAME).trim()
  return name === '' ? null : name
}

/** This browser's device ({id, name}), remembered so we can start offline. */
export function loadStoredDevice(): Device | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Device>
    return typeof parsed.id === 'string' && typeof parsed.name === 'string' ? { id: parsed.id, name: parsed.name } : null
  } catch {
    return null
  }
}

export function storeDevice(device: Device | null): void {
  try {
    if (device) localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: device.id, name: device.name }))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked (private mode etc.): the device just re-registers next time.
  }
}
