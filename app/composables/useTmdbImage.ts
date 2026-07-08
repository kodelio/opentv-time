import { TMDB_IMAGE_SIZES, tmdbImageUrl, type TmdbImageSize } from '#shared/utils/tmdbImages'

export type TmdbImageKind = keyof typeof TMDB_IMAGE_SIZES

export function useTmdbImage() {
  const config = useRuntimeConfig()

  function imageUrl(path: string | null | undefined, kind: TmdbImageKind = 'poster'): string | null {
    const size: TmdbImageSize = TMDB_IMAGE_SIZES[kind]
    return tmdbImageUrl(config.public.tmdbImageBase, size, path)
  }

  return { imageUrl }
}
