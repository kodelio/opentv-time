export const DEFAULT_DATABASE_PATH = './data/opentvtime.sqlite'
export const DEFAULT_MIGRATIONS_DIR = 'server/db/migrations'

export const TMDB_DEFAULTS = {
  baseUrl: 'https://api.themoviedb.org/3',
  language: 'en-US',
  region: 'US',
  maxConcurrency: 4,
} as const

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'
