import { eq } from 'drizzle-orm'
import { addByTmdbIdSchema } from '../../../shared/schemas/api/media'
import { useDb } from '../../db/client'
import { shows } from '../../db/schema'
import { fetchAndUpsertShow } from '../../services/shows/fetchAndUpsertShow'
import { updateShowState } from '../../services/shows/updateShowState'
import { TmdbNotFoundError } from '../../utils/tmdb/errors'
import { usePreferredTmdb } from '../../utils/tmdb/usePreferredTmdb'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, addByTmdbIdSchema.parse)
  const db = useDb()
  try {
    const existing = db.select({ id: shows.id }).from(shows).where(eq(shows.tmdbId, body.tmdbId)).get()
    const showId = existing?.id ?? (await fetchAndUpsertShow(db, usePreferredTmdb(db), body.tmdbId))
    updateShowState(db, showId, { isFollowed: true, isArchived: false })
    setResponseStatus(event, 201)
    return { showId }
  } catch (error) {
    if (error instanceof TmdbNotFoundError) {
      throw createError({ statusCode: 404, message: 'Show not found on TMDB' })
    }
    console.error('Failed to follow show:', error)
    throw createError({ statusCode: 500, message: 'Could not follow this show' })
  }
})
