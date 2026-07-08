import { searchQuerySchema } from '../../shared/schemas/api/search'
import { useDb } from '../db/client'
import { enrichMovieItems, enrichShowItems } from '../services/discover/enrichMediaItems'
import { searchMovie, searchTv } from '../utils/tmdb/endpoints'
import { toTmdbHttpError } from '../utils/tmdb/toTmdbHttpError'
import { usePreferredTmdb } from '../utils/tmdb/usePreferredTmdb'

export default defineEventHandler(async (event) => {
  const { query, type } = await getValidatedQuery(event, searchQuerySchema.parse)
  const db = useDb()
  const tmdb = usePreferredTmdb(db)
  try {
    if (type === 'movie') {
      const results = await searchMovie(tmdb, query)
      return enrichMovieItems(
        db,
        results.map(result => ({
          tmdbId: result.id,
          title: result.title,
          originalTitle: result.original_title ?? null,
          releaseDate: result.release_date,
          posterPath: result.poster_path ?? null,
          overview: result.overview ?? null,
        })),
      )
    }
    const results = await searchTv(tmdb, query)
    return enrichShowItems(
      db,
      results.map(result => ({
        tmdbId: result.id,
        title: result.name,
        originalTitle: result.original_name ?? null,
        releaseDate: result.first_air_date,
        posterPath: result.poster_path ?? null,
        overview: result.overview ?? null,
      })),
    )
  } catch (error) {
    toTmdbHttpError(error)
  }
})
