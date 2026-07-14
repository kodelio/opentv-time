import {
  DEFAULT_LANGUAGE,
  LANGUAGE_CONFIGS,
  type AppLanguage,
} from '../../shared/config/languages'
import { useAppLanguage } from '../composables/useAppLanguage'
import { translateMessage, type MessageKey } from './i18n/messages'

function currentLanguage(): AppLanguage {
  try {
    return useAppLanguage().language.value
  } catch {
    return DEFAULT_LANGUAGE
  }
}

function currentLocale(): string {
  return LANGUAGE_CONFIGS[currentLanguage()].intlLocale
}

function t(key: MessageKey, params?: Record<string, string | number>): string {
  return translateMessage(currentLanguage(), key, params)
}

function toDate(value: string): Date | null {
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return ''
  }
  const date = toDate(value)
  return date
    ? new Intl.DateTimeFormat(currentLocale(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date)
    : ''
}

export function yearOf(value: string | null | undefined): string {
  return value ? value.slice(0, 4) : ''
}

export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) {
    return ''
  }
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) {
    return `${rest} ${t('duration.minute')}`
  }
  return rest === 0
    ? `${hours} ${t('duration.hour')}`
    : `${hours} ${t('duration.hour')} ${String(rest).padStart(2, '0')}`
}

export function episodeCode(seasonNumber: number, episodeNumber: number): string {
  const season = String(seasonNumber).padStart(2, '0')
  const episode = String(episodeNumber).padStart(2, '0')
  return `S${season}E${episode}`
}

const SHOW_STATUS_LABELS: Readonly<Record<string, MessageKey>> = {
  'Returning Series': 'status.returning',
  'In Production': 'status.inProduction',
  'Planned': 'status.planned',
  'Ended': 'status.ended',
  'Canceled': 'status.canceled',
  'Pilot': 'status.pilot',
}

export function showStatusLabel(status: string | null | undefined): string {
  if (!status) {
    return ''
  }
  const key = SHOW_STATUS_LABELS[status]
  return key ? t(key) : status
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR

export function formatLongDuration(minutes: number): string {
  if (minutes < MINUTES_PER_HOUR) {
    return `${minutes} min`
  }
  if (minutes < MINUTES_PER_DAY) {
    return formatDuration(minutes)
  }
  const days = Math.floor(minutes / MINUTES_PER_DAY)
  const hours = Math.floor((minutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR)
  return hours === 0
    ? `${days} ${t('duration.day')}`
    : `${days} ${t('duration.day')} ${hours} ${t('duration.hour')}`
}

export function relativeDayLabel(isoDate: string): string {
  const today = todayIsoDate()
  if (isoDate === today) {
    return t('date.today')
  }
  const tomorrow = new Date(Date.now() + MINUTES_PER_DAY * 60 * 1000).toISOString().slice(0, 10)
  if (isoDate === tomorrow) {
    return t('date.tomorrow')
  }
  const label = new Intl.DateTimeFormat(currentLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${isoDate}T12:00:00Z`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function shortMonthLabel(yearMonth: string): string {
  return new Intl.DateTimeFormat(currentLocale(), { month: 'short' }).format(
    new Date(`${yearMonth}-15T12:00:00Z`),
  )
}

function isoDaysFromToday(days: number): string {
  return new Date(Date.now() + days * MINUTES_PER_DAY * 60 * 1000).toISOString().slice(0, 10)
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** "Out yesterday" / "Out Thursday" / "Out Jul 3" label for an already-aired episode. */
export function releasedLabel(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return ''
  }
  const today = todayIsoDate()
  if (isoDate >= today) {
    return t('home.released.today')
  }
  if (isoDate === isoDaysFromToday(-1)) {
    return t('home.released.yesterday')
  }
  const date = new Date(`${isoDate}T12:00:00Z`)
  if (isoDate >= isoDaysFromToday(-6)) {
    const day = new Intl.DateTimeFormat(currentLocale(), { weekday: 'long' }).format(date)
    return t('home.released.weekday', { day })
  }
  const day = new Intl.DateTimeFormat(currentLocale(), { day: 'numeric', month: 'short' }).format(date)
  return t('home.released.date', { date: day })
}

/** Compact future-day label: Today, Tomorrow, or "Tue 15". */
export function compactDayLabel(isoDate: string): string {
  if (isoDate === todayIsoDate()) {
    return t('date.today')
  }
  if (isoDate === isoDaysFromToday(1)) {
    return t('date.tomorrow')
  }
  return capitalize(
    new Intl.DateTimeFormat(currentLocale(), { weekday: 'short', day: 'numeric' }).format(
      new Date(`${isoDate}T12:00:00Z`),
    ),
  )
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(currentLocale()).format(value)
}
