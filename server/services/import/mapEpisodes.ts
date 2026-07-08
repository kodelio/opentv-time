import { eq, inArray } from 'drizzle-orm'
import { chunk } from '../../../shared/utils/chunk'
import type { Db } from '../../db/createDb'
import { episodes } from '../../db/schema'
import type { TmdbClient } from '../../utils/tmdb/client'
import { findByTvdbId } from '../../utils/tmdb/endpoints'
import { TmdbError } from '../../utils/tmdb/errors'
import type { EpisodeWatchRecord } from './types'

export interface MappedWatch {
  readonly record: EpisodeWatchRecord
  readonly episodeId: number
}

export interface MapEpisodesResult {
  readonly mapped: readonly MappedWatch[]
  readonly unmatchedByShow: ReadonlyMap<number, readonly EpisodeWatchRecord[]>
}

interface EpisodeIndex {
  readonly bySeasonEpisode: ReadonlyMap<string, number>
  readonly byTmdbId: ReadonlyMap<number, number>
  readonly byTvdbId: ReadonlyMap<number, number>
}

const SHOW_ID_BATCH = 400

function loadEpisodeIndex(db: Db, showIds: readonly number[]): EpisodeIndex {
  const bySeasonEpisode = new Map<string, number>()
  const byTmdbId = new Map<number, number>()
  const byTvdbId = new Map<number, number>()
  for (const batch of chunk(showIds, SHOW_ID_BATCH)) {
    const rows = db
      .select({
        id: episodes.id,
        showId: episodes.showId,
        seasonNumber: episodes.seasonNumber,
        episodeNumber: episodes.episodeNumber,
        tmdbId: episodes.tmdbId,
        tvdbId: episodes.tvdbId,
      })
      .from(episodes)
      .where(inArray(episodes.showId, [...batch]))
      .all()
    for (const row of rows) {
      bySeasonEpisode.set(`${row.showId}:${row.seasonNumber}:${row.episodeNumber}`, row.id)
      if (row.tmdbId !== null) {
        byTmdbId.set(row.tmdbId, row.id)
      }
      if (row.tvdbId !== null) {
        byTvdbId.set(row.tvdbId, row.id)
      }
    }
  }
  return { bySeasonEpisode, byTmdbId, byTvdbId }
}

async function resolveByTvdbFind(
  tmdb: TmdbClient,
  tvdbEpisodeId: number,
  byTmdbId: ReadonlyMap<number, number>,
): Promise<number | null> {
  try {
    const found = await findByTvdbId(tmdb, tvdbEpisodeId)
    const episode = found.tv_episode_results[0]
    if (!episode) {
      return null
    }
    return byTmdbId.get(episode.id) ?? null
  } catch (error) {
    if (error instanceof TmdbError) {
      return null
    }
    throw error
  }
}

export async function mapEpisodes(
  db: Db,
  tmdb: TmdbClient,
  watches: readonly EpisodeWatchRecord[],
  showIdByTvdbId: ReadonlyMap<number, number>,
  log?: (message: string) => void,
): Promise<MapEpisodesResult> {
  const index = loadEpisodeIndex(db, [...new Set(showIdByTvdbId.values())])
  const mapped: MappedWatch[] = []
  const needFind: EpisodeWatchRecord[] = []
  const unmatched: EpisodeWatchRecord[] = []

  for (const record of watches) {
    const showId = showIdByTvdbId.get(record.tvdbSeriesId)
    if (showId === undefined) {
      continue
    }
    const directId =
      (record.tvdbEpisodeId !== null ? index.byTvdbId.get(record.tvdbEpisodeId) : undefined) ??
      (record.seasonNumber !== null && record.episodeNumber !== null
        ? index.bySeasonEpisode.get(`${showId}:${record.seasonNumber}:${record.episodeNumber}`)
        : undefined)
    if (directId !== undefined) {
      mapped.push({ record, episodeId: directId })
    } else if (record.tvdbEpisodeId !== null) {
      needFind.push(record)
    } else {
      unmatched.push(record)
    }
  }

  if (needFind.length > 0) {
    log?.(`Episodes to resolve through TMDB /find: ${needFind.length}`)
    const uniqueTvdbIds = [...new Set(needFind.map(record => record.tvdbEpisodeId as number))]
    const resolutions = new Map<number, number | null>()
    await Promise.all(
      uniqueTvdbIds.map(async (tvdbEpisodeId) => {
        resolutions.set(tvdbEpisodeId, await resolveByTvdbFind(tmdb, tvdbEpisodeId, index.byTmdbId))
      }),
    )
    const foundEntries = [...resolutions.entries()].filter(
      (entry): entry is [number, number] => entry[1] !== null,
    )
    for (const [tvdbEpisodeId, episodeId] of foundEntries) {
      db.update(episodes).set({ tvdbId: tvdbEpisodeId }).where(eq(episodes.id, episodeId)).run()
    }
    for (const record of needFind) {
      const episodeId = resolutions.get(record.tvdbEpisodeId as number) ?? null
      if (episodeId !== null) {
        mapped.push({ record, episodeId })
      } else {
        unmatched.push(record)
      }
    }
  }

  const unmatchedByShow = new Map<number, readonly EpisodeWatchRecord[]>()
  for (const record of unmatched) {
    const existing = unmatchedByShow.get(record.tvdbSeriesId) ?? []
    unmatchedByShow.set(record.tvdbSeriesId, [...existing, record])
  }

  return { mapped, unmatchedByShow }
}
