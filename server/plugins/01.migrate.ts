import { defineNitroPlugin, useRuntimeConfig } from '#imports'
import { useDb } from '../db/client'
import { runMigrations } from '../db/migrate'

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  if (!config.tmdbApiKey) {
    console.warn(
      'Missing NUXT_TMDB_API_KEY: TMDB features (search, sync, discover) will fail.',
    )
  }
  runMigrations(useDb(), config.migrationsDir)
})
