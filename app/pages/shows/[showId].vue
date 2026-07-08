<script setup lang="ts">
const route = useRoute()
const toast = useToast()
const { t } = useI18n()
const showId = computed(() => String(route.params.showId))

const { data: show, refresh, error } = await useFetch(() => `/api/shows/${showId.value}`, {
  getCachedData: freshCachedData,
})

const modal = reactive({
  open: false,
  mode: 'episode' as 'episode' | 'season' | 'show',
  episodeId: 0,
  seasonNumber: 0,
  title: '',
})

const accordionItems = computed(() =>
  (show.value?.seasons ?? []).map(season => ({
    label:
      season.seasonNumber === 0
        ? t('show.specialEpisodes')
        : t('show.season', { number: season.seasonNumber }),
    value: String(season.seasonNumber),
    seasonNumber: season.seasonNumber,
    badge: `${season.watchedCount}/${season.episodes.length}`,
  })),
)

const stateMenuItems = computed(() => {
  const state = show.value?.state
  return [
    {
      label: state?.isFavorite ? t('show.favoriteRemove') : t('show.favoriteAdd'),
      icon: state?.isFavorite ? 'i-lucide-star-off' : 'i-lucide-star',
      onSelect: () => patchState({ isFavorite: !state?.isFavorite }),
    },
    {
      label: state?.isArchived ? t('show.unarchive') : t('show.archive'),
      icon: 'i-lucide-archive',
      onSelect: () => patchState({ isArchived: !state?.isArchived }),
    },
  ]
})

function seasonOf(seasonNumber: number) {
  return show.value?.seasons.find(season => season.seasonNumber === seasonNumber)
}

async function patchState(patch: Record<string, boolean>) {
  try {
    await $fetch(`/api/shows/${showId.value}/state`, { method: 'PATCH', body: patch })
    await refresh()
  } catch (fetchError) {
    console.error('Failed to update show state:', fetchError)
    toast.add({ title: t('common.updateImpossible'), color: 'error' })
  }
}

async function markEpisode(episodeId: number, watchedAt?: string) {
  try {
    await $fetch(`/api/episodes/${episodeId}/watches`, {
      method: 'POST',
      body: watchedAt ? { watchedAt } : {},
    })
    toast.add({ title: t('home.episodeMarked'), color: 'success' })
    await refresh()
  } catch (fetchError) {
    console.error('Failed to mark episode:', fetchError)
    toast.add({ title: t('home.episodeMarkFailed'), color: 'error' })
  }
}

async function markSeason(seasonNumber: number, watchedAt: string) {
  try {
    const result = await $fetch<{ inserted: number }>(
      `/api/shows/${showId.value}/seasons/${seasonNumber}/watches`,
      { method: 'POST', body: { watchedAt } },
    )
    toast.add({ title: t('show.episodesMarked', { count: result.inserted }), color: 'success' })
    await refresh()
  } catch (fetchError) {
    console.error('Failed to mark season:', fetchError)
    toast.add({ title: t('show.markSeasonFailed'), color: 'error' })
  }
}

async function markShow(watchedAt: string) {
  try {
    const result = await $fetch<{ inserted: number }>(`/api/shows/${showId.value}/watches`, {
      method: 'POST',
      body: { watchedAt },
    })
    toast.add({ title: t('show.episodesMarked', { count: result.inserted }), color: 'success' })
    await refresh()
  } catch (fetchError) {
    console.error('Failed to mark show:', fetchError)
    toast.add({ title: t('show.markShowFailed'), color: 'error' })
  }
}

async function unwatchEpisode(episodeId: number, watchId: number) {
  try {
    await $fetch(`/api/episodes/${episodeId}/watches/${watchId}`, { method: 'DELETE' })
    await refresh()
  } catch (fetchError) {
    console.error('Failed to remove watch:', fetchError)
    toast.add({ title: t('show.removeWatchFailed'), color: 'error' })
  }
}

function openEpisodeModal(episodeId: number, title: string) {
  Object.assign(modal, { open: true, mode: 'episode', episodeId, title })
}

function openSeasonModal(seasonNumber: number) {
  Object.assign(modal, {
    open: true,
    mode: 'season',
    seasonNumber,
    title: t('show.seasonTitle', { number: seasonNumber, title: show.value?.name ?? '' }),
  })
}

function openShowModal() {
  Object.assign(modal, {
    open: true,
    mode: 'show',
    title: t('show.wholeShowTitle', { title: show.value?.name ?? '' }),
  })
}

