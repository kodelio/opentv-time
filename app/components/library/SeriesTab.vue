<script setup lang="ts">
const props = withDefaults(defineProps<{ search?: string }>(), { search: '' })
const { t } = useI18n()

const FILTER_OPTIONS = computed(() => [
  { label: t('library.filters.all'), value: 'toutes' },
  { label: t('library.filters.inProgress'), value: 'en-cours' },
  { label: t('library.filters.caughtUp'), value: 'a-jour' },
  { label: t('library.filters.ended'), value: 'terminees' },
  { label: t('library.filters.archived'), value: 'archivees' },
])

const groupTitleKeys = {
  'en-cours': 'library.group.started',
  'pas-commencees': 'library.group.notStarted',
  'a-jour': 'library.group.caughtUp',
} as const

const filter = ref('toutes')
const { data: items, status } = await useFetch('/api/shows', {
  query: { filter },
  watch: [filter],
  getCachedData: freshCachedData,
})

const filteredItems = computed(() =>
  (items.value ?? []).filter(show => matchesQuery(show.name, props.search)),
)

const groups = computed(() => {
  if (filter.value !== 'toutes') {
    return null
  }
  return groupShows(filteredItems.value)
})
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between gap-3">
      <USelect v-model="filter" :items="FILTER_OPTIONS" class="w-44" />
      <span v-if="items" class="text-sm text-muted">
        {{ t('library.showCount', { count: filteredItems.length }) }}
      </span>
    </div>

    <div v-if="status === 'pending'" class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      <USkeleton v-for="index in 12" :key="index" class="aspect-[2/3] w-full" />
    </div>

    <UEmpty
      v-else-if="filteredItems.length === 0"
      icon="i-lucide-tv"
      :title="t('library.noShowsTitle')"
      :description="
        search.trim() !== ''
          ? t('library.noShowsSearch')
          : t('library.noShowsFilter')
      "
    />

    <div v-else-if="groups" class="space-y-8">
      <section v-for="group in groups" :key="group.key">
        <h2 class="eyebrow mb-3 flex items-baseline gap-2">
          {{ t(groupTitleKeys[group.key]) }}
          <span class="font-normal text-dimmed">{{ group.items.length }}</span>
        </h2>
        <div class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <MediaPosterCard
            v-for="show in group.items"
            :key="show.id"
            :to="`/shows/${show.id}`"
            :title="show.name"
            :poster-path="show.posterPath"
            :subtitle="t('library.episodeProgress', { watched: show.watched, aired: show.aired })"
            :badge="show.isFavorite ? '★' : undefined"
          >
            <template #overlay>
              <ShowProgress :watched="show.watched" :aired="show.aired" variant="overlay" />
            </template>
          </MediaPosterCard>
        </div>
      </section>
    </div>

    <div v-else class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      <MediaPosterCard
        v-for="show in filteredItems"
        :key="show.id"
        :to="`/shows/${show.id}`"
        :title="show.name"
        :poster-path="show.posterPath"
        :subtitle="t('library.episodeProgress', { watched: show.watched, aired: show.aired })"
        :badge="show.isFavorite ? '★' : undefined"
      >
        <template #overlay>
          <ShowProgress :watched="show.watched" :aired="show.aired" variant="overlay" />
        </template>
      </MediaPosterCard>
    </div>
  </div>
</template>
