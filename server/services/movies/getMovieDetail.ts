import { desc, eq } from 'drizzle-orm'
import type { Db } from '../../db/createDb'
import { movies, movieWatches, watchlistItems } from '../../db/schema'
import { NotFoundError } from '../errors'

export interface MovieDetail {
  readonly id: number
  readonly tmdbId: number
  readonly title: string
  readonly originalTitle: string | null
  readonly overview: string | null
  readonly posterPath: string | null
  readonly backdropPath: string | null
  readonly releaseDate: string | null
  readonly runtime: number | null
  readonly genres: readonly string[]
  readonly inWatchlist: boolean
  readonly watchlistItemId: number | null
  readonly watches: readonly { readonly id: number; readonly watchedAt: string }[]
}

export function getMovieDetail(db: Db, movieId: number): MovieDetail {
  const movie = db.select().from(movies).where(eq(movies.id, movieId)).get()
  if (!movie) {
    throw new NotFoundError('Movie not found')
  }
  const watches = db
    .select({ id: movieWatches.id, watchedAt: movieWatches.watchedAt })
    .from(movieWatches)
    .where(eq(movieWatches.movieId, movieId))
    .orderBy(desc(movieWatches.watchedAt))
    .all()
  const watchlistItem = db
    .select({ id: watchlistItems.id })
    .from(watchlistItems)
    .where(eq(watchlistItems.movieId, movieId))
    .get()

  return {
    id: movie.id,
    tmdbId: movie.tmdbId,
    title: movie.title,
    originalTitle: movie.originalTitle,
    overview: movie.overview,
    posterPath: movie.posterPath,
    backdropPath: movie.backdropPath,
    releaseDate: movie.releaseDate,
    runtime: movie.runtime,
    genres: movie.genres,
    inWatchlist: watchlistItem !== undefined,
    watchlistItemId: watchlistItem?.id ?? null,
    watches,
  }
}
