import { toNumber, type CsvRow } from '../csv'
import { csvDateToIso, extractUnixFromRangeKey, unixToIso, yearFromDate } from '../dates'
import { extractAlphaSlug } from '../normalizeTitle'
import type { EpisodeWatchRecord, MovieRecord, MovieWatchRecord, WatchlistMovieRecord } from '../types'

export interface TrackingV1Data {
  readonly episodeWatches: readonly EpisodeWatchRecord[]
  readonly movieWatches: readonly MovieWatchRecord[]
  readonly watchlistMovies: readonly WatchlistMovieRecord[]
}

const SECONDS_PER_MINUTE = 60

function watchDateOf(row: CsvRow): string | null {
  const fromRangeKey = extractUnixFromRangeKey(row.watch_date_range_key)
  if (fromRangeKey !== null) {
    return unixToIso(fromRangeKey)
  }
  const fromWatchDate = toNumber(row.watch_date)
  if (fromWatchDate !== null) {
    return unixToIso(fromWatchDate)
  }
  return csvDateToIso(row.updated_at) ?? csvDateToIso(row.created_at)
}

function runtimeMinutesOf(row: CsvRow): number | null {
  const seconds = toNumber(row.runtime)
  return seconds === null ? null : Math.round(seconds / SECONDS_PER_MINUTE)
}

function movieRecordOf(row: CsvRow): MovieRecord | null {
  const uuid = row.uuid ?? ''
  const title = (row.movie_name ?? '').trim()
  if (uuid === '' || title === '') {
    return null
  }
  return {
    uuid,
    title,
    releaseYear: yearFromDate(row.release_date),
    runtimeMinutes: runtimeMinutesOf(row),
    alphaSlug: extractAlphaSlug(row.alpha_range_key),
  }
}

function parseEpisodeWatch(row: CsvRow): EpisodeWatchRecord | null {
  const tvdbSeriesId = toNumber(row.series_id)
  const sourceUuid = row.uuid ?? ''
  const watchedAt = watchDateOf(row)
  if (tvdbSeriesId === null || sourceUuid === '' || watchedAt === null) {
    return null
  }
  return {
    tvdbSeriesId,
    tvdbEpisodeId: toNumber(row.episode_id),
    seasonNumber: toNumber(row.season_number),
    episodeNumber: toNumber(row.episode_number),
    seriesName: row.series_name ?? '',
    watchedAt,
    isRewatch: false,
    sourceUuid,
    source: 'import-v1',
  }
}

export function parseTrackingV1(rows: readonly CsvRow[]): TrackingV1Data {
  const episodeWatches: EpisodeWatchRecord[] = []
  const movieWatches: MovieWatchRecord[] = []
  const watchlistMovies: WatchlistMovieRecord[] = []

  for (const row of rows) {
    if (row.type === 'watch' && row.entity_type === 'episode') {
      const record = parseEpisodeWatch(row)
      if (record) {
        episodeWatches.push(record)
      }
      continue
    }
    if (row.type === 'watch' && row.entity_type === 'movie') {
      const movie = movieRecordOf(row)
      const watchedAt = watchDateOf(row)
      if (movie && watchedAt) {
        movieWatches.push({ ...movie, watchedAt })
      }
      continue
    }
    if (row.type === 'towatch' && row.entity_type === 'movie') {
      const movie = movieRecordOf(row)
      const addedAt = csvDateToIso(row.created_at) ?? csvDateToIso(row.updated_at)
      if (movie && addedAt) {
        watchlistMovies.push({ ...movie, addedAt })
      }
    }
  }

  return { episodeWatches, movieWatches, watchlistMovies }
}
