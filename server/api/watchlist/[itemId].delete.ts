import { idParamSchema } from '../../../shared/schemas/api/watches'
import { useDb } from '../../db/client'
import { removeWatchlistItem } from '../../services/watchlist/removeWatchlistItem'
import { toHttpError } from '../../utils/handleServiceError'

export default defineEventHandler((event) => {
  const itemId = idParamSchema.parse(getRouterParam(event, 'itemId'))
  try {
    removeWatchlistItem(useDb(), itemId)
    return sendNoContent(event)
  } catch (error) {
    toHttpError(error)
  }
})
