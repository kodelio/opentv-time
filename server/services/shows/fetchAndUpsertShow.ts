import type { Db } from '../../db/createDb'
import type { TmdbClient } from '../../utils/tmdb/client'
import { getTvDetails, getTvSeasons } from '../../utils/tmdb/endpoints'
import { upsertShowFromTmdb } from './upsertShowFromTmdb'

export async function fetchAndUpsertShow(
  db: Db,
  tmdb: TmdbClient,
  tmdbId: number,
  tvdbId: number | null = null,
): Promise<number> {
  const details = await getTvDetails(tmdb, tmdbId)
  const seasonsData = await getTvSeasons(
    tmdb,
    tmdbId,
    details.seasons.map(season => season.season_number),
  )
  return upsertShowFromTmdb(db, details, seasonsData, tvdbId)
}
