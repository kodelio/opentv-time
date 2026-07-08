<script setup lang="ts">
const toast = useToast()
const { t } = useI18n()
const { data: items, refresh, status } = await useFetch('/api/home', {
  getCachedData: freshCachedData,
})

useRefreshOnVisible(refresh)

const search = ref('')

const sections = computed(() => {
  const all = (items.value ?? []).filter(item => matchesQuery(item.showName, search.value))
  const enCours = all.filter(item => item.lastWatchedAt !== null)
  const pasCommencees = [...all.filter(item => item.lastWatchedAt === null)].sort((a, b) =>
    (b.followedAt ?? '').localeCompare(a.followedAt ?? ''),
  )
  return [
    { key: 'en-cours', title: t('home.section.started'), items: enCours },
    { key: 'pas-commencees', title: t('home.section.notStarted'), items: pasCommencees },
  ].filter(section => section.items.length > 0)
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

function openModal(episodeId: number, title: string) {
  modal.episodeId = episodeId
  modal.title = title
  modal.open = true
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-2xl font-bold tracking-tight">{{ t('home.title') }}</h1>

    <UInput
      v-if="items && items.length > 0"
      v-model="search"
      icon="i-lucide-search"
      :placeholder="t('home.searchPlaceholder')"
      class="mb-4 w-full"
    />

    <div v-if="status === 'pending' && !items" class="space-y-3">
      <USkeleton v-for="index in 5" :key="index" class="h-24 w-full" />
    </div>

    <UEmpty
      v-else-if="sections.length === 0 && search.trim() !== ''"
      icon="i-lucide-search-x"
      :title="t('home.noResultsTitle')"
      :description="t('home.noResultsDescription')"
    />

    <UEmpty
      v-else-if="sections.length === 0"
      icon="i-lucide-popcorn"
      :title="t('home.emptyTitle')"
      :description="t('home.emptyDescription')"
    >
      <UButton to="/discover" :label="t('nav.discover')" icon="i-lucide-compass" />
    </UEmpty>

    <div v-else class="space-y-8">
      <section v-for="section in sections" :key="section.key">
        <h2 class="eyebrow mb-3 flex items-baseline gap-2">
          {{ section.title }}
          <span class="font-normal text-dimmed">{{ section.items.length }}</span>
        </h2>
        <div class="space-y-3">
          <ShowNextEpisodeCard
            v-for="item in section.items"
            :key="item.showId"
            :item="item"
            @watch="markSeen(item.episodeId)"
            @watch-at="openModal(item.episodeId, `${item.showName} · ${episodeCode(item.seasonNumber, item.episodeNumber)}`)"
          />
        </div>
      </section>
    </div>

    <WatchMarkSeenModal
      v-model:open="modal.open"
      :title="modal.title"
      @confirm="watchedAt => markSeen(modal.episodeId, watchedAt)"
    />
  </div>
</template>
