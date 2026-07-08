import { and, count, countDistinct, eq, gt, inArray, isNotNull, lte, sql } from 'drizzle-orm'
import { toIsoDate } from '../../../shared/utils/time'
import type { Db } from '../../db/createDb'
import { episodes, episodeWatches } from '../../db/schema'

export interface ShowProgress {
  readonly aired: number
  readonly watched: number
}

export function airedEpisodesFilter(today = toIsoDate(new Date())) {
  return and(
    gt(episodes.seasonNumber, 0),
    isNotNull(episodes.airDate),
    lte(episodes.airDate, today),
  )
}

export function progressByShow(db: Db, showIds: readonly number[]): ReadonlyMap<number, ShowProgress> {
  if (showIds.length === 0) {
    return new Map()
  }
  const airedRows = db
    .select({ showId: episodes.showId, total: count() })
    .from(episodes)
    .where(and(inArray(episodes.showId, [...showIds]), airedEpisodesFilter()))
    .groupBy(episodes.showId)
    .all()

  const watchedRows = db
    .select({ showId: episodes.showId, total: countDistinct(episodes.id) })
    .from(episodes)
    .innerJoin(episodeWatches, eq(episodeWatches.episodeId, episodes.id))
    .where(and(inArray(episodes.showId, [...showIds]), gt(episodes.seasonNumber, 0)))
    .groupBy(episodes.showId)
    .all()

  const watchedByShow = new Map(watchedRows.map(row => [row.showId, row.total]))
  return new Map(
    showIds.map(showId => [
      showId,
      {
        aired: airedRows.find(row => row.showId === showId)?.total ?? 0,
        watched: watchedByShow.get(showId) ?? 0,
      },
    ]),
  )
}

export function lastWatchedByShow(db: Db, showIds: readonly number[]): ReadonlyMap<number, string> {
  if (showIds.length === 0) {
    return new Map()
  }
  const rows = db
    .select({
      showId: episodes.showId,
      lastWatchedAt: sql<string>`max(${episodeWatches.watchedAt})`,
    })
    .from(episodes)
    .innerJoin(episodeWatches, eq(episodeWatches.episodeId, episodes.id))
    .where(inArray(episodes.showId, [...showIds]))
    .groupBy(episodes.showId)
    .all()
  return new Map(rows.map(row => [row.showId, row.lastWatchedAt]))
}
