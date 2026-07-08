import { toNumber, type CsvRow } from '../csv'
import { csvDateToIso } from '../dates'
import type { EpisodeWatchRecord } from '../types'

const WATCH_KEY_PREFIX = 'watch-episode-'
const REWATCH_KEY_PREFIX = 'rewatch-episode-'

export function parseTrackingV2(rows: readonly CsvRow[]): readonly EpisodeWatchRecord[] {
  return rows.flatMap((row) => {
    const key = row.key ?? ''
    const isWatch = key.startsWith(WATCH_KEY_PREFIX)
    const isRewatch = key.startsWith(REWATCH_KEY_PREFIX)
    if (!isWatch && !isRewatch) {
      return []
    }
    const tvdbSeriesId = toNumber(row.s_id)
    const watchedAt = csvDateToIso(row.created_at) ?? csvDateToIso(row.updated_at)
    if (tvdbSeriesId === null || watchedAt === null) {
      return []
    }
    return [
      {
        tvdbSeriesId,
        tvdbEpisodeId: toNumber(row.episode_id) ?? toNumber(row.ep_id),
        seasonNumber: toNumber(row.season_number) ?? toNumber(row.s_no),
        episodeNumber: toNumber(row.episode_number) ?? toNumber(row.ep_no),
        seriesName: row.series_name ?? '',
        watchedAt,
        isRewatch,
        sourceUuid: key,
        source: 'import-v2',
      } satisfies EpisodeWatchRecord,
    ]
  })
}
