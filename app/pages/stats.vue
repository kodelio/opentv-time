<script setup lang="ts">
const { t } = useI18n()
const [{ data: overview }, { data: monthly }, { data: top }, { data: genres }] = await Promise.all([
  useFetch('/api/stats/overview', { getCachedData: freshCachedData }),
  useFetch('/api/stats/monthly', { getCachedData: freshCachedData }),
  useFetch('/api/stats/top-shows', { getCachedData: freshCachedData }),
  useFetch('/api/stats/genres', { getCachedData: freshCachedData }),
])

const maxGenreCount = computed(() => Math.max(1, ...(genres.value ?? []).map(genre => genre.count)))
</script>

<template>
  <div>
    <h1 class="mb-4 text-2xl font-bold tracking-tight">{{ t('stats.title') }}</h1>

    <div v-if="overview" class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatsStatTile
        icon="i-lucide-clock"
        :label="t('stats.totalScreenTime')"
        :value="formatLongDuration(overview.totalMinutes)"
        :hint="
          t('stats.screenTimeHint', {
            shows: formatLongDuration(overview.episodeMinutes),
            movies: formatLongDuration(overview.movieMinutes),
          })
        "
      />
      <StatsStatTile
        icon="i-lucide-tv"
        :label="t('stats.episodesWatched')"
        :value="formatNumber(overview.episodesWatched)"
      />
      <StatsStatTile
        icon="i-lucide-film"
        :label="t('stats.moviesWatched')"
        :value="formatNumber(overview.moviesWatched)"
      />
      <StatsStatTile
        icon="i-lucide-library-big"
        :label="t('stats.showsFollowed')"
        :value="formatNumber(overview.showsFollowed)"
      />
    </div>

    <div class="mt-4 grid gap-4 lg:grid-cols-2">
      <StatsMonthlyBarChart v-if="monthly" :data="monthly" />
      <StatsTopShowsList v-if="top && top.length > 0" :items="top" />
    </div>

    <UCard v-if="genres && genres.length > 0" class="mt-4">
      <h3 class="mb-3 text-sm font-medium">{{ t('stats.mostWatchedGenres') }}</h3>
      <ul class="space-y-2">
        <li v-for="genre in genres" :key="genre.genre" class="flex items-center gap-3">
          <span class="w-28 truncate text-sm">{{ genre.genre }}</span>
          <div class="h-2 flex-1 overflow-hidden rounded-full bg-elevated">
            <div
              class="h-full rounded-full bg-primary"
              :style="{ width: `${(genre.count / maxGenreCount) * 100}%` }"
            />
          </div>
          <span class="w-10 text-right text-xs tabular-nums text-muted">{{ genre.count }}</span>
        </li>
      </ul>
    </UCard>
  </div>
</template>
