export const TMDB_IMAGE_SIZES = {
  posterSmall: 'w185',
  poster: 'w342',
  backdrop: 'w780',
  still: 'w300',
} as const

export type TmdbImageSize = (typeof TMDB_IMAGE_SIZES)[keyof typeof TMDB_IMAGE_SIZES]

export function tmdbImageUrl(
  baseUrl: string,
  size: TmdbImageSize,
  path: string | null | undefined,
): string | null {
  if (!path) {
    return null
  }
  return `${baseUrl}/${size}${path}`
}
