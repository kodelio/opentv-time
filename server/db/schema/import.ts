import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { nowIso } from '../../../shared/utils/time'

export const IMPORT_PENDING_KINDS = ['movie', 'show', 'episode'] as const
export type ImportPendingKind = (typeof IMPORT_PENDING_KINDS)[number]

export const IMPORT_PENDING_STATUSES = ['pending', 'resolved', 'ignored'] as const
export type ImportPendingStatus = (typeof IMPORT_PENDING_STATUSES)[number]

export interface ImportCandidate {
  readonly tmdbId: number
  readonly title: string
  readonly originalTitle?: string
  readonly releaseDate?: string
  readonly posterPath?: string
  readonly overview?: string
  readonly score: number
}

export const importPending = sqliteTable(
  'import_pending',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    kind: text('kind').$type<ImportPendingKind>().notNull(),
    dedupeKey: text('dedupe_key').notNull(),
    rawTitle: text('raw_title').notNull(),
    releaseYear: integer('release_year'),
    runtime: integer('runtime'),
    sourceRows: text('source_rows', { mode: 'json' }).$type<readonly unknown[]>().notNull().default([]),
    candidates: text('candidates', { mode: 'json' })
      .$type<readonly ImportCandidate[]>()
      .notNull()
      .default([]),
    status: text('status').$type<ImportPendingStatus>().notNull().default('pending'),
    resolvedTmdbId: integer('resolved_tmdb_id'),
    resolvedAt: text('resolved_at'),
    createdAt: text('created_at').notNull().$defaultFn(nowIso),
  },
  table => [
    uniqueIndex('import_pending_dedupe_key_unique').on(table.dedupeKey),
    index('import_pending_status_idx').on(table.status),
  ],
)
