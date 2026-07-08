import {
  idParamSchema,
  markSeenBodySchema,
  normalizeWatchedAt,
} from '../../../../shared/schemas/api/watches'
import { nowIso } from '../../../../shared/utils/time'
import { useDb } from '../../../db/client'
import { markShowWatched } from '../../../services/watches/markShowWatched'

export default defineEventHandler(async (event) => {
  const showId = idParamSchema.parse(getRouterParam(event, 'showId'))
  const body = await readValidatedBody(event, markSeenBodySchema.parse)
  const watchedAt = normalizeWatchedAt(body.watchedAt, nowIso())
  const inserted = markShowWatched(useDb(), showId, watchedAt)
  setResponseStatus(event, 201)
  return { inserted }
})
