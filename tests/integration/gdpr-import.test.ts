import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  episodes,
  episodeWatches,
  importPending,
  movies,
  movieWatches,
  showStates,
  shows,
  watchlistItems,
} from '../../server/db/schema'
import { runGdprImport, type GdprImportFiles } from '../../server/services/import/runGdprImport'
import { ignorePendingItem, resolvePendingItem } from '../../server/services/import/resolvePending'
import { fakeTmdb } from '../helpers/fakeTmdb'
import { createTestDb } from '../helpers/testDb'

const readFixture = (name: string) =>
  readFileSync(join('tests/fixtures/gdpr', name), 'utf8')

const files: GdprImportFiles = {
  trackingV2: readFixture('tracking-prod-records-v2.csv'),
  trackingV1: readFixture('tracking-prod-records.csv'),
  followedShows: readFixture('followed_tv_show.csv'),
  userShowData: readFixture('user_tv_show_data.csv'),
}

const showAlphaDetails = {
  id: 800001,
  name: 'Série Démo Alpha',
  original_name: 'Série Démo Alpha',
  status: 'Ended',
  in_production: false,
  genres: [{ id: 18, name: 'Drame' }],
  number_of_seasons: 1,
  number_of_episodes: 4,
  episode_run_time: [50],
  seasons: [{ id: 90, season_number: 3, episode_count: 4, name: 'Saison 3' }],
}

const showAlphaSeason3 = {
  season_number: 3,
  episodes: [
    { id: 810005, season_number: 3, episode_number: 5, air_date: '2021-09-01' },
    { id: 810006, season_number: 3, episode_number: 6, air_date: '2021-09-08' },
    { id: 810009, season_number: 3, episode_number: 9, air_date: '2021-09-29' },
    { id: 810010, season_number: 3, episode_number: 10, air_date: '2021-10-06' },
  ],
}

const showBetaDetails = {
  id: 800002,
  name: 'Série Démo Beta',
  seasons: [{ id: 91, season_number: 1, episode_count: 1 }],
}

function movieSearchRoute(query: Record<string, unknown> | undefined) {
  const text = String(query?.query ?? '')
  if (text === 'Film Démo Un') {
    return {
      results: [
        { id: 900001, title: 'Film Démo Un', original_title: 'Film Démo Un', release_date: '2025-06-25' },
      ],
    }
  }
  if (text === 'Film Démo Trois') {
    return { results: [{ id: 900003, title: 'Film Démo Trois', release_date: '2026-01-01' }] }
  }
  return { results: [] }
}

const routes = {
  '/find/700001': { tv_results: [{ id: 800001, name: 'Série Démo Alpha' }] },
  '/find/700002': { tv_results: [] },
  '/find/990001': {
    tv_episode_results: [{ id: 810010, show_id: 800001, season_number: 3, episode_number: 10 }],
  },
  '/find/990002': { tv_episode_results: [] },
  '/tv/800001': (query?: Record<string, unknown>) =>
    query?.append_to_response ? { 'season/3': showAlphaSeason3 } : showAlphaDetails,
  '/tv/800002': (query?: Record<string, unknown>) =>
    query?.append_to_response
      ? { 'season/1': { season_number: 1, episodes: [{ id: 820001, season_number: 1, episode_number: 1 }] } }
      : showBetaDetails,
  '/search/tv': { results: [{ id: 800002, name: 'Série Démo Beta', first_air_date: '2001-01-01' }] },
  '/search/movie': movieSearchRoute,
  '/movie/900001': { id: 900001, title: 'Film Démo Un', release_date: '2025-06-25', runtime: 120 },
  '/movie/900002': { id: 900002, title: 'Film Démo, Deux', release_date: '2024-03-10', runtime: 180 },
  '/movie/900003': { id: 900003, title: 'Film Démo Trois', release_date: '2026-01-01', runtime: 100 },
} as const

