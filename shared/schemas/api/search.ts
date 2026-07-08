import { z } from 'zod'

export const searchQuerySchema = z.object({
  query: z.string().trim().min(1),
  type: z.enum(['movie', 'tv']),
})

export type SearchQuery = z.infer<typeof searchQuerySchema>
