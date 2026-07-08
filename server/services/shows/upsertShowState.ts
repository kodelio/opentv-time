import { nowIso } from '../../../shared/utils/time'
import type { Db } from '../../db/createDb'
import { showStates } from '../../db/schema'

export interface ShowStateInput {
  readonly isFollowed?: boolean
  readonly isArchived?: boolean
  readonly isFavorite?: boolean
  readonly followedAt?: string | null
}

export function upsertShowState(db: Db, showId: number, state: ShowStateInput): void {
  db.insert(showStates)
    .values({
      showId,
      isFollowed: state.isFollowed ?? false,
      isArchived: state.isArchived ?? false,
      isFavorite: state.isFavorite ?? false,
      followedAt: state.followedAt ?? null,
      updatedAt: nowIso(),
    })
    .onConflictDoUpdate({
      target: showStates.showId,
      set: { ...state, updatedAt: nowIso() },
    })
    .run()
}
