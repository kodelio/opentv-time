import { describe, expect, it } from 'vitest'
import { matchesQuery } from '../../app/utils/textSearch'

describe('matchesQuery', () => {
  it('accepte tout quand la requête est vide ou blanche', () => {
    expect(matchesQuery('Breaking Bad', '')).toBe(true)
    expect(matchesQuery('Breaking Bad', '   ')).toBe(true)
  })

  it('ignore la casse', () => {
    expect(matchesQuery('Breaking Bad', 'breaking')).toBe(true)
    expect(matchesQuery('breaking bad', 'BAD')).toBe(true)
  })

  it('ignore les accents dans le texte et la requête', () => {
    expect(matchesQuery('Éternelle', 'eter')).toBe(true)
    expect(matchesQuery('Le Bureau des Légendes', 'legendes')).toBe(true)
    expect(matchesQuery('Peaky Blinders', 'péaky')).toBe(true)
  })

  it('cherche une sous-chaîne n’importe où dans le titre', () => {
    expect(matchesQuery('The Last of Us', 'last')).toBe(true)
    expect(matchesQuery('The Last of Us', 'of us')).toBe(true)
  })

  it('rejette un titre qui ne contient pas la requête', () => {
    expect(matchesQuery('Severance', 'dark')).toBe(false)
  })

  it('ignore les espaces superflus autour de la requête', () => {
    expect(matchesQuery('Dark', '  dark  ')).toBe(true)
  })
})
