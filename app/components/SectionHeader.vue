<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    /** Optional Lucide icon shown before the label. */
    icon?: string
    /** Amber tint (for "urgent" sections: Out this week, Upcoming). */
    accent?: boolean
    /** Discreet counter shown after the label. */
    count?: string | number
  }>(),
  { accent: false },
)
</script>

<template>
  <h2
    class="mb-3 flex items-center gap-2.5 text-[13px] font-bold"
    :class="accent ? 'text-primary' : 'text-default'"
  >
    <UIcon
      v-if="icon"
      :name="icon"
      class="size-4 shrink-0"
      :class="accent ? 'text-primary' : 'text-muted'"
    />
    <span>{{ label }}</span>
    <span v-if="count !== undefined" class="text-xs font-medium text-dimmed">{{ count }}</span>
    <span
      aria-hidden="true"
      class="h-px flex-1 bg-gradient-to-r to-transparent"
      :class="accent ? 'from-primary/35' : 'from-white/15'"
    />
  </h2>
</template>
