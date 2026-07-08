import { chunk } from '../../../shared/utils/chunk'
import type { Db } from '../../db/createDb'
import { episodeWatches } from '../../db/schema'
import type { MappedWatch } from './mapEpisodes'

const INSERT_BATCH = 200

export function importEpisodeWatches(db: Db, mapped: readonly MappedWatch[]): number {
  let inserted = 0
  for (const batch of chunk(mapped, INSERT_BATCH)) {
    const result = db
      .insert(episodeWatches)
      .values(
        batch.map(({ record, episodeId }) => ({
          episodeId,
          watchedAt: record.watchedAt,
          isRewatch: record.isRewatch,
          source: record.source,
          sourceUuid: record.sourceUuid,
        })),
      )
      .onConflictDoNothing()
      .run()
    inserted += result.changes
  }
  return inserted
}
