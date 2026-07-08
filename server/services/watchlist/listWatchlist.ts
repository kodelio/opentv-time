import { desc, eq } from 'drizzle-orm'
import type { Db } from '../../db/createDb'
import { movies, shows, watchlistItems, type MediaType } from '../../db/schema'

export interface WatchlistEntry {
  readonly id: number
  readonly mediaType: MediaType
  readonly addedAt: string
  readonly mediaId: number
  readonly title: string
  readonly posterPath: string | null
  readonly releaseDate: string | null
}

export function listWatchlist(db: Db): readonly WatchlistEntry[] {
  const rows = db
    .select({
      id: watchlistItems.id,
      mediaType: watchlistItems.mediaType,
      addedAt: watchlistItems.addedAt,
      movieId: watchlistItems.movieId,
      showId: watchlistItems.showId,
      movieTitle: movies.title,
      moviePoster: movies.posterPath,
      movieRelease: movies.releaseDate,
      showName: shows.name,
      showPoster: shows.posterPath,
      showRelease: shows.firstAirDate,
    })
    .from(watchlistItems)
    .leftJoin(movies, eq(movies.id, watchlistItems.movieId))
    .leftJoin(shows, eq(shows.id, watchlistItems.showId))
    .orderBy(desc(watchlistItems.addedAt))
    .all()

  return rows.flatMap((row) => {
    const isMovie = row.mediaType === 'movie'
    const mediaId = isMovie ? row.movieId : row.showId
    const title = isMovie ? row.movieTitle : row.showName
    if (mediaId === null || title === null) {
      return []
    }
    return [
      {
        id: row.id,
        mediaType: row.mediaType,
        addedAt: row.addedAt,
        mediaId,
        title,
        posterPath: isMovie ? row.moviePoster : row.showPoster,
        releaseDate: isMovie ? row.movieRelease : row.showRelease,
      } satisfies WatchlistEntry,
    ]
  })
}
