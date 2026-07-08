import { count, desc, eq, sql } from 'drizzle-orm'
import type { Db } from '../../db/createDb'
import { episodes, episodeWatches, shows } from '../../db/schema'
import { DEFAULT_EPISODE_RUNTIME_MINUTES } from './overview'

export interface TopShow {
  readonly showId: number
  readonly name: string
  readonly posterPath: string | null
  readonly episodesWatched: number
  readonly minutes: number
}

const DEFAULT_LIMIT = 10

export function topShows(db: Db, limit = DEFAULT_LIMIT): readonly TopShow[] {
  const minutes = sql<number>`coalesce(sum(coalesce(${episodes.runtime}, ${shows.episodeRunTime}, ${DEFAULT_EPISODE_RUNTIME_MINUTES})), 0)`
  return db
    .select({
      showId: shows.id,
      name: shows.name,
      posterPath: shows.posterPath,
      episodesWatched: count(),
      minutes,
    })
    .from(episodeWatches)
    .innerJoin(episodes, eq(episodes.id, episodeWatches.episodeId))
    .innerJoin(shows, eq(shows.id, episodes.showId))
    .groupBy(shows.id)
    .orderBy(desc(minutes))
    .limit(limit)
    .all()
}
