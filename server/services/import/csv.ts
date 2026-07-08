import { parse } from 'csv-parse/sync'

export type CsvRow = Readonly<Record<string, string>>

/**
 * Parses CSV content into rows indexed by column name.
 * Tolerates extra/missing columns and BOM. Empty content returns `[]`.
 */
export function parseCsv(content: string): readonly CsvRow[] {
  try {
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      bom: true,
    }) as CsvRow[]
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`Unreadable CSV content: ${detail}`)
  }
}

export function toNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
