import { eq } from 'drizzle-orm'
import type { Db } from '../../db/createDb'
import { movies, movieWatches, watchlistItems } from '../../db/schema'
import { NotFoundError } from '../errors'
import type { RecordedWatch } from './recordEpisodeWatch'

export function recordMovieWatch(db: Db, movieId: number, watchedAt: string): RecordedWatch {
  const movie = db.select({ id: movies.id }).from(movies).where(eq(movies.id, movieId)).get()
  if (!movie) {
    throw new NotFoundError('Movie not found')
  }
  const existing = db
    .select({ id: movieWatches.id })
    .from(movieWatches)
    .where(eq(movieWatches.movieId, movieId))
    .get()
  const inserted = db
    .insert(movieWatches)
    .values({ movieId, watchedAt, isRewatch: existing !== undefined })
    .returning({ id: movieWatches.id })
    .get()
  db.delete(watchlistItems).where(eq(watchlistItems.movieId, movieId)).run()
  return { watchId: inserted.id, isRewatch: existing !== undefined }
}
