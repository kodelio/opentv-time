import { eq } from 'drizzle-orm'
import type { Db } from '../../db/createDb'
import { shows, showStates } from '../../db/schema'
import { lastWatchedByShow, progressByShow } from './showProgress'

export const SHOW_FILTERS = ['toutes', 'en-cours', 'a-jour', 'terminees', 'archivees'] as const
export type ShowFilter = (typeof SHOW_FILTERS)[number]

export interface ShowListItem {
  readonly id: number
  readonly name: string
  readonly posterPath: string | null
  readonly status: string | null
  readonly nextEpisodeAirDate: string | null
  readonly isArchived: boolean
  readonly isFavorite: boolean
  readonly followedAt: string | null
  readonly aired: number
  readonly watched: number
  readonly lastWatchedAt: string | null
}

const ENDED_STATUSES = new Set(['Ended', 'Canceled'])

function matchesFilter(item: ShowListItem, filter: ShowFilter): boolean {
  if (filter === 'archivees') {
    return item.isArchived
  }
  if (item.isArchived) {
    return false
  }
  if (filter === 'en-cours') {
    return item.watched < item.aired
  }
  const isEnded = item.status !== null && ENDED_STATUSES.has(item.status)
  if (filter === 'a-jour') {
    return item.watched >= item.aired && !isEnded
  }
  if (filter === 'terminees') {
    return item.watched >= item.aired && isEnded
  }
  return true
}

export function listShows(db: Db, filter: ShowFilter = 'toutes'): readonly ShowListItem[] {
  const rows = db
    .select({
      id: shows.id,
      name: shows.name,
      posterPath: shows.posterPath,
      status: shows.status,
      nextEpisodeAirDate: shows.nextEpisodeAirDate,
      isArchived: showStates.isArchived,
      isFavorite: showStates.isFavorite,
      followedAt: showStates.followedAt,
    })
    .from(shows)
    .innerJoin(showStates, eq(showStates.showId, shows.id))
    .where(eq(showStates.isFollowed, true))
    .all()

  const showIds = rows.map(row => row.id)
  const progress = progressByShow(db, showIds)
  const lastWatched = lastWatchedByShow(db, showIds)

  return rows
    .map(row => ({
      ...row,
      aired: progress.get(row.id)?.aired ?? 0,
      watched: progress.get(row.id)?.watched ?? 0,
      lastWatchedAt: lastWatched.get(row.id) ?? null,
    }))
    .filter(item => matchesFilter(item, filter))
    .sort(
      (a, b) =>
        activityDate(b).localeCompare(activityDate(a)) || a.name.localeCompare(b.name, 'fr'),
    )
}

function activityDate(item: ShowListItem): string {
  return item.lastWatchedAt ?? item.followedAt ?? ''
}
