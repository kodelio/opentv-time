import { sql } from 'drizzle-orm'
import { useDb } from '../db/client'

/**
 * Liveness/readiness probe for the Docker HEALTHCHECK (`/api/health`).
 *
 * Checks both the process and SQLite availability: a bad volume mount or a
 * corrupted file would still pass a plain "does the port answer?" check.
 * No auth and no dependencies so it stays usable if auth is added later.
 */
export default defineEventHandler(() => {
  try {
    useDb().run(sql`select 1`)
    return { status: 'ok', timestamp: new Date().toISOString() }
  } catch (error) {
    console.error('Healthcheck failed:', error)
    throw createError({ statusCode: 503, message: 'Database unavailable' })
  }
})
