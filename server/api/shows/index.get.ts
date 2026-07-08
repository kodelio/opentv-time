import { showFilterQuerySchema } from '../../../shared/schemas/api/shows'
import { useDb } from '../../db/client'
import { listShows } from '../../services/shows/listShows'

export default defineEventHandler(async (event) => {
  const { filter } = await getValidatedQuery(event, showFilterQuerySchema.parse)
  return listShows(useDb(), filter)
})
