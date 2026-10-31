// Deletes stored files whose item row no longer exists.
// Called hourly by pg_cron right after it deletes expired rows (see migrations).
// Takes no input, so it is harmless if anyone else calls it.
import { adminClient, json } from '../_shared/admin.ts'

const BUCKET = 'files'
const BATCH = 1000
const MAX_ROUNDS = 10

Deno.serve(async () => {
  const db = adminClient()
  let removed = 0

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { data, error } = await db.rpc('beam_orphaned_files')
    if (error) return json({ error: error.message, removed }, 500)

    const names = (data ?? []) as string[]
    if (names.length === 0) break

    const { error: removeError } = await db.storage.from(BUCKET).remove(names)
    if (removeError) return json({ error: removeError.message, removed }, 500)

    removed += names.length
    if (names.length < BATCH) break
  }

  console.log(`cleanup: removed ${removed} orphaned file(s)`)
  return json({ removed })
})