function onModalConfirm(watchedAt: string) {
  if (modal.mode === 'episode') {
    markEpisode(modal.episodeId, watchedAt)
  } else if (modal.mode === 'season') {
    markSeason(modal.seasonNumber, watchedAt)
  } else {
    markShow(watchedAt)
  }
}
</script>

<template>
  <UEmpty
    v-if="error"
    icon="i-lucide-tv"
    :title="t('show.notFoundTitle')"
    :description="t('show.notFoundDescription')"
  >
    <UButton to="/library" :label="t('show.backToLibrary')" />
  </UEmpty>

  <div v-else-if="show">
    <div class="relative -mx-4 -mt-6 mb-4 h-56 overflow-hidden md:h-80 md:rounded-b-2xl">
      <MediaTmdbImage :path="show.backdropPath" :alt="show.name" kind="backdrop" />
      <div class="hero-gradient absolute inset-0" />
    </div>

    <div class="relative flex gap-4">
      <div
        class="-mt-20 w-28 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15 shadow-2xl shadow-black/60 md:-mt-24 md:w-36"
      >
        <div class="aspect-[2/3]">
          <MediaTmdbImage :path="show.posterPath" :alt="show.name" />
        </div>
      </div>
      <div class="min-w-0 flex-1">
        <h1 class="text-2xl font-bold leading-tight tracking-tight md:text-3xl">{{ show.name }}</h1>
        <p class="mt-0.5 text-sm text-muted">
          {{ yearOf(show.firstAirDate) }}
          <template v-if="show.status"> · {{ showStatusLabel(show.status) }}</template>
        </p>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <UBadge
            v-for="genre in show.genres"
            :key="genre"
            :label="genre"
            color="neutral"
            variant="subtle"
            size="sm"
          />
        </div>
        <ShowProgress
          class="mt-3 max-w-xs"
          :watched="show.progress.watched"
          :aired="show.progress.aired"
        />
      </div>
    </div>

    <div class="mt-4 flex items-center gap-2">
      <UButton
        :label="show.state.isFollowed ? t('show.followed') : t('show.follow')"
        :icon="show.state.isFollowed ? 'i-lucide-check' : 'i-lucide-plus'"
        :variant="show.state.isFollowed ? 'soft' : 'solid'"
        @click="patchState({ isFollowed: !show.state.isFollowed })"
      />
      <UButton
        v-if="show.progress.watched < show.progress.aired"
        :label="t('show.markAllWatched')"
        icon="i-lucide-check-check"
        color="neutral"
        variant="soft"
        @click="openShowModal()"
      />
      <UBadge v-if="show.state.isFavorite" :label="t('show.favoriteBadge')" color="primary" variant="subtle" />
      <UBadge v-if="show.state.isArchived" :label="t('show.archivedBadge')" color="neutral" variant="subtle" />
      <UDropdownMenu :items="stateMenuItems">
        <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" :aria-label="t('show.moreActions')" />
      </UDropdownMenu>
    </div>

    <p v-if="show.overview" class="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
      {{ show.overview }}
    </p>

    <p v-if="show.nextEpisodeAirDate" class="mt-3 text-sm">
      <UIcon name="i-lucide-calendar-clock" class="mr-1 inline size-4 text-primary" />
      {{ t('show.nextEpisodeOn', { date: formatDate(show.nextEpisodeAirDate) }) }}
    </p>

    <UAccordion :items="accordionItems" type="multiple" class="mt-6">
      <template #body="{ item }">
        <div v-if="seasonOf(item.seasonNumber)">
          <UButton
            v-if="seasonOf(item.seasonNumber)!.watchedCount < seasonOf(item.seasonNumber)!.airedCount"
            :label="t('show.markSeasonWatched')"
            icon="i-lucide-check-check"
            variant="soft"
            size="sm"
            class="mb-2"
            @click="openSeasonModal(item.seasonNumber)"
          />
          <div class="divide-y divide-default">
            <ShowEpisodeRow
              v-for="episode in seasonOf(item.seasonNumber)!.episodes"
              :key="episode.id"
              :episode="episode"
              @watch="markEpisode(episode.id)"
              @watch-at="
                openEpisodeModal(
                  episode.id,
                  `${show?.name ?? ''} · ${episodeCode(item.seasonNumber, episode.episodeNumber)}`,
                )
              "
              @unwatch="watchId => unwatchEpisode(episode.id, watchId)"
            />
          </div>
        </div>
      </template>
    </UAccordion>

    <WatchMarkSeenModal v-model:open="modal.open" :title="modal.title" @confirm="onModalConfirm" />
  </div>
</template>
