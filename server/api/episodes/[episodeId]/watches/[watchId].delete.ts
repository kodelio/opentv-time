import { idParamSchema } from '../../../../../shared/schemas/api/watches'
import { useDb } from '../../../../db/client'
import { deleteEpisodeWatch } from '../../../../services/watches/deleteEpisodeWatch'
import { toHttpError } from '../../../../utils/handleServiceError'

export default defineEventHandler((event) => {
  const episodeId = idParamSchema.parse(getRouterParam(event, 'episodeId'))
  const watchId = idParamSchema.parse(getRouterParam(event, 'watchId'))
  try {
    deleteEpisodeWatch(useDb(), episodeId, watchId)
    return sendNoContent(event)
  } catch (error) {
    toHttpError(error)
  }
})
