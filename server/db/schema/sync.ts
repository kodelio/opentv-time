import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nowIso } from '../../../shared/utils/time'

export const SYNC_KINDS = ['scheduled', 'manual', 'import'] as const
export type SyncKind = (typeof SYNC_KINDS)[number]

export const syncRuns = sqliteTable('sync_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kind: text('kind').$type<SyncKind>().notNull(),
  startedAt: text('started_at').notNull().$defaultFn(nowIso),
  finishedAt: text('finished_at'),
  showsRefreshed: integer('shows_refreshed').notNull().default(0),
  errors: text('errors', { mode: 'json' }).$type<readonly string[]>().notNull().default([]),
})
