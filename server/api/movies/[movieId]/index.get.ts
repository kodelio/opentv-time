import { idParamSchema } from '../../../../shared/schemas/api/watches'
import { useDb } from '../../../db/client'
import { getMovieDetail } from '../../../services/movies/getMovieDetail'
import { toHttpError } from '../../../utils/handleServiceError'

export default defineEventHandler((event) => {
  const movieId = idParamSchema.parse(getRouterParam(event, 'movieId'))
  try {
    return getMovieDetail(useDb(), movieId)
  } catch (error) {
    toHttpError(error)
  }
})
