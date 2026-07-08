export const DEFAULT_LANGUAGE = 'en'

export const SUPPORTED_LANGUAGE_CODES = ['en', 'fr', 'es', 'de', 'it', 'pt'] as const

export type AppLanguage = (typeof SUPPORTED_LANGUAGE_CODES)[number]

export interface LanguageConfig {
  readonly code: AppLanguage
  readonly label: string
  readonly nativeLabel: string
  readonly intlLocale: string
  readonly tmdbLanguage: string
  readonly tmdbRegion: string
}

export const LANGUAGE_CONFIGS: Record<AppLanguage, LanguageConfig> = {
  en: {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    intlLocale: 'en-US',
    tmdbLanguage: 'en-US',
    tmdbRegion: 'US',
  },
  fr: {
    code: 'fr',
    label: 'French',
    nativeLabel: 'Français',
    intlLocale: 'fr-FR',
    tmdbLanguage: 'fr-FR',
    tmdbRegion: 'FR',
  },
  es: {
    code: 'es',
    label: 'Spanish',
    nativeLabel: 'Español',
    intlLocale: 'es-ES',
    tmdbLanguage: 'es-ES',
    tmdbRegion: 'ES',
  },
  de: {
    code: 'de',
    label: 'German',
    nativeLabel: 'Deutsch',
    intlLocale: 'de-DE',
    tmdbLanguage: 'de-DE',
    tmdbRegion: 'DE',
  },
  it: {
    code: 'it',
    label: 'Italian',
    nativeLabel: 'Italiano',
    intlLocale: 'it-IT',
    tmdbLanguage: 'it-IT',
    tmdbRegion: 'IT',
  },
  pt: {
    code: 'pt',
    label: 'Portuguese',
    nativeLabel: 'Português',
    intlLocale: 'pt-PT',
    tmdbLanguage: 'pt-PT',
    tmdbRegion: 'PT',
  },
}

export const SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGE_CODES.map(code => LANGUAGE_CONFIGS[code])

export function isAppLanguage(value: unknown): value is AppLanguage {
  return (
    typeof value === 'string'
    && SUPPORTED_LANGUAGE_CODES.includes(value as AppLanguage)
  )
}

export function normalizeAppLanguage(value: unknown): AppLanguage {
  return isAppLanguage(value) ? value : DEFAULT_LANGUAGE
}
