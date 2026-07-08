import { eq } from 'drizzle-orm'
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_CONFIGS,
  type AppLanguage,
  normalizeAppLanguage,
} from '../../../shared/config/languages'
import { nowIso } from '../../../shared/utils/time'
import type { Db } from '../../db/createDb'
import { appSettings } from '../../db/schema'

const SETTINGS_ID = 1

export interface AppSettings {
  readonly displayLanguage: AppLanguage
}

export interface TmdbLocaleSettings {
  readonly language: string
  readonly region: string
}

function toAppSettings(row: typeof appSettings.$inferSelect): AppSettings {
  return { displayLanguage: normalizeAppLanguage(row.displayLanguage) }
}

export function getAppSettings(db: Db): AppSettings {
  const row = db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, SETTINGS_ID))
    .get()

  if (row) {
    return toAppSettings(row)
  }

  db.insert(appSettings)
    .values({ id: SETTINGS_ID, displayLanguage: DEFAULT_LANGUAGE })
    .onConflictDoNothing()
    .run()

  const created = db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, SETTINGS_ID))
    .get()

  return created ? toAppSettings(created) : { displayLanguage: DEFAULT_LANGUAGE }
}

export function updateAppSettings(db: Db, input: AppSettings): AppSettings {
  const displayLanguage = normalizeAppLanguage(input.displayLanguage)
  db.insert(appSettings)
    .values({ id: SETTINGS_ID, displayLanguage, updatedAt: nowIso() })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: { displayLanguage, updatedAt: nowIso() },
    })
    .run()
  return getAppSettings(db)
}

export function tmdbLocaleForSettings(settings: AppSettings): TmdbLocaleSettings {
  const config = LANGUAGE_CONFIGS[settings.displayLanguage]
  return { language: config.tmdbLanguage, region: config.tmdbRegion }
}
