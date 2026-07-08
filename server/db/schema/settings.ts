import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { DEFAULT_LANGUAGE, type AppLanguage } from '../../../shared/config/languages'
import { nowIso } from '../../../shared/utils/time'

export const appSettings = sqliteTable('app_settings', {
  id: integer('id').primaryKey().default(1),
  displayLanguage: text('display_language').$type<AppLanguage>().notNull().default(DEFAULT_LANGUAGE),
  updatedAt: text('updated_at').notNull().$defaultFn(nowIso),
})
