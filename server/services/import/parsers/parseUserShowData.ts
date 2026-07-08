import { toNumber, type CsvRow } from '../csv'
import type { UserShowDataRecord } from '../types'

export function parseUserShowData(rows: readonly CsvRow[]): readonly UserShowDataRecord[] {
  return rows.flatMap((row) => {
    const tvdbId = toNumber(row.tv_show_id)
    if (tvdbId === null) {
      return []
    }
    return [
      {
        tvdbId,
        name: row.tv_show_name ?? '',
        isFollowed: row.is_followed === '1',
        isFavorite: row.is_favorited === '1',
      } satisfies UserShowDataRecord,
    ]
  })
}
