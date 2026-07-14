<script setup lang="ts">
const { t } = useI18n()
const { data: items, status } = await useFetch('/api/upcoming', {
  getCachedData: freshCachedData,
})

const groupedByDay = computed(() => {
  const groups = new Map<string, NonNullable<typeof items.value>>()
  for (const item of items.value ?? []) {
    const list = groups.get(item.date) ?? []
    groups.set(item.date, [...list, item])
  }
  return [...groups.entries()].map(([date, dayItems]) => ({ date, items: dayItems }))
})
</script>

<template>
  <div>
    <h1 class="mb-4 text-2xl font-bold tracking-tight">{{ t('upcoming.title') }}</h1>

    <div v-if="status === 'pending'" class="space-y-3">
      <USkeleton v-for="index in 6" :key="index" class="h-16 w-full rounded-[10px]" />
    </div>

    <UEmpty
      v-else-if="groupedByDay.length === 0"
      class="mt-10"
      icon="i-lucide-calendar-off"
      :title="t('upcoming.emptyTitle')"
      :description="t('upcoming.emptyDescription')"
    />

    <div v-else class="space-y-6">
      <section v-for="group in groupedByDay" :key="group.date">
        <h2
          class="sticky top-14 z-10 -mx-4 mb-2.5 flex items-center gap-2.5 bg-default/85 px-4 py-2 text-[13px] font-bold text-primary backdrop-blur"
        >
          {{ relativeDayLabel(group.date) }}
          <span
            aria-hidden="true"
            class="h-px flex-1 bg-gradient-to-r from-primary/35 to-transparent"
          />
        </h2>
        <div class="space-y-2">
          <NuxtLink
            v-for="item in group.items"
            :key="`${item.kind}-${item.mediaId}-${item.episodeNumber ?? 0}-${item.seasonNumber ?? 0}`"
            :to="item.kind === 'episode' ? showRoute(item.mediaId) : movieRoute(item.mediaId)"
            class="flex items-center gap-3 rounded-[10px] bg-muted p-3 ring-1 ring-white/8 transition-colors hover:ring-white/15"
          >
            <div class="w-11 shrink-0 overflow-hidden rounded-md">
              <div class="aspect-[2/3]">
                <MediaTmdbImage :path="item.posterPath" :alt="item.title" kind="posterSmall" />
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ item.title }}</p>
              <p class="truncate text-sm text-muted">
                <template v-if="item.kind === 'episode'">
                  <span class="font-mono text-xs text-primary">{{
                    episodeCode(item.seasonNumber ?? 0, item.episodeNumber ?? 0)
                  }}</span>
                  <template v-if="item.episodeName"> · {{ item.episodeName }}</template>
                </template>
                <template v-else>{{ t('upcoming.movieRelease') }}</template>
              </p>
            </div>
            <span
              v-if="item.isSeasonPremiere"
              class="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/25"
            >
              {{ t('upcoming.season', { number: item.seasonNumber ?? 0 }) }}
            </span>
            <span
              v-else-if="item.kind === 'movie'"
              class="shrink-0 rounded-md bg-elevated px-2 py-0.5 text-xs font-medium text-toned ring-1 ring-white/15"
            >
              {{ t('common.movie') }}
            </span>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>
