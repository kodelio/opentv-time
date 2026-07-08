<script setup lang="ts">
const { t } = useI18n()

const tabs = computed(() => [
  { label: t('library.tabs.series'), icon: 'i-lucide-tv', slot: 'series' as const, value: 'series' },
  { label: t('library.tabs.movies'), icon: 'i-lucide-film', slot: 'movies' as const, value: 'movies' },
  { label: t('library.tabs.watchlist'), icon: 'i-lucide-bookmark', slot: 'watchlist' as const, value: 'watchlist' },
])

const activeTab = ref('series')
const search = ref('')
</script>

<template>
  <div>
    <h1 class="mb-4 text-2xl font-bold tracking-tight">{{ t('library.title') }}</h1>
    <UInput
      v-model="search"
      icon="i-lucide-search"
      :placeholder="t('library.searchPlaceholder')"
      class="mb-4 w-full"
    />
    <UTabs v-model="activeTab" :items="tabs" variant="link" class="w-full">
      <template #series>
        <LibrarySeriesTab class="pt-4" :search="search" />
      </template>
      <template #movies>
        <LibraryMoviesTab class="pt-4" :search="search" />
      </template>
      <template #watchlist>
        <LibraryWatchlistTab class="pt-4" :search="search" />
      </template>
    </UTabs>
  </div>
</template>
