<script setup lang="ts">
interface UpNextItemData {
  readonly showId: number
  readonly showName: string
  readonly posterPath: string | null
  readonly backdropPath: string | null
  readonly episodeId: number
  readonly seasonNumber: number
  readonly episodeNumber: number
  readonly episodeName: string | null
  readonly airDate: string | null
  readonly remaining: number
}

defineProps<{ item: UpNextItemData }>()

defineEmits<{ watch: []; watchAt: [] }>()
const { t } = useI18n()
</script>

<template>
  <div class="group relative overflow-hidden rounded-xl ring-1 ring-white/10">
    <div class="absolute inset-0" aria-hidden="true">
      <MediaTmdbImage
        v-if="item.backdropPath"
        :path="item.backdropPath"
        :alt="''"
        kind="backdrop"
        class="opacity-50 transition-opacity duration-300 group-hover:opacity-65"
      />
      <div v-else class="size-full bg-elevated" />
      <div class="absolute inset-0 bg-gradient-to-r from-default/95 via-default/75 to-default/30" />
    </div>

    <div class="relative flex items-center gap-3 p-3">
      <NuxtLink :to="`/shows/${item.showId}`" class="block w-14 shrink-0">
        <div class="aspect-[2/3] overflow-hidden rounded-lg ring-1 ring-white/15 shadow-lg shadow-black/40">
          <MediaTmdbImage :path="item.posterPath" :alt="item.showName" kind="posterSmall" />
        </div>
      </NuxtLink>
      <div class="min-w-0 flex-1">
        <NuxtLink :to="`/shows/${item.showId}`" class="block truncate font-semibold">
          {{ item.showName }}
        </NuxtLink>
        <p class="truncate text-sm text-muted">
          <span class="font-mono text-xs font-medium text-primary">{{
            episodeCode(item.seasonNumber, item.episodeNumber)
          }}</span>
          <template v-if="item.episodeName"> · {{ item.episodeName }}</template>
        </p>
        <p class="text-xs text-dimmed">
          {{ formatDate(item.airDate) }}
          <template v-if="item.remaining > 1">
            · {{ t('home.remainingEpisodes', { count: item.remaining }) }}
          </template>
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <UButton
          icon="i-lucide-check"
          size="lg"
          color="primary"
          variant="solid"
          :aria-label="t('common.watchNow')"
          @click="$emit('watch')"
        />
        <UButton
          icon="i-lucide-calendar"
          size="lg"
          color="neutral"
          variant="ghost"
          :aria-label="t('common.watchOnDate')"
          @click="$emit('watchAt')"
        />
      </div>
    </div>
  </div>
</template>
