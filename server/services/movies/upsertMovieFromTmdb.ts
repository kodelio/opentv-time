import { eq } from 'drizzle-orm'
import type { TmdbMovieDetails } from '../../../shared/schemas/tmdb'
import { nowIso } from '../../../shared/utils/time'
import type { Db } from '../../db/createDb'
import { movies } from '../../db/schema'

export function upsertMovieFromTmdb(db: Db, details: TmdbMovieDetails): number {
  const values = {
    tmdbId: details.id,
    title: details.title,
    originalTitle: details.original_title ?? null,
    overview: details.overview ?? null,
    posterPath: details.poster_path ?? null,
    backdropPath: details.backdrop_path ?? null,
    releaseDate: details.release_date,
    runtime: details.runtime ?? null,
    genres: details.genres.map(genre => genre.name),
    lastSyncedAt: nowIso(),
  }
  db.insert(movies)
    .values(values)
    .onConflictDoUpdate({ target: movies.tmdbId, set: values })
    .run()
  const movie = db.select({ id: movies.id }).from(movies).where(eq(movies.tmdbId, details.id)).get()
  if (!movie) {
    throw new Error(`TMDB movie ${details.id} not found after insert`)
  }
  return movie.id
}
