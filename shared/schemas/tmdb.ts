import { z } from 'zod'

const emptyableDate = z
  .string()
  .nullish()
  .transform(value => (value ? value : null))

export const tmdbGenreSchema = z.object({
  id: z.number(),
  name: z.string(),
})

export const tmdbMovieSummarySchema = z.object({
  id: z.number(),
  title: z.string(),
  original_title: z.string().nullish(),
  overview: z.string().nullish(),
  poster_path: z.string().nullish(),
  backdrop_path: z.string().nullish(),
  release_date: emptyableDate,
  genre_ids: z.array(z.number()).optional(),
  popularity: z.number().optional(),
  vote_average: z.number().optional(),
})

export const tmdbTvSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  original_name: z.string().nullish(),
  overview: z.string().nullish(),
  poster_path: z.string().nullish(),
  backdrop_path: z.string().nullish(),
  first_air_date: emptyableDate,
  genre_ids: z.array(z.number()).optional(),
  popularity: z.number().optional(),
  vote_average: z.number().optional(),
})

export const tmdbEpisodeSchema = z.object({
  id: z.number(),
  season_number: z.number(),
  episode_number: z.number(),
  name: z.string().nullish(),
  overview: z.string().nullish(),
  air_date: emptyableDate,
  runtime: z.number().nullish(),
  still_path: z.string().nullish(),
})

export const tmdbFindEpisodeSchema = tmdbEpisodeSchema.extend({
  show_id: z.number(),
})

export const tmdbFindResultSchema = z.object({
  movie_results: z.array(tmdbMovieSummarySchema).default([]),
  tv_results: z.array(tmdbTvSummarySchema).default([]),
  tv_episode_results: z.array(tmdbFindEpisodeSchema).default([]),
})

export const tmdbSeasonSummarySchema = z.object({
  id: z.number(),
  season_number: z.number(),
  name: z.string().nullish(),
  poster_path: z.string().nullish(),
  air_date: emptyableDate,
  episode_count: z.number().nullish(),
})

export const tmdbSeasonSchema = z.object({
  id: z.number().nullish(),
  season_number: z.number(),
  name: z.string().nullish(),
  poster_path: z.string().nullish(),
  air_date: emptyableDate,
  episodes: z.array(tmdbEpisodeSchema).default([]),
})

export const tmdbTvDetailsSchema = z.object({
  id: z.number(),
  name: z.string(),
  original_name: z.string().nullish(),
  overview: z.string().nullish(),
  poster_path: z.string().nullish(),
  backdrop_path: z.string().nullish(),
  first_air_date: emptyableDate,
  status: z.string().nullish(),
  in_production: z.boolean().default(false),
  genres: z.array(tmdbGenreSchema).default([]),
  number_of_seasons: z.number().default(0),
  number_of_episodes: z.number().default(0),
  episode_run_time: z.array(z.number()).default([]),
  next_episode_to_air: tmdbEpisodeSchema.nullish(),
  seasons: z.array(tmdbSeasonSummarySchema).default([]),
})

export const tmdbMovieDetailsSchema = z.object({
  id: z.number(),
  title: z.string(),
  original_title: z.string().nullish(),
  overview: z.string().nullish(),
  poster_path: z.string().nullish(),
  backdrop_path: z.string().nullish(),
  release_date: emptyableDate,
  runtime: z.number().nullish(),
  genres: z.array(tmdbGenreSchema).default([]),
})

export function tmdbPagedSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    page: z.number().default(1),
    results: z.array(itemSchema).default([]),
    total_pages: z.number().default(1),
    total_results: z.number().default(0),
  })
}

export const tmdbMovieSearchSchema = tmdbPagedSchema(tmdbMovieSummarySchema)
export const tmdbTvSearchSchema = tmdbPagedSchema(tmdbTvSummarySchema)

export type TmdbGenre = z.infer<typeof tmdbGenreSchema>
export type TmdbMovieSummary = z.infer<typeof tmdbMovieSummarySchema>
export type TmdbTvSummary = z.infer<typeof tmdbTvSummarySchema>
export type TmdbEpisode = z.infer<typeof tmdbEpisodeSchema>
export type TmdbFindResult = z.infer<typeof tmdbFindResultSchema>
export type TmdbSeasonSummary = z.infer<typeof tmdbSeasonSummarySchema>
export type TmdbSeason = z.infer<typeof tmdbSeasonSchema>
export type TmdbTvDetails = z.infer<typeof tmdbTvDetailsSchema>
export type TmdbMovieDetails = z.infer<typeof tmdbMovieDetailsSchema>
