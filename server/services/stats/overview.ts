import { count, eq, sql } from 'drizzle-orm'
import type { Db } from '../../db/createDb'
import { episodes, episodeWatches, movies, movieWatches, shows, showStates } from '../../db/schema'

export const DEFAULT_EPISODE_RUNTIME_MINUTES = 40

export interface StatsOverview {
  readonly totalMinutes: number
  readonly episodeMinutes: number
  readonly movieMinutes: number
  readonly episodesWatched: number
  readonly moviesWatched: number
  readonly showsFollowed: number
}

export function statsOverview(db: Db): StatsOverview {
  const episodeAgg = db
    .select({
      total: count(),
      minutes: sql<number>`coalesce(sum(coalesce(${episodes.runtime}, ${shows.episodeRunTime}, ${DEFAULT_EPISODE_RUNTIME_MINUTES})), 0)`,
    })
    .from(episodeWatches)
    .innerJoin(episodes, eq(episodes.id, episodeWatches.episodeId))
    .innerJoin(shows, eq(shows.id, episodes.showId))
    .get()

  const movieAgg = db
    .select({
      total: count(),
      minutes: sql<number>`coalesce(sum(coalesce(${movies.runtime}, 0)), 0)`,
    })
    .from(movieWatches)
    .innerJoin(movies, eq(movies.id, movieWatches.movieId))
    .get()

  const followed = db
    .select({ total: count() })
    .from(showStates)
    .where(eq(showStates.isFollowed, true))
    .get()

  const episodeMinutes = episodeAgg?.minutes ?? 0
  const movieMinutes = movieAgg?.minutes ?? 0
  return {
    totalMinutes: episodeMinutes + movieMinutes,
    episodeMinutes,
    movieMinutes,
    episodesWatched: episodeAgg?.total ?? 0,
    moviesWatched: movieAgg?.total ?? 0,
    showsFollowed: followed?.total ?? 0,
  }
}