describe('runGdprImport', () => {
  let db: ReturnType<typeof createTestDb>
  const tmdb = fakeTmdb(routes)

  beforeEach(() => {
    db = createTestDb()
  })

  it('importe séries, visionnages, films et watchlist avec les dates d’origine', async () => {
    const summary = await runGdprImport({ db, tmdb, files })

    expect(summary.shows).toEqual({ imported: 1, alreadyPresent: 0, pending: 1 })
    expect(summary.episodes).toMatchObject({
      totalWatches: 5,
      mapped: 4,
      unmatched: 1,
      watchesInserted: 4,
    })
    expect(summary.movies).toMatchObject({
      matched: 2,
      pending: 1,
      watchesInserted: 1,
      watchlistInserted: 1,
    })
    expect(summary.errors).toEqual([])

    const show = db.select().from(shows).where(eq(shows.tmdbId, 800001)).get()
    expect(show).toMatchObject({ tvdbId: 700001, name: 'Série Démo Alpha', status: 'Ended' })
    const state = db.select().from(showStates).where(eq(showStates.showId, show!.id)).get()
    expect(state).toMatchObject({ isFollowed: true, isFavorite: true, isArchived: false })

    const rewatch = db.select().from(episodeWatches).where(eq(episodeWatches.isRewatch, true)).get()
    expect(rewatch?.watchedAt).toBe('2025-04-16T19:22:58.000Z')

    const fallbackEpisode = db.select().from(episodes).where(eq(episodes.tmdbId, 810010)).get()
    expect(fallbackEpisode?.tvdbId).toBe(990001)

    const un = db.select().from(movies).where(eq(movies.tmdbId, 900001)).get()
    expect(un).toBeDefined()
    const unWatch = db.select().from(movieWatches).where(eq(movieWatches.movieId, un!.id)).get()
    expect(unWatch?.watchedAt).toBe(new Date(1756236320 * 1000).toISOString())

    expect(db.select().from(watchlistItems).all()).toHaveLength(1)

    const pendingRows = db.select().from(importPending).all()
    expect(pendingRows.map(row => row.kind).sort()).toEqual(['episode', 'movie', 'show'])
  })

  it('est idempotent : la seconde exécution n’insère rien', async () => {
    await runGdprImport({ db, tmdb, files })
    const second = await runGdprImport({ db, tmdb, files })

    expect(second.shows).toEqual({ imported: 0, alreadyPresent: 1, pending: 1 })
    expect(second.episodes.watchesInserted).toBe(0)
    expect(second.movies.watchesInserted).toBe(0)
    expect(second.movies.watchlistInserted).toBe(0)
    expect(second.movies.skipped).toBe(2)

    expect(db.select().from(episodeWatches).all()).toHaveLength(4)
    expect(db.select().from(movieWatches).all()).toHaveLength(1)
    expect(db.select().from(watchlistItems).all()).toHaveLength(1)
    expect(db.select().from(importPending).all()).toHaveLength(3)
  })

  it('résout les éléments en attente (série et film) et ignore les épisodes', async () => {
    await runGdprImport({ db, tmdb, files })
    const pendingRows = db.select().from(importPending).all()
    const showItem = pendingRows.find(row => row.kind === 'show')!
    const movieItem = pendingRows.find(row => row.kind === 'movie')!
    const episodeItem = pendingRows.find(row => row.kind === 'episode')!

    await resolvePendingItem(db, tmdb, showItem.id, 800002)
    const beta = db.select().from(shows).where(eq(shows.tmdbId, 800002)).get()
    expect(beta).toMatchObject({ tvdbId: 700002, name: 'Série Démo Beta' })
    const betaState = db.select().from(showStates).where(eq(showStates.showId, beta!.id)).get()
    expect(betaState).toMatchObject({ isFollowed: true, isArchived: true })

    await resolvePendingItem(db, tmdb, movieItem.id, 900002)
    const deux = db.select().from(movies).where(eq(movies.tmdbId, 900002)).get()
    expect(deux).toBeDefined()
    expect(db.select().from(movieWatches).all()).toHaveLength(2)

    await expect(resolvePendingItem(db, tmdb, movieItem.id, 900002)).rejects.toThrow(/already/)

    ignorePendingItem(db, episodeItem.id)
    const stillPending = db
      .select()
      .from(importPending)
      .where(eq(importPending.status, 'pending'))
      .all()
    expect(stillPending).toHaveLength(0)
  })
})
