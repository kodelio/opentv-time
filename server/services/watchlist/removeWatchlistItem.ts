import { eq } from 'drizzle-orm'
import type { Db } from '../../db/createDb'
import { watchlistItems } from '../../db/schema'
import { NotFoundError } from '../errors'

export function removeWatchlistItem(db: Db, itemId: number): void {
  const result = db.delete(watchlistItems).where(eq(watchlistItems.id, itemId)).run()
  if (result.changes === 0) {
    throw new NotFoundError('Watchlist item not found')
  }
}
