import type { TmdbClient, TmdbQuery } from '../../server/utils/tmdb/client'
import { TmdbNotFoundError } from '../../server/utils/tmdb/errors'

export type FakeRoute = unknown | ((query: TmdbQuery | undefined) => unknown)

export function fakeTmdb(routes: Readonly<Record<string, FakeRoute>>): TmdbClient {
  return {
    config: {
      apiKey: 'test',
      baseUrl: 'https://fake.test/3',
      language: 'fr-FR',
      region: 'FR',
      maxConcurrency: 4,
    },
    get: async <T>(path: string, query?: TmdbQuery): Promise<T> => {
      const route = routes[path]
      if (route === undefined) {
        throw new TmdbNotFoundError(`Route factice absente : ${path}`)
      }
      const value = typeof route === 'function' ? (route as (q?: TmdbQuery) => unknown)(query) : route
      return value as T
    },
  }
}
