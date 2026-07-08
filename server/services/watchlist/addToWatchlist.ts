import { eq } from 'drizzle-orm'
import type { Db } from '../../db/createDb'
import { movies, shows, watchlistItems, type MediaType } from '../../db/schema'
import type { TmdbClient } from '../../utils/tmdb/client'
import { getMovieDetails } from '../../utils/tmdb/endpoints'
import { upsertMovieFromTmdb } from '../movies/upsertMovieFromTmdb'
import { fetchAndUpsertShow } from '../shows/fetchAndUpsertShow'

export interface AddToWatchlistResult {
  readonly added: boolean
  readonly mediaId: number
}

export async function addToWatchlist(
  db: Db,
  tmdb: TmdbClient,
  mediaType: MediaType,
  tmdbId: number,
): Promise<AddToWatchlistResult> {
  if (mediaType === 'movie') {
    const existing = db.select({ id: movies.id }).from(movies).where(eq(movies.tmdbId, tmdbId)).get()
    const movieId = existing?.id ?? upsertMovieFromTmdb(db, await getMovieDetails(tmdb, tmdbId))
    const result = db
      .insert(watchlistItems)
      .values({ mediaType: 'movie', movieId })
      .onConflictDoNothing()
      .run()
    return { added: result.changes > 0, mediaId: movieId }
  }

  const existing = db.select({ id: shows.id }).from(shows).where(eq(shows.tmdbId, tmdbId)).get()
  const showId = existing?.id ?? (await fetchAndUpsertShow(db, tmdb, tmdbId))
  const result = db
    .insert(watchlistItems)
    .values({ mediaType: 'show', showId })
    .onConflictDoNothing()
    .run()
  return { added: result.changes > 0, mediaId: showId }
}
