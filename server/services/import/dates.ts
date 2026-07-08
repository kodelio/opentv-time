const CSV_DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
const MIN_VALID_YEAR = 1900

export function csvDateToIso(value: string | undefined): string | null {
  if (!value) {
    return null
  }
  const match = CSV_DATETIME_PATTERN.exec(value.trim())
  if (!match) {
    return null
  }
  const year = Number(match[1])
  if (year < MIN_VALID_YEAR) {
    return null
  }
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}.000Z`
}

export function unixToIso(seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null
  }
  const date = new Date(seconds * 1000)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function extractUnixFromRangeKey(value: string | undefined): number | null {
  if (!value) {
    return null
  }
  const match = /-(\d{9,13})$/.exec(value.trim())
  if (!match) {
    return null
  }
  return Number(match[1])
}

export function yearFromDate(value: string | undefined): number | null {
  if (!value) {
    return null
  }
  const year = Number(value.slice(0, 4))
  if (!Number.isFinite(year) || year < MIN_VALID_YEAR) {
    return null
  }
  return year
}
