<script setup lang="ts">
interface ImportSummary {
  readonly shows: { readonly imported: number; readonly alreadyPresent: number; readonly pending: number }
  readonly episodes: {
    readonly totalWatches: number
    readonly mapped: number
    readonly unmatched: number
    readonly watchesInserted: number
  }
  readonly movies: {
    readonly matched: number
    readonly pending: number
    readonly skipped: number
    readonly watchesInserted: number
    readonly watchlistInserted: number
  }
  readonly errors: readonly string[]
}

const emit = defineEmits<{ done: [] }>()
const toast = useToast()
const { t } = useI18n()

const file = ref<File | null>(null)
const importing = ref(false)
const summary = ref<ImportSummary | null>(null)

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { message?: string; statusMessage?: string } }).data
    return data?.message ?? data?.statusMessage ?? t('common.importImpossible')
  }
  return t('common.importImpossible')
}

async function onImport() {
  if (!file.value) {
    return
  }
  importing.value = true
  try {
    const formData = new FormData()
    formData.append('archive', file.value)
    const result = await $fetch<ImportSummary>('/api/import/tvtime', {
      method: 'POST',
      body: formData,
    })
    summary.value = result
    const pendingTotal = result.shows.pending + result.movies.pending + result.episodes.unmatched
    toast.add({
      title: t('import.doneTitle'),
      description: t('import.doneDescription', {
        shows: result.shows.imported,
        episodes: result.episodes.watchesInserted,
        movies: result.movies.watchesInserted,
        pending: pendingTotal > 0 ? t('import.pendingSuffix', { count: pendingTotal }) : '',
      }),
      color: result.errors.length > 0 ? 'warning' : 'success',
    })
    file.value = null
    emit('done')
  } catch (error) {
    toast.add({ title: t('common.importImpossible'), description: errorMessage(error), color: 'error' })
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div class="min-w-0 space-y-3">
    <UFileUpload
      v-model="file"
      accept=".zip"
      icon="i-lucide-upload"
      :label="t('import.dropLabel')"
      :description="t('import.dropDescription')"
      class="min-w-0 max-w-full overflow-hidden"
    />

    <div class="flex min-w-0 flex-wrap items-center gap-3">
      <UButton
        :label="t('import.button')"
        icon="i-lucide-download"
        :loading="importing"
        :disabled="!file"
        @click="onImport"
      />
      <span v-if="file" class="min-w-0 truncate text-sm text-muted">{{ file.name }}</span>
    </div>

    <UCard v-if="summary" class="min-w-0 overflow-hidden" :ui="{ body: 'p-4 sm:p-4' }">
      <ul class="space-y-1 text-sm">
        <li>
          {{
            t('import.summaryShows', {
              imported: summary.shows.imported,
              alreadyPresent: summary.shows.alreadyPresent,
              pending: summary.shows.pending,
            })
          }}
        </li>
        <li>
          {{ t('import.summaryEpisodes', { count: summary.episodes.watchesInserted }) }}
          <template v-if="summary.episodes.unmatched > 0">
            {{ t('import.summaryEpisodesUnmatched', { count: summary.episodes.unmatched }) }}
          </template>
        </li>
        <li>
          {{
            t('import.summaryMovies', {
              watched: summary.movies.watchesInserted,
              watchlist: summary.movies.watchlistInserted,
              pending: summary.movies.pending,
            })
          }}
        </li>
        <li v-if="summary.errors.length > 0" class="text-warning">
          {{ t('import.summaryErrors', { count: summary.errors.length }) }}
        </li>
      </ul>
    </UCard>
  </div>
</template>
