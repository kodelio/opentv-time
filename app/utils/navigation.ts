import type { MessageKey } from './i18n/messages'

export interface AppNavItem {
  readonly labelKey: MessageKey
  readonly to: string
  readonly icon: string
}

export const ROUTES = {
  home: '/',
  upcoming: '/upcoming',
  library: '/library',
  discover: '/discover',
  stats: '/stats',
  settings: '/settings',
} as const

export function movieRoute(movieId: number | string): string {
  return `/movies/${movieId}`
}

export function showRoute(showId: number | string): string {
  return `/shows/${showId}`
}

export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  { labelKey: 'nav.home', to: ROUTES.home, icon: 'i-lucide-house' },
  { labelKey: 'nav.upcoming', to: ROUTES.upcoming, icon: 'i-lucide-calendar-days' },
  { labelKey: 'nav.library', to: ROUTES.library, icon: 'i-lucide-library-big' },
  { labelKey: 'nav.discover', to: ROUTES.discover, icon: 'i-lucide-compass' },
  { labelKey: 'nav.stats', to: ROUTES.stats, icon: 'i-lucide-chart-column' },
]
