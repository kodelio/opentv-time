import { and, eq, notExists } from 'drizzle-orm'
import { chunk } from '../../../shared/utils/chunk'
import type { Db } from '../../db/createDb'
import { episodes, episodeWatches } from '../../db/schema'
import { airedEpisodesFilter } from '../shows/showProgress'

const INSERT_BATCH = 200

export function markSeasonWatched(
  db: Db,
  showId: number,
  seasonNumber: number,
  watchedAt: string,
): number {
  const unwatched = db
    .select({ id: episodes.id })
    .from(episodes)
    .where(
      and(
        eq(episodes.showId, showId),
        eq(episodes.seasonNumber, seasonNumber),
        airedEpisodesFilter(),
        notExists(
          db.select().from(episodeWatches).where(eq(episodeWatches.episodeId, episodes.id)),
        ),
      ),
    )
    .all()

  let inserted = 0
  for (const batch of chunk(unwatched, INSERT_BATCH)) {
    const result = db
      .insert(episodeWatches)
      .values(batch.map(episode => ({ episodeId: episode.id, watchedAt })))
      .run()
    inserted += result.changes
  }
  return inserted
}
