import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { toIsoDate } from '../../shared/utils/time'
import {
  episodes,
  episodeWatches,
  movies,
  movieWatches,
  shows,
  syncRuns,
  watchlistItems,
} from '../../server/db/schema'
import { upsertShowState } from '../../server/services/shows/upsertShowState'
import { genreStats } from '../../server/services/stats/genres'
import { monthlyStats } from '../../server/services/stats/monthly'
import { statsOverview } from '../../server/services/stats/overview'
import { topShows } from '../../server/services/stats/topShows'
import { refreshFollowedShows } from '../../server/services/sync/refreshShows'
import { upcoming } from '../../server/services/upcoming/upcoming'
import { fakeTmdb } from '../helpers/fakeTmdb'
import { createTestDb, type TestDb } from '../helpers/testDb'

const DAY_MS = 24 * 60 * 60 * 1000
const tomorrow = toIsoDate(new Date(Date.now() + DAY_MS))
const inTenDays = toIsoDate(new Date(Date.now() + 10 * DAY_MS))

function seedWatchedShow(db: TestDb) {
  const show = db
    .insert(shows)
    .values({
      tmdbId: 1,
      name: 'Drame Show',
      episodeRunTime: 60,
      genres: ['Drame', 'Thriller'],
      status: 'Returning Series',
    })
    .returning()
    .get()
  upsertShowState(db, show.id, { isFollowed: true })
  const eps = db
    .insert(episodes)
    .values([
      { showId: show.id, seasonNumber: 1, episodeNumber: 1, airDate: '2020-01-01', runtime: 30 },
      { showId: show.id, seasonNumber: 1, episodeNumber: 2, airDate: '2020-01-08' },
      { showId: show.id, seasonNumber: 2, episodeNumber: 1, airDate: tomorrow },
    ])
    .returning()
    .all()
  const nowMonth = new Date().toISOString()
  db.insert(episodeWatches)
    .values([
      { episodeId: eps[0]!.id, watchedAt: nowMonth },
      { episodeId: eps[1]!.id, watchedAt: nowMonth },
    ])
    .run()
  return show
}

describe('stats', () => {
  let db: TestDb

  beforeEach(() => {
    db = createTestDb()
  })

  it('calcule le temps total avec repli sur la durée moyenne de la série', () => {
    seedWatchedShow(db)
    const movie = db
      .insert(movies)
      .values({ tmdbId: 10, title: 'Long Film', runtime: 120, genres: ['Action'] })
      .returning()
      .get()
    db.insert(movieWatches).values({ movieId: movie.id, watchedAt: new Date().toISOString() }).run()

    const overview = statsOverview(db)
    expect(overview).toMatchObject({
      episodesWatched: 2,
      moviesWatched: 1,
      episodeMinutes: 90,
      movieMinutes: 120,
      totalMinutes: 210,
      showsFollowed: 1,
    })
  })

  it('agrège les visionnages par mois sur 12 mois', () => {
    seedWatchedShow(db)
    const stats = monthlyStats(db)
    expect(stats).toHaveLength(12)
    const currentMonth = new Date().toISOString().slice(0, 7)
    expect(stats.at(-1)).toEqual({ month: currentMonth, episodes: 2, movies: 0 })
    expect(stats[0]?.episodes).toBe(0)
  })

  it('classe les séries par temps de visionnage', () => {
    seedWatchedShow(db)
    const top = topShows(db)
    expect(top).toHaveLength(1)
    expect(top[0]).toMatchObject({ name: 'Drame Show', episodesWatched: 2, minutes: 90 })
  })

  it('agrège les genres pondérés par visionnages', () => {
    seedWatchedShow(db)
    const movie = db
      .insert(movies)
      .values({ tmdbId: 10, title: 'Long Film', runtime: 120, genres: ['Action'] })
      .returning()
      .get()
    db.insert(movieWatches).values({ movieId: movie.id, watchedAt: new Date().toISOString() }).run()

    const genres = genreStats(db)
    expect(genres).toContainEqual({ genre: 'Drame', count: 2 })
    expect(genres).toContainEqual({ genre: 'Action', count: 1 })
  })
})

describe('upcoming', () => {
  let db: TestDb

  beforeEach(() => {
    db = createTestDb()
  })

  it('liste les épisodes à venir des séries suivies et les sorties de la watchlist', () => {
    seedWatchedShow(db)

    const archived = db.insert(shows).values({ tmdbId: 2, name: 'Archivée' }).returning().get()
    upsertShowState(db, archived.id, { isFollowed: true, isArchived: true })
    db.insert(episodes)
      .values({ showId: archived.id, seasonNumber: 1, episodeNumber: 1, airDate: tomorrow })
      .run()

    const movie = db
      .insert(movies)
      .values({ tmdbId: 20, title: 'Film attendu', releaseDate: inTenDays })
      .returning()
      .get()
    db.insert(watchlistItems).values({ mediaType: 'movie', movieId: movie.id }).run()

    const items = upcoming(db, 30)
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      kind: 'episode',
      title: 'Drame Show',
      date: tomorrow,
      isSeasonPremiere: true,
    })
    expect(items[1]).toMatchObject({ kind: 'movie', title: 'Film attendu', date: inTenDays })
  })
})

describe('refreshFollowedShows', () => {
  it('rafraîchit les séries actives et saute les terminées récemment synchronisées', async () => {
    const db = createTestDb()
    const active = seedWatchedShow(db)

    const ended = db
      .insert(shows)
      .values({ tmdbId: 2, name: 'Finie', status: 'Ended', lastSyncedAt: new Date().toISOString() })
      .returning()
      .get()
    upsertShowState(db, ended.id, { isFollowed: true })

    const tmdb = fakeTmdb({
      '/tv/1': (query?: Record<string, unknown>) =>
        query?.append_to_response
          ? {
              'season/2': {
                season_number: 2,
                episodes: [
                  { id: 21, season_number: 2, episode_number: 1, air_date: tomorrow },
                  { id: 22, season_number: 2, episode_number: 2, air_date: inTenDays },
                ],
              },
            }
          : {
              id: 1,
              name: 'Drame Show',
              status: 'Returning Series',
              seasons: [{ id: 90, season_number: 2, episode_count: 2 }],
              next_episode_to_air: { id: 21, season_number: 2, episode_number: 1, air_date: tomorrow },
            },
    })

    const summary = await refreshFollowedShows(db, tmdb, 'manual')
    expect(summary).toMatchObject({ refreshed: 1, skipped: 1, errors: [] })

    const refreshed = db.select().from(shows).where(eq(shows.id, active.id)).get()
    expect(refreshed?.nextEpisodeAirDate).toBe(tomorrow)
    const newEpisode = db.select().from(episodes).where(eq(episodes.tmdbId, 22)).get()
    expect(newEpisode).toBeDefined()

    const run = db.select().from(syncRuns).all().at(-1)
    expect(run).toMatchObject({ kind: 'manual', showsRefreshed: 1 })
    expect(run?.finishedAt).not.toBeNull()
  })
})
