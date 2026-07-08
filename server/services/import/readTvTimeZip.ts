import { strFromU8, unzipSync } from 'fflate'
import type { GdprImportFiles } from './runGdprImport'

// Expected CSV names in the TV Time GDPR archive -> GdprImportFiles key.
const GDPR_CSV_FILES = {
  'tracking-prod-records-v2.csv': 'trackingV2',
  'tracking-prod-records.csv': 'trackingV1',
  'followed_tv_show.csv': 'followedShows',
  'user_tv_show_data.csv': 'userShowData',
} as const satisfies Record<string, keyof GdprImportFiles>

function basename(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] ?? path
}

/**
 * Extracts the 4 useful CSV files from a TV Time GDPR export ZIP.
 * Files are matched by basename, nested paths are tolerated, other files are
 * ignored, and a missing CSV returns an empty string.
 */
export function extractGdprCsvFiles(zip: Uint8Array): GdprImportFiles {
  const entries = unzipSync(zip)
  const files: { -readonly [K in keyof GdprImportFiles]: string } = {
    trackingV2: '',
    trackingV1: '',
    followedShows: '',
    userShowData: '',
  }
  for (const [path, data] of Object.entries(entries)) {
    const key = GDPR_CSV_FILES[basename(path) as keyof typeof GDPR_CSV_FILES]
    if (key) {
      files[key] = strFromU8(data)
    }
  }
  return files
}
