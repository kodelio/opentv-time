import type { Db } from '../../db/createDb'
import { importPending, type ImportCandidate, type ImportPendingKind } from '../../db/schema'

export interface PendingItemInput {
  readonly kind: ImportPendingKind
  readonly dedupeKey: string
  readonly rawTitle: string
  readonly releaseYear?: number | null
  readonly runtime?: number | null
  readonly sourceRows: readonly unknown[]
  readonly candidates?: readonly ImportCandidate[]
}

export function addPendingItem(db: Db, item: PendingItemInput): void {
  db.insert(importPending)
    .values({
      kind: item.kind,
      dedupeKey: item.dedupeKey,
      rawTitle: item.rawTitle,
      releaseYear: item.releaseYear ?? null,
      runtime: item.runtime ?? null,
      sourceRows: item.sourceRows,
      candidates: item.candidates ?? [],
    })
    .onConflictDoNothing()
    .run()
}
