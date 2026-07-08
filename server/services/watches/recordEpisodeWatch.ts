import { eq } from 'drizzle-orm'
import type { Db } from '../../db/createDb'
import { episodes, episodeWatches } from '../../db/schema'
import { NotFoundError } from '../errors'

export interface RecordedWatch {
  readonly watchId: number
  readonly isRewatch: boolean
}

export function recordEpisodeWatch(db: Db, episodeId: number, watchedAt: string): RecordedWatch {
  const episode = db.select({ id: episodes.id }).from(episodes).where(eq(episodes.id, episodeId)).get()
  if (!episode) {
    throw new NotFoundError('Episode not found')
  }
  const existing = db
    .select({ id: episodeWatches.id })
    .from(episodeWatches)
    .where(eq(episodeWatches.episodeId, episodeId))
    .get()
  const inserted = db
    .insert(episodeWatches)
    .values({ episodeId, watchedAt, isRewatch: existing !== undefined })
    .returning({ id: episodeWatches.id })
    .get()
  return { watchId: inserted.id, isRewatch: existing !== undefined }
}
