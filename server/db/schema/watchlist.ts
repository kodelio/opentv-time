import { sql } from 'drizzle-orm'
import { check, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { nowIso } from '../../../shared/utils/time'
import { movies } from './movies'
import { shows } from './shows'

export const MEDIA_TYPES = ['movie', 'show'] as const
export type MediaType = (typeof MEDIA_TYPES)[number]

export const watchlistItems = sqliteTable(
  'watchlist_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    mediaType: text('media_type').$type<MediaType>().notNull(),
    movieId: integer('movie_id').references(() => movies.id, { onDelete: 'cascade' }),
    showId: integer('show_id').references(() => shows.id, { onDelete: 'cascade' }),
    addedAt: text('added_at').notNull().$defaultFn(nowIso),
  },
  table => [
    uniqueIndex('watchlist_movie_unique').on(table.movieId),
    uniqueIndex('watchlist_show_unique').on(table.showId),
    check(
      'watchlist_exactly_one_target',
      sql`(${table.movieId} IS NOT NULL) + (${table.showId} IS NOT NULL) = 1`,
    ),
  ],
)
