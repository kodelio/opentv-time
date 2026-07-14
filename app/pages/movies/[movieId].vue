<script setup lang="ts">
const route = useRoute()
const toast = useToast()
const { t } = useI18n()
const movieId = computed(() => String(route.params.movieId))

const { data: movie, refresh, error } = await useFetch(() => `/api/movies/${movieId.value}`, {
  getCachedData: freshCachedData,
})

const modalOpen = ref(false)

const lastWatchedAt = computed(() => {
  const dates = (movie.value?.watches ?? []).map(watch => watch.watchedAt)
  return dates.length > 0 ? dates.toSorted((a, b) => b.localeCompare(a))[0] : null
})

function openModal() {
  modalOpen.value = true
}

async function markSeen(watchedAt: string) {
  try {
    await $fetch(`/api/movies/${movieId.value}/watches`, { method: 'POST', body: { watchedAt } })
    toast.add({ title: t('movie.markedWatched'), color: 'success' })
    await refresh()
  } catch (fetchError) {
    console.error('Failed to mark movie:', fetchError)
    toast.add({ title: t('movie.markFailed'), color: 'error' })
  }
}

async function deleteWatch(watchId: number) {
  try {
    await $fetch(`/api/movies/${movieId.value}/watches/${watchId}`, { method: 'DELETE' })
    await refresh()
  } catch (fetchError) {
    console.error('Failed to delete movie watch:', fetchError)
    toast.add({ title: t('movie.deleteWatchFailed'), color: 'error' })
  }
}

async function toggleWatchlist() {
  if (!movie.value) {
    return
  }
  try {
    if (movie.value.inWatchlist && movie.value.watchlistItemId) {
      await $fetch(`/api/watchlist/${movie.value.watchlistItemId}`, { method: 'DELETE' })
      toast.add({ title: t('movie.removedFromWatchlist'), color: 'neutral' })
    } else {
      await $fetch('/api/watchlist', {
        method: 'POST',
        body: { mediaType: 'movie', tmdbId: movie.value.tmdbId },
      })
      toast.add({ title: t('movie.addedToWatchlist'), color: 'success' })
    }
    await refresh()
  } catch (fetchError) {
    console.error('Watchlist action failed:', fetchError)
    toast.add({ title: t('movie.actionFailed'), color: 'error' })
  }
}
</script>

<template>
  <UEmpty
    v-if="error"
    icon="i-lucide-film"
    :title="t('movie.notFoundTitle')"
    :description="t('movie.notFoundDescription')"
  >
    <UButton to="/library" :label="t('show.backToLibrary')" />
  </UEmpty>

  <div v-else-if="movie">
    <UButton
      to="/library"
      icon="i-lucide-undo-2"
      :label="t('show.backToLibrary')"
      variant="link"
      color="neutral"
      class="-ml-1 mb-2"
    />

    <div class="relative -mx-4 mb-4 h-52 overflow-hidden md:h-80 md:rounded-b-2xl">
      <MediaTmdbImage :path="movie.backdropPath" :alt="movie.title" kind="backdrop" />
      <div class="hero-gradient absolute inset-0" />
    </div>

    <div class="relative flex gap-4">
      <div
        class="-mt-20 w-28 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15 shadow-2xl shadow-black/60 md:-mt-24 md:w-36"
      >
        <div class="aspect-[2/3]">
          <MediaTmdbImage :path="movie.posterPath" :alt="movie.title" />
        </div>
      </div>
      <div class="min-w-0 flex-1">
        <h1 class="text-2xl font-bold leading-tight tracking-tight md:text-3xl">{{ movie.title }}</h1>
        <p class="mt-0.5 text-sm text-muted">
          {{ yearOf(movie.releaseDate) }}
          <template v-if="movie.runtime"> · {{ formatDuration(movie.runtime) }}</template>
        </p>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <span
            v-for="genre in movie.genres"
            :key="genre"
            class="rounded-md bg-elevated px-2 py-0.5 text-xs font-medium text-toned ring-1 ring-white/15"
          >{{ genre }}</span>
        </div>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <span
        v-if="lastWatchedAt"
        class="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary ring-1 ring-primary/25"
      >
        <UIcon name="i-lucide-eye" class="size-3.5" />
        {{ t('library.seenOn', { date: formatDate(lastWatchedAt) }) }}
      </span>
      <UButton
        :label="lastWatchedAt ? t('movie.watchAgain') : t('movie.markWatched')"
        :icon="lastWatchedAt ? 'i-lucide-plus' : 'i-lucide-check'"
        :color="lastWatchedAt ? 'neutral' : 'primary'"
        :variant="lastWatchedAt ? 'soft' : 'solid'"
        @click="openModal"
      />
      <UButton
        :label="movie.inWatchlist ? t('movie.inWatchlist') : t('common.watchlist')"
        :icon="movie.inWatchlist ? 'i-lucide-bookmark-check' : 'i-lucide-bookmark-plus'"
        color="neutral"
        :variant="movie.inWatchlist ? 'soft' : 'outline'"
        @click="toggleWatchlist"
      />
    </div>

    <p v-if="movie.overview" class="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
      {{ movie.overview }}
    </p>

    <section v-if="movie.watches.length > 0" class="panel mt-6 max-w-lg p-4">
      <h3 class="mb-3 flex items-center gap-2 text-sm font-medium">
        {{ t('movie.watches') }}
        <span v-if="movie.watches.length > 1" class="text-xs font-normal text-dimmed">
          ×{{ movie.watches.length }}
        </span>
      </h3>
      <ul class="space-y-2">
        <li v-for="watch in movie.watches" :key="watch.id" class="flex items-center gap-3">
          <UIcon name="i-lucide-eye" class="size-4 shrink-0 text-primary" />
          <span class="flex-1 text-sm">{{ formatDate(watch.watchedAt) }}</span>
          <button
            type="button"
            :aria-label="t('movie.deleteWatch')"
            class="flex size-7 shrink-0 items-center justify-center rounded-lg text-dimmed transition-colors hover:bg-white/5 hover:text-default"
            @click="deleteWatch(watch.id)"
          >
            <UIcon name="i-lucide-trash-2" class="size-3.5" />
          </button>
        </li>
      </ul>
    </section>

    <WatchMarkSeenModal v-model:open="modalOpen" :title="movie.title" @confirm="markSeen" />
  </div>
</template>
