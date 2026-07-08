import { desc } from 'drizzle-orm'
import { useDb } from '../../db/client'
import { syncRuns } from '../../db/schema'

export default defineEventHandler(() => {
  const lastRun = useDb()
    .select()
    .from(syncRuns)
    .orderBy(desc(syncRuns.id))
    .limit(1)
    .get()
  return lastRun ?? null
})
