import {
  DEFAULT_LANGUAGE,
  LANGUAGE_CONFIGS,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
  normalizeAppLanguage,
} from '../../shared/config/languages'

export interface LanguageSelectItem {
  label: string
  value: AppLanguage
  description: string
}

export function useAppLanguage() {
  const language = useState<AppLanguage>('app-display-language', () => DEFAULT_LANGUAGE)

  const currentLanguage = computed(() => LANGUAGE_CONFIGS[language.value])
  const locale = computed(() => currentLanguage.value.intlLocale)
  const languageOptions = computed<LanguageSelectItem[]>(() =>
    SUPPORTED_LANGUAGES.map(item => ({
      label: item.nativeLabel,
      value: item.code,
      description: item.label,
    })),
  )

  function setLocalLanguage(value: unknown) {
    language.value = normalizeAppLanguage(value)
  }

  return {
    language,
    currentLanguage,
    locale,
    languageOptions,
    setLocalLanguage,
  }
}
