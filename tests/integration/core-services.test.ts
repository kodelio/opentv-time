import { beforeEach, describe, expect, it } from 'vitest'
import { episodes, movies, movieWatches, shows, watchlistItems } from '../../server/db/schema'
import { enrichMovieItems, enrichShowItems } from '../../server/services/discover/enrichMediaItems'
import { upNext } from '../../server/services/home/upNext'
import { getMovieDetail } from '../../server/services/movies/getMovieDetail'
import { listMovies } from '../../server/services/movies/listMovies'
import { getShowDetail } from '../../server/services/shows/getShowDetail'
import { listShows } from '../../server/services/shows/listShows'
import { upsertShowState } from '../../server/services/shows/upsertShowState'
import { deleteEpisodeWatch } from '../../server/services/watches/deleteEpisodeWatch'
import { markSeasonWatched } from '../../server/services/watches/markSeasonWatched'
import { markShowWatched } from '../../server/services/watches/markShowWatched'
import { recordEpisodeWatch } from '../../server/services/watches/recordEpisodeWatch'
import { recordMovieWatch } from '../../server/services/watches/recordMovieWatch'
import { listWatchlist } from '../../server/services/watchlist/listWatchlist'
import { createTestDb, type TestDb } from '../helpers/testDb'

const PAST = '2020-01-01'
const FUTURE = '2999-01-01'

function seedShow(
  db: TestDb,
  options: { tmdbId: number; name: string; status?: string; archived?: boolean },
) {
  const show = db
    .insert(shows)
    .values({ tmdbId: options.tmdbId, name: options.name, status: options.status ?? 'Returning Series' })
    .returning()
    .get()
  upsertShowState(db, show.id, { isFollowed: true, isArchived: options.archived ?? false })
  const inserted = db
    .insert(episodes)
    .values([
      { showId: show.id, seasonNumber: 1, episodeNumber: 1, airDate: PAST },
      { showId: show.id, seasonNumber: 1, episodeNumber: 2, airDate: PAST },
      { showId: show.id, seasonNumber: 1, episodeNumber: 3, airDate: FUTURE },
      { showId: show.id, seasonNumber: 0, episodeNumber: 1, airDate: PAST },
    ])
    .returning()
    .all()
  return { show, episodes: inserted }
}

