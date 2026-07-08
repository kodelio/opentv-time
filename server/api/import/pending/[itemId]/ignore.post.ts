import { pendingItemIdSchema } from '../../../../../shared/schemas/api/importPending'
import { useDb } from '../../../../db/client'
import { ignorePendingItem, PendingResolutionError } from '../../../../services/import/resolvePending'

export default defineEventHandler((event) => {
  const itemId = pendingItemIdSchema.parse(getRouterParam(event, 'itemId'))
  try {
    ignorePendingItem(useDb(), itemId)
    return { ignored: true }
  } catch (error) {
    if (error instanceof PendingResolutionError) {
      throw createError({ statusCode: error.statusCode, message: error.message })
    }
    throw error
  }
})
