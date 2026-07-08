import { watchlistAddSchema } from '../../../shared/schemas/api/media'
import { useDb } from '../../db/client'
import { addToWatchlist } from '../../services/watchlist/addToWatchlist'
import { TmdbNotFoundError } from '../../utils/tmdb/errors'
import { usePreferredTmdb } from '../../utils/tmdb/usePreferredTmdb'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, watchlistAddSchema.parse)
  const db = useDb()
  try {
    const result = await addToWatchlist(db, usePreferredTmdb(db), body.mediaType, body.tmdbId)
    setResponseStatus(event, 201)
    return result
  } catch (error) {
    if (error instanceof TmdbNotFoundError) {
      throw createError({ statusCode: 404, message: 'Title not found on TMDB' })
    }
    console.error('Failed to add to watchlist:', error)
    throw createError({ statusCode: 500, message: 'Could not add to watchlist' })
  }
})
