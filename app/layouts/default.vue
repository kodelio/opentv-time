<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()

const desktopNavItems = computed(() =>
  APP_NAV_ITEMS.map(item => ({
    label: t(item.labelKey),
    to: item.to,
    icon: item.icon,
    active: item.to === '/' ? route.path === '/' : route.path.startsWith(item.to),
  })),
)
</script>

<template>
  <div class="min-h-screen text-default">
    <header
      class="sticky top-0 z-40 bg-default/75 backdrop-blur-xl"
      style="padding-top: env(safe-area-inset-top)"
    >
      <div class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold tracking-tight">
          <span
            class="flex size-7 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25"
          >
            <UIcon name="i-lucide-clapperboard" class="size-4.5 text-primary" />
          </span>
          <span>Open TV Time</span>
        </NuxtLink>
        <UNavigationMenu :items="desktopNavItems" class="hidden md:flex" />
        <UButton
          to="/settings"
          icon="i-lucide-settings"
          color="neutral"
          variant="ghost"
          :aria-label="t('nav.settings')"
        />
      </div>
      <div
        class="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
        aria-hidden="true"
      />
    </header>

    <main class="mx-auto min-w-0 max-w-6xl px-4 py-6 pb-32 md:pb-10">
      <slot />
    </main>

    <LayoutAppBottomNav />
  </div>
</template>
