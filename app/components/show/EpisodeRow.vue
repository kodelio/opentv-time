<script setup lang="ts">
interface EpisodeRowData {
  readonly id: number
  readonly episodeNumber: number
  readonly name: string | null
  readonly airDate: string | null
  readonly isAired: boolean
  readonly watchCount: number
  readonly lastWatchId: number | null
}

const props = defineProps<{ episode: EpisodeRowData }>()

const emit = defineEmits<{
  watch: []
  watchAt: []
  unwatch: [watchId: number]
}>()

const { t } = useI18n()

const menuItems = computed(() => {
  const items = [{ label: t('common.watchOnDate'), icon: 'i-lucide-calendar', onSelect: () => emit('watchAt') }]
  if (props.episode.watchCount > 0 && props.episode.lastWatchId !== null) {
    items.push({
      label: t('show.removeWatch'),
      icon: 'i-lucide-undo-2',
      onSelect: () => emit('unwatch', props.episode.lastWatchId!),
    })
  }
  return items
})
</script>

<template>
  <div class="flex items-center gap-3 py-2">
    <UButton
      :icon="episode.watchCount > 0 ? 'i-lucide-circle-check-big' : 'i-lucide-circle'"
      :color="episode.watchCount > 0 ? 'primary' : 'neutral'"
      variant="ghost"
      size="lg"
      :disabled="!episode.isAired && episode.watchCount === 0"
      :aria-label="episode.watchCount > 0 ? t('common.watched') : t('common.watchNow')"
      @click="episode.watchCount > 0 ? emit('watchAt') : emit('watch')"
    />
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm" :class="episode.watchCount > 0 ? 'text-muted' : ''">
        <span class="mr-2 font-mono text-xs text-dimmed">{{
          String(episode.episodeNumber).padStart(2, '0')
        }}</span>
        {{ episode.name ?? t('show.defaultEpisodeTitle', { number: episode.episodeNumber }) }}
      </p>
      <p class="text-xs text-dimmed">
        {{ formatDate(episode.airDate) }}
        <template v-if="!episode.isAired && episode.airDate"> · {{ t('show.upcomingEpisode') }}</template>
      </p>
    </div>
    <UBadge
      v-if="episode.watchCount > 1"
      :label="`×${episode.watchCount}`"
      color="neutral"
      variant="subtle"
      size="sm"
    />
    <UDropdownMenu :items="menuItems">
      <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="sm" :aria-label="t('common.actions')" />
    </UDropdownMenu>
  </div>
</template>
