import { and, asc, eq, inArray, notExists } from 'drizzle-orm'
import type { Db } from '../../db/createDb'
import { episodes, episodeWatches, shows, showStates } from '../../db/schema'
import { airedEpisodesFilter, lastWatchedByShow, progressByShow } from '../shows/showProgress'

export interface UpNextItem {
  readonly showId: number
  readonly showName: string
  readonly posterPath: string | null
  readonly backdropPath: string | null
  readonly episodeId: number
  readonly seasonNumber: number
  readonly episodeNumber: number
  readonly episodeName: string | null
  readonly airDate: string | null
  readonly runtime: number | null
  readonly remaining: number
  readonly lastWatchedAt: string | null
  readonly followedAt: string | null
}

export function upNext(db: Db): readonly UpNextItem[] {
  const followed = db
    .select({
      id: shows.id,
      name: shows.name,
      posterPath: shows.posterPath,
      backdropPath: shows.backdropPath,
      followedAt: showStates.followedAt,
    })
    .from(shows)
    .innerJoin(showStates, eq(showStates.showId, shows.id))
    .where(and(eq(showStates.isFollowed, true), eq(showStates.isArchived, false)))
    .all()
  if (followed.length === 0) {
    return []
  }

  const showIds = followed.map(show => show.id)
  const unwatchedAired = db
    .select({
      id: episodes.id,
      showId: episodes.showId,
      seasonNumber: episodes.seasonNumber,
      episodeNumber: episodes.episodeNumber,
      name: episodes.name,
      airDate: episodes.airDate,
      runtime: episodes.runtime,
    })
    .from(episodes)
    .where(
      and(
        inArray(episodes.showId, showIds),
        airedEpisodesFilter(),
        notExists(
          db.select().from(episodeWatches).where(eq(episodeWatches.episodeId, episodes.id)),
        ),
      ),
    )
    .orderBy(asc(episodes.showId), asc(episodes.seasonNumber), asc(episodes.episodeNumber))
    .all()

  const firstByShow = new Map<number, (typeof unwatchedAired)[number]>()
  for (const episode of unwatchedAired) {
    if (!firstByShow.has(episode.showId)) {
      firstByShow.set(episode.showId, episode)
    }
  }

  const progress = progressByShow(db, [...firstByShow.keys()])
  const lastWatched = lastWatchedByShow(db, [...firstByShow.keys()])

  return followed
    .flatMap((show) => {
      const episode = firstByShow.get(show.id)
      if (!episode) {
        return []
      }
      const showProgress = progress.get(show.id)
      return [
        {
          showId: show.id,
          showName: show.name,
          posterPath: show.posterPath,
          backdropPath: show.backdropPath,
          episodeId: episode.id,
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          episodeName: episode.name,
          airDate: episode.airDate,
          runtime: episode.runtime,
          remaining: (showProgress?.aired ?? 0) - (showProgress?.watched ?? 0),
          lastWatchedAt: lastWatched.get(show.id) ?? null,
          followedAt: show.followedAt,
        } satisfies UpNextItem,
      ]
    })
    .sort((a, b) => (b.lastWatchedAt ?? '').localeCompare(a.lastWatchedAt ?? ''))
}
