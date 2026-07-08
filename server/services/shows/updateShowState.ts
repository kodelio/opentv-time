import { eq } from 'drizzle-orm'
import { nowIso } from '../../../shared/utils/time'
import type { Db } from '../../db/createDb'
import { shows, showStates } from '../../db/schema'
import { NotFoundError } from '../errors'
import { upsertShowState, type ShowStateInput } from './upsertShowState'

export function updateShowState(db: Db, showId: number, patch: ShowStateInput): void {
  const show = db.select({ id: shows.id }).from(shows).where(eq(shows.id, showId)).get()
  if (!show) {
    throw new NotFoundError('Show not found')
  }
  const current = db.select().from(showStates).where(eq(showStates.showId, showId)).get()
  const followedAt =
    patch.isFollowed === true && !current?.followedAt ? nowIso() : patch.followedAt
  upsertShowState(db, showId, { ...patch, followedAt })
}
