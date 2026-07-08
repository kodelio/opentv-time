import type { z } from 'zod'
import {
  tmdbFindResultSchema,
  tmdbMovieDetailsSchema,
  tmdbMovieSearchSchema,
  tmdbSeasonSchema,
  tmdbTvDetailsSchema,
  tmdbTvSearchSchema,
  type TmdbFindResult,
  type TmdbMovieDetails,
  type TmdbMovieSummary,
  type TmdbSeason,
  type TmdbTvDetails,
  type TmdbTvSummary,
} from '../../../shared/schemas/tmdb'
import { chunk } from '../../../shared/utils/chunk'
import type { TmdbClient } from './client'
import { TmdbError } from './errors'

const SEASONS_PER_REQUEST = 20

function parseWith<T extends z.ZodType>(
  schema: T,
  raw: unknown,
  context: string,
): z.output<T> {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw new TmdbError(`Unexpected TMDB response for ${context}: ${parsed.error.message}`)
  }
  return parsed.data
}

export async function findByTvdbId(client: TmdbClient, tvdbId: number): Promise<TmdbFindResult> {
  const raw = await client.get(`/find/${tvdbId}`, { external_source: 'tvdb_id' })
  return parseWith(tmdbFindResultSchema, raw, `find (tvdb ${tvdbId})`)
}

export async function searchMovie(
  client: TmdbClient,
  query: string,
  year?: number,
): Promise<readonly TmdbMovieSummary[]> {
  const raw = await client.get('/search/movie', {
    query,
    year,
    region: client.config.region,
    include_adult: false,
  })
  return parseWith(tmdbMovieSearchSchema, raw, `search/movie "${query}"`).results
}

export async function searchTv(
  client: TmdbClient,
  query: string,
  year?: number,
): Promise<readonly TmdbTvSummary[]> {
  const raw = await client.get('/search/tv', {
    query,
    first_air_date_year: year,
    include_adult: false,
  })
  return parseWith(tmdbTvSearchSchema, raw, `search/tv "${query}"`).results
}

export async function getTvDetails(client: TmdbClient, tmdbId: number): Promise<TmdbTvDetails> {
  const raw = await client.get(`/tv/${tmdbId}`)
  return parseWith(tmdbTvDetailsSchema, raw, `tv ${tmdbId}`)
}

export async function getTvSeasons(
  client: TmdbClient,
  tmdbId: number,
  seasonNumbers: readonly number[],
): Promise<readonly TmdbSeason[]> {
  const batches = chunk(seasonNumbers, SEASONS_PER_REQUEST)
  const responses = await Promise.all(
    batches.map(batch =>
      client.get<Record<string, unknown>>(`/tv/${tmdbId}`, {
        append_to_response: batch.map(seasonNumber => `season/${seasonNumber}`).join(','),
      }),
    ),
  )
  return batches.flatMap((batch, batchIndex) =>
    batch.flatMap((seasonNumber) => {
      const raw = responses[batchIndex]?.[`season/${seasonNumber}`]
      if (raw === undefined || raw === null) {
        return []
      }
      return [parseWith(tmdbSeasonSchema, raw, `tv ${tmdbId} saison ${seasonNumber}`)]
    }),
  )
}

export async function getMovieDetails(
  client: TmdbClient,
  tmdbId: number,
): Promise<TmdbMovieDetails> {
  const raw = await client.get(`/movie/${tmdbId}`)
  return parseWith(tmdbMovieDetailsSchema, raw, `movie ${tmdbId}`)
}

export async function getTrendingMovies(
  client: TmdbClient,
  page = 1,
): Promise<readonly TmdbMovieSummary[]> {
  const raw = await client.get('/trending/movie/week', { page })
  return parseWith(tmdbMovieSearchSchema, raw, 'trending/movie').results
}

export async function getTrendingTv(
  client: TmdbClient,
  page = 1,
): Promise<readonly TmdbTvSummary[]> {
  const raw = await client.get('/trending/tv/week', { page })
  return parseWith(tmdbTvSearchSchema, raw, 'trending/tv').results
}
