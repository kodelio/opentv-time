import { idParamSchema } from '../../../../../shared/schemas/api/watches'
import { useDb } from '../../../../db/client'
import { deleteMovieWatch } from '../../../../services/watches/deleteMovieWatch'
import { toHttpError } from '../../../../utils/handleServiceError'

export default defineEventHandler((event) => {
  const movieId = idParamSchema.parse(getRouterParam(event, 'movieId'))
  const watchId = idParamSchema.parse(getRouterParam(event, 'watchId'))
  try {
    deleteMovieWatch(useDb(), movieId, watchId)
    return sendNoContent(event)
  } catch (error) {
    toHttpError(error)
  }
})
