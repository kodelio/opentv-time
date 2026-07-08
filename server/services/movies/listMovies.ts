import { count, desc, eq, max } from 'drizzle-orm'
import type { Db } from '../../db/createDb'
import { movies, movieWatches } from '../../db/schema'

export interface MovieListItem {
  readonly id: number
  readonly title: string
  readonly posterPath: string | null
  readonly releaseDate: string | null
  readonly runtime: number | null
  readonly lastWatchedAt: string
  readonly watchCount: number
}

export function listMovies(db: Db): readonly MovieListItem[] {
  return db
    .select({
      id: movies.id,
      title: movies.title,
      posterPath: movies.posterPath,
      releaseDate: movies.releaseDate,
      runtime: movies.runtime,
      lastWatchedAt: max(movieWatches.watchedAt).mapWith(String),
      watchCount: count(movieWatches.id),
    })
    .from(movies)
    .innerJoin(movieWatches, eq(movieWatches.movieId, movies.id))
    .groupBy(movies.id)
    .orderBy(desc(max(movieWatches.watchedAt)))
    .all()
}
