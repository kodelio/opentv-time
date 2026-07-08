import { useDb } from '../../db/client'
import { extractGdprCsvFiles } from '../../services/import/readTvTimeZip'
import { runGdprImport, type GdprImportFiles } from '../../services/import/runGdprImport'
import { toHttpError } from '../../utils/handleServiceError'
import { usePreferredTmdb } from '../../utils/tmdb/usePreferredTmdb'

// Maximum accepted archive size. TV Time GDPR exports are usually only a few MB.
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  if (!config.tmdbApiKey) {
    throw createError({ statusCode: 503, message: 'TMDB API key is not configured' })
  }

  const form = await readMultipartFormData(event)
  const archive = form?.find(part => part.filename && part.data.length > 0)
  if (!archive) {
    throw createError({ statusCode: 400, message: 'No ZIP archive provided' })
  }
  if (archive.data.length > MAX_ARCHIVE_BYTES) {
    throw createError({ statusCode: 413, message: 'Archive is too large (max 50 MB)' })
  }

  let files: GdprImportFiles
  try {
    files = extractGdprCsvFiles(new Uint8Array(archive.data))
  } catch {
    throw createError({ statusCode: 400, message: 'Unreadable ZIP archive' })
  }

  if (files.trackingV2 === '' && files.trackingV1 === '') {
    throw createError({
      statusCode: 400,
      message:
        'Invalid archive: no TV Time tracking file found (tracking-prod-records*.csv)',
    })
  }

  try {
    const db = useDb()
    return await runGdprImport({ db, tmdb: usePreferredTmdb(db), files })
  } catch (error) {
    return toHttpError(error)
  }
})
