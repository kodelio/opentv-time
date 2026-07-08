import { z } from 'zod'

const movieRecordSchema = z.object({
  uuid: z.string(),
  title: z.string(),
  releaseYear: z.number().nullable(),
  runtimeMinutes: z.number().nullable(),
  alphaSlug: z.string().nullable(),
})

export const movieSourceRowSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('watch'),
    record: movieRecordSchema.extend({ watchedAt: z.string() }),
  }),
  z.object({
    type: z.literal('watchlist'),
    record: movieRecordSchema.extend({ addedAt: z.string() }),
  }),
])

export const episodeWatchRecordSchema = z.object({
  tvdbSeriesId: z.number(),
  tvdbEpisodeId: z.number().nullable(),
  seasonNumber: z.number().nullable(),
  episodeNumber: z.number().nullable(),
  seriesName: z.string(),
  watchedAt: z.string(),
  isRewatch: z.boolean(),
  sourceUuid: z.string(),
  source: z.enum(['import-v1', 'import-v2']),
})

export const showSourceRowSchema = z.object({
  input: z.object({
    tvdbId: z.number(),
    name: z.string(),
    isFollowed: z.boolean(),
    isArchived: z.boolean(),
    isFavorite: z.boolean(),
    followedAt: z.string().nullable(),
  }),
  watches: z.array(episodeWatchRecordSchema),
})
