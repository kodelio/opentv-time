<script setup lang="ts">
interface PendingCandidate {
  readonly tmdbId: number
  readonly title: string
  readonly originalTitle?: string
  readonly releaseDate?: string
  readonly posterPath?: string
  readonly overview?: string | null
  readonly score: number
}

interface PendingItem {
  readonly id: number
  readonly kind: 'movie' | 'show' | 'episode'
  readonly rawTitle: string
  readonly releaseYear: number | null
  readonly runtime: number | null
  readonly sourceRowsCount?: number
  readonly candidates: readonly PendingCandidate[]
}

const props = defineProps<{ item: PendingItem }>()
const emit = defineEmits<{ done: [] }>()

const toast = useToast()
const { t } = useI18n()
const searchQuery = ref('')
const searching = ref(false)
const searchResults = ref<readonly PendingCandidate[]>([])
const selectedCandidate = ref<PendingCandidate | null>(null)

const kindLabel = computed(
  () =>
    ({
      movie: t('pending.kindMovie'),
      show: t('pending.kindShow'),
      episode: t('pending.kindEpisode'),
    })[props.item.kind],
)
const ignoreLabel = computed(() =>
  props.item.kind === 'episode' ? t('pending.ignoreEpisodes') : t('pending.ignore'),
)
const displayTitle = computed(() => {
  if (props.item.kind !== 'episode') {
    return props.item.rawTitle
  }
  const seriesTitle = props.item.rawTitle
    .replace(/\s+-\s+\d+\s+unmatched episode\(s\)$/i, '')
    .replace(/\s+[\u2013\u2014-]\s+\d+\s+épisode\(s\) non associé\(s\)$/i, '')
  return t('pending.unmatchedEpisodesTitle', {
    title: seriesTitle,
    count: props.item.sourceRowsCount ?? 0,
  })
})
const candidateSections = computed(() =>
  [
    { key: 'suggestions', title: t('pending.suggestions'), items: props.item.candidates },
    { key: 'search', title: t('pending.searchResults'), items: searchResults.value },
  ].filter(section => section.items.length > 0),
)
const detailOpen = computed({
  get: () => selectedCandidate.value !== null,
  set: (value) => {
    if (!value) {
      selectedCandidate.value = null
    }
  },
})

async function search() {
  if (!searchQuery.value.trim()) {
    return
  }
  searching.value = true
  try {
    const results = await $fetch<
      readonly {
        tmdbId: number
        title: string
        originalTitle: string | null
        releaseDate: string | null
        posterPath: string | null
        overview: string | null
      }[]
    >('/api/search', {
      query: { query: searchQuery.value, type: props.item.kind === 'movie' ? 'movie' : 'tv' },
    })
    searchResults.value = results.map(result => ({
      tmdbId: result.tmdbId,
      title: result.title,
      originalTitle: result.originalTitle ?? undefined,
      releaseDate: result.releaseDate ?? undefined,
      posterPath: result.posterPath ?? undefined,
      overview: result.overview,
      score: 0,
    }))
  } catch (error) {
    console.error('Search failed:', error)
    toast.add({ title: t('common.searchImpossible'), color: 'error' })
  } finally {
    searching.value = false
  }
}

async function resolve(tmdbId: number) {
  try {
    await $fetch(`/api/import/pending/${props.item.id}/resolve`, {
      method: 'POST',
      body: { tmdbId },
    })
    toast.add({ title: t('pending.matched', { title: displayTitle.value }), color: 'success' })
    emit('done')
  } catch (error) {
    console.error('Resolution failed:', error)
    toast.add({ title: t('common.associationImpossible'), color: 'error' })
  }
}

async function ignore() {
  try {
    await $fetch(`/api/import/pending/${props.item.id}/ignore`, { method: 'POST' })
    toast.add({ title: t('pending.ignored', { title: displayTitle.value }), color: 'neutral' })
    emit('done')
  } catch (error) {
    console.error('Ignore failed:', error)
    toast.add({ title: t('movie.actionFailed'), color: 'error' })
  }
}

function openDetails(candidate: PendingCandidate) {
  selectedCandidate.value = candidate
}

function closeDetails() {
  detailOpen.value = false
}

