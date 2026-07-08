import { pendingItemIdSchema, resolvePendingBodySchema } from '../../../../../shared/schemas/api/importPending'
import { useDb } from '../../../../db/client'
import { PendingResolutionError, resolvePendingItem } from '../../../../services/import/resolvePending'
import { usePreferredTmdb } from '../../../../utils/tmdb/usePreferredTmdb'

export default defineEventHandler(async (event) => {
  const itemId = pendingItemIdSchema.parse(getRouterParam(event, 'itemId'))
  const body = await readValidatedBody(event, resolvePendingBodySchema.parse)
  const db = useDb()

  try {
    await resolvePendingItem(db, usePreferredTmdb(db), itemId, body.tmdbId)
    return { resolved: true }
  } catch (error) {
    if (error instanceof PendingResolutionError) {
      throw createError({ statusCode: error.statusCode, message: error.message })
    }
    console.error(`Failed to resolve pending item ${itemId}:`, error)
    throw createError({ statusCode: 500, message: 'Resolution failed' })
  }
})
