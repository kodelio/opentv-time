import { describe, expect, it } from 'vitest'
import { groupShows } from '../../app/utils/libraryGroups'

interface FakeShow {
  readonly name: string
  readonly watched: number
  readonly aired: number
  readonly lastWatchedAt: string | null
  readonly followedAt: string | null
}

function show(
  name: string,
  watched: number,
  aired: number,
  lastWatchedAt: string | null = null,
  followedAt: string | null = null,
): FakeShow {
  return { name, watched, aired, lastWatchedAt, followedAt }
}

describe('groupShows', () => {
  it('répartit en cours / pas commencées / à jour', () => {
    const groups = groupShows([
      show('En cours', 1, 3, '2025-01-01T20:00:00.000Z'),
      show('Jamais vue', 0, 5, null, '2025-06-01T10:00:00.000Z'),
      show('Terminée', 4, 4, '2024-01-01T20:00:00.000Z'),
    ])

    expect(groups.map(group => group.key)).toEqual(['en-cours', 'pas-commencees', 'a-jour'])
    expect(groups[0]?.items.map(item => item.name)).toEqual(['En cours'])
    expect(groups[1]?.items.map(item => item.name)).toEqual(['Jamais vue'])
    expect(groups[2]?.items.map(item => item.name)).toEqual(['Terminée'])
  })

  it('trie les séries en cours par dernier visionnage décroissant', () => {
    const groups = groupShows([
      show('Ancienne', 1, 3, '2023-01-01T20:00:00.000Z'),
      show('Récente', 2, 5, '2026-01-01T20:00:00.000Z'),
    ])

    expect(groups[0]?.items.map(item => item.name)).toEqual(['Récente', 'Ancienne'])
  })

  it('trie les séries jamais commencées par date de suivi décroissante', () => {
    const groups = groupShows([
      show('Suivie en premier', 0, 3, null, '2024-01-01T10:00:00.000Z'),
      show('Suivie récemment', 0, 3, null, '2026-01-01T10:00:00.000Z'),
      show('Sans date', 0, 3, null, null),
    ])

    expect(groups[0]?.items.map(item => item.name)).toEqual([
      'Suivie récemment',
      'Suivie en premier',
      'Sans date',
    ])
  })

  it('omet les sections vides', () => {
    const groups = groupShows([show('Seule', 1, 2, '2025-01-01T20:00:00.000Z')])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.key).toBe('en-cours')
  })

  it('classe une série sans épisode diffusé dans « pas commencées »', () => {
    const groups = groupShows([show('Pas encore diffusée', 0, 0, null, '2026-01-01T10:00:00.000Z')])

    expect(groups[0]?.key).toBe('pas-commencees')
  })
})
