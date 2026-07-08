<script setup lang="ts">
interface DiscoverItem {
  readonly tmdbId: number
  readonly title: string
  readonly releaseDate: string | null
  readonly posterPath: string | null
  readonly overview: string | null
  readonly mediaId: number | null
  readonly isFollowed: boolean
  readonly isArchived: boolean
  readonly isInWatchlist: boolean
  readonly isWatched: boolean
}

const props = defineProps<{
  item: DiscoverItem
  type: 'movie' | 'tv'
  busy?: boolean
}>()

const emit = defineEmits<{ action: [] }>()
const { t } = useI18n()

const detailsTo = computed(() => {
  if (props.item.mediaId == null) {
    return undefined
  }
  return props.type === 'tv' ? showRoute(props.item.mediaId) : movieRoute(props.item.mediaId)
})

const statusLabel = computed(() => {
  if (props.type === 'tv') {
    if (props.item.isArchived) return t('discover.archived')
    if (props.item.isFollowed) return t('discover.followed')
    if (props.item.isWatched) return t('discover.showWatched')
    if (props.item.isInWatchlist) return t('common.watchlist')
    return null
  }
  if (props.item.isWatched) return t('discover.movieWatched')
  if (props.item.isInWatchlist) return t('common.watchlist')
  return null
})

const actionLabel = computed(() => {
  if (detailsTo.value && statusLabel.value) {
    return statusLabel.value
  }
  return props.type === 'tv' ? t('discover.follow') : t('common.watchlist')
})

const actionIcon = computed(() => {
  if (detailsTo.value && statusLabel.value) {
    return props.type === 'tv' ? 'i-lucide-check' : 'i-lucide-bookmark-check'
  }
  return props.type === 'tv' ? 'i-lucide-plus' : 'i-lucide-bookmark-plus'
})

function onAction() {
  if (!detailsTo.value) {
    emit('action')
  }
}
</script>

<template>
  <div class="group">
    <div class="poster-frame aspect-[2/3]">
      <MediaTmdbImage
        :path="item.posterPath"
        :alt="item.title"
        class="transition-transform duration-300 group-hover:scale-[1.04]"
      />
      <UBadge
        v-if="statusLabel"
        :label="statusLabel"
        color="primary"
        variant="solid"
        size="sm"
        class="absolute left-1.5 top-1.5 z-10"
      />
    </div>
    <p class="mt-2 line-clamp-2 text-sm font-medium leading-tight">{{ item.title }}</p>
    <p class="text-xs text-muted">{{ yearOf(item.releaseDate) }}</p>
    <UButton
      :label="actionLabel"
      :icon="actionIcon"
      :to="detailsTo"
      size="xs"
      variant="soft"
      class="mt-1.5"
      :loading="busy"
      block
      @click="onAction"
    />
  </div>
</template>
