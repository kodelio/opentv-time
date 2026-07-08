import { z } from 'zod'

export const showFilterQuerySchema = z.object({
  filter: z.enum(['toutes', 'en-cours', 'a-jour', 'terminees', 'archivees']).default('toutes'),
})

export const showStatePatchSchema = z
  .object({
    isFollowed: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    isFavorite: z.boolean().optional(),
  })
  .refine(
    patch => patch.isFollowed !== undefined || patch.isArchived !== undefined || patch.isFavorite !== undefined,
    { message: 'No field to update' },
  )

export type ShowStatePatch = z.infer<typeof showStatePatchSchema>
