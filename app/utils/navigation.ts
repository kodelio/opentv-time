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

/** Route prefixes that belong to the "Library" tab (detail pages included). */
const LIBRARY_PREFIXES = ['/library', '/shows', '/movies', '/series', '/films'] as const

/** Whether a nav item is active for the current path. */
export function isNavItemActive(to: string, path: string): boolean {
  if (to === ROUTES.home) {
    return path === '/'
  }
  if (to === ROUTES.library) {
    return LIBRARY_PREFIXES.some(prefix => path.startsWith(prefix))
  }
  return path.startsWith(to)
}

export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  { labelKey: 'nav.home', to: ROUTES.home, icon: 'i-lucide-house' },
  { labelKey: 'nav.upcoming', to: ROUTES.upcoming, icon: 'i-lucide-calendar-days' },
  { labelKey: 'nav.library', to: ROUTES.library, icon: 'i-lucide-library-big' },
  { labelKey: 'nav.discover', to: ROUTES.discover, icon: 'i-lucide-compass' },
  { labelKey: 'nav.stats', to: ROUTES.stats, icon: 'i-lucide-chart-column' },
]
