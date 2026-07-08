export type ImportSource = 'import-v1' | 'import-v2'

export interface EpisodeWatchRecord {
  readonly tvdbSeriesId: number
  readonly tvdbEpisodeId: number | null
  readonly seasonNumber: number | null
  readonly episodeNumber: number | null
  readonly seriesName: string
  readonly watchedAt: string
  readonly isRewatch: boolean
  readonly sourceUuid: string
  readonly source: ImportSource
}

export interface MovieRecord {
  readonly uuid: string
  readonly title: string
  readonly releaseYear: number | null
  readonly runtimeMinutes: number | null
  readonly alphaSlug: string | null
}

export interface MovieWatchRecord extends MovieRecord {
  readonly watchedAt: string
}

export interface WatchlistMovieRecord extends MovieRecord {
  readonly addedAt: string
}

export interface FollowedShowRecord {
  readonly tvdbId: number
  readonly name: string
  readonly isArchived: boolean
  readonly followedAt: string | null
}

export interface UserShowDataRecord {
  readonly tvdbId: number
  readonly name: string
  readonly isFollowed: boolean
  readonly isFavorite: boolean
}

export interface ShowImportInput {
  readonly tvdbId: number
  readonly name: string
  readonly isFollowed: boolean
  readonly isArchived: boolean
  readonly isFavorite: boolean
  readonly followedAt: string | null
}

export type MovieSourceRow =
  | { readonly type: 'watch'; readonly record: MovieWatchRecord }
  | { readonly type: 'watchlist'; readonly record: WatchlistMovieRecord }

export interface ShowSourceRow {
  readonly input: ShowImportInput
  readonly watches: readonly EpisodeWatchRecord[]
}
