const COMBINING_DIACRITICS = /[\u0300-\u036f]/g

function normalizeText(text: string): string {
  return text.normalize('NFD').replace(COMBINING_DIACRITICS, '').toLowerCase()
}

/**
 * Case-insensitive and accent-insensitive local search.
 * An empty or whitespace-only query accepts everything.
 */
export function matchesQuery(text: string, query: string): boolean {
  const normalizedQuery = normalizeText(query.trim())
  if (normalizedQuery === '') {
    return true
  }
  return normalizeText(text).includes(normalizedQuery)
}
