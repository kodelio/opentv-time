import { idParamSchema } from '../../../../shared/schemas/api/watches'
import { useDb } from '../../../db/client'
import { getShowDetail } from '../../../services/shows/getShowDetail'
import { toHttpError } from '../../../utils/handleServiceError'

export default defineEventHandler((event) => {
  const showId = idParamSchema.parse(getRouterParam(event, 'showId'))
  try {
    return getShowDetail(useDb(), showId)
  } catch (error) {
    toHttpError(error)
  }
})
