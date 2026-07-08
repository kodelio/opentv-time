import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

export type Db = ReturnType<typeof createDb>

const IN_MEMORY = ':memory:'

export function createDb(databasePath: string) {
  try {
    if (databasePath !== IN_MEMORY) {
      mkdirSync(dirname(databasePath), { recursive: true })
    }
    const sqlite = new Database(databasePath)
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('busy_timeout = 5000')
    sqlite.pragma('foreign_keys = ON')
    return drizzle(sqlite, { schema })
  } catch (error) {
    console.error('Failed to open SQLite database:', error)
    throw new Error(`Could not open database "${databasePath}"`)
  }
}
