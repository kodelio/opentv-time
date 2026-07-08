import { count, gte, sql } from 'drizzle-orm'
import type { Db } from '../../db/createDb'
import { episodeWatches, movieWatches } from '../../db/schema'

export interface MonthlyStat {
  readonly month: string
  readonly episodes: number
  readonly movies: number
}

const DEFAULT_MONTHS = 12

function lastMonths(total: number): readonly string[] {
  const now = new Date()
  return Array.from({ length: total }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (total - 1 - index), 1))
    return date.toISOString().slice(0, 7)
  })
}

export function monthlyStats(db: Db, months = DEFAULT_MONTHS): readonly MonthlyStat[] {
  const monthKeys = lastMonths(months)
  const startIso = `${monthKeys[0]}-01T00:00:00.000Z`

  const episodeMonth = sql<string>`substr(${episodeWatches.watchedAt}, 1, 7)`
  const episodeRows = db
    .select({ month: episodeMonth, total: count() })
    .from(episodeWatches)
    .where(gte(episodeWatches.watchedAt, startIso))
    .groupBy(episodeMonth)
    .all()

  const movieMonth = sql<string>`substr(${movieWatches.watchedAt}, 1, 7)`
  const movieRows = db
    .select({ month: movieMonth, total: count() })
    .from(movieWatches)
    .where(gte(movieWatches.watchedAt, startIso))
    .groupBy(movieMonth)
    .all()

  const episodesByMonth = new Map(episodeRows.map(row => [row.month, row.total]))
  const moviesByMonth = new Map(movieRows.map(row => [row.month, row.total]))

  return monthKeys.map(month => ({
    month,
    episodes: episodesByMonth.get(month) ?? 0,
    movies: moviesByMonth.get(month) ?? 0,
  }))
}
