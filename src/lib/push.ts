import { supabase } from './supabase'

/**
 * VAPID public key (the "application server key"). Public by design; the
 * private half lives only in the Supabase Edge Function secret VAPID_KEYS.
 */
export const VAPID_PUBLIC_KEY =
  'BD8XyRufBdlcs7gI79HdMJ5ggzj-u8Awrk2eCD58C0VVoq_eQD9MYls7lufjvZCThLc20xwl3cbM9q3y7asERRw'

export type PushState = 'unsupported' | 'blocked' | 'off' | 'on'

export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function supported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

/** Is this subscription for our current VAPID key? (Keys can be rotated.) */
function matchesOurKey(sub: PushSubscription): boolean {
  const key = sub.options.applicationServerKey
  if (!key) return false
  const ours = base64UrlToBytes(VAPID_PUBLIC_KEY)
  const theirs = new Uint8Array(key)
  return theirs.length === ours.length && theirs.every((b, i) => b === ours[i])
}

async function saveSubscription(deviceId: string, sub: PushSubscription | null): Promise<void> {
  const { error } = await supabase
    .from('devices')
    .update({ push_subscription: sub ? sub.toJSON() : null })
    .eq('id', deviceId)
  if (error) throw new Error(error.message)
}

export async function getPushState(): Promise<PushState> {
  if (!supported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  if (Notification.permission !== 'granted') return 'off'
  return (await currentSubscription()) ? 'on' : 'off'
}

async function subscribe(): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  if (existing && matchesOurKey(existing)) return existing
  await existing?.unsubscribe()
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY),
  })
}

/** Ask for permission (must be called from a tap) and register this device for push. */
export async function enablePush(deviceId: string): Promise<PushState> {
  if (!supported()) return 'unsupported'
  const permission = await Notification.requestPermission()
  if (permission === 'denied') return 'blocked'
  if (permission !== 'granted') return 'off'
  await saveSubscription(deviceId, await subscribe())
  return 'on'
}

export async function disablePush(deviceId: string): Promise<PushState> {
  if (!supported()) return 'unsupported'
  const sub = await currentSubscription()
  await sub?.unsubscribe()
  await saveSubscription(deviceId, null)
  return 'off'
}

/**
 * On start: if notifications were already allowed, make sure the database has
 * this device's current subscription (browsers occasionally rotate them).
 * Never prompts.
 */
export async function syncPush(deviceId: string): Promise<void> {
  if (!supported() || Notification.permission !== 'granted') return
  const sub = await currentSubscription()
  if (!sub) return // user turned notifications off in Beam; leave it off
  await saveSubscription(deviceId, matchesOurKey(sub) ? sub : await subscribe())
}
