import { useDb } from '../../db/client'
import { refreshFollowedShows } from '../../services/sync/refreshShows'
import { usePreferredTmdb } from '../../utils/tmdb/usePreferredTmdb'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  if (!config.tmdbApiKey) {
    throw createError({ statusCode: 503, message: 'TMDB API key is not configured' })
  }
  const db = useDb()
  return refreshFollowedShows(db, usePreferredTmdb(db), 'manual')
})
