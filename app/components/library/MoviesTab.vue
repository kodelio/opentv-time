<script setup lang="ts">
const props = withDefaults(defineProps<{ search?: string }>(), { search: '' })
const { t } = useI18n()

const { data: items, status } = await useFetch('/api/movies', {
  getCachedData: freshCachedData,
})

const filteredItems = computed(() =>
  (items.value ?? []).filter(movie => matchesQuery(movie.title, props.search)),
)
</script>

<template>
  <div>
    <div v-if="status === 'pending'" class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      <USkeleton v-for="index in 12" :key="index" class="aspect-[2/3] w-full" />
    </div>

    <UEmpty
      v-else-if="filteredItems.length === 0"
      icon="i-lucide-film"
      :title="t('library.noMoviesTitle')"
      :description="
        search.trim() !== ''
          ? t('library.noMoviesSearch')
          : t('library.noMoviesEmpty')
      "
    />

    <div v-else>
      <p class="mb-4 text-sm text-muted">
        {{ t('library.movieCount', { count: filteredItems.length }) }}
      </p>
      <div class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <MediaPosterCard
          v-for="movie in filteredItems"
          :key="movie.id"
          :to="`/movies/${movie.id}`"
          :title="movie.title"
          :poster-path="movie.posterPath"
          :subtitle="t('library.seenOn', { date: formatDate(movie.lastWatchedAt) })"
          :badge="movie.watchCount > 1 ? `×${movie.watchCount}` : undefined"
        />
      </div>
    </div>
  </div>
</template>
