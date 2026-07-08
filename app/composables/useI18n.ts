import type { AppLanguage } from '../../shared/config/languages'
import {
  translateMessage,
  type MessageKey,
  type MessageParams,
} from '../utils/i18n/messages'

export function useI18n() {
  const { language, locale, languageOptions, setLocalLanguage } = useAppLanguage()

  function t(key: MessageKey, params?: MessageParams): string {
    return translateMessage(language.value, key, params)
  }

  return {
    t,
    language,
    locale,
    languageOptions,
    setLocalLanguage: setLocalLanguage as (value: AppLanguage) => void,
  }
}
