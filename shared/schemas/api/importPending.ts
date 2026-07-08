import { z } from 'zod'

export const resolvePendingBodySchema = z.object({
  tmdbId: z.number().int().positive(),
})

export const pendingItemIdSchema = z.coerce.number().int().positive()

export type ResolvePendingBody = z.infer<typeof resolvePendingBodySchema>