describe('services séries', () => {
  let db: TestDb

  beforeEach(() => {
    db = createTestDb()
  })

  it('calcule la progression sans compter les spéciaux ni les épisodes à venir', () => {
    const { episodes: eps } = seedShow(db, { tmdbId: 1, name: 'Test' })
    recordEpisodeWatch(db, eps[0]!.id, '2024-05-01T20:00:00.000Z')

    const items = listShows(db)
    expect(items[0]).toMatchObject({ aired: 2, watched: 1 })
  })

  it('filtre en-cours / a-jour / terminees / archivees', () => {
    const enCours = seedShow(db, { tmdbId: 1, name: 'En cours' })
    recordEpisodeWatch(db, enCours.episodes[0]!.id, '2024-05-01T20:00:00.000Z')

    const aJour = seedShow(db, { tmdbId: 2, name: 'À jour' })
    recordEpisodeWatch(db, aJour.episodes[0]!.id, '2024-05-01T20:00:00.000Z')
    recordEpisodeWatch(db, aJour.episodes[1]!.id, '2024-05-01T20:00:00.000Z')

    const terminee = seedShow(db, { tmdbId: 3, name: 'Terminée', status: 'Ended' })
    recordEpisodeWatch(db, terminee.episodes[0]!.id, '2024-05-01T20:00:00.000Z')
    recordEpisodeWatch(db, terminee.episodes[1]!.id, '2024-05-01T20:00:00.000Z')

    seedShow(db, { tmdbId: 4, name: 'Archivée', archived: true })

    expect(listShows(db, 'en-cours').map(item => item.name)).toEqual(['En cours'])
    expect(listShows(db, 'a-jour').map(item => item.name)).toEqual(['À jour'])
    expect(listShows(db, 'terminees').map(item => item.name)).toEqual(['Terminée'])
    expect(listShows(db, 'archivees').map(item => item.name)).toEqual(['Archivée'])
    expect(listShows(db)).toHaveLength(3)
  })

  it('propose le prochain épisode à voir, trié par visionnage récent', () => {
    const showA = seedShow(db, { tmdbId: 1, name: 'A' })
    recordEpisodeWatch(db, showA.episodes[0]!.id, '2024-01-01T20:00:00.000Z')
    const showB = seedShow(db, { tmdbId: 2, name: 'B' })
    recordEpisodeWatch(db, showB.episodes[0]!.id, '2025-01-01T20:00:00.000Z')
    seedShow(db, { tmdbId: 3, name: 'Archivée', archived: true })

    const items = upNext(db)
    expect(items.map(item => item.showName)).toEqual(['B', 'A'])
    expect(items[0]).toMatchObject({ seasonNumber: 1, episodeNumber: 2, remaining: 1 })
  })

  it('expose followedAt et lastWatchedAt null pour distinguer les séries jamais commencées', () => {
    const jamaisVue = seedShow(db, { tmdbId: 1, name: 'Jamais vue' })
    upsertShowState(db, jamaisVue.show.id, { followedAt: '2026-01-01T10:00:00.000Z' })

    const items = upNext(db)
    expect(items[0]).toMatchObject({
      showName: 'Jamais vue',
      lastWatchedAt: null,
      followedAt: '2026-01-01T10:00:00.000Z',
    })
  })

  it('détaille une série avec compteurs par saison et re-visionnages', () => {
    const { show, episodes: eps } = seedShow(db, { tmdbId: 1, name: 'Détail' })
    recordEpisodeWatch(db, eps[0]!.id, '2024-05-01T20:00:00.000Z')
    const rewatch = recordEpisodeWatch(db, eps[0]!.id, '2025-05-01T20:00:00.000Z')
    expect(rewatch.isRewatch).toBe(true)

    const detail = getShowDetail(db, show.id)
    expect(detail.progress).toEqual({ aired: 2, watched: 1 })
    const season1 = detail.seasons.find(season => season.seasonNumber === 1)
    expect(season1?.episodes[0]).toMatchObject({ watchCount: 2 })

    deleteEpisodeWatch(db, eps[0]!.id, rewatch.watchId)
    const after = getShowDetail(db, show.id)
    expect(after.seasons.find(s => s.seasonNumber === 1)?.episodes[0]?.watchCount).toBe(1)
  })

  it('marque une saison entière comme vue sans doublons ni épisodes futurs', () => {
    const { show, episodes: eps } = seedShow(db, { tmdbId: 1, name: 'Saison' })
    recordEpisodeWatch(db, eps[0]!.id, '2024-05-01T20:00:00.000Z')

    const inserted = markSeasonWatched(db, show.id, 1, '2026-01-01T12:00:00.000Z')
    expect(inserted).toBe(1)
    expect(markSeasonWatched(db, show.id, 1, '2026-01-01T12:00:00.000Z')).toBe(0)
  })

  it('marque une série entière comme vue sans spéciaux, doublons ni épisodes futurs', () => {
    const { show, episodes: eps } = seedShow(db, { tmdbId: 1, name: 'Série entière' })
    db.insert(episodes)
      .values({ showId: show.id, seasonNumber: 2, episodeNumber: 1, airDate: PAST })
      .run()
    recordEpisodeWatch(db, eps[0]!.id, '2024-05-01T20:00:00.000Z')

    const inserted = markShowWatched(db, show.id, '2026-01-01T12:00:00.000Z')
    expect(inserted).toBe(2)
    expect(markShowWatched(db, show.id, '2026-01-01T12:00:00.000Z')).toBe(0)

    const items = listShows(db)
    expect(items[0]).toMatchObject({ aired: 3, watched: 3 })
  })

  it('trie la bibliothèque par activité récente (visionnage puis date de suivi)', () => {
    const ancienne = seedShow(db, { tmdbId: 1, name: 'Ancienne' })
    recordEpisodeWatch(db, ancienne.episodes[0]!.id, '2024-05-01T20:00:00.000Z')

    const recente = seedShow(db, { tmdbId: 2, name: 'Récente' })
    recordEpisodeWatch(db, recente.episodes[0]!.id, '2025-05-01T20:00:00.000Z')

    const jamaisVue = seedShow(db, { tmdbId: 3, name: 'Jamais vue' })
    upsertShowState(db, jamaisVue.show.id, { followedAt: '2026-01-01T10:00:00.000Z' })

    const items = listShows(db)
    expect(items.map(item => item.name)).toEqual(['Jamais vue', 'Récente', 'Ancienne'])
    expect(items[0]?.followedAt).toBe('2026-01-01T10:00:00.000Z')
  })

  it('enrichit les résultats de découverte avec l’état local des séries', () => {
    const { show, episodes: eps } = seedShow(db, { tmdbId: 123, name: 'Déjà suivie' })
    recordEpisodeWatch(db, eps[0]!.id, '2024-05-01T20:00:00.000Z')

    const items = enrichShowItems(db, [
      {
        tmdbId: 123,
        title: 'Déjà suivie',
        releaseDate: null,
        posterPath: null,
        overview: null,
      },
    ])

    expect(items[0]).toMatchObject({
      mediaId: show.id,
      isFollowed: true,
      isWatched: true,
    })
  })
})

describe('services films et watchlist', () => {
  let db: TestDb

  beforeEach(() => {
    db = createTestDb()
  })

  it('liste les films vus et retire de la watchlist au visionnage', () => {
    const movie = db
      .insert(movies)
      .values({ tmdbId: 550, title: 'Fight Club', runtime: 139 })
      .returning()
      .get()
    db.insert(watchlistItems).values({ mediaType: 'movie', movieId: movie.id }).run()
    expect(listWatchlist(db)).toHaveLength(1)

    recordMovieWatch(db, movie.id, '2026-06-01T21:00:00.000Z')

    expect(listWatchlist(db)).toHaveLength(0)
    const items = listMovies(db)
    expect(items[0]).toMatchObject({ title: 'Fight Club', watchCount: 1 })

    const detail = getMovieDetail(db, movie.id)
    expect(detail.watches).toHaveLength(1)
    expect(detail.inWatchlist).toBe(false)
  })

  it('compte les re-visionnages de films', () => {
    const movie = db.insert(movies).values({ tmdbId: 1, title: 'Dune' }).returning().get()
    recordMovieWatch(db, movie.id, '2024-01-01T21:00:00.000Z')
    const second = recordMovieWatch(db, movie.id, '2026-01-01T21:00:00.000Z')
    expect(second.isRewatch).toBe(true)
    expect(listMovies(db)[0]).toMatchObject({ watchCount: 2, lastWatchedAt: '2026-01-01T21:00:00.000Z' })
  })

  it('enrichit les résultats de découverte avec l’état local des films', () => {
    const movie = db.insert(movies).values({ tmdbId: 550, title: 'Fight Club' }).returning().get()
    recordMovieWatch(db, movie.id, '2026-06-01T21:00:00.000Z')

    const items = enrichMovieItems(db, [
      {
        tmdbId: 550,
        title: 'Fight Club',
        releaseDate: null,
        posterPath: null,
        overview: null,
      },
    ])

    expect(items[0]).toMatchObject({
      mediaId: movie.id,
      isWatched: true,
    })
  })
})
