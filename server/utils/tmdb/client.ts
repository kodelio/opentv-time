import { $fetch, FetchError, type $Fetch } from 'ofetch'
import pLimit from 'p-limit'
import { TmdbError, TmdbNotFoundError, TmdbRateLimitError } from './errors'

export interface TmdbClientConfig {
  readonly apiKey: string
  readonly baseUrl: string
  readonly language: string
  readonly region: string
  readonly maxConcurrency: number
}

export type TmdbQuery = Record<string, string | number | boolean | undefined>

export interface TmdbClient {
  readonly config: TmdbClientConfig
  get: <T = unknown>(path: string, query?: TmdbQuery) => Promise<T>
}

const MAX_ATTEMPTS = 4
const BASE_RETRY_DELAY_MS = 500

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function retryDelayMs(error: FetchError, attempt: number): number {
  const retryAfter = Number(error.response?.headers.get('retry-after'))
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return retryAfter * 1000
  }
  return BASE_RETRY_DELAY_MS * 2 ** (attempt - 1)
}

export function createTmdbClient(config: TmdbClientConfig, fetcher: $Fetch = $fetch): TmdbClient {
  const limit = pLimit(config.maxConcurrency)

  async function request<T>(path: string, query: TmdbQuery = {}): Promise<T> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        return await fetcher<T>(path, {
          baseURL: config.baseUrl,
          headers: { Authorization: `Bearer ${config.apiKey}` },
          query: { language: config.language, ...query },
        })
      } catch (error) {
        if (!(error instanceof FetchError)) {
          throw new TmdbError(`TMDB request "${path}" failed: ${String(error)}`)
        }
        const status = error.response?.status
        if (status === 404) {
          throw new TmdbNotFoundError(`TMDB resource not found: ${path}`)
        }
        const retryable = status === 429 || (status !== undefined && status >= 500)
        if (retryable && attempt < MAX_ATTEMPTS) {
          await wait(retryDelayMs(error, attempt))
          continue
        }
        if (status === 429) {
          throw new TmdbRateLimitError()
        }
        throw new TmdbError(`TMDB error on "${path}" (HTTP ${status ?? '?'})`, status)
      }
    }
    throw new TmdbError(`TMDB error on "${path}": attempts exhausted`)
  }

  return {
    config,
    get: (path, query) => limit(() => request(path, query)),
  }
}
