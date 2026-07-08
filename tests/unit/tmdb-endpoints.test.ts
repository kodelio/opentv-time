import { describe, expect, it, vi } from 'vitest'
import type { TmdbClient } from '../../server/utils/tmdb/client'
import {
  findByTvdbId,
  getTrendingMovies,
  getTrendingTv,
  getTvSeasons,
  searchMovie,
  searchTv,
} from '../../server/utils/tmdb/endpoints'
import { TmdbError } from '../../server/utils/tmdb/errors'

function fakeClient(responses: Record<string, unknown> | ((path: string) => unknown)): TmdbClient {
  const get = vi.fn(async (path: string) =>
    typeof responses === 'function' ? responses(path) : responses[path],
  )
  return {
    config: {
      apiKey: 'k',
      baseUrl: 'https://api.example.test/3',
      language: 'fr-FR',
      region: 'FR',
      maxConcurrency: 4,
    },
    get: get as TmdbClient['get'],
  }
}

describe('findByTvdbId', () => {
  it('parse les résultats séries et épisodes', async () => {
    const client = fakeClient({
      '/find/70851': {
        tv_results: [{ id: 5544, name: 'Stargate Atlantis', first_air_date: '2004-07-16' }],
        tv_episode_results: [],
      },
    })

    const result = await findByTvdbId(client, 70851)

    expect(result.tv_results[0]?.id).toBe(5544)
    expect(result.movie_results).toEqual([])
    expect(client.get).toHaveBeenCalledWith('/find/70851', { external_source: 'tvdb_id' })
  })

  it('lève TmdbError sur une réponse invalide', async () => {
    const client = fakeClient({ '/find/1': { tv_results: 'pas-un-tableau' } })

    await expect(findByTvdbId(client, 1)).rejects.toBeInstanceOf(TmdbError)
  })
})

describe('searchMovie', () => {
  it('passe l’année et la région et renvoie les résultats', async () => {
    const client = fakeClient({
      '/search/movie': {
        page: 1,
        results: [{ id: 361743, title: 'Top Gun : Maverick', release_date: '2022-05-25' }],
      },
    })

    const results = await searchMovie(client, 'Top Gun Maverick', 2022)

    expect(results[0]?.id).toBe(361743)
    expect(client.get).toHaveBeenCalledWith('/search/movie', {
      query: 'Top Gun Maverick',
      year: 2022,
      region: 'FR',
      include_adult: false,
    })
  })
})

describe('searchTv', () => {
  it('passe first_air_date_year', async () => {
    const client = fakeClient({ '/search/tv': { results: [] } })

    await searchTv(client, 'Succession', 2018)

    expect(client.get).toHaveBeenCalledWith('/search/tv', {
      query: 'Succession',
      first_air_date_year: 2018,
      include_adult: false,
    })
  })
})

describe('getTrendingMovies / getTrendingTv', () => {
  it('demande la première page par défaut', async () => {
    const client = fakeClient({ '/trending/movie/week': { results: [] } })

    await getTrendingMovies(client)

    expect(client.get).toHaveBeenCalledWith('/trending/movie/week', { page: 1 })
  })

  it('transmet la page demandée', async () => {
    const client = fakeClient({ '/trending/tv/week': { results: [] } })

    await getTrendingTv(client, 4)

    expect(client.get).toHaveBeenCalledWith('/trending/tv/week', { page: 4 })
  })

  it('parse les résultats de tendances séries', async () => {
    const client = fakeClient({
      '/trending/tv/week': {
        results: [{ id: 999, name: 'Tendance', first_air_date: '2026-01-01' }],
      },
    })

    const results = await getTrendingTv(client)

    expect(results[0]?.id).toBe(999)
  })
})

describe('getTvSeasons', () => {
  it('découpe les saisons en lots de 20 et extrait chaque clé season/N', async () => {
    const seasonNumbers = Array.from({ length: 25 }, (_, index) => index + 1)
    const client = fakeClient(() =>
      Object.fromEntries(
        seasonNumbers.map(n => [
          `season/${n}`,
          { season_number: n, episodes: [{ id: n * 10, season_number: n, episode_number: 1 }] },
        ]),
      ),
    )

    const seasons = await getTvSeasons(client, 999, seasonNumbers)

    expect(client.get).toHaveBeenCalledTimes(2)
    expect(seasons).toHaveLength(25)
    expect(seasons[0]?.episodes[0]?.id).toBe(10)
  })

  it('ignore les saisons absentes de la réponse', async () => {
    const client = fakeClient({
      '/tv/7': { 'season/1': { season_number: 1, episodes: [] } },
    })

    const seasons = await getTvSeasons(client, 7, [1, 2])

    expect(seasons).toHaveLength(1)
    expect(seasons[0]?.season_number).toBe(1)
  })
})
