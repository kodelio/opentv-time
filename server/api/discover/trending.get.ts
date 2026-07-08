import { z } from 'zod'
import { useDb } from '../../db/client'
import {
  enrichMovieItems,
  enrichShowItems,
  type DiscoverMediaItem,
} from '../../services/discover/enrichMediaItems'
import { getTrendingMovies, getTrendingTv } from '../../utils/tmdb/endpoints'
import { toTmdbHttpError } from '../../utils/tmdb/toTmdbHttpError'
import { usePreferredTmdb } from '../../utils/tmdb/usePreferredTmdb'

const querySchema = z.object({
  type: z.enum(['movie', 'tv']),
  page: z.coerce.number().int().min(1).max(100).default(1),
})

const TMDB_PAGES_PER_REQUEST = 3
const TMDB_PAGE_SIZE = 20

function tmdbPagesFor(page: number): readonly number[] {
  return Array.from(
    { length: TMDB_PAGES_PER_REQUEST },
    (_, index) => (page - 1) * TMDB_PAGES_PER_REQUEST + index + 1,
  )
}

function dedupeByTmdbId(items: readonly DiscoverMediaItem[]): readonly DiscoverMediaItem[] {
  const seen = new Set<number>()
  return items.filter((item) => {
    if (seen.has(item.tmdbId)) {
      return false
    }
    seen.add(item.tmdbId)
    return true
  })
}

export default defineEventHandler(async (event) => {
  const { type, page } = await getValidatedQuery(event, querySchema.parse)
  const db = useDb()
  const tmdb = usePreferredTmdb(db)
  try {
    if (type === 'movie') {
      const pages = await Promise.all(
        tmdbPagesFor(page).map(tmdbPage => getTrendingMovies(tmdb, tmdbPage)),
      )
      const items = dedupeByTmdbId(
        pages.flat().map(result => ({
          tmdbId: result.id,
          title: result.title,
          releaseDate: result.release_date,
          posterPath: result.poster_path ?? null,
          overview: result.overview ?? null,
        })),
      )
      return {
        items: enrichMovieItems(db, items),
        hasMore: (pages.at(-1)?.length ?? 0) === TMDB_PAGE_SIZE,
      }
    }
    const pages = await Promise.all(
      tmdbPagesFor(page).map(tmdbPage => getTrendingTv(tmdb, tmdbPage)),
    )
    const items = dedupeByTmdbId(
      pages.flat().map(result => ({
        tmdbId: result.id,
        title: result.name,
        releaseDate: result.first_air_date,
        posterPath: result.poster_path ?? null,
        overview: result.overview ?? null,
      })),
    )
    return {
      items: enrichShowItems(db, items),
      hasMore: (pages.at(-1)?.length ?? 0) === TMDB_PAGE_SIZE,
    }
  } catch (error) {
    toTmdbHttpError(error)
  }
})
