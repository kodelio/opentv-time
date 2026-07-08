<script setup lang="ts">
const toast = useToast()
const { t } = useI18n()

const SEARCH_DEBOUNCE_MS = 350

const query = ref('')
const debouncedQuery = ref('')
const mediaType = ref<'movie' | 'tv'>('tv')
const busyId = ref<number | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | undefined
watch(query, (value) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = value.trim()
  }, SEARCH_DEBOUNCE_MS)
})

const typeTabs = computed(() => [
  { label: t('library.tabs.series'), value: 'tv' as const, icon: 'i-lucide-tv' },
  { label: t('library.tabs.movies'), value: 'movie' as const, icon: 'i-lucide-film' },
])

const {
  data: trending,
  refresh: refreshTrending,
  status: trendingStatus,
} = await useFetch('/api/discover/trending', {
  query: { type: mediaType },
  watch: [mediaType],
  getCachedData: freshCachedData,
})

const {
  data: searchResults,
  refresh: refreshSearch,
  status: searchStatus,
} = await useFetch('/api/search', {
  // A stable key is required: if useFetch derives it from the reactive query,
  // it changes on every keystroke. Combined with `immediate: false`, the key
  // watcher cancels the explicit watcher and the request never starts.
  key: 'discover-search',
  query: { query: debouncedQuery, type: mediaType },
  watch: [debouncedQuery, mediaType],
  immediate: false,
  getCachedData: freshCachedData,
})

useRefreshOnVisible(refreshTrending)

type TrendingItems = NonNullable<typeof trending.value>['items']

const page = ref(1)
const extraItems = ref<TrendingItems>([])
const extraHasMore = ref<boolean | null>(null)
const loadingMore = ref(false)
const addedIds = ref<ReadonlySet<number>>(new Set())

watch(mediaType, () => {
  page.value = 1
  extraItems.value = []
  extraHasMore.value = null
  // Clear data to show skeletons when switching tabs. Refreshes after adding an
  // item keep the grid in place.
  trending.value = undefined
  searchResults.value = undefined
})

const isSearching = computed(() => debouncedQuery.value.length > 0)

const trendingItems = computed(() => {
  const combined = [...(trending.value?.items ?? []), ...extraItems.value]
  const seen = new Set<number>()
  return combined.filter((item) => {
    if (seen.has(item.tmdbId)) {
      return false
    }
    seen.add(item.tmdbId)
    return true
  })
})

const items = computed(() => {
  if (isSearching.value) {
    return searchResults.value ?? []
  }
  return trendingItems.value.filter(
    item =>
      !item.isFollowed
      && !item.isArchived
      && !item.isInWatchlist
      && !item.isWatched
      && !addedIds.value.has(item.tmdbId),
  )
})

const hasMore = computed(() => extraHasMore.value ?? trending.value?.hasMore ?? false)
const isLoading = computed(() =>
  isSearching.value
    ? searchStatus.value === 'pending' && !searchResults.value
    : trendingStatus.value === 'pending' && !trending.value,
)

async function loadMore() {
  loadingMore.value = true
  try {
    const nextPage = page.value + 1
    const result = await $fetch('/api/discover/trending', {
      query: { type: mediaType.value, page: nextPage },
    })
    page.value = nextPage
    extraItems.value = [...extraItems.value, ...result.items]
    extraHasMore.value = result.hasMore
  } catch (error) {
    console.error('Failed to load more items:', error)
    toast.add({ title: t('discover.loadingFailed'), color: 'error' })
  } finally {
    loadingMore.value = false
  }
}

async function addItem(tmdbId: number, title: string) {
  busyId.value = tmdbId
  try {
    if (mediaType.value === 'tv') {
      const result = await $fetch<{ showId: number }>('/api/shows', {
        method: 'POST',
        body: { tmdbId },
      })
      toast.add({
        title: t('discover.followedShow', { title }),
        color: 'success',
        actions: [{ label: t('discover.viewDetails'), to: showRoute(result.showId) }],
      })
    } else {
      const result = await $fetch<{ mediaId: number }>('/api/watchlist', {
        method: 'POST',
        body: { mediaType: 'movie', tmdbId },
      })
      toast.add({
        title: t('discover.addedToWatchlist', { title }),
        color: 'success',
        actions: [{ label: t('discover.viewDetails'), to: movieRoute(result.mediaId) }],
      })
    }
    addedIds.value = new Set([...addedIds.value, tmdbId])
    if (isSearching.value) {
      await Promise.all([refreshSearch(), refreshTrending()])
    } else {
      await refreshTrending()
    }
  } catch (error) {
    console.error('Failed to add item:', error)
    toast.add({ title: t('common.addImpossible'), color: 'error' })
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-2xl font-bold tracking-tight">{{ t('discover.title') }}</h1>

    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <UInput
        v-model="query"
        icon="i-lucide-search"
        :placeholder="t('discover.searchPlaceholder')"
        size="lg"
        class="flex-1"
      />
      <UTabs v-model="mediaType" :items="typeTabs" size="sm" :content="false" />
    </div>

    <h2 class="eyebrow mb-3">
      {{ isSearching ? t('discover.resultsFor', { query: debouncedQuery }) : t('discover.weeklyTrending') }}
    </h2>

    <div v-if="isLoading" class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      <USkeleton v-for="index in 12" :key="index" class="aspect-[2/3] w-full" />
    </div>

    <UEmpty
      v-else-if="items.length === 0"
      icon="i-lucide-search-x"
      :title="t('discover.noResultsTitle')"
      :description="t('discover.noResultsDescription')"
    />

    <div v-else class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      <DiscoverMediaCard
        v-for="item in items"
        :key="item.tmdbId"
        :item="item"
        :type="mediaType"
        :busy="busyId === item.tmdbId"
        @action="addItem(item.tmdbId, item.title)"
      />
    </div>

    <div v-if="!isSearching && !isLoading && hasMore" class="mt-6 flex justify-center">
      <UButton
        :label="t('discover.loadMore')"
        icon="i-lucide-chevrons-down"
        color="neutral"
        variant="soft"
        :loading="loadingMore"
        @click="loadMore"
      />
    </div>
  </div>
</template>
