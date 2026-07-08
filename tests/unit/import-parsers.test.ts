import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildShowInputs } from '../../server/services/import/buildShowInputs'
import { parseCsv } from '../../server/services/import/csv'
import { csvDateToIso, extractUnixFromRangeKey, yearFromDate } from '../../server/services/import/dates'
import { mergeEpisodeWatches } from '../../server/services/import/mergeEpisodeWatches'
import {
  extractAlphaSlug,
  normalizeTitle,
  slugToQuery,
} from '../../server/services/import/normalizeTitle'
import { parseFollowedShows } from '../../server/services/import/parsers/parseFollowedShows'
import { parseTrackingV1 } from '../../server/services/import/parsers/parseTrackingV1'
import { parseTrackingV2 } from '../../server/services/import/parsers/parseTrackingV2'
import { parseUserShowData } from '../../server/services/import/parsers/parseUserShowData'

const fixture = (name: string) =>
  parseCsv(readFileSync(join('tests/fixtures/gdpr', name), 'utf8'))

describe('parseCsv', () => {
  it('renvoie un tableau vide pour un contenu vide', () => {
    expect(parseCsv('')).toEqual([])
  })

  it('indexe les lignes par nom de colonne', () => {
    expect(parseCsv('a,b\n1,2\n')).toEqual([{ a: '1', b: '2' }])
  })
})

describe('parseTrackingV2', () => {
  const watches = parseTrackingV2(fixture('tracking-prod-records-v2.csv'))

  it('extrait les visionnages et revisionnages, ignore les lignes user-series', () => {
    expect(watches).toHaveLength(4)
    expect(watches[0]).toMatchObject({
      tvdbSeriesId: 700001,
      tvdbEpisodeId: null,
      seasonNumber: 3,
      episodeNumber: 5,
      watchedAt: '2021-09-20T09:24:07.000Z',
      isRewatch: false,
      source: 'import-v2',
    })
    expect(watches[1]?.isRewatch).toBe(true)
  })

  it('utilise ep_id/s_no/ep_no en secours', () => {
    expect(watches[2]).toMatchObject({ tvdbEpisodeId: 990001, seasonNumber: 3, episodeNumber: 99 })
  })
})

describe('parseTrackingV1', () => {
  const data = parseTrackingV1(fixture('tracking-prod-records.csv'))

  it('extrait les visionnages d’épisodes avec la date du range key', () => {
    expect(data.episodeWatches).toHaveLength(1)
    expect(data.episodeWatches[0]).toMatchObject({
      tvdbSeriesId: 700001,
      tvdbEpisodeId: 880009,
      seasonNumber: 3,
      episodeNumber: 9,
      watchedAt: new Date(1624524048 * 1000).toISOString(),
      source: 'import-v1',
    })
  })

  it('extrait les films vus avec titre contenant une virgule, année et durée', () => {
    expect(data.movieWatches).toHaveLength(2)
    const un = data.movieWatches.find(movie => movie.title === 'Film Démo Un')
    expect(un).toMatchObject({ releaseYear: 2025, runtimeMinutes: 120, alphaSlug: 'film-demo-un' })
    const deux = data.movieWatches.find(movie => movie.title.includes('Deux'))
    expect(deux).toMatchObject({
      title: 'Film Démo, Deux',
      releaseYear: 2024,
      alphaSlug: 'film-demo-deux',
    })
  })

  it('extrait la watchlist (towatch) et ignore follow/rewatch_count', () => {
    expect(data.watchlistMovies).toHaveLength(1)
    expect(data.watchlistMovies[0]).toMatchObject({
      title: 'Film Démo Trois',
      addedAt: '2023-06-21T08:53:02.000Z',
    })
  })
})

describe('parseFollowedShows / parseUserShowData', () => {
  it('parse le suivi et l’archivage', () => {
    const followed = parseFollowedShows(fixture('followed_tv_show.csv'))
    expect(followed).toEqual([
      {
        tvdbId: 700001,
        name: 'Série Démo Alpha',
        isArchived: false,
        followedAt: '2015-07-20T20:06:33.000Z',
      },
      {
        tvdbId: 700002,
        name: 'Série Démo Beta',
        isArchived: true,
        followedAt: '2015-07-21T10:05:37.000Z',
      },
    ])
  })

  it('parse les favoris', () => {
    const data = parseUserShowData(fixture('user_tv_show_data.csv'))
    expect(data[0]).toMatchObject({ tvdbId: 700001, isFollowed: true, isFavorite: true })
    expect(data[1]).toMatchObject({ tvdbId: 700002, isFavorite: false })
  })
})

describe('mergeEpisodeWatches', () => {
  it('ajoute uniquement les épisodes v1 absents de v2', () => {
    const v2 = parseTrackingV2(fixture('tracking-prod-records-v2.csv'))
    const v1 = parseTrackingV1(fixture('tracking-prod-records.csv')).episodeWatches
    const merged = mergeEpisodeWatches(v2, v1)
    expect(merged).toHaveLength(5)

    const duplicated = mergeEpisodeWatches(v2, [{ ...v1[0]!, tvdbEpisodeId: 990001 }])
    expect(duplicated).toHaveLength(4)
  })
})

describe('buildShowInputs', () => {
  it('marque suivie une série qui a déjà des épisodes vus', () => {
    const rows = buildShowInputs(
      [
        {
          tvdbSeriesId: 123,
          tvdbEpisodeId: 456,
          seasonNumber: 1,
          episodeNumber: 1,
          seriesName: 'Série Déjà Vue',
          watchedAt: '2026-01-01T00:00:00.000Z',
          isRewatch: false,
          sourceUuid: 'watch-1',
          source: 'import-v2',
        },
      ],
      [],
      [],
    )

    expect(rows[0]?.input).toMatchObject({
      tvdbId: 123,
      name: 'Série Déjà Vue',
      isFollowed: true,
    })
  })
})

describe('normalizeTitle / slug helpers', () => {
  it('normalise accents, casse et ponctuation', () => {
    expect(normalizeTitle('Éléphant bleu !')).toBe('elephant bleu')
    expect(normalizeTitle('Démo : Test — Deux')).toBe('demo test deux')
  })

  it('extrait le slug après le dernier marqueur alpha-', () => {
    expect(extractAlphaSlug('watch-alpha-film-demo-un')).toBe('film-demo-un')
    expect(extractAlphaSlug('rewatch_count-alpha-watch-alpha-demo-deux')).toBe('demo-deux')
    expect(extractAlphaSlug('')).toBeNull()
  })

  it('convertit un slug en requête', () => {
    expect(slugToQuery('film-demo-un')).toBe('film demo un')
  })
})

describe('dates', () => {
  it('convertit les dates CSV en ISO et rejette les dates sentinelles', () => {
    expect(csvDateToIso('2026-06-25 23:34:27')).toBe('2026-06-25T23:34:27.000Z')
    expect(csvDateToIso('0001-01-01 00:00:00')).toBeNull()
    expect(csvDateToIso('')).toBeNull()
  })

  it('extrait le timestamp unix des range keys', () => {
    expect(extractUnixFromRangeKey('watch-date-1756236320')).toBe(1756236320)
    expect(extractUnixFromRangeKey('watch-alpha-film-demo-un')).toBeNull()
  })

  it('extrait l’année de sortie', () => {
    expect(yearFromDate('2025-06-25 00:00:00')).toBe(2025)
    expect(yearFromDate('0001-01-01 00:00:00')).toBeNull()
  })
})
