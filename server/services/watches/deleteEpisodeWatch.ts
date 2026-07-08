import { and, eq } from 'drizzle-orm'
import type { Db } from '../../db/createDb'
import { episodeWatches } from '../../db/schema'
import { NotFoundError } from '../errors'

export function deleteEpisodeWatch(db: Db, episodeId: number, watchId: number): void {
  const result = db
    .delete(episodeWatches)
    .where(and(eq(episodeWatches.id, watchId), eq(episodeWatches.episodeId, episodeId)))
    .run()
  if (result.changes === 0) {
    throw new NotFoundError('Watch not found')
  }
}
