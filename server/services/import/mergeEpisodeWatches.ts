import type { EpisodeWatchRecord } from './types'

export function mergeEpisodeWatches(
  v2Watches: readonly EpisodeWatchRecord[],
  v1Watches: readonly EpisodeWatchRecord[],
): readonly EpisodeWatchRecord[] {
  const v2EpisodeIds = new Set(
    v2Watches.flatMap(watch => (watch.tvdbEpisodeId === null ? [] : [watch.tvdbEpisodeId])),
  )
  const v1Only = v1Watches.filter(
    watch => watch.tvdbEpisodeId !== null && !v2EpisodeIds.has(watch.tvdbEpisodeId),
  )
  return [...v2Watches, ...v1Only]
}
