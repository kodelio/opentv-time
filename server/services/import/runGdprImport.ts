import { eq } from 'drizzle-orm'
import { nowIso } from '../../../shared/utils/time'
import type { Db } from '../../db/createDb'
import { syncRuns } from '../../db/schema'
import type { TmdbClient } from '../../utils/tmdb/client'
import { buildShowInputs } from './buildShowInputs'
import { parseCsv } from './csv'
import { importEpisodeWatches } from './importEpisodeWatches'
import { importMovies, type ImportMoviesResult } from './importMovies'
import { importShows, type ImportShowsResult } from './importShows'
import { mapEpisodes } from './mapEpisodes'
import { mergeEpisodeWatches } from './mergeEpisodeWatches'
import { addPendingItem } from './pending'
import { parseFollowedShows } from './parsers/parseFollowedShows'
import { parseTrackingV1 } from './parsers/parseTrackingV1'
import { parseTrackingV2 } from './parsers/parseTrackingV2'
import { parseUserShowData } from './parsers/parseUserShowData'
import type { MovieSourceRow } from './types'

/**
 * Raw contents of the 4 CSV files from a TV Time GDPR export. A missing file is
 * provided as an empty string (0 rows). Original export filenames:
 *  - trackingV2   : tracking-prod-records-v2.csv
 *  - trackingV1   : tracking-prod-records.csv
 *  - followedShows: followed_tv_show.csv
 *  - userShowData : user_tv_show_data.csv
 */
export interface GdprImportFiles {
  readonly trackingV2: string
  readonly trackingV1: string
  readonly followedShows: string
  readonly userShowData: string
}

export interface GdprImportDeps {
  readonly db: Db
  readonly tmdb: TmdbClient
  readonly files: GdprImportFiles
  readonly log?: (message: string) => void
}

export interface GdprImportSummary {
  readonly shows: Pick<ImportShowsResult, 'imported' | 'alreadyPresent' | 'pending'>
  readonly episodes: {
    readonly totalWatches: number
    readonly mapped: number
    readonly unmatched: number
    readonly watchesInserted: number
  }
  readonly movies: Omit<ImportMoviesResult, 'errors'>
  readonly errors: readonly string[]
}

export async function runGdprImport(deps: GdprImportDeps): Promise<GdprImportSummary> {
  const { db, tmdb, files } = deps
  const log = deps.log ?? (() => {})
  const syncRun = db.insert(syncRuns).values({ kind: 'import' }).returning().get()

  log('Reading CSV files...')
  const v2Watches = parseTrackingV2(parseCsv(files.trackingV2))
  const v1Data = parseTrackingV1(parseCsv(files.trackingV1))
  const followedShows = parseFollowedShows(parseCsv(files.followedShows))
  const userShowData = parseUserShowData(parseCsv(files.userShowData))

  const allEpisodeWatches = mergeEpisodeWatches(v2Watches, v1Data.episodeWatches)
  log(
    `Episode watches: ${allEpisodeWatches.length} (v2: ${v2Watches.length}) · ` +
      `watched movies: ${v1Data.movieWatches.length} · watchlist: ${v1Data.watchlistMovies.length}`,
  )

  const showRows = buildShowInputs(allEpisodeWatches, followedShows, userShowData)
  log(`Importing ${showRows.length} shows from TMDB...`)
  const showsResult = await importShows(db, tmdb, showRows, log)

  log('Matching episodes...')
  const mapResult = await mapEpisodes(db, tmdb, allEpisodeWatches, showsResult.showIdByTvdbId, log)
  const watchesInserted = importEpisodeWatches(db, mapResult.mapped)
  for (const [tvdbSeriesId, records] of mapResult.unmatchedByShow) {
    const seriesName = records[0]?.seriesName || `TVDB show ${tvdbSeriesId}`
    addPendingItem(db, {
      kind: 'episode',
      dedupeKey: `episodes:${tvdbSeriesId}`,
      rawTitle: `${seriesName} - ${records.length} unmatched episode(s)`,
      sourceRows: records,
    })
  }

  const movieRows: readonly MovieSourceRow[] = [
    ...v1Data.movieWatches.map(record => ({ type: 'watch', record }) as const),
    ...v1Data.watchlistMovies.map(record => ({ type: 'watchlist', record }) as const),
  ]
  log(`Importing ${movieRows.length} movies from TMDB...`)
  const moviesResult = await importMovies(db, tmdb, movieRows, log)

  const errors = [...showsResult.errors, ...moviesResult.errors]
  db.update(syncRuns)
    .set({
      finishedAt: nowIso(),
      showsRefreshed: showsResult.imported + showsResult.alreadyPresent,
      errors,
    })
    .where(eq(syncRuns.id, syncRun.id))
    .run()

  const unmatchedCount = [...mapResult.unmatchedByShow.values()].reduce(
    (total, records) => total + records.length,
    0,
  )
  return {
    shows: {
      imported: showsResult.imported,
      alreadyPresent: showsResult.alreadyPresent,
      pending: showsResult.pending,
    },
    episodes: {
      totalWatches: allEpisodeWatches.length,
      mapped: mapResult.mapped.length,
      unmatched: unmatchedCount,
      watchesInserted,
    },
    movies: {
      matched: moviesResult.matched,
      pending: moviesResult.pending,
      skipped: moviesResult.skipped,
      watchesInserted: moviesResult.watchesInserted,
      watchlistInserted: moviesResult.watchlistInserted,
    },
    errors,
  }
}
