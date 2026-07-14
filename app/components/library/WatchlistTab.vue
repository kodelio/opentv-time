<script setup lang="ts">
const props = withDefaults(defineProps<{ search?: string }>(), { search: '' })

const toast = useToast()
const { t } = useI18n()
const { data: items, refresh, status } = await useFetch('/api/watchlist', {
  getCachedData: freshCachedData,
})

const filteredItems = computed(() =>
  (items.value ?? []).filter(item => matchesQuery(item.title, props.search)),
)

const modal = reactive({ open: false, movieId: 0, title: '' })

async function markMovieSeen(watchedAt: string) {
  try {
    await $fetch(`/api/movies/${modal.movieId}/watches`, {
      method: 'POST',
      body: { watchedAt },
    })
    toast.add({ title: t('movie.markedWatched'), color: 'success' })
    await refresh()
  } catch (error) {
    console.error('Failed to mark movie:', error)
    toast.add({ title: t('movie.markFailed'), color: 'error' })
  }
}

async function removeItem(itemId: number) {
  try {
    await $fetch(`/api/watchlist/${itemId}`, { method: 'DELETE' })
    await refresh()
  } catch (error) {
    console.error('Failed to remove watchlist item:', error)
    toast.add({ title: t('library.removeFromWatchlist'), color: 'error' })
  }
}

function openModal(movieId: number, title: string) {
  modal.movieId = movieId
  modal.title = title
  modal.open = true
}
</script>

<template>
  <div>
    <div v-if="status === 'pending'" class="space-y-3">
      <USkeleton v-for="index in 6" :key="index" class="h-20 w-full" />
    </div>

    <UEmpty
      v-else-if="filteredItems.length === 0 && search.trim() !== ''"
      icon="i-lucide-search-x"
      :title="t('discover.noResultsTitle')"
      :description="t('library.noWatchlistSearch')"
    />

    <UEmpty
      v-else-if="filteredItems.length === 0"
      icon="i-lucide-bookmark"
      :title="t('library.emptyWatchlistTitle')"
      :description="t('library.emptyWatchlistDescription')"
    >
      <UButton to="/discover" :label="t('nav.discover')" icon="i-lucide-compass" />
    </UEmpty>

    <div v-else class="space-y-2">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="flex items-center gap-3 rounded-[10px] bg-muted p-3 ring-1 ring-white/8"
      >
        <NuxtLink
          :to="item.mediaType === 'movie' ? movieRoute(item.mediaId) : showRoute(item.mediaId)"
          class="block w-12 shrink-0"
        >
          <div class="aspect-[2/3] overflow-hidden rounded-md">
            <MediaTmdbImage :path="item.posterPath" :alt="item.title" kind="posterSmall" />
          </div>
        </NuxtLink>
        <div class="min-w-0 flex-1">
          <NuxtLink
            :to="item.mediaType === 'movie' ? movieRoute(item.mediaId) : showRoute(item.mediaId)"
            class="block truncate font-medium hover:text-highlighted"
          >
            {{ item.title }}
          </NuxtLink>
          <p class="text-xs text-muted">
            {{ item.mediaType === 'movie' ? t('common.movie') : t('common.show') }}
            <template v-if="item.releaseDate"> · {{ yearOf(item.releaseDate) }}</template>
          </p>
        </div>
        <button
          v-if="item.mediaType === 'movie'"
          type="button"
          :aria-label="t('common.watchNow')"
          class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors hover:bg-primary/20"
          @click="openModal(item.mediaId, item.title)"
        >
          <UIcon name="i-lucide-check" class="size-4" />
        </button>
        <button
          type="button"
          :aria-label="t('library.removeFromWatchlist')"
          class="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-default"
          @click="removeItem(item.id)"
        >
          <UIcon name="i-lucide-x" class="size-4" />
        </button>
      </div>
    </div>

    <WatchMarkSeenModal v-model:open="modal.open" :title="modal.title" @confirm="markMovieSeen" />
  </div>
</template>
