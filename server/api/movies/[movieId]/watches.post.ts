import {
  idParamSchema,
  markSeenBodySchema,
  normalizeWatchedAt,
} from '../../../../shared/schemas/api/watches'
import { nowIso } from '../../../../shared/utils/time'
import { useDb } from '../../../db/client'
import { recordMovieWatch } from '../../../services/watches/recordMovieWatch'
import { toHttpError } from '../../../utils/handleServiceError'

export default defineEventHandler(async (event) => {
  const movieId = idParamSchema.parse(getRouterParam(event, 'movieId'))
  const body = await readValidatedBody(event, markSeenBodySchema.parse)
  const watchedAt = normalizeWatchedAt(body.watchedAt, nowIso())
  try {
    const result = recordMovieWatch(useDb(), movieId, watchedAt)
    setResponseStatus(event, 201)
    return result
  } catch (error) {
    toHttpError(error)
  }
})
