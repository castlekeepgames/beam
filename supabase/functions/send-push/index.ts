// Sends a web push for a new item to every other device of its owner.
// Called by the items insert trigger with { item_id } (see migrations).
//
// Safe to call by anyone: it only accepts an item id, reads everything else
// from the database, and "claims" the item via pushed_at so each item is pushed
// at most once, and only within a few minutes of being created.
import * as webpush from 'jsr:@negrel/webpush@0.5.0'
import { adminClient, json } from '../_shared/admin.ts'
import { notificationPayload } from '../_shared/preview.ts'

const MAX_AGE_MS = 5 * 60_000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

let server: Promise<webpush.ApplicationServer> | null = null

function applicationServer() {
  server ??= (async () => {
    const raw = Deno.env.get('VAPID_KEYS')
    if (!raw) throw new Error('VAPID_KEYS secret is not set')
    const vapidKeys = await webpush.importVapidKeys(JSON.parse(raw))
    return webpush.ApplicationServer.new({
      contactInformation: Deno.env.get('VAPID_SUBJECT') ?? 'https://castlekeepgames.github.io/beam/',
      vapidKeys,
    })
  })()
  return server
}

interface DeviceRow {
  id: string
  name: string
  push_subscription: webpush.PushSubscription | null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  let itemId: unknown
  try {
    itemId = (await req.json()).item_id
  } catch {
    return json({ error: 'Expected JSON body' }, 400)
  }
  if (typeof itemId !== 'string' || !UUID.test(itemId)) return json({ error: 'item_id required' }, 400)

  const db = adminClient()

  // Claim the item: only the first call for a fresh, unpushed item gets the row back.
  const { data: item, error } = await db
    .from('items')
    .update({ pushed_at: new Date().toISOString() })
    .eq('id', itemId)
    .is('pushed_at', null)
    .gt('created_at', new Date(Date.now() - MAX_AGE_MS).toISOString())
    .select('id, user_id, kind, content, file_name, source_device_id, target_device_id, from_guest')
    .maybeSingle()
  if (error) return json({ error: error.message }, 500)
  if (!item) return json({ skipped: true })

  const { data: devices, error: devicesError } = await db
    .from('devices')
    .select('id, name, push_subscription')
    .eq('user_id', item.user_id)
  if (devicesError) return json({ error: devicesError.message }, 500)

  const rows = (devices ?? []) as DeviceRow[]
  const sourceName = rows.find((d) => d.id === item.source_device_id)?.name ?? null
  // Never notify the device the item came from; items sent to one device notify only that one.
  const targets = rows.filter(
    (d) =>
      d.id !== item.source_device_id &&
      d.push_subscription &&
      (!item.target_device_id || d.id === item.target_device_id),
  )
  if (targets.length === 0) return json({ sent: 0 })

  const payload = JSON.stringify(notificationPayload(item, sourceName))
  const app = await applicationServer()

  let sent = 0
  let expired = 0
  let failed = 0
  await Promise.all(
    targets.map(async (device) => {
      try {
        await app
          .subscribe(device.push_subscription!)
          .pushTextMessage(payload, { urgency: webpush.Urgency.High, ttl: 24 * 3600 })
        sent++
      } catch (err) {
        const status = err instanceof webpush.PushMessageError ? err.response.status : 0
        if (status === 404 || status === 410) {
          // The browser dropped this subscription; stop sending to it.
          await db.from('devices').update({ push_subscription: null }).eq('id', device.id)
          expired++
        } else {
          console.error(`send-push: device ${device.id} failed`, status || err)
          failed++
        }
      }
    }),
  )

  return json({ sent, expired, failed })
})
