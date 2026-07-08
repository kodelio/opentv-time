import { showStatePatchSchema } from '../../../../shared/schemas/api/shows'
import { idParamSchema } from '../../../../shared/schemas/api/watches'
import { useDb } from '../../../db/client'
import { updateShowState } from '../../../services/shows/updateShowState'
import { toHttpError } from '../../../utils/handleServiceError'

export default defineEventHandler(async (event) => {
  const showId = idParamSchema.parse(getRouterParam(event, 'showId'))
  const patch = await readValidatedBody(event, showStatePatchSchema.parse)
  try {
    updateShowState(useDb(), showId, patch)
    return { updated: true }
  } catch (error) {
    toHttpError(error)
  }
})
