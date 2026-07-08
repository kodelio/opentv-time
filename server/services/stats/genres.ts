import { count, eq } from 'drizzle-orm'
import type { Db } from '../../db/createDb'
import { episodes, episodeWatches, movies, movieWatches, shows } from '../../db/schema'

export interface GenreStat {
  readonly genre: string
  readonly count: number
}

const DEFAULT_LIMIT = 12

export function genreStats(db: Db, limit = DEFAULT_LIMIT): readonly GenreStat[] {
  const showRows = db
    .select({ genres: shows.genres, total: count() })
    .from(episodeWatches)
    .innerJoin(episodes, eq(episodes.id, episodeWatches.episodeId))
    .innerJoin(shows, eq(shows.id, episodes.showId))
    .groupBy(shows.id)
    .all()

  const movieRows = db
    .select({ genres: movies.genres, total: count() })
    .from(movieWatches)
    .innerJoin(movies, eq(movies.id, movieWatches.movieId))
    .groupBy(movies.id)
    .all()

  const totals = new Map<string, number>()
  for (const row of [...showRows, ...movieRows]) {
    for (const genre of row.genres) {
      totals.set(genre, (totals.get(genre) ?? 0) + row.total)
    }
  }

  return [...totals.entries()]
    .map(([genre, total]) => ({ genre, count: total }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
