import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { nowIso } from '../../../shared/utils/time'

export const movies = sqliteTable(
  'movies',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tmdbId: integer('tmdb_id').notNull(),
    title: text('title').notNull(),
    originalTitle: text('original_title'),
    overview: text('overview'),
    posterPath: text('poster_path'),
    backdropPath: text('backdrop_path'),
    releaseDate: text('release_date'),
    runtime: integer('runtime'),
    genres: text('genres', { mode: 'json' }).$type<readonly string[]>().notNull().default([]),
    lastSyncedAt: text('last_synced_at'),
    createdAt: text('created_at').notNull().$defaultFn(nowIso),
  },
  table => [uniqueIndex('movies_tmdb_id_unique').on(table.tmdbId)],
)
