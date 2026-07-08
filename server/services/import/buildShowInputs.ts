import type {
  EpisodeWatchRecord,
  FollowedShowRecord,
  ShowSourceRow,
  UserShowDataRecord,
} from './types'

export function buildShowInputs(
  watches: readonly EpisodeWatchRecord[],
  followedShows: readonly FollowedShowRecord[],
  userShowData: readonly UserShowDataRecord[],
): readonly ShowSourceRow[] {
  const watchesByTvdbId = new Map<number, EpisodeWatchRecord[]>()
  for (const watch of watches) {
    const existing = watchesByTvdbId.get(watch.tvdbSeriesId) ?? []
    watchesByTvdbId.set(watch.tvdbSeriesId, [...existing, watch])
  }

  const followedByTvdbId = new Map(followedShows.map(record => [record.tvdbId, record]))
  const userDataByTvdbId = new Map(userShowData.map(record => [record.tvdbId, record]))

  const tvdbIds = new Set([
    ...watchesByTvdbId.keys(),
    ...followedByTvdbId.keys(),
    ...userDataByTvdbId.keys(),
  ])

  return [...tvdbIds].map((tvdbId) => {
    const followed = followedByTvdbId.get(tvdbId)
    const userData = userDataByTvdbId.get(tvdbId)
    const showWatches = watchesByTvdbId.get(tvdbId) ?? []
    const name =
      followed?.name || userData?.name || showWatches.find(watch => watch.seriesName)?.seriesName || ''
    return {
      input: {
        tvdbId,
        name,
        isFollowed:
          followed !== undefined || (userData?.isFollowed ?? false) || showWatches.length > 0,
        isArchived: followed?.isArchived ?? false,
        isFavorite: userData?.isFavorite ?? false,
        followedAt: followed?.followedAt ?? null,
      },
      watches: showWatches,
    }
  })
}
