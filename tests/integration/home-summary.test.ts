import { beforeEach, describe, expect, it } from 'vitest'
import { episodes, shows } from '../../server/db/schema'
import { homeSummary } from '../../server/services/home/homeSummary'
import { upsertShowState } from '../../server/services/shows/upsertShowState'
import { recordEpisodeWatch } from '../../server/services/watches/recordEpisodeWatch'
import { createTestDb, type TestDb } from '../helpers/testDb'

const DAY_MS = 24 * 60 * 60 * 1000

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10)
}

interface SeedEpisode {
  readonly seasonNumber?: number
  readonly episodeNumber: number
  readonly airDate: string
  readonly runtime?: number
}

function seedFollowedShow(db: TestDb, tmdbId: number, name: string, eps: readonly SeedEpisode[]) {
  const show = db.insert(shows).values({ tmdbId, name }).returning().get()
  upsertShowState(db, show.id, { isFollowed: true, isArchived: false })
  const inserted = db
    .insert(episodes)
    .values(
      eps.map(episode => ({
        showId: show.id,
        seasonNumber: episode.seasonNumber ?? 1,
        episodeNumber: episode.episodeNumber,
        airDate: episode.airDate,
        runtime: episode.runtime ?? null,
      })),
    )
    .returning()
    .all()
  return { show, episodes: inserted }
}

describe('service accueil (homeSummary)', () => {
  let db: TestDb

  beforeEach(() => {
    db = createTestDb()
  })

  it('répartit les épisodes par urgence et calcule les totaux', () => {
    // Série commencée dont le prochain épisode est sorti cette semaine → fresh.
    const fresh = seedFollowedShow(db, 1, 'Fresh', [
      { episodeNumber: 1, airDate: isoDaysAgo(30), runtime: 20 },
      { episodeNumber: 2, airDate: isoDaysAgo(2), runtime: 40 },
    ])
    recordEpisodeWatch(db, fresh.episodes[0]!.id, '2024-01-01T20:00:00.000Z')

    // Série commencée dont le prochain épisode est ancien → backlog.
    const backlog = seedFollowedShow(db, 2, 'Backlog', [
      { episodeNumber: 1, airDate: isoDaysAgo(60), runtime: 30 },
      { episodeNumber: 2, airDate: isoDaysAgo(30), runtime: 50 },
    ])
    recordEpisodeWatch(db, backlog.episodes[0]!.id, '2024-01-01T20:00:00.000Z')

    // Série jamais commencée avec des épisodes diffusés → à commencer.
    seedFollowedShow(db, 3, 'ToStart', [{ episodeNumber: 1, airDate: isoDaysAgo(30), runtime: 25 }])

    // Série à jour avec un épisode à venir → bientôt.
    const soon = seedFollowedShow(db, 4, 'Soon', [
      { episodeNumber: 1, airDate: isoDaysAgo(30), runtime: 45 },
      { episodeNumber: 2, airDate: new Date(Date.now() + 3 * DAY_MS).toISOString().slice(0, 10) },
    ])
    recordEpisodeWatch(db, soon.episodes[0]!.id, '2024-01-01T20:00:00.000Z')

    const summary = homeSummary(db)

    expect(summary.freshThisWeek.map(item => item.showName)).toEqual(['Fresh'])
    expect(summary.backlog.map(item => item.showName)).toEqual(['Backlog'])
    expect(summary.toStart.map(item => item.showName)).toEqual(['ToStart'])
    expect(summary.toStart[0]).toMatchObject({ episodeCount: 1 })
    expect(summary.soon.map(item => item.showName)).toEqual(['Soon'])

    // Épisodes prêts à regarder = fresh + backlog (un prochain épisode par série).
    expect(summary.episodeCount).toBe(2)
    // Durée cumulée = runtime des prochains épisodes fresh (40) + backlog (50).
    expect(summary.totalRuntime).toBe(90)
  })

  it('exclut les séries archivées', () => {
    const show = db.insert(shows).values({ tmdbId: 1, name: 'Archivée' }).returning().get()
    upsertShowState(db, show.id, { isFollowed: true, isArchived: true })
    db.insert(episodes)
      .values({ showId: show.id, seasonNumber: 1, episodeNumber: 1, airDate: isoDaysAgo(2) })
      .run()

    const summary = homeSummary(db)
    expect(summary.freshThisWeek).toHaveLength(0)
    expect(summary.backlog).toHaveLength(0)
    expect(summary.toStart).toHaveLength(0)
    expect(summary.soon).toHaveLength(0)
  })
})
