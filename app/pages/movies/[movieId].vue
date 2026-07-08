<script setup lang="ts">
const route = useRoute()
const toast = useToast()
const { t } = useI18n()
const movieId = computed(() => String(route.params.movieId))

const { data: movie, refresh, error } = await useFetch(() => `/api/movies/${movieId.value}`, {
  getCachedData: freshCachedData,
})

const modalOpen = ref(false)

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
    <div class="relative -mx-4 -mt-6 mb-4 h-56 overflow-hidden md:h-80 md:rounded-b-2xl">
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
          <UBadge
            v-for="genre in movie.genres"
            :key="genre"
            :label="genre"
            color="neutral"
            variant="subtle"
            size="sm"
          />
        </div>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <UButton :label="t('movie.markWatched')" icon="i-lucide-check" @click="openModal" />
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

    <section v-if="movie.watches.length > 0" class="mt-6">
      <h2 class="mb-2 font-medium">
        {{ t('movie.watches') }}
        <UBadge
          v-if="movie.watches.length > 1"
          :label="`×${movie.watches.length}`"
          color="neutral"
          variant="subtle"
          size="sm"
        />
      </h2>
      <ul class="divide-y divide-default">
        <li
          v-for="watch in movie.watches"
          :key="watch.id"
          class="flex items-center justify-between py-2 text-sm"
        >
          <span>
            <UIcon name="i-lucide-eye" class="mr-2 inline size-4 text-primary" />
            {{ formatDate(watch.watchedAt) }}
          </span>
          <UButton
            icon="i-lucide-trash-2"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('movie.deleteWatch')"
            @click="deleteWatch(watch.id)"
          />
        </li>
      </ul>
    </section>

    <WatchMarkSeenModal v-model:open="modalOpen" :title="movie.title" @confirm="markSeen" />
  </div>
</template>
