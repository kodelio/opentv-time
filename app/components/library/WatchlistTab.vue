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
      <UCard v-for="item in filteredItems" :key="item.id" :ui="{ body: 'p-3 sm:p-3' }">
        <div class="flex items-center gap-3">
          <NuxtLink
            :to="item.mediaType === 'movie' ? `/movies/${item.mediaId}` : `/shows/${item.mediaId}`"
            class="block w-12 shrink-0"
          >
            <div class="aspect-[2/3] overflow-hidden rounded-md">
              <MediaTmdbImage :path="item.posterPath" :alt="item.title" kind="posterSmall" />
            </div>
          </NuxtLink>
          <div class="min-w-0 flex-1">
            <NuxtLink
              :to="item.mediaType === 'movie' ? `/movies/${item.mediaId}` : `/shows/${item.mediaId}`"
              class="block truncate font-medium"
            >
              {{ item.title }}
            </NuxtLink>
            <p class="text-xs text-muted">
              {{ item.mediaType === 'movie' ? t('common.movie') : t('common.show') }}
              <template v-if="item.releaseDate"> · {{ yearOf(item.releaseDate) }}</template>
            </p>
          </div>
          <UButton
            v-if="item.mediaType === 'movie'"
            icon="i-lucide-check"
            color="primary"
            variant="soft"
            :aria-label="t('common.watchNow')"
            @click="openModal(item.mediaId, item.title)"
          />
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            :aria-label="t('library.removeFromWatchlist')"
            @click="removeItem(item.id)"
          />
        </div>
      </UCard>
    </div>

    <WatchMarkSeenModal v-model:open="modal.open" :title="modal.title" @confirm="markMovieSeen" />
  </div>
</template>
