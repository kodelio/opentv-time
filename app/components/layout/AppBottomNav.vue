<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()

function isActive(to: string): boolean {
  if (to === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(to)
}
</script>

<template>
  <nav
    class="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 md:hidden"
    style="padding-bottom: max(env(safe-area-inset-bottom), 0.75rem)"
  >
    <ul
      class="pointer-events-auto flex w-full max-w-sm items-center justify-between gap-0.5 rounded-2xl border border-white/10 bg-elevated/90 px-1.5 py-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl"
    >
      <li v-for="item in APP_NAV_ITEMS" :key="item.to" class="min-w-0 flex-1">
        <NuxtLink
          :to="item.to"
          class="flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[9px] font-medium transition-colors sm:text-[10px]"
          :class="isActive(item.to) ? 'bg-primary/15 text-primary' : 'text-muted hover:text-default'"
        >
          <UIcon :name="item.icon" class="size-5" />
          <span class="max-w-full truncate">{{ t(item.labelKey) }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
