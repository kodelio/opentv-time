import { z } from 'zod'

export const markSeenBodySchema = z.object({
  watchedAt: z.union([z.iso.date(), z.iso.datetime()]).optional(),
})

export type MarkSeenBody = z.infer<typeof markSeenBodySchema>

export const idParamSchema = z.coerce.number().int().positive()

const DATE_ONLY_LENGTH = 10
const MIDDAY_UTC = 'T12:00:00.000Z'

export function normalizeWatchedAt(watchedAt: string | undefined, fallback: string): string {
  if (!watchedAt) {
    return fallback
  }
  if (watchedAt.length === DATE_ONLY_LENGTH) {
    return `${watchedAt}${MIDDAY_UTC}`
  }
  return watchedAt
}
