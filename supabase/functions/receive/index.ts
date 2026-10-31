// Lets someone without Beam send text or files to its owner through a
// Receive QR code (…/beam/#r=<token>). Called from the guest's browser.
//
// Guests can only add items; nothing is ever returned about the owner's data.
// Every send uses up one of the code's items (beam_claim_receive), and codes
// expire after 10 minutes or when the owner stops them.
import { adminClient } from '../_shared/admin.ts'
import { classifyText } from '../_shared/links.ts'
import { BUCKET, MAX_FILE_BYTES, objectPaths } from '../_shared/names.ts'
import { hashReceiveToken, isReceiveToken } from '../_shared/receive.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
}
const MAX_TEXT = 100_000
const FINISH_WINDOW_MS = 2 * 3600_000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

const isName = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 255

type Db = ReturnType<typeof adminClient>

/** Use up one send on the code; the owner's user id, or null if the code can't take more. */
async function claim(db: Db, tokenHash: string): Promise<string | null> {
  const { data, error } = await db.rpc('beam_claim_receive', { p_token_hash: tokenHash })
  if (error) throw new Error(error.message)
  return (data as string | null) ?? null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return reply({ error: 'POST only' }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return reply({ error: 'Expected JSON' }, 400)
  }
  if (!isReceiveToken(body.token)) return reply({ error: 'unknown' }, 404)

  const db = adminClient()
  const tokenHash = await hashReceiveToken(body.token)

  try {
    switch (body.action) {
      // Is the code still usable? (Shown on the guest page; reveals nothing else.)
      case 'check': {
        const { data } = await db
          .from('receive_codes')
          .select('expires_at, max_items, used_items, revoked_at')
          .eq('token_hash', tokenHash)
          .maybeSingle()
        if (!data) return reply({ error: 'unknown' }, 404)
        const left = data.max_items - data.used_items
        if (data.revoked_at || Date.parse(data.expires_at) <= Date.now() || left <= 0) {
          return reply({ error: 'expired' }, 410)
        }
        return reply({ expiresAt: data.expires_at, remaining: left })
      }

      case 'text': {
        const text = body.text
        if (typeof text !== 'string' || text.trim() === '' || text.length > MAX_TEXT) {
          return reply({ error: 'Text is empty or too long' }, 400)
        }
        const userId = await claim(db, tokenHash)
        if (!userId) return reply({ error: 'expired' }, 410)
        const { kind, content } = classifyText(text)
        const { error } = await db.from('items').insert({ user_id: userId, kind, content, from_guest: true })
        if (error) throw new Error(error.message)
        return reply({ ok: true })
      }

      // Step 1 of a file: reserve a send and hand back a one-time upload token.
      case 'upload': {
        const { name, size } = body
        if (!isName(name) || typeof size !== 'number' || size < 0 || size > MAX_FILE_BYTES) {
          return reply({ error: 'File is missing or over 50 MB' }, 400)
        }
        const userId = await claim(db, tokenHash)
        if (!userId) return reply({ error: 'expired' }, 410)
        const itemId = crypto.randomUUID()
        const { filePath } = objectPaths(userId, itemId, name)
        const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(filePath)
        if (error) throw new Error(error.message)
        return reply({ itemId, path: data.path, uploadToken: data.token })
      }

      // Step 2 of a file: the upload finished; create the item so it appears everywhere.
      case 'finish': {
        const { itemId, name, type } = body
        if (typeof itemId !== 'string' || !UUID.test(itemId) || !isName(name)) {
          return reply({ error: 'Bad request' }, 400)
        }
        const { data: code } = await db
          .from('receive_codes')
          .select('user_id, created_at')
          .eq('token_hash', tokenHash)
          .maybeSingle()
        if (!code || Date.parse(code.created_at) < Date.now() - FINISH_WINDOW_MS) return reply({ error: 'unknown' }, 404)

        // The file must really be there (only a reserved upload token could have put it there).
        const { filePath } = objectPaths(code.user_id, itemId, name)
        const folder = `${code.user_id}/${itemId}`
        const { data: listed, error: listError } = await db.storage.from(BUCKET).list(folder)
        if (listError) throw new Error(listError.message)
        const object = listed?.find((o) => `${folder}/${o.name}` === filePath)
        if (!object) return reply({ error: 'Upload not found' }, 409)

        const meta = (object.metadata ?? {}) as { size?: number; mimetype?: string }
        const { error } = await db.from('items').upsert(
          {
            id: itemId,
            user_id: code.user_id,
            kind: 'file',
            file_path: filePath,
            file_name: name,
            file_size: meta.size ?? 0,
            mime_type: meta.mimetype || (typeof type === 'string' && type) || null,
            from_guest: true,
          },
          { onConflict: 'id', ignoreDuplicates: true },
        )
        if (error) throw new Error(error.message)
        return reply({ ok: true })
      }

      default:
        return reply({ error: 'Unknown action' }, 400)
    }
  } catch (err) {
    console.error('receive:', err)
    return reply({ error: 'Something went wrong' }, 500)
  }
})
