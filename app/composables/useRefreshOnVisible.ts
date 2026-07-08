/**
 * Refreshes data when the app becomes visible again (PWA reopened,
 * tab refocused) to avoid showing stale state.
 */
export function useRefreshOnVisible(refresh: () => Promise<unknown> | unknown): void {
  if (import.meta.server) {
    return
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      void refresh()
    }
  }

  onMounted(() => document.addEventListener('visibilitychange', onVisibilityChange))
  onUnmounted(() => document.removeEventListener('visibilitychange', onVisibilityChange))
}
