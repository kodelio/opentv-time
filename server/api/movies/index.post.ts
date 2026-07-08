import { eq } from 'drizzle-orm'
import { addByTmdbIdSchema } from '../../../shared/schemas/api/media'
import { useDb } from '../../db/client'
import { movies } from '../../db/schema'
import { upsertMovieFromTmdb } from '../../services/movies/upsertMovieFromTmdb'
import { getMovieDetails } from '../../utils/tmdb/endpoints'
import { TmdbNotFoundError } from '../../utils/tmdb/errors'
import { usePreferredTmdb } from '../../utils/tmdb/usePreferredTmdb'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, addByTmdbIdSchema.parse)
  const db = useDb()
  try {
    const existing = db.select({ id: movies.id }).from(movies).where(eq(movies.tmdbId, body.tmdbId)).get()
    const movieId =
      existing?.id ?? upsertMovieFromTmdb(db, await getMovieDetails(usePreferredTmdb(db), body.tmdbId))
    setResponseStatus(event, 201)
    return { movieId }
  } catch (error) {
    if (error instanceof TmdbNotFoundError) {
      throw createError({ statusCode: 404, message: 'Movie not found on TMDB' })
    }
    console.error('Failed to add movie:', error)
    throw createError({ statusCode: 500, message: 'Could not add this movie' })
  }
})
