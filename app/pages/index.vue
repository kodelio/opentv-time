<script setup lang="ts">
const toast = useToast()
const { t } = useI18n()
const {
  data: summary,
  refresh,
  status,
} = await useFetch('/api/home', { getCachedData: freshCachedData })

useRefreshOnVisible(refresh)

const search = ref('')
const isoTomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

function matchesShow(name: string): boolean {
  return matchesQuery(name, search.value)
}

const freshThisWeek = computed(() =>
  (summary.value?.freshThisWeek ?? []).filter(item => matchesShow(item.showName)),
)
const backlog = computed(() =>
  (summary.value?.backlog ?? []).filter(item => matchesShow(item.showName)),
)
const toStart = computed(() =>
  (summary.value?.toStart ?? []).filter(item => matchesShow(item.showName)),
)
const soonRows = computed(() =>
  (summary.value?.soon ?? [])
    .filter(item => matchesShow(item.showName))
    .map(item => ({
      ...item,
      label: compactDayLabel(item.airDate),
      urgent: item.airDate <= isoTomorrow,
    })),
)

const hasAnything = computed(
  () =>
    freshThisWeek.value.length > 0 ||
    backlog.value.length > 0 ||
    toStart.value.length > 0 ||
    soonRows.value.length > 0,
)

const subtitle = computed(() => {
  const count = summary.value?.episodeCount ?? 0
  if (count === 0) {
    return t('home.subtitle.caughtUp')
  }
  const waiting = t('home.subtitle.waiting', { count })
  const runtime = formatDuration(summary.value?.totalRuntime ?? 0)
  return runtime ? `${waiting} · ${t('home.subtitle.total', { duration: runtime })}` : waiting
})

const modal = reactive({ open: false, episodeId: 0, title: '' })

async function markSeen(episodeId: number, watchedAt?: string) {
  try {
    await $fetch(`/api/episodes/${episodeId}/watches`, {
      method: 'POST',
      body: watchedAt ? { watchedAt } : {},
    })
    toast.add({ title: t('home.episodeMarked'), color: 'success' })
    await refresh()
  } catch (error) {
    console.error('Failed to mark episode:', error)
    toast.add({ title: t('home.episodeMarkFailed'), color: 'error' })
  }
}

function openModal(item: {
  episodeId: number
  showName: string
  seasonNumber: number
  episodeNumber: number
}) {
  modal.episodeId = item.episodeId
  modal.title = `${item.showName} · ${episodeCode(item.seasonNumber, item.episodeNumber)}`
  modal.open = true
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="text-[26px] font-extrabold tracking-[-0.03em] text-highlighted md:text-[28px]">
          {{ t('home.title') }}
        </h1>
        <p class="mt-1 text-sm text-muted">{{ subtitle }}</p>
      </div>
      <UInput
        v-if="hasAnything || search"
        v-model="search"
        icon="i-lucide-search"
        :placeholder="t('home.searchPlaceholder')"
        class="md:w-72"
      />
    </div>

    <div v-if="status === 'pending' && !summary" class="mt-6 space-y-3">
      <USkeleton v-for="index in 4" :key="index" class="h-20 w-full rounded-[14px]" />
    </div>

    <UEmpty
      v-else-if="!hasAnything && search.trim() !== ''"
      class="mt-10"
      icon="i-lucide-search-x"
      :title="t('home.noResultsTitle')"
      :description="t('home.noResultsDescription')"
    />

    <UEmpty
      v-else-if="!hasAnything"
      class="mt-10"
      icon="i-lucide-popcorn"
      :title="t('home.emptyTitle')"
      :description="t('home.emptyDescription')"
    >
      <UButton to="/discover" :label="t('nav.discover')" icon="i-lucide-compass" />
    </UEmpty>

    <div v-else class="mt-6 space-y-7">
      <section v-if="freshThisWeek.length">
        <SectionHeader
          icon="i-lucide-calendar-clock"
          :label="t('home.section.freshThisWeek')"
          accent
        />
        <div class="grid gap-2 md:grid-cols-2 md:gap-3">
          <HomeEpisodeCard
            v-for="item in freshThisWeek"
            :key="item.showId"
            :item="item"
            variant="fresh"
            @watch="markSeen(item.episodeId)"
            @watch-at="openModal(item)"
          />
        </div>
      </section>

      <section v-if="backlog.length">
        <SectionHeader
          icon="i-lucide-hourglass"
          :label="t('home.section.backlog')"
          :count="t('library.showCount', { count: backlog.length })"
        />
        <div class="grid gap-2 md:grid-cols-2 md:gap-3">
          <HomeEpisodeCard
            v-for="item in backlog"
            :key="item.showId"
            :item="item"
            variant="backlog"
            @watch="markSeen(item.episodeId)"
            @watch-at="openModal(item)"
          />
        </div>
      </section>

      <div class="grid gap-7 md:grid-cols-[1.3fr_1fr]">
        <section v-if="toStart.length">
          <SectionHeader
            icon="i-lucide-bookmark"
            :label="t('home.section.toStart')"
            :count="summary?.toStartTotal"
          />
          <div class="grid grid-cols-3 gap-3">
            <MediaPosterCard
              v-for="item in toStart"
              :key="item.showId"
              :to="showRoute(item.showId)"
              :title="item.showName"
              :poster-path="item.posterPath"
              :subtitle="t('home.episodeCount', { count: item.episodeCount })"
            />
          </div>
          <UButton
            v-if="!search && (summary?.toStartTotal ?? 0) > toStart.length"
            to="/library"
            variant="link"
            color="neutral"
            trailing-icon="i-lucide-arrow-right"
            :label="t('home.viewAllShows', { count: summary?.toStartTotal ?? 0 })"
            class="mt-2 px-1"
          />
        </section>

        <section v-if="soonRows.length">
          <SectionHeader icon="i-lucide-calendar-days" :label="t('home.section.soon')" />
          <div>
            <NuxtLink
              v-for="row in soonRows"
              :key="`${row.showId}-${row.seasonNumber}-${row.episodeNumber}`"
              :to="showRoute(row.showId)"
              class="flex items-center gap-3 border-b border-white/6 px-1 py-2.5 last:border-0 hover:bg-white/[0.03]"
            >
              <span
                class="w-16 shrink-0 text-xs font-semibold"
                :class="row.urgent ? 'text-primary' : 'text-muted'"
              >{{ row.label }}</span>
              <span class="flex-1 truncate text-sm text-default">
                {{ row.showName }}
                <span class="ml-1 font-mono text-xs text-dimmed">{{
                  episodeCode(row.seasonNumber, row.episodeNumber)
                }}</span>
              </span>
            </NuxtLink>
          </div>
        </section>
      </div>
    </div>

    <WatchMarkSeenModal
      v-model:open="modal.open"
      :title="modal.title"
      @confirm="watchedAt => markSeen(modal.episodeId, watchedAt)"
    />
  </div>
</template>
