import { describe, expect, it } from 'vitest'
import type { TmdbMovieSummary } from '../../shared/schemas/tmdb'
import {
  pickAutoMatch,
  scoreCandidates,
  topCandidates,
} from '../../server/services/import/matchMovies'

function summary(overrides: Partial<TmdbMovieSummary> & { id: number; title: string }): TmdbMovieSummary {
  return { original_title: null, release_date: null, ...overrides } as TmdbMovieSummary
}

describe('scoreCandidates / pickAutoMatch', () => {
  it('associe automatiquement un titre exact avec la bonne année', () => {
    const scored = scoreCandidates(
      ['Encanto'],
      2021,
      [
        summary({ id: 1, title: 'Encanto', release_date: '2021-11-24' }),
        summary({ id: 2, title: 'Encanto at the Hollywood Bowl', release_date: '2022-12-28' }),
      ],
    )
    expect(pickAutoMatch(scored)?.id).toBe(1)
  })

  it('associe via le titre original', () => {
    const scored = scoreCandidates(
      ['僕のヒーローアカデミア THE MOVIE', 'my hero academia the movie'],
      2021,
      [
        summary({
          id: 3,
          title: 'My Hero Academia : World Heroes’ Mission',
          original_title: '僕のヒーローアカデミア THE MOVIE',
          release_date: '2021-08-06',
        }),
      ],
    )
    expect(pickAutoMatch(scored)?.id).toBe(3)
  })

  it('tolère une année décalée d’un an au plus', () => {
    const offByOne = scoreCandidates(['Encanto'], 2022, [
      summary({ id: 1, title: 'Encanto', release_date: '2021-11-24' }),
    ])
    expect(pickAutoMatch(offByOne)?.id).toBe(1)

    const offByThree = scoreCandidates(['Encanto'], 2024, [
      summary({ id: 1, title: 'Encanto', release_date: '2021-11-24' }),
    ])
    expect(pickAutoMatch(offByThree)).toBeNull()
  })

  it('refuse d’associer deux candidats exacts ambigus', () => {
    const scored = scoreCandidates(['Fury'], null, [
      summary({ id: 1, title: 'Fury', release_date: '2014-10-15' }),
      summary({ id: 2, title: 'Fury', release_date: '1936-06-05' }),
    ])
    expect(pickAutoMatch(scored)).toBeNull()
  })

  it('associe un titre exact unique sans année', () => {
    const scored = scoreCandidates(['Barbie'], null, [
      summary({ id: 9, title: 'Barbie', release_date: '2023-07-19' }),
    ])
    expect(pickAutoMatch(scored)?.id).toBe(9)
  })

  it('classe les meilleurs candidats par score', () => {
    const scored = scoreCandidates(['Dune'], 2021, [
      summary({ id: 1, title: 'Dune, deuxième partie', release_date: '2024-02-28' }),
      summary({ id: 2, title: 'Dune', release_date: '2021-09-15' }),
    ])
    const top = topCandidates(scored)
    expect(top[0]?.tmdbId).toBe(2)
    expect(top).toHaveLength(2)
  })
})
