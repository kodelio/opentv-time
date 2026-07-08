import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { nowIso } from '../../../shared/utils/time'
import { movies } from './movies'
import { episodes } from './shows'

export const WATCH_SOURCES = ['app', 'import-v1', 'import-v2'] as const
export type WatchSource = (typeof WATCH_SOURCES)[number]

export const episodeWatches = sqliteTable(
  'episode_watches',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    episodeId: integer('episode_id')
      .notNull()
      .references(() => episodes.id, { onDelete: 'cascade' }),
    watchedAt: text('watched_at').notNull(),
    isRewatch: integer('is_rewatch', { mode: 'boolean' }).notNull().default(false),
    source: text('source').$type<WatchSource>().notNull().default('app'),
    sourceUuid: text('source_uuid'),
    createdAt: text('created_at').notNull().$defaultFn(nowIso),
  },
  table => [
    uniqueIndex('episode_watches_source_uuid_unique').on(table.sourceUuid),
    index('episode_watches_episode_idx').on(table.episodeId),
    index('episode_watches_watched_at_idx').on(table.watchedAt),
  ],
)

export const movieWatches = sqliteTable(
  'movie_watches',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    movieId: integer('movie_id')
      .notNull()
      .references(() => movies.id, { onDelete: 'cascade' }),
    watchedAt: text('watched_at').notNull(),
    isRewatch: integer('is_rewatch', { mode: 'boolean' }).notNull().default(false),
    source: text('source').$type<WatchSource>().notNull().default('app'),
    sourceUuid: text('source_uuid'),
    createdAt: text('created_at').notNull().$defaultFn(nowIso),
  },
  table => [
    uniqueIndex('movie_watches_source_uuid_unique').on(table.sourceUuid),
    index('movie_watches_movie_idx').on(table.movieId),
    index('movie_watches_watched_at_idx').on(table.watchedAt),
  ],
)
