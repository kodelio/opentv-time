import { defineTask, useRuntimeConfig } from '#imports'
import { useDb } from '../../db/client'
import { refreshFollowedShows } from '../../services/sync/refreshShows'
import { usePreferredTmdb } from '../../utils/tmdb/usePreferredTmdb'

export default defineTask({
  meta: {
    name: 'tmdb:refresh',
    description: 'Refreshes TMDB metadata for followed shows',
  },
  async run() {
    const config = useRuntimeConfig()
    if (!config.tmdbApiKey) {
      console.warn('tmdb:refresh skipped: missing NUXT_TMDB_API_KEY')
      return { result: 'skipped: missing TMDB key' }
    }
    const db = useDb()
    const summary = await refreshFollowedShows(db, usePreferredTmdb(db), 'scheduled')
    if (summary.errors.length > 0) {
      console.error(`tmdb:refresh finished with ${summary.errors.length} error(s)`, summary.errors)
    }
    return {
      result: `${summary.refreshed} show(s) refreshed, ${summary.skipped} skipped, ${summary.errors.length} error(s)`,
    }
  },
})