function candidateMeta(candidate: PendingCandidate | null): string | undefined {
  if (!candidate) {
    return undefined
  }
  const parts = [
    kindLabel.value,
    yearOf(candidate.releaseDate),
    candidate.originalTitle && candidate.originalTitle !== candidate.title
      ? candidate.originalTitle
      : undefined,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : undefined
}

function tmdbUrl(candidate: PendingCandidate): string {
  const tmdbKind = props.item.kind === 'movie' ? 'movie' : 'tv'
  return `https://www.themoviedb.org/${tmdbKind}/${candidate.tmdbId}`
}
</script>

<template>
  <UCard class="min-w-0 overflow-hidden">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <p class="break-words font-medium">{{ displayTitle }}</p>
        <p class="text-xs text-muted">
          {{ kindLabel }}
          <template v-if="item.releaseYear"> · {{ item.releaseYear }}</template>
          <template v-if="item.runtime"> · {{ formatDuration(item.runtime) }}</template>
        </p>
      </div>
      <UButton
        :label="ignoreLabel"
        color="neutral"
        variant="ghost"
        size="sm"
        class="justify-center sm:shrink-0"
        @click="ignore"
      />
    </div>

    <template v-if="item.kind !== 'episode'">
      <div v-for="section in candidateSections" :key="section.key" class="mt-3">
        <h3 class="mb-2 text-xs font-medium uppercase text-muted">{{ section.title }}</h3>
        <ul class="space-y-2">
          <li
            v-for="candidate in section.items"
            :key="`${section.key}-${candidate.tmdbId}`"
            class="flex items-center gap-3"
          >
            <button
              type="button"
              class="w-12 shrink-0 overflow-hidden rounded-md text-left ring-1 ring-default transition hover:ring-primary"
              :aria-label="t('common.showDetails', { title: candidate.title })"
              @click="openDetails(candidate)"
            >
              <div class="aspect-[2/3]">
                <MediaTmdbImage :path="candidate.posterPath" :alt="candidate.title" kind="posterSmall" />
              </div>
            </button>
            <div class="min-w-0 flex-1">
              <button
                type="button"
                class="block max-w-full truncate text-left text-sm font-medium hover:text-primary"
                @click="openDetails(candidate)"
              >
                {{ candidate.title }}
              </button>
              <p class="truncate text-xs text-dimmed">
                {{ yearOf(candidate.releaseDate) || t('common.unknownDate') }}
                <template v-if="candidate.originalTitle && candidate.originalTitle !== candidate.title">
                  · {{ candidate.originalTitle }}
                </template>
              </p>
            </div>
            <UButton
              icon="i-lucide-info"
              color="neutral"
              variant="ghost"
              size="sm"
              :aria-label="t('common.showDetails', { title: candidate.title })"
              @click="openDetails(candidate)"
            />
            <UButton :label="t('common.associate')" size="sm" variant="soft" @click="resolve(candidate.tmdbId)" />
          </li>
        </ul>
      </div>

      <div class="mt-3 flex gap-2">
        <UInput
          v-model="searchQuery"
          :placeholder="t('pending.searchPlaceholder')"
          icon="i-lucide-search"
          class="flex-1"
          @keyup.enter="search"
        />
        <UButton :label="t('pending.searchButton')" :loading="searching" color="neutral" variant="outline" @click="search" />
      </div>
    </template>

    <p v-else class="mt-2 text-xs text-muted">
      {{ t('pending.episodeHelp') }}
    </p>

    <UModal
      v-model:open="detailOpen"
      :title="selectedCandidate?.title ?? t('pending.detailsTitle')"
      :description="candidateMeta(selectedCandidate)"
    >
      <template #body>
        <div v-if="selectedCandidate" class="grid gap-4 sm:grid-cols-[9rem_1fr]">
          <div class="overflow-hidden rounded-lg ring-1 ring-default">
            <div class="aspect-[2/3]">
              <MediaTmdbImage :path="selectedCandidate.posterPath" :alt="selectedCandidate.title" />
            </div>
          </div>
          <div class="min-w-0">
            <dl class="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
              <dt class="text-muted">{{ t('pending.title') }}</dt>
              <dd>{{ selectedCandidate.title }}</dd>
              <template
                v-if="
                  selectedCandidate.originalTitle &&
                  selectedCandidate.originalTitle !== selectedCandidate.title
                "
              >
                <dt class="text-muted">{{ t('pending.originalTitle') }}</dt>
                <dd class="min-w-0 break-words">{{ selectedCandidate.originalTitle }}</dd>
              </template>
              <dt class="text-muted">{{ t('pending.year') }}</dt>
              <dd>{{ yearOf(selectedCandidate.releaseDate) || t('common.unknown') }}</dd>
              <dt v-if="selectedCandidate.score > 0" class="text-muted">{{ t('pending.score') }}</dt>
              <dd v-if="selectedCandidate.score > 0">{{ selectedCandidate.score }}</dd>
            </dl>
            <p v-if="selectedCandidate.overview" class="mt-4 text-sm leading-relaxed text-muted">
              {{ selectedCandidate.overview }}
            </p>
            <p v-else class="mt-4 text-sm text-muted">{{ t('pending.noOverview') }}</p>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full flex-wrap justify-end gap-2">
          <UButton :label="t('common.close')" color="neutral" variant="ghost" @click="closeDetails" />
          <UButton
            v-if="selectedCandidate"
            :label="t('common.viewOnTmdb')"
            icon="i-lucide-external-link"
            color="neutral"
            variant="outline"
            :to="tmdbUrl(selectedCandidate)"
            target="_blank"
            rel="noopener noreferrer"
          />
          <UButton
            v-if="selectedCandidate"
            :label="t('common.associate')"
            icon="i-lucide-link"
            @click="resolve(selectedCandidate.tmdbId)"
          />
        </div>
      </template>
    </UModal>
  </UCard>
</template>
