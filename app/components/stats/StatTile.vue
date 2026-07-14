<script setup lang="ts">
defineProps<{
  icon: string
  label: string
  value: string
  hint?: string
}>()
</script>

<template>
  <div class="panel flex items-center gap-3 p-4">
    <div
      class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20"
    >
      <UIcon :name="icon" class="size-5 text-primary" />
    </div>
    <div class="min-w-0">
      <p class="truncate text-xl font-bold leading-tight tracking-tight tabular-nums">
        {{ value }}
      </p>
      <p class="text-xs text-muted">{{ label }}</p>
      <p v-if="hint" class="text-xs text-dimmed">{{ hint }}</p>
    </div>
  </div>
</template>
