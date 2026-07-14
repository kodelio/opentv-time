<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    watched: number
    aired: number
    variant?: 'default' | 'overlay'
  }>(),
  { variant: 'default' },
)

const percent = computed(() =>
  props.aired === 0 ? 0 : Math.round((props.watched / props.aired) * 100),
)
const { t } = useI18n()
</script>

<template>
  <div
    v-if="variant === 'overlay'"
    class="bg-gradient-to-t from-black/80 to-transparent pt-5"
    role="progressbar"
    :aria-valuenow="percent"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="t('show.progressAria', { watched, aired })"
  >
    <div class="h-1 w-full bg-white/25">
      <div class="h-full bg-primary" :style="{ width: `${percent}%` }" />
    </div>
  </div>

  <div
    v-else
    class="flex items-center gap-2"
    role="progressbar"
    :aria-valuenow="percent"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="t('show.progressAria', { watched, aired })"
  >
    <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-accented">
      <div class="h-full rounded-full bg-primary" :style="{ width: `${percent}%` }" />
    </div>
    <span class="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted">
      {{ watched }}/{{ aired }}
    </span>
  </div>
</template>
