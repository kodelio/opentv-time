import { and, eq } from 'drizzle-orm'
import type { Db } from '../../db/createDb'
import { movieWatches } from '../../db/schema'
import { NotFoundError } from '../errors'

export function deleteMovieWatch(db: Db, movieId: number, watchId: number): void {
  const result = db
    .delete(movieWatches)
    .where(and(eq(movieWatches.id, watchId), eq(movieWatches.movieId, movieId)))
    .run()
  if (result.changes === 0) {
    throw new NotFoundError('Watch not found')
  }
}
