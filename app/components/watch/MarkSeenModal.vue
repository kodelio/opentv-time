<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })
const { t } = useI18n()

const props = withDefaults(defineProps<{ title?: string }>(), {
  title: undefined,
})

const emit = defineEmits<{ confirm: [watchedAt: string] }>()

const watchedDate = ref(todayIsoDate())

watch(open, (value) => {
  if (value) {
    watchedDate.value = todayIsoDate()
  }
})

function confirm() {
  emit('confirm', watchedDate.value)
  open.value = false
}

function cancel() {
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="props.title ?? t('watchModal.defaultTitle')"
    :description="t('watchModal.description')"
  >
    <template #body>
      <UFormField :label="t('watchModal.dateLabel')">
        <UInput v-model="watchedDate" type="date" size="lg" class="w-full" :max="todayIsoDate()" />
      </UFormField>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" :label="t('common.cancel')" @click="cancel" />
        <UButton icon="i-lucide-check" :label="t('watchModal.confirm')" @click="confirm" />
      </div>
    </template>
  </UModal>
</template>
