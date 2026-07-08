import {
  idParamSchema,
  markSeenBodySchema,
  normalizeWatchedAt,
} from '../../../../shared/schemas/api/watches'
import { nowIso } from '../../../../shared/utils/time'
import { useDb } from '../../../db/client'
import { recordEpisodeWatch } from '../../../services/watches/recordEpisodeWatch'
import { toHttpError } from '../../../utils/handleServiceError'

export default defineEventHandler(async (event) => {
  const episodeId = idParamSchema.parse(getRouterParam(event, 'episodeId'))
  const body = await readValidatedBody(event, markSeenBodySchema.parse)
  const watchedAt = normalizeWatchedAt(body.watchedAt, nowIso())
  try {
    const result = recordEpisodeWatch(useDb(), episodeId, watchedAt)
    setResponseStatus(event, 201)
    return result
  } catch (error) {
    toHttpError(error)
  }
})
