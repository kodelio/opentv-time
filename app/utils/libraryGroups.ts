export interface LibraryGroupableShow {
  readonly watched: number
  readonly aired: number
  readonly lastWatchedAt: string | null
  readonly followedAt: string | null
}

export type LibraryGroupKey = 'en-cours' | 'pas-commencees' | 'a-jour'

export interface LibraryGroup<T extends LibraryGroupableShow> {
  readonly key: LibraryGroupKey
  readonly items: readonly T[]
}

function byLastWatchedDesc(a: LibraryGroupableShow, b: LibraryGroupableShow): number {
  return (b.lastWatchedAt ?? '').localeCompare(a.lastWatchedAt ?? '')
}

function byFollowedDesc(a: LibraryGroupableShow, b: LibraryGroupableShow): number {
  return (b.followedAt ?? '').localeCompare(a.followedAt ?? '')
}

/**
 * Splits followed shows into started, not-started, and caught-up groups.
 * Empty groups are omitted.
 */
export function groupShows<T extends LibraryGroupableShow>(
  items: readonly T[],
): readonly LibraryGroup<T>[] {
  const started = items.filter(item => item.watched > 0 && item.watched < item.aired)
  const notStarted = items.filter(item => item.watched === 0)
  const caughtUp = items.filter(item => item.watched > 0 && item.watched >= item.aired)

  const groups: readonly LibraryGroup<T>[] = [
    { key: 'en-cours', items: [...started].sort(byLastWatchedDesc) },
    {
      key: 'pas-commencees',
      items: [...notStarted].sort(byFollowedDesc),
    },
    { key: 'a-jour', items: [...caughtUp].sort(byLastWatchedDesc) },
  ]
  return groups.filter(group => group.items.length > 0)
}
