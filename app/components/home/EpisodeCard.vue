<script setup lang="ts">
interface UpNextItemData {
  readonly showId: number
  readonly showName: string
  readonly posterPath: string | null
  readonly seasonNumber: number
  readonly episodeNumber: number
  readonly episodeName: string | null
  readonly airDate: string | null
  readonly runtime: number | null
  readonly remaining: number
}

const props = defineProps<{
  item: UpNextItemData
  /** "fresh": out this week (amber card). "backlog": catch up (neutral card). */
  variant: 'fresh' | 'backlog'
}>()

defineEmits<{ watch: []; watchAt: [] }>()

const { t } = useI18n()

const meta = computed(() => {
  const parts = [props.item.episodeName, formatDuration(props.item.runtime)].filter(Boolean)
  return parts.join(' · ')
})
</script>

<template>
  <div
    class="relative overflow-hidden rounded-[14px]"
    :class="
      variant === 'fresh'
        ? 'shadow-[inset_0_0_0_1px_rgb(251_191_36/0.25)]'
        : 'bg-muted ring-1 ring-white/8'
    "
  >
    <div
      v-if="variant === 'fresh'"
      aria-hidden="true"
      class="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/[0.02]"
    />

    <div class="relative flex items-center gap-3 p-3">
      <NuxtLink :to="showRoute(item.showId)" class="w-12 shrink-0 md:w-13">
        <div
          class="aspect-[2/3] overflow-hidden rounded-lg shadow-lg shadow-black/40 ring-1 ring-white/15"
        >
          <MediaTmdbImage :path="item.posterPath" :alt="item.showName" kind="posterSmall" />
        </div>
      </NuxtLink>

      <div class="min-w-0 flex-1">
        <NuxtLink
          :to="showRoute(item.showId)"
          class="block truncate font-semibold text-default hover:text-highlighted"
        >
          {{ item.showName }}
        </NuxtLink>
        <p class="truncate text-sm text-muted">
          <span class="font-mono text-xs font-medium text-primary">{{
            episodeCode(item.seasonNumber, item.episodeNumber)
          }}</span>
          <template v-if="meta"> · {{ meta }}</template>
        </p>
        <p
          class="mt-0.5 text-xs font-semibold"
          :class="variant === 'fresh' ? 'text-primary' : 'font-normal text-dimmed'"
        >
          {{
            variant === 'fresh'
              ? releasedLabel(item.airDate)
              : t('home.behind', { count: item.remaining })
          }}
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          :aria-label="t('common.watchNow')"
          class="flex size-12 items-center justify-center rounded-xl transition-transform active:scale-95"
          :class="variant === 'fresh' ? 'bg-primary text-inverted' : 'bg-primary/12 text-primary'"
          @click="$emit('watch')"
        >
          <UIcon name="i-lucide-check" class="size-5.5" />
        </button>
        <UButton
          icon="i-lucide-calendar"
          color="neutral"
          variant="ghost"
          size="md"
          :aria-label="t('common.watchOnDate')"
          @click="$emit('watchAt')"
        />
      </div>
    </div>
  </div>
</template>
