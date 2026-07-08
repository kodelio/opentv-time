import type { NuxtApp } from '#app'

/**
 * `getCachedData` policy for `useFetch`: reuse the SSR payload during hydration,
 * then refetch on each client navigation so library-dependent flags stay fresh.
 */
export function freshCachedData<T>(key: string, nuxtApp: NuxtApp): T | undefined {
  if (nuxtApp.isHydrating) {
    return nuxtApp.payload.data[key] as T | undefined
  }
  return undefined
}
