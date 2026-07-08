import { describe, expect, it } from 'vitest'
import { chunk } from '../../shared/utils/chunk'
import { nowIso, toIsoDate } from '../../shared/utils/time'
import { TMDB_IMAGE_SIZES, tmdbImageUrl } from '../../shared/utils/tmdbImages'

describe('chunk', () => {
  it('découpe un tableau en lots de taille fixe', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('renvoie un tableau vide pour une entrée vide', () => {
    expect(chunk([], 3)).toEqual([])
  })

  it('rejette une taille invalide', () => {
    expect(() => chunk([1], 0)).toThrow()
  })
})

describe('tmdbImageUrl', () => {
  it('construit l’URL complète', () => {
    expect(tmdbImageUrl('https://image.tmdb.org/t/p', TMDB_IMAGE_SIZES.poster, '/abc.jpg')).toBe(
      'https://image.tmdb.org/t/p/w342/abc.jpg',
    )
  })

  it('renvoie null sans chemin', () => {
    expect(tmdbImageUrl('https://image.tmdb.org/t/p', TMDB_IMAGE_SIZES.poster, null)).toBeNull()
    expect(tmdbImageUrl('https://image.tmdb.org/t/p', TMDB_IMAGE_SIZES.poster, undefined)).toBeNull()
  })
})

describe('time', () => {
  it('nowIso renvoie une date ISO-8601 UTC', () => {
    expect(nowIso()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('toIsoDate renvoie la date calendaire', () => {
    expect(toIsoDate(new Date('2026-07-02T15:30:00Z'))).toBe('2026-07-02')
  })
})
