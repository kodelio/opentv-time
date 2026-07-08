import { eq } from 'drizzle-orm'
import { nowIso } from '../../../shared/utils/time'
import type { Db } from '../../db/createDb'
import { importPending } from '../../db/schema'
import type { TmdbClient } from '../../utils/tmdb/client'
import { getMovieDetails, getTvDetails, getTvSeasons } from '../../utils/tmdb/endpoints'
import { upsertMovieFromTmdb } from '../movies/upsertMovieFromTmdb'
import { upsertShowFromTmdb } from '../shows/upsertShowFromTmdb'
import { upsertShowState } from '../shows/upsertShowState'
import { importEpisodeWatches } from './importEpisodeWatches'
import { insertMovieSourceRow } from './importMovies'
import { mapEpisodes } from './mapEpisodes'
import { addPendingItem } from './pending'
import { movieSourceRowSchema, showSourceRowSchema } from './sourceRowSchemas'

export class PendingResolutionError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message)
    this.name = 'PendingResolutionError'
  }
}

type PendingItem = typeof importPending.$inferSelect

function getPendingItem(db: Db, itemId: number): PendingItem {
  const item = db.select().from(importPending).where(eq(importPending.id, itemId)).get()
  if (!item) {
    throw new PendingResolutionError('Pending item not found', 404)
  }
  if (item.status !== 'pending') {
    throw new PendingResolutionError('This item has already been processed', 409)
  }
  return item
}

function markResolved(db: Db, itemId: number, tmdbId: number): void {
  db.update(importPending)
    .set({ status: 'resolved', resolvedTmdbId: tmdbId, resolvedAt: nowIso() })
    .where(eq(importPending.id, itemId))
    .run()
}

async function resolveMovie(db: Db, tmdb: TmdbClient, item: PendingItem, tmdbId: number) {
  const details = await getMovieDetails(tmdb, tmdbId)
  const movieId = upsertMovieFromTmdb(db, details)
  for (const raw of item.sourceRows) {
    const row = movieSourceRowSchema.parse(raw)
    insertMovieSourceRow(db, movieId, row)
  }
}

async function resolveShow(db: Db, tmdb: TmdbClient, item: PendingItem, tmdbId: number) {
  const raw = item.sourceRows[0]
  const sourceRow = showSourceRowSchema.parse(raw)
  const details = await getTvDetails(tmdb, tmdbId)
  const seasonsData = await getTvSeasons(
    tmdb,
    tmdbId,
    details.seasons.map(season => season.season_number),
  )
  const showId = upsertShowFromTmdb(db, details, seasonsData, sourceRow.input.tvdbId)
  upsertShowState(db, showId, sourceRow.input)

  const mapResult = await mapEpisodes(
    db,
    tmdb,
    sourceRow.watches,
    new Map([[sourceRow.input.tvdbId, showId]]),
  )
  importEpisodeWatches(db, mapResult.mapped)
  for (const [tvdbSeriesId, records] of mapResult.unmatchedByShow) {
    addPendingItem(db, {
      kind: 'episode',
      dedupeKey: `episodes:${tvdbSeriesId}`,
      rawTitle: `${sourceRow.input.name} - ${records.length} unmatched episode(s)`,
      sourceRows: records,
    })
  }
}

export async function resolvePendingItem(
  db: Db,
  tmdb: TmdbClient,
  itemId: number,
  tmdbId: number,
): Promise<void> {
  const item = getPendingItem(db, itemId)
  if (item.kind === 'movie') {
    await resolveMovie(db, tmdb, item, tmdbId)
  } else if (item.kind === 'show') {
    await resolveShow(db, tmdb, item, tmdbId)
  } else {
    throw new PendingResolutionError(
      'Unmatched episodes cannot be resolved manually: ignore this item.',
    )
  }
  markResolved(db, itemId, tmdbId)
}

export function ignorePendingItem(db: Db, itemId: number): void {
  getPendingItem(db, itemId)
  db.update(importPending)
    .set({ status: 'ignored', resolvedAt: nowIso() })
    .where(eq(importPending.id, itemId))
    .run()
}
