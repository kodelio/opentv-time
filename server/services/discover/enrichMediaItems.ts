import { countDistinct, eq, inArray } from 'drizzle-orm'
import type { Db } from '../../db/createDb'
import {
  episodes,
  episodeWatches,
  movies,
  movieWatches,
  shows,
  showStates,
  watchlistItems,
} from '../../db/schema'

export interface DiscoverMediaItem {
  readonly tmdbId: number
  readonly title: string
  readonly originalTitle?: string | null
  readonly releaseDate: string | null
  readonly posterPath: string | null
  readonly overview: string | null
}

export interface EnrichedDiscoverMediaItem extends DiscoverMediaItem {
  readonly mediaId: number | null
  readonly isFollowed: boolean
  readonly isArchived: boolean
  readonly isInWatchlist: boolean
  readonly isWatched: boolean
}

function uniqueTmdbIds(items: readonly DiscoverMediaItem[]): number[] {
  return [...new Set(items.map(item => item.tmdbId))]
}

export function enrichMovieItems(
  db: Db,
  items: readonly DiscoverMediaItem[],
): readonly EnrichedDiscoverMediaItem[] {
  const tmdbIds = uniqueTmdbIds(items)
  if (tmdbIds.length === 0) {
    return []
  }

  const movieRows = db
    .select({ id: movies.id, tmdbId: movies.tmdbId })
    .from(movies)
    .where(inArray(movies.tmdbId, tmdbIds))
    .all()
  const movieIds = movieRows.map(row => row.id)
  const movieByTmdbId = new Map(movieRows.map(row => [row.tmdbId, row]))

  const watchedMovieIds =
    movieIds.length === 0
      ? new Set<number>()
      : new Set(
          db
            .select({ movieId: movieWatches.movieId, total: countDistinct(movieWatches.id) })
            .from(movieWatches)
            .where(inArray(movieWatches.movieId, movieIds))
            .groupBy(movieWatches.movieId)
            .all()
            .filter(row => row.total > 0)
            .map(row => row.movieId),
        )

  const watchlistMovieIds =
    movieIds.length === 0
      ? new Set<number>()
      : new Set(
          db
            .select({ movieId: watchlistItems.movieId })
            .from(watchlistItems)
            .where(inArray(watchlistItems.movieId, movieIds))
            .all()
            .flatMap(row => (row.movieId === null ? [] : [row.movieId])),
        )

  return items.map((item) => {
    const movie = movieByTmdbId.get(item.tmdbId)
    return {
      ...item,
      mediaId: movie?.id ?? null,
      isFollowed: false,
      isArchived: false,
      isInWatchlist: movie ? watchlistMovieIds.has(movie.id) : false,
      isWatched: movie ? watchedMovieIds.has(movie.id) : false,
    }
  })
}

export function enrichShowItems(
  db: Db,
  items: readonly DiscoverMediaItem[],
): readonly EnrichedDiscoverMediaItem[] {
  const tmdbIds = uniqueTmdbIds(items)
  if (tmdbIds.length === 0) {
    return []
  }

  const showRows = db
    .select({
      id: shows.id,
      tmdbId: shows.tmdbId,
      isFollowed: showStates.isFollowed,
      isArchived: showStates.isArchived,
    })
    .from(shows)
    .leftJoin(showStates, eq(showStates.showId, shows.id))
    .where(inArray(shows.tmdbId, tmdbIds))
    .all()
  const showIds = showRows.map(row => row.id)
  const showByTmdbId = new Map(showRows.map(row => [row.tmdbId, row]))

  const watchedShowIds =
    showIds.length === 0
      ? new Set<number>()
      : new Set(
          db
            .select({ showId: episodes.showId, total: countDistinct(episodes.id) })
            .from(episodes)
            .innerJoin(episodeWatches, eq(episodeWatches.episodeId, episodes.id))
            .where(inArray(episodes.showId, showIds))
            .groupBy(episodes.showId)
            .all()
            .filter(row => row.total > 0)
            .map(row => row.showId),
        )

  const watchlistShowIds =
    showIds.length === 0
      ? new Set<number>()
      : new Set(
          db
            .select({ showId: watchlistItems.showId })
            .from(watchlistItems)
            .where(inArray(watchlistItems.showId, showIds))
            .all()
            .flatMap(row => (row.showId === null ? [] : [row.showId])),
        )

  return items.map((item) => {
    const show = showByTmdbId.get(item.tmdbId)
    return {
      ...item,
      mediaId: show?.id ?? null,
      isFollowed: show?.isFollowed ?? false,
      isArchived: show?.isArchived ?? false,
      isInWatchlist: show ? watchlistShowIds.has(show.id) : false,
      isWatched: show ? watchedShowIds.has(show.id) : false,
    }
  })
}
