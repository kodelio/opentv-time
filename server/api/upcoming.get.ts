import { z } from 'zod'
import { useDb } from '../db/client'
import { upcoming } from '../services/upcoming/upcoming'

const querySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
})

export default defineEventHandler(async (event) => {
  const { days } = await getValidatedQuery(event, querySchema.parse)
  return upcoming(useDb(), days)
})
