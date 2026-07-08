import { createDb, type Db } from '../../server/db/createDb'
import { runMigrations } from '../../server/db/migrate'

export type TestDb = Db

export function createTestDb(): Db {
  const db = createDb(':memory:')
  runMigrations(db, 'server/db/migrations')
  return db
}
