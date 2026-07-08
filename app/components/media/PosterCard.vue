<script setup lang="ts">
defineProps<{
  to: string
  title: string
  posterPath: string | null
  subtitle?: string
  badge?: string
}>()
</script>

<template>
  <NuxtLink :to="to" class="group block">
    <div class="poster-frame aspect-[2/3]">
      <MediaTmdbImage
        :path="posterPath"
        :alt="title"
        class="transition-transform duration-300 group-hover:scale-[1.04]"
      />
      <UBadge
        v-if="badge"
        :label="badge"
        color="primary"
        variant="solid"
        size="sm"
        class="absolute right-1.5 top-1.5 z-10"
      />
      <div v-if="$slots.overlay" class="absolute inset-x-0 bottom-0 z-10">
        <slot name="overlay" />
      </div>
    </div>
    <p class="mt-2 line-clamp-2 text-sm font-medium leading-tight">{{ title }}</p>
    <p v-if="subtitle" class="text-xs text-muted">{{ subtitle }}</p>
    <slot />
  </NuxtLink>
</template>
