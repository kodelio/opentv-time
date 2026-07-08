import { z } from 'zod'

export const addByTmdbIdSchema = z.object({
  tmdbId: z.number().int().positive(),
})

export const watchlistAddSchema = z.object({
  mediaType: z.enum(['movie', 'show']),
  tmdbId: z.number().int().positive(),
})

export type WatchlistAddBody = z.infer<typeof watchlistAddSchema>
