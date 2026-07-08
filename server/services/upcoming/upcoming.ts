import { and, asc, between, eq } from 'drizzle-orm'
import { toIsoDate } from '../../../shared/utils/time'
import type { Db } from '../../db/createDb'
import { episodes, movies, shows, showStates, watchlistItems } from '../../db/schema'

export interface UpcomingItem {
  readonly kind: 'episode' | 'movie'
  readonly date: string
  readonly mediaId: number
  readonly title: string
  readonly posterPath: string | null
  readonly seasonNumber: number | null
  readonly episodeNumber: number | null
  readonly episodeName: string | null
  readonly isSeasonPremiere: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000

export function upcoming(db: Db, days: number): readonly UpcomingItem[] {
  const today = toIsoDate(new Date())
  const end = toIsoDate(new Date(Date.now() + days * DAY_MS))

  const episodeRows = db
    .select({
      date: episodes.airDate,
      showId: shows.id,
      showName: shows.name,
      posterPath: shows.posterPath,
      seasonNumber: episodes.seasonNumber,
      episodeNumber: episodes.episodeNumber,
      episodeName: episodes.name,
    })
    .from(episodes)
    .innerJoin(shows, eq(shows.id, episodes.showId))
    .innerJoin(showStates, eq(showStates.showId, shows.id))
    .where(
      and(
        eq(showStates.isFollowed, true),
        eq(showStates.isArchived, false),
        between(episodes.airDate, today, end),
      ),
    )
    .orderBy(asc(episodes.airDate), asc(shows.name), asc(episodes.episodeNumber))
    .all()

  const movieRows = db
    .select({
      date: movies.releaseDate,
      movieId: movies.id,
      title: movies.title,
      posterPath: movies.posterPath,
    })
    .from(watchlistItems)
    .innerJoin(movies, eq(movies.id, watchlistItems.movieId))
    .where(
      and(eq(watchlistItems.mediaType, 'movie'), between(movies.releaseDate, today, end)),
    )
    .orderBy(asc(movies.releaseDate))
    .all()

  const items: UpcomingItem[] = [
    ...episodeRows.flatMap((row) => {
      if (!row.date) {
        return []
      }
      return [
        {
          kind: 'episode',
          date: row.date,
          mediaId: row.showId,
          title: row.showName,
          posterPath: row.posterPath,
          seasonNumber: row.seasonNumber,
          episodeNumber: row.episodeNumber,
          episodeName: row.episodeName,
          isSeasonPremiere: row.episodeNumber === 1,
        } satisfies UpcomingItem,
      ]
    }),
    ...movieRows.flatMap((row) => {
      if (!row.date) {
        return []
      }
      return [
        {
          kind: 'movie',
          date: row.date,
          mediaId: row.movieId,
          title: row.title,
          posterPath: row.posterPath,
          seasonNumber: null,
          episodeNumber: null,
          episodeName: null,
          isSeasonPremiere: false,
        } satisfies UpcomingItem,
      ]
    }),
  ]

  return items.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'fr'))
}
