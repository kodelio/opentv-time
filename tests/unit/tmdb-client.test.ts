import { FetchError, type $Fetch } from 'ofetch'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTmdbClient, type TmdbClientConfig } from '../../server/utils/tmdb/client'
import { TmdbError, TmdbNotFoundError } from '../../server/utils/tmdb/errors'

const config: TmdbClientConfig = {
  apiKey: 'test-key',
  baseUrl: 'https://api.example.test/3',
  language: 'fr-FR',
  region: 'FR',
  maxConcurrency: 4,
}

function fetchErrorWithStatus(status: number): FetchError {
  const error = new FetchError(`HTTP ${status}`)
  Object.defineProperty(error, 'response', {
    value: new Response(null, { status }),
  })
  return error
}

describe('createTmdbClient', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('envoie le jeton et la langue sur chaque requête', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true }) as unknown as $Fetch
    const client = createTmdbClient(config, fetcher)

    const result = await client.get('/find/123', { external_source: 'tvdb_id' })

    expect(result).toEqual({ ok: true })
    expect(fetcher).toHaveBeenCalledWith('/find/123', {
      baseURL: config.baseUrl,
      headers: { Authorization: 'Bearer test-key' },
      query: { language: 'fr-FR', external_source: 'tvdb_id' },
    })
  })

  it('lève TmdbNotFoundError sur un 404 sans réessayer', async () => {
    const fetcher = vi.fn().mockRejectedValue(fetchErrorWithStatus(404)) as unknown as $Fetch
    const client = createTmdbClient(config, fetcher)

    await expect(client.get('/movie/1')).rejects.toBeInstanceOf(TmdbNotFoundError)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('réessaie après un 429 puis réussit', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(fetchErrorWithStatus(429))
      .mockResolvedValueOnce({ ok: true }) as unknown as $Fetch
    const client = createTmdbClient(config, fetcher)

    const promise = client.get('/movie/1')
    await vi.advanceTimersByTimeAsync(1_000)

    expect(await promise).toEqual({ ok: true })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('lève TmdbError après épuisement des tentatives sur 500', async () => {
    const fetcher = vi.fn().mockRejectedValue(fetchErrorWithStatus(500)) as unknown as $Fetch
    const client = createTmdbClient(config, fetcher)

    const promise = client.get('/tv/42')
    const assertion = expect(promise).rejects.toBeInstanceOf(TmdbError)
    await vi.advanceTimersByTimeAsync(10_000)

    await assertion
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('ne réessaie pas les erreurs client (400)', async () => {
    const fetcher = vi.fn().mockRejectedValue(fetchErrorWithStatus(400)) as unknown as $Fetch
    const client = createTmdbClient(config, fetcher)

    await expect(client.get('/search/movie')).rejects.toBeInstanceOf(TmdbError)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
