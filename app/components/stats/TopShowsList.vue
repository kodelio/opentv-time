<script setup lang="ts">
interface TopShowData {
  readonly showId: number
  readonly name: string
  readonly posterPath: string | null
  readonly episodesWatched: number
  readonly minutes: number
}

defineProps<{ items: readonly TopShowData[] }>()
const { t } = useI18n()
</script>

<template>
  <UCard>
    <h3 class="mb-3 text-sm font-medium">{{ t('stats.topShowsTitle') }}</h3>
    <ol class="space-y-2">
      <li v-for="(show, index) in items" :key="show.showId">
        <NuxtLink :to="`/shows/${show.showId}`" class="flex items-center gap-3">
          <span class="w-5 text-right font-mono text-xs text-dimmed">{{ index + 1 }}</span>
          <div class="w-8 shrink-0 overflow-hidden rounded">
            <div class="aspect-[2/3]">
              <MediaTmdbImage :path="show.posterPath" :alt="show.name" kind="posterSmall" />
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm">{{ show.name }}</p>
            <p class="text-xs text-muted">
              {{ t('stats.topShowsMeta', { episodes: show.episodesWatched, duration: formatLongDuration(show.minutes) }) }}
            </p>
          </div>
        </NuxtLink>
      </li>
    </ol>
  </UCard>
</template>
