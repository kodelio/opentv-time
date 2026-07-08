import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type { Db } from './createDb'

export function runMigrations(db: Db, migrationsFolder: string): void {
  try {
    migrate(db, { migrationsFolder })
  } catch (error) {
    console.error('Database migrations failed:', error)
    throw new Error('Database migrations failed')
  }
}
