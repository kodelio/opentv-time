import { eq } from 'drizzle-orm'
import pLimit from 'p-limit'
import type { TmdbMovieSummary } from '../../../shared/schemas/tmdb'
import type { Db } from '../../db/createDb'
import { importPending, movieWatches, watchlistItems } from '../../db/schema'
import type { TmdbClient } from '../../utils/tmdb/client'
import { getMovieDetails, searchMovie } from '../../utils/tmdb/endpoints'
import { upsertMovieFromTmdb } from '../movies/upsertMovieFromTmdb'
import { normalizeTitle, slugToQuery } from './normalizeTitle'
import { pickAutoMatch, scoreCandidates, topCandidates } from './matchMovies'
import { addPendingItem } from './pending'
import type { MovieRecord, MovieSourceRow } from './types'

export interface ImportMoviesResult {
  readonly matched: number
  readonly pending: number
  readonly skipped: number
  readonly watchesInserted: number
  readonly watchlistInserted: number
  readonly errors: readonly string[]
}

const MOVIE_IMPORT_CONCURRENCY = 4

interface MovieMatch {
  readonly summary: TmdbMovieSummary | null
  readonly bestCandidates: ReturnType<typeof topCandidates>
}

async function matchOneMovie(tmdb: TmdbClient, record: MovieRecord): Promise<MovieMatch> {
  const titles = [record.title]
  if (record.alphaSlug) {
    const slugQuery = slugToQuery(record.alphaSlug)
    if (normalizeTitle(slugQuery) !== normalizeTitle(record.title)) {
      titles.push(slugQuery)
    }
  }

  let allScored = scoreCandidates(
    titles,
    record.releaseYear,
    await searchMovie(tmdb, record.title, record.releaseYear ?? undefined),
  )
  let match = pickAutoMatch(allScored)

  if (!match && record.releaseYear !== null) {
    const scored = scoreCandidates(titles, record.releaseYear, await searchMovie(tmdb, record.title))
    allScored = allScored.length > 0 ? allScored : scored
    match = pickAutoMatch(scored)
  }

  if (!match && titles.length > 1) {
    const scored = scoreCandidates(
      titles,
      record.releaseYear,
      await searchMovie(tmdb, titles[1]!, record.releaseYear ?? undefined),
    )
    allScored = allScored.length > 0 ? allScored : scored
    match = pickAutoMatch(scored)
  }

  return { summary: match, bestCandidates: topCandidates(allScored) }
}

export function insertMovieSourceRow(db: Db, movieId: number, row: MovieSourceRow): { watch: number; watchlist: number } {
  if (row.type === 'watch') {
    const result = db
      .insert(movieWatches)
      .values({
        movieId,
        watchedAt: row.record.watchedAt,
        source: 'import-v1',
        sourceUuid: row.record.uuid,
      })
      .onConflictDoNothing()
      .run()
    return { watch: result.changes, watchlist: 0 }
  }
  const result = db
    .insert(watchlistItems)
    .values({ mediaType: 'movie', movieId, addedAt: row.record.addedAt })
    .onConflictDoNothing()
    .run()
  return { watch: 0, watchlist: result.changes }
}

function alreadyHandled(db: Db, row: MovieSourceRow): boolean {
  const dedupeKey = `movie:${row.record.uuid}`
  const pendingRow = db
    .select({ id: importPending.id })
    .from(importPending)
    .where(eq(importPending.dedupeKey, dedupeKey))
    .get()
  if (pendingRow) {
    return true
  }
  if (row.type === 'watch') {
    const existing = db
      .select({ id: movieWatches.id })
      .from(movieWatches)
      .where(eq(movieWatches.sourceUuid, row.record.uuid))
      .get()
    return existing !== undefined
  }
  return false
}

export async function importMovies(
  db: Db,
  tmdb: TmdbClient,
  rows: readonly MovieSourceRow[],
  log?: (message: string) => void,
): Promise<ImportMoviesResult> {
  const limit = pLimit(MOVIE_IMPORT_CONCURRENCY)
  const errors: string[] = []
  let matched = 0
  let pending = 0
  let skipped = 0
  let watchesInserted = 0
  let watchlistInserted = 0
  let processed = 0

  await Promise.all(
    rows.map(row =>
      limit(async () => {
        try {
          if (alreadyHandled(db, row)) {
            skipped += 1
            return
          }
          const { summary, bestCandidates } = await matchOneMovie(tmdb, row.record)
          if (summary) {
            const details = await getMovieDetails(tmdb, summary.id)
            const movieId = upsertMovieFromTmdb(db, details)
            const inserted = insertMovieSourceRow(db, movieId, row)
            watchesInserted += inserted.watch
            watchlistInserted += inserted.watchlist
            matched += 1
          } else {
            addPendingItem(db, {
              kind: 'movie',
              dedupeKey: `movie:${row.record.uuid}`,
              rawTitle: row.record.title,
              releaseYear: row.record.releaseYear,
              runtime: row.record.runtimeMinutes,
              sourceRows: [row],
              candidates: bestCandidates,
            })
            pending += 1
          }
        } catch (error) {
          errors.push(`Movie "${row.record.title}": ${String(error)}`)
        }
        processed += 1
        if (processed % 50 === 0) {
          log?.(`Movies processed: ${processed}/${rows.length}`)
        }
      }),
    ),
  )

  return { matched, pending, skipped, watchesInserted, watchlistInserted, errors }
}
