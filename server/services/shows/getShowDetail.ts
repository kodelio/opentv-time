import { asc, count, eq, max, sql } from 'drizzle-orm'
import { toIsoDate } from '../../../shared/utils/time'
import type { Db } from '../../db/createDb'
import { episodes, episodeWatches, seasons, shows, showStates } from '../../db/schema'
import { NotFoundError } from '../errors'
import { progressByShow } from './showProgress'

export interface EpisodeDetail {
  readonly id: number
  readonly episodeNumber: number
  readonly name: string | null
  readonly overview: string | null
  readonly airDate: string | null
  readonly runtime: number | null
  readonly stillPath: string | null
  readonly isAired: boolean
  readonly watchCount: number
  readonly lastWatchedAt: string | null
  readonly lastWatchId: number | null
}

export interface SeasonDetail {
  readonly seasonNumber: number
  readonly name: string | null
  readonly airDate: string | null
  readonly watchedCount: number
  readonly airedCount: number
  readonly episodes: readonly EpisodeDetail[]
}

export interface ShowDetail {
  readonly id: number
  readonly tmdbId: number
  readonly name: string
  readonly originalName: string | null
  readonly overview: string | null
  readonly posterPath: string | null
  readonly backdropPath: string | null
  readonly firstAirDate: string | null
  readonly status: string | null
  readonly genres: readonly string[]
  readonly nextEpisodeAirDate: string | null
  readonly state: {
    readonly isFollowed: boolean
    readonly isArchived: boolean
    readonly isFavorite: boolean
  }
  readonly progress: { readonly aired: number; readonly watched: number }
  readonly seasons: readonly SeasonDetail[]
}

export function getShowDetail(db: Db, showId: number): ShowDetail {
  const show = db.select().from(shows).where(eq(shows.id, showId)).get()
  if (!show) {
    throw new NotFoundError('Show not found')
  }
  const state = db.select().from(showStates).where(eq(showStates.showId, showId)).get()

  const episodeRows = db
    .select()
    .from(episodes)
    .where(eq(episodes.showId, showId))
    .orderBy(asc(episodes.seasonNumber), asc(episodes.episodeNumber))
    .all()

  const watchRows = db
    .select({
      episodeId: episodeWatches.episodeId,
      watchCount: count(),
      lastWatchedAt: max(episodeWatches.watchedAt),
      lastWatchId: sql<number>`max(${episodeWatches.id})`,
    })
    .from(episodeWatches)
    .innerJoin(episodes, eq(episodes.id, episodeWatches.episodeId))
    .where(eq(episodes.showId, showId))
    .groupBy(episodeWatches.episodeId)
    .all()
  const watchesByEpisode = new Map(watchRows.map(row => [row.episodeId, row]))

  const seasonRows = db
    .select()
    .from(seasons)
    .where(eq(seasons.showId, showId))
    .orderBy(asc(seasons.seasonNumber))
    .all()

  const today = toIsoDate(new Date())
  const episodesBySeason = new Map<number, EpisodeDetail[]>()
  for (const episode of episodeRows) {
    const watch = watchesByEpisode.get(episode.id)
    const detail: EpisodeDetail = {
      id: episode.id,
      episodeNumber: episode.episodeNumber,
      name: episode.name,
      overview: episode.overview,
      airDate: episode.airDate,
      runtime: episode.runtime,
      stillPath: episode.stillPath,
      isAired: episode.airDate !== null && episode.airDate <= today,
      watchCount: watch?.watchCount ?? 0,
      lastWatchedAt: watch?.lastWatchedAt ?? null,
      lastWatchId: watch?.lastWatchId ?? null,
    }
    const list = episodesBySeason.get(episode.seasonNumber) ?? []
    episodesBySeason.set(episode.seasonNumber, [...list, detail])
  }

  const seasonMetaByNumber = new Map(seasonRows.map(season => [season.seasonNumber, season]))
  const seasonDetails = [...episodesBySeason.keys()]
    .sort((a, b) => a - b)
    .map((seasonNumber) => {
      const seasonEpisodes = episodesBySeason.get(seasonNumber) ?? []
      const meta = seasonMetaByNumber.get(seasonNumber)
      return {
        seasonNumber,
        name: meta?.name ?? null,
        airDate: meta?.airDate ?? null,
        watchedCount: seasonEpisodes.filter(episode => episode.watchCount > 0).length,
        airedCount: seasonEpisodes.filter(episode => episode.isAired).length,
        episodes: seasonEpisodes,
      } satisfies SeasonDetail
    })

  const progress = progressByShow(db, [showId]).get(showId)

  return {
    id: show.id,
    tmdbId: show.tmdbId,
    name: show.name,
    originalName: show.originalName,
    overview: show.overview,
    posterPath: show.posterPath,
    backdropPath: show.backdropPath,
    firstAirDate: show.firstAirDate,
    status: show.status,
    genres: show.genres,
    nextEpisodeAirDate: show.nextEpisodeAirDate,
    state: {
      isFollowed: state?.isFollowed ?? false,
      isArchived: state?.isArchived ?? false,
      isFavorite: state?.isFavorite ?? false,
    },
    progress: progress ?? { aired: 0, watched: 0 },
    seasons: seasonDetails,
  }
}
