import { and, asc, between, eq, gt, inArray } from 'drizzle-orm'
import { toIsoDate } from '../../../shared/utils/time'
import type { Db } from '../../db/createDb'
import { episodes, shows, showStates } from '../../db/schema'
import { type UpNextItem, upNext } from './upNext'

/** Un épisode déjà diffusé, prêt à être regardé (sections « Sortis cette semaine » et « À rattraper »). */
export interface HomeUpNextItem extends UpNextItem {}

/** Une série suivie jamais commencée (section « À commencer »). */
export interface HomeToStartItem {
  readonly showId: number
  readonly showName: string
  readonly posterPath: string | null
  readonly episodeCount: number
}

/** Un épisode à venir d'une série suivie (section « Bientôt »). */
export interface HomeSoonItem {
  readonly showId: number
  readonly showName: string
  readonly seasonNumber: number
  readonly episodeNumber: number
  readonly airDate: string
}

export interface HomeSummary {
  readonly freshThisWeek: readonly HomeUpNextItem[]
  readonly backlog: readonly HomeUpNextItem[]
  readonly toStart: readonly HomeToStartItem[]
  /** Nombre total de séries à commencer (peut dépasser `toStart.length` qui est plafonné). */
  readonly toStartTotal: number
  readonly soon: readonly HomeSoonItem[]
  /** Nombre d'épisodes prêts à regarder (fresh + backlog). */
  readonly episodeCount: number
  /** Durée cumulée estimée de ces épisodes, en minutes. */
  readonly totalRuntime: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const FRESH_WINDOW_DAYS = 7
const SOON_HORIZON_DAYS = 30
const SOON_LIMIT = 6
const TO_START_LIMIT = 12

/** Un épisode « frais » a été diffusé dans la fenêtre récente (7 derniers jours). */
function isFresh(airDate: string | null, weekAgo: string): boolean {
  return airDate !== null && airDate >= weekAgo
}

export function homeSummary(db: Db): HomeSummary {
  const weekAgo = toIsoDate(new Date(Date.now() - FRESH_WINDOW_DAYS * DAY_MS))

  const items = upNext(db)

  const freshThisWeek = items
    .filter(item => item.lastWatchedAt !== null && isFresh(item.airDate, weekAgo))
    .toSorted((a, b) => (b.airDate ?? '').localeCompare(a.airDate ?? ''))

  const backlog = items.filter(
    item => item.lastWatchedAt !== null && !isFresh(item.airDate, weekAgo),
  )

  const neverStarted = items
    .filter(item => item.lastWatchedAt === null)
    .toSorted((a, b) => (b.followedAt ?? '').localeCompare(a.followedAt ?? ''))

  const toStart: HomeToStartItem[] = neverStarted.slice(0, TO_START_LIMIT).map(item => ({
    showId: item.showId,
    showName: item.showName,
    posterPath: item.posterPath,
    episodeCount: item.remaining,
  }))

  const readyToWatch = [...freshThisWeek, ...backlog]

  return {
    freshThisWeek,
    backlog,
    toStart,
    toStartTotal: neverStarted.length,
    soon: soonEpisodes(db),
    episodeCount: readyToWatch.length,
    totalRuntime: readyToWatch.reduce((sum, item) => sum + (item.runtime ?? 0), 0),
  }
}

/** Prochains épisodes non encore diffusés des séries suivies. */
function soonEpisodes(db: Db): readonly HomeSoonItem[] {
  const followed = db
    .select({ id: shows.id })
    .from(shows)
    .innerJoin(showStates, eq(showStates.showId, shows.id))
    .where(and(eq(showStates.isFollowed, true), eq(showStates.isArchived, false)))
    .all()
  if (followed.length === 0) {
    return []
  }

  const horizon = toIsoDate(new Date(Date.now() + SOON_HORIZON_DAYS * DAY_MS))
  const tomorrow = toIsoDate(new Date(Date.now() + DAY_MS))

  return db
    .select({
      showId: shows.id,
      showName: shows.name,
      seasonNumber: episodes.seasonNumber,
      episodeNumber: episodes.episodeNumber,
      airDate: episodes.airDate,
    })
    .from(episodes)
    .innerJoin(shows, eq(shows.id, episodes.showId))
    .where(
      and(
        inArray(
          episodes.showId,
          followed.map(show => show.id),
        ),
        gt(episodes.seasonNumber, 0),
        between(episodes.airDate, tomorrow, horizon),
      ),
    )
    .orderBy(asc(episodes.airDate), asc(shows.name))
    .limit(SOON_LIMIT)
    .all()
    .flatMap(row =>
      row.airDate === null
        ? []
        : [
            {
              showId: row.showId,
              showName: row.showName,
              seasonNumber: row.seasonNumber,
              episodeNumber: row.episodeNumber,
              airDate: row.airDate,
            } satisfies HomeSoonItem,
          ],
    )
}
