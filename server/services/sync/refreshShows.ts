import { and, eq, gte, isNull, or } from 'drizzle-orm'
import pLimit from 'p-limit'
import { nowIso, toIsoDate } from '../../../shared/utils/time'
import type { Db } from '../../db/createDb'
import { episodes, shows, showStates, syncRuns, type SyncKind } from '../../db/schema'
import type { TmdbClient } from '../../utils/tmdb/client'
import { getTvDetails, getTvSeasons } from '../../utils/tmdb/endpoints'
import { upsertShowFromTmdb } from '../shows/upsertShowFromTmdb'

export interface RefreshSummary {
  readonly refreshed: number
  readonly skipped: number
  readonly errors: readonly string[]
}

const ENDED_STATUSES = new Set(['Ended', 'Canceled'])
const ENDED_REFRESH_INTERVAL_DAYS = 7
const RECENT_AIR_WINDOW_DAYS = 30
const REFRESH_CONCURRENCY = 2

function isStale(lastSyncedAt: string | null, days: number): boolean {
  if (!lastSyncedAt) {
    return true
  }
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  return lastSyncedAt < threshold
}

function seasonNumbersToRefresh(db: Db, showId: number, latestSeason: number): readonly number[] {
  const windowStart = toIsoDate(new Date(Date.now() - RECENT_AIR_WINDOW_DAYS * 24 * 60 * 60 * 1000))
  const rows = db
    .selectDistinct({ seasonNumber: episodes.seasonNumber })
    .from(episodes)
    .where(
      and(
        eq(episodes.showId, showId),
        or(isNull(episodes.airDate), gte(episodes.airDate, windowStart)),
      ),
    )
    .all()
  return [...new Set([latestSeason, ...rows.map(row => row.seasonNumber)])].filter(
    seasonNumber => seasonNumber >= 0,
  )
}

async function refreshOneShow(db: Db, tmdb: TmdbClient, showId: number, tmdbId: number): Promise<void> {
  const details = await getTvDetails(tmdb, tmdbId)
  const latestSeason = Math.max(0, ...details.seasons.map(season => season.season_number))
  const hasEpisodes = db
    .select({ id: episodes.id })
    .from(episodes)
    .where(eq(episodes.showId, showId))
    .limit(1)
    .get()
  const seasonNumbers = hasEpisodes
    ? seasonNumbersToRefresh(db, showId, latestSeason)
    : details.seasons.map(season => season.season_number)
  const seasonsData = await getTvSeasons(tmdb, tmdbId, seasonNumbers)
  upsertShowFromTmdb(db, details, seasonsData)
}

export async function refreshFollowedShows(
  db: Db,
  tmdb: TmdbClient,
  kind: SyncKind,
  log?: (message: string) => void,
): Promise<RefreshSummary> {
  const syncRun = db.insert(syncRuns).values({ kind }).returning().get()
  const candidates = db
    .select({
      id: shows.id,
      tmdbId: shows.tmdbId,
      name: shows.name,
      status: shows.status,
      lastSyncedAt: shows.lastSyncedAt,
    })
    .from(shows)
    .innerJoin(showStates, eq(showStates.showId, shows.id))
    .where(and(eq(showStates.isFollowed, true), eq(showStates.isArchived, false)))
    .all()

  const toRefresh = candidates.filter(
    show =>
      !(show.status !== null && ENDED_STATUSES.has(show.status)) ||
      isStale(show.lastSyncedAt, ENDED_REFRESH_INTERVAL_DAYS),
  )
  const skipped = candidates.length - toRefresh.length
  log?.(`Refreshing ${toRefresh.length} shows (${skipped} skipped)`)

  const limit = pLimit(REFRESH_CONCURRENCY)
  const errors: string[] = []
  let refreshed = 0
  await Promise.all(
    toRefresh.map(show =>
      limit(async () => {
        try {
          await refreshOneShow(db, tmdb, show.id, show.tmdbId)
          refreshed += 1
        } catch (error) {
          errors.push(`"${show.name}": ${String(error)}`)
        }
      }),
    ),
  )

  db.update(syncRuns)
    .set({ finishedAt: nowIso(), showsRefreshed: refreshed, errors })
    .where(eq(syncRuns.id, syncRun.id))
    .run()

  return { refreshed, skipped, errors }
}
