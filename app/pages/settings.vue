<script setup lang="ts">
import type { AppLanguage } from '../../shared/config/languages'

const toast = useToast()
const { t, language, languageOptions, setLocalLanguage } = useI18n()
const { data: appSettings, refresh: refreshAppSettings } = await useFetch('/api/settings', {
  key: 'app-settings',
})
const { data: pendingItems, refresh: refreshPending } = await useFetch('/api/import/pending')
const { data: lastSync, refresh: refreshSync } = await useFetch('/api/sync/status')

if (appSettings.value) {
  setLocalLanguage(appSettings.value.displayLanguage)
}

const syncing = ref(false)
const savingLanguage = ref(false)

const syncKindLabels = computed<Record<string, string>>(() => ({
  scheduled: t('settings.syncKindScheduled'),
  manual: t('settings.syncKindManual'),
  import: t('settings.syncKindImport'),
}))

async function saveLanguage(value: AppLanguage) {
  if (value === language.value || savingLanguage.value) {
    return
  }
  const previous = language.value
  setLocalLanguage(value)
  savingLanguage.value = true
  try {
    const updated = await $fetch<{ displayLanguage: AppLanguage }>('/api/settings', {
      method: 'PATCH',
      body: { displayLanguage: value },
    })
    setLocalLanguage(updated.displayLanguage)
    await refreshAppSettings()
    toast.add({ title: t('settings.languageSaved'), color: 'success' })
  } catch (error) {
    console.error('Failed to update language:', error)
    setLocalLanguage(previous)
    toast.add({ title: t('settings.languageSaveFailed'), color: 'error' })
  } finally {
    savingLanguage.value = false
  }
}

async function runSync() {
  syncing.value = true
  try {
    const summary = await $fetch<{ refreshed: number; errors: readonly string[] }>(
      '/api/sync/refresh',
      { method: 'POST' },
    )
    toast.add({
      title: t('settings.syncSuccess', { count: summary.refreshed }),
      description: summary.errors.length > 0 ? t('common.errorCount', { count: summary.errors.length }) : undefined,
      color: summary.errors.length > 0 ? 'warning' : 'success',
    })
    await refreshSync()
  } catch (error) {
    console.error('Sync failed:', error)
    toast.add({ title: t('settings.syncFailed'), color: 'error' })
  } finally {
    syncing.value = false
  }
}
</script>

<template>
  <div class="mx-auto min-w-0 max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold tracking-tight">{{ t('settings.title') }}</h1>

    <section class="mb-8">
      <h2 class="mb-1 font-medium">{{ t('settings.displayTitle') }}</h2>
      <p class="mb-3 break-words text-sm text-muted">
        {{ t('settings.displayDescription') }}
      </p>
      <div class="panel min-w-0 overflow-hidden p-4">
        <UFormField :label="t('settings.languageLabel')">
          <USelect
            :model-value="language"
            :items="languageOptions"
            :loading="savingLanguage"
            class="w-full sm:w-64"
            @update:model-value="value => saveLanguage(value as AppLanguage)"
          />
        </UFormField>
      </div>
    </section>

    <section class="mb-8">
      <div class="mb-3 flex items-center gap-2">
        <h2 class="font-medium">{{ t('settings.tmdbSyncTitle') }}</h2>
        <span
          class="inline-flex items-center gap-1.5 rounded-md bg-success/10 px-2 py-0.5 text-xs font-medium text-success ring-1 ring-success/25"
        >
          <UIcon name="i-lucide-circle-check-big" class="size-3.5" />
          {{ t('settings.connected') }}
        </span>
      </div>
      <p class="mb-3 break-words text-sm text-muted">
        {{ t('settings.tmdbSyncDescription') }}
      </p>
      <div class="panel min-w-0 overflow-hidden p-4">
        <div class="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0 text-sm">
            <template v-if="lastSync">
              <p class="break-words">
                {{ t('settings.lastSync', { kind: syncKindLabels[lastSync.kind] ?? lastSync.kind }) }}
                <span class="text-muted">{{ formatDate(lastSync.startedAt) }}</span>
              </p>
              <p class="break-words text-xs text-muted">
                {{ t('settings.syncedShows', { count: lastSync.showsRefreshed }) }}
                <template v-if="lastSync.errors.length > 0">
                  · {{ t('common.errorCount', { count: lastSync.errors.length }) }}
                </template>
              </p>
            </template>
            <p v-else class="text-muted">{{ t('settings.noSyncYet') }}</p>
          </div>
          <UButton
            :label="t('settings.refreshNow')"
            icon="i-lucide-refresh-cw"
            :loading="syncing"
            variant="soft"
            class="justify-center sm:w-auto"
            @click="runSync"
          />
        </div>
      </div>
    </section>

    <section class="mb-8">
      <h2 class="mb-1 font-medium">{{ t('settings.importTitle') }}</h2>
      <p class="mb-3 break-words text-sm text-muted">
        {{ t('settings.importDescription') }}
      </p>
      <ImportTvTimeImport @done="refreshPending()" />
    </section>

    <section>
      <h2 class="mb-1 font-medium">{{ t('settings.pendingTitle') }}</h2>
      <p class="mb-4 break-words text-sm text-muted">
        {{ t('settings.pendingDescription') }}
      </p>

      <UEmpty
        v-if="!pendingItems || pendingItems.length === 0"
        icon="i-lucide-check-circle-2"
        :title="t('settings.pendingEmptyTitle')"
        :description="t('settings.pendingEmptyDescription')"
      />

      <div v-else class="min-w-0 space-y-3">
        <ImportPendingItemCard
          v-for="item in pendingItems"
          :key="item.id"
          :item="item"
          @done="refreshPending()"
        />
      </div>
    </section>
  </div>
</template>
