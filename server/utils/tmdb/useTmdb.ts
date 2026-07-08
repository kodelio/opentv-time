import { useRuntimeConfig } from '#imports'
import { createTmdbClient, type TmdbClient } from './client'

export interface UseTmdbOptions {
  readonly language?: string
  readonly region?: string
}

const instances = new Map<string, TmdbClient>()

export function useTmdb(options: UseTmdbOptions = {}): TmdbClient {
  const config = useRuntimeConfig()
  const language = options.language ?? config.tmdb.language
  const region = options.region ?? config.tmdb.region
  const key = `${language}:${region}`
  let instance = instances.get(key)
  if (!instance) {
    instance = createTmdbClient({
      apiKey: config.tmdbApiKey,
      baseUrl: config.tmdb.baseUrl,
      language,
      region,
      maxConcurrency: config.tmdb.maxConcurrency,
    })
    instances.set(key, instance)
  }
  return instance
}
