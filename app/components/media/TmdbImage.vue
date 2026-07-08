<script setup lang="ts">
import type { TmdbImageKind } from '~/composables/useTmdbImage'

const props = withDefaults(
  defineProps<{
    path: string | null | undefined
    alt: string
    kind?: TmdbImageKind
    fallbackIcon?: string
  }>(),
  { kind: 'poster', fallbackIcon: 'i-lucide-image' },
)

const { imageUrl } = useTmdbImage()
const url = computed(() => imageUrl(props.path, props.kind))
</script>

<template>
  <img v-if="url" :src="url" :alt="alt" loading="lazy" class="size-full object-cover">
  <div v-else class="flex size-full items-center justify-center bg-elevated">
    <UIcon :name="fallbackIcon" class="size-8 text-dimmed" />
  </div>
</template>
