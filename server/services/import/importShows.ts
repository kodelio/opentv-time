import { eq } from 'drizzle-orm'
import pLimit from 'p-limit'
import type { Db } from '../../db/createDb'
import { shows, type ImportCandidate } from '../../db/schema'
import type { TmdbClient } from '../../utils/tmdb/client'
import { findByTvdbId, getTvDetails, getTvSeasons, searchTv } from '../../utils/tmdb/endpoints'
import { upsertShowFromTmdb } from '../shows/upsertShowFromTmdb'
import { upsertShowState } from '../shows/upsertShowState'
import { addPendingItem } from './pending'
import type { ShowSourceRow } from './types'

export interface ImportShowsResult {
  readonly showIdByTvdbId: ReadonlyMap<number, number>
  readonly imported: number
  readonly alreadyPresent: number
  readonly pending: number
  readonly errors: readonly string[]
}

const SHOW_IMPORT_CONCURRENCY = 4

function tvCandidatesOf(results: Awaited<ReturnType<typeof searchTv>>): readonly ImportCandidate[] {
  return results.slice(0, 5).map((result, index) => ({
    tmdbId: result.id,
    title: result.name,
    originalTitle: result.original_name ?? undefined,
    releaseDate: result.first_air_date ?? undefined,
    posterPath: result.poster_path ?? undefined,
    overview: result.overview ?? undefined,
    score: results.length - index,
  }))
}

async function importOneShow(
  db: Db,
  tmdb: TmdbClient,
  row: ShowSourceRow,
): Promise<{ kind: 'imported' | 'present' | 'pending'; showId?: number }> {
  const existing = db
    .select({ id: shows.id })
    .from(shows)
    .where(eq(shows.tvdbId, row.input.tvdbId))
    .get()
  if (existing) {
    upsertShowState(db, existing.id, row.input)
    return { kind: 'present', showId: existing.id }
  }

  const found = await findByTvdbId(tmdb, row.input.tvdbId)
  const summary = found.tv_results[0]
  if (!summary) {
    const candidates = row.input.name ? await searchTv(tmdb, row.input.name) : []
    addPendingItem(db, {
      kind: 'show',
      dedupeKey: `show:${row.input.tvdbId}`,
      rawTitle: row.input.name || `TVDB show ${row.input.tvdbId}`,
      sourceRows: [row],
      candidates: tvCandidatesOf(candidates),
    })
    return { kind: 'pending' }
  }

  const details = await getTvDetails(tmdb, summary.id)
  const seasonsData = await getTvSeasons(
    tmdb,
    summary.id,
    details.seasons.map(season => season.season_number),
  )
  const showId = upsertShowFromTmdb(db, details, seasonsData, row.input.tvdbId)
  upsertShowState(db, showId, row.input)
  return { kind: 'imported', showId }
}

export async function importShows(
  db: Db,
  tmdb: TmdbClient,
  rows: readonly ShowSourceRow[],
  log?: (message: string) => void,
): Promise<ImportShowsResult> {
  const limit = pLimit(SHOW_IMPORT_CONCURRENCY)
  const showIdByTvdbId = new Map<number, number>()
  const errors: string[] = []
  let imported = 0
  let alreadyPresent = 0
  let pending = 0
  let processed = 0

  await Promise.all(
    rows.map(row =>
      limit(async () => {
        try {
          const result = await importOneShow(db, tmdb, row)
          if (result.showId !== undefined) {
            showIdByTvdbId.set(row.input.tvdbId, result.showId)
          }
          if (result.kind === 'imported') imported += 1
          if (result.kind === 'present') alreadyPresent += 1
          if (result.kind === 'pending') pending += 1
        } catch (error) {
          errors.push(`Show "${row.input.name}" (tvdb ${row.input.tvdbId}): ${String(error)}`)
        }
        processed += 1
        if (processed % 25 === 0) {
          log?.(`Shows processed: ${processed}/${rows.length}`)
        }
      }),
    ),
  )

  return { showIdByTvdbId, imported, alreadyPresent, pending, errors }
}
