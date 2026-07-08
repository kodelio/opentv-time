import { toNumber, type CsvRow } from '../csv'
import { csvDateToIso } from '../dates'
import type { FollowedShowRecord } from '../types'

export function parseFollowedShows(rows: readonly CsvRow[]): readonly FollowedShowRecord[] {
  return rows.flatMap((row) => {
    const tvdbId = toNumber(row.tv_show_id)
    if (tvdbId === null) {
      return []
    }
    return [
      {
        tvdbId,
        name: row.tv_show_name ?? '',
        isArchived: row.archived === '1',
        followedAt: csvDateToIso(row.created_at),
      } satisfies FollowedShowRecord,
    ]
  })
}
