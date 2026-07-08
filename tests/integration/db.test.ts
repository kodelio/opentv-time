import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import {
  episodes,
  episodeWatches,
  movies,
  shows,
  showStates,
  watchlistItems,
} from '../../server/db/schema'
import { createTestDb } from '../helpers/testDb'

function insertShow(db: ReturnType<typeof createTestDb>) {
  return db
    .insert(shows)
    .values({ tmdbId: 5544, tvdbId: 70851, name: 'Stargate Atlantis' })
    .returning()
    .get()
}

describe('schéma de base de données', () => {
  it('applique les migrations et insère une série avec épisodes et visionnage', () => {
    const db = createTestDb()
    const show = insertShow(db)
    db.insert(showStates).values({ showId: show.id, isFollowed: true }).run()
    const episode = db
      .insert(episodes)
      .values({ showId: show.id, seasonNumber: 1, episodeNumber: 1, tmdbId: 100 })
      .returning()
      .get()
    db.insert(episodeWatches)
      .values({ episodeId: episode.id, watchedAt: '2026-01-10T20:00:00Z', sourceUuid: 'uuid-1' })
      .run()

    const watched = db.select().from(episodeWatches).all()
    expect(watched).toHaveLength(1)
    expect(watched[0]?.source).toBe('app')
    expect(watched[0]?.createdAt).toMatch(/^\d{4}-/)
  })

  it('refuse deux séries avec le même tmdbId', () => {
    const db = createTestDb()
    insertShow(db)

    expect(() => insertShow(db)).toThrow(/UNIQUE/i)
  })

  it('déduplique les visionnages par sourceUuid', () => {
    const db = createTestDb()
    const show = insertShow(db)
    const episode = db
      .insert(episodes)
      .values({ showId: show.id, seasonNumber: 1, episodeNumber: 1 })
      .returning()
      .get()
    const watch = {
      episodeId: episode.id,
      watchedAt: '2026-01-10T20:00:00Z',
      sourceUuid: 'dup',
    }
    db.insert(episodeWatches).values(watch).onConflictDoNothing().run()
    db.insert(episodeWatches).values(watch).onConflictDoNothing().run()

    expect(db.select().from(episodeWatches).all()).toHaveLength(1)
  })

  it('supprime en cascade les épisodes et visionnages avec la série', () => {
    const db = createTestDb()
    const show = insertShow(db)
    const episode = db
      .insert(episodes)
      .values({ showId: show.id, seasonNumber: 1, episodeNumber: 1 })
      .returning()
      .get()
    db.insert(episodeWatches)
      .values({ episodeId: episode.id, watchedAt: '2026-01-10T20:00:00Z' })
      .run()

    db.delete(shows).where(eq(shows.id, show.id)).run()

    expect(db.select().from(episodes).all()).toHaveLength(0)
    expect(db.select().from(episodeWatches).all()).toHaveLength(0)
  })

  it('impose exactement une cible par élément de watchlist', () => {
    const db = createTestDb()
    const show = insertShow(db)
    const movie = db.insert(movies).values({ tmdbId: 550, title: 'Fight Club' }).returning().get()

    db.insert(watchlistItems).values({ mediaType: 'movie', movieId: movie.id }).run()

    expect(() =>
      db
        .insert(watchlistItems)
        .values({ mediaType: 'show', movieId: movie.id, showId: show.id })
        .run(),
    ).toThrow(/CHECK/i)
  })
})
