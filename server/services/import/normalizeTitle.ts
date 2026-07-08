const COMBINING_MARKS = /[̀-ͯ]/g

export function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export function extractAlphaSlug(alphaRangeKey: string | undefined): string | null {
  if (!alphaRangeKey) {
    return null
  }
  const marker = 'alpha-'
  const index = alphaRangeKey.lastIndexOf(marker)
  if (index === -1) {
    return null
  }
  const slug = alphaRangeKey.slice(index + marker.length).trim()
  return slug === '' ? null : slug
}

export function slugToQuery(slug: string): string {
  return slug.replace(/-+/g, ' ').trim()
}
