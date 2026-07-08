import { eq } from 'drizzle-orm'
import type { TmdbSeason, TmdbTvDetails } from '../../../shared/schemas/tmdb'
import { chunk } from '../../../shared/utils/chunk'
import { nowIso } from '../../../shared/utils/time'
import type { Db } from '../../db/createDb'
import { episodes, seasons, shows } from '../../db/schema'

const EPISODE_INSERT_BATCH = 100

function showValuesOf(details: TmdbTvDetails, tvdbId: number | null) {
  return {
    tmdbId: details.id,
    tvdbId,
    name: details.name,
    originalName: details.original_name ?? null,
    overview: details.overview ?? null,
    posterPath: details.poster_path ?? null,
    backdropPath: details.backdrop_path ?? null,
    firstAirDate: details.first_air_date,
    status: details.status ?? null,
    inProduction: details.in_production,
    genres: details.genres.map(genre => genre.name),
    numberOfSeasons: details.number_of_seasons,
    numberOfEpisodes: details.number_of_episodes,
    episodeRunTime: details.episode_run_time[0] ?? null,
    nextEpisodeAirDate: details.next_episode_to_air?.air_date ?? null,
    lastSyncedAt: nowIso(),
  }
}

export function upsertShowFromTmdb(
  db: Db,
  details: TmdbTvDetails,
  seasonsData: readonly TmdbSeason[],
  tvdbId: number | null = null,
): number {
  return db.transaction((tx) => {
    const values = showValuesOf(details, tvdbId)
    const { tvdbId: _ignored, ...updateSet } = values
    tx.insert(shows)
      .values(values)
      .onConflictDoUpdate({
        target: shows.tmdbId,
        set: tvdbId === null ? updateSet : values,
      })
      .run()
    const show = tx.select({ id: shows.id }).from(shows).where(eq(shows.tmdbId, details.id)).get()
    if (!show) {
      throw new Error(`TMDB show ${details.id} not found after insert`)
    }

    for (const summary of details.seasons) {
      tx.insert(seasons)
        .values({
          showId: show.id,
          tmdbId: summary.id,
          seasonNumber: summary.season_number,
          name: summary.name ?? null,
          posterPath: summary.poster_path ?? null,
          episodeCount: summary.episode_count ?? 0,
          airDate: summary.air_date,
        })
        .onConflictDoUpdate({
          target: [seasons.showId, seasons.seasonNumber],
          set: {
            tmdbId: summary.id,
            name: summary.name ?? null,
            posterPath: summary.poster_path ?? null,
            episodeCount: summary.episode_count ?? 0,
            airDate: summary.air_date,
          },
        })
        .run()
    }

    const episodeValues = seasonsData.flatMap(season =>
      season.episodes.map(episode => ({
        showId: show.id,
        seasonNumber: episode.season_number,
        episodeNumber: episode.episode_number,
        tmdbId: episode.id,
        name: episode.name ?? null,
        overview: episode.overview ?? null,
        airDate: episode.air_date,
        runtime: episode.runtime ?? null,
        stillPath: episode.still_path ?? null,
      })),
    )
    for (const batch of chunk(episodeValues, EPISODE_INSERT_BATCH)) {
      for (const value of batch) {
        tx.insert(episodes)
          .values(value)
          .onConflictDoUpdate({
            target: [episodes.showId, episodes.seasonNumber, episodes.episodeNumber],
            set: {
              tmdbId: value.tmdbId,
              name: value.name,
              overview: value.overview,
              airDate: value.airDate,
              runtime: value.runtime,
              stillPath: value.stillPath,
            },
          })
          .run()
      }
    }

    return show.id
  })
}
