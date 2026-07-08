import { asc, eq } from 'drizzle-orm'
import { useDb } from '../../../db/client'
import { importPending } from '../../../db/schema'

export default defineEventHandler(() => {
  const db = useDb()
  const rows = db
    .select({
      id: importPending.id,
      kind: importPending.kind,
      rawTitle: importPending.rawTitle,
      releaseYear: importPending.releaseYear,
      runtime: importPending.runtime,
      sourceRows: importPending.sourceRows,
      candidates: importPending.candidates,
      createdAt: importPending.createdAt,
    })
    .from(importPending)
    .where(eq(importPending.status, 'pending'))
    .orderBy(asc(importPending.kind), asc(importPending.rawTitle))
    .all()

  return rows.map(({ sourceRows, ...row }) => ({
    ...row,
    sourceRowsCount: sourceRows.length,
  }))
})
