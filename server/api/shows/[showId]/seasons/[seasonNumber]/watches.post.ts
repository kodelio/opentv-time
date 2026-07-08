import { z } from 'zod'
import {
  idParamSchema,
  markSeenBodySchema,
  normalizeWatchedAt,
} from '../../../../../../shared/schemas/api/watches'
import { nowIso } from '../../../../../../shared/utils/time'
import { useDb } from '../../../../../db/client'
import { markSeasonWatched } from '../../../../../services/watches/markSeasonWatched'

const seasonNumberSchema = z.coerce.number().int().min(0)

export default defineEventHandler(async (event) => {
  const showId = idParamSchema.parse(getRouterParam(event, 'showId'))
  const seasonNumber = seasonNumberSchema.parse(getRouterParam(event, 'seasonNumber'))
  const body = await readValidatedBody(event, markSeenBodySchema.parse)
  const watchedAt = normalizeWatchedAt(body.watchedAt, nowIso())
  const inserted = markSeasonWatched(useDb(), showId, seasonNumber, watchedAt)
  setResponseStatus(event, 201)
  return { inserted }
})
