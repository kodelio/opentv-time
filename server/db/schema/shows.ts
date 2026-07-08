import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { nowIso } from '../../../shared/utils/time'

export const shows = sqliteTable(
  'shows',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tmdbId: integer('tmdb_id').notNull(),
    tvdbId: integer('tvdb_id'),
    name: text('name').notNull(),
    originalName: text('original_name'),
    overview: text('overview'),
    posterPath: text('poster_path'),
    backdropPath: text('backdrop_path'),
    firstAirDate: text('first_air_date'),
    status: text('status'),
    inProduction: integer('in_production', { mode: 'boolean' }).notNull().default(false),
    genres: text('genres', { mode: 'json' }).$type<readonly string[]>().notNull().default([]),
    numberOfSeasons: integer('number_of_seasons').notNull().default(0),
    numberOfEpisodes: integer('number_of_episodes').notNull().default(0),
    episodeRunTime: integer('episode_run_time'),
    nextEpisodeAirDate: text('next_episode_air_date'),
    lastSyncedAt: text('last_synced_at'),
    createdAt: text('created_at').notNull().$defaultFn(nowIso),
  },
  table => [
    uniqueIndex('shows_tmdb_id_unique').on(table.tmdbId),
    uniqueIndex('shows_tvdb_id_unique').on(table.tvdbId),
  ],
)

export const showStates = sqliteTable('show_states', {
  showId: integer('show_id')
    .primaryKey()
    .references(() => shows.id, { onDelete: 'cascade' }),
  isFollowed: integer('is_followed', { mode: 'boolean' }).notNull().default(false),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
  followedAt: text('followed_at'),
  updatedAt: text('updated_at').notNull().$defaultFn(nowIso),
})

export const seasons = sqliteTable(
  'seasons',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    showId: integer('show_id')
      .notNull()
      .references(() => shows.id, { onDelete: 'cascade' }),
    tmdbId: integer('tmdb_id'),
    seasonNumber: integer('season_number').notNull(),
    name: text('name'),
    posterPath: text('poster_path'),
    episodeCount: integer('episode_count').notNull().default(0),
    airDate: text('air_date'),
  },
  table => [uniqueIndex('seasons_show_season_unique').on(table.showId, table.seasonNumber)],
)

export const episodes = sqliteTable(
  'episodes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    showId: integer('show_id')
      .notNull()
      .references(() => shows.id, { onDelete: 'cascade' }),
    seasonNumber: integer('season_number').notNull(),
    episodeNumber: integer('episode_number').notNull(),
    tmdbId: integer('tmdb_id'),
    tvdbId: integer('tvdb_id'),
    name: text('name'),
    overview: text('overview'),
    airDate: text('air_date'),
    runtime: integer('runtime'),
    stillPath: text('still_path'),
  },
  table => [
    uniqueIndex('episodes_show_season_episode_unique').on(
      table.showId,
      table.seasonNumber,
      table.episodeNumber,
    ),
    uniqueIndex('episodes_tmdb_id_unique').on(table.tmdbId),
    index('episodes_air_date_idx').on(table.airDate),
    index('episodes_show_season_idx').on(table.showId, table.seasonNumber),
  ],
)
