import { createError } from '#imports'
import { TmdbError } from './errors'

const UNAUTHORIZED = 401

export function toTmdbHttpError(error: unknown): never {
  if (error instanceof TmdbError) {
    if (error.statusCode === UNAUTHORIZED) {
      throw createError({
        statusCode: 503,
        message: 'Missing or invalid TMDB API key (NUXT_TMDB_API_KEY)',
      })
    }
    throw createError({ statusCode: 502, message: error.message })
  }
  console.error('Unexpected TMDB error:', error)
  throw createError({ statusCode: 500, message: 'Internal error' })
}
