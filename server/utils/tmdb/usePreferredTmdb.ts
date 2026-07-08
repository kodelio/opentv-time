import type { Db } from '../../db/createDb'
import { getAppSettings, tmdbLocaleForSettings } from '../../services/settings/appSettings'
import { useTmdb } from './useTmdb'

export function usePreferredTmdb(db: Db) {
  return useTmdb(tmdbLocaleForSettings(getAppSettings(db)))
}
