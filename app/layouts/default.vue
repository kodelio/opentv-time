<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()

const desktopNavItems = computed(() =>
  APP_NAV_ITEMS.map(item => ({
    label: t(item.labelKey),
    to: item.to,
    icon: item.icon,
    active: isNavItemActive(item.to, route.path),
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
        <nav class="hidden items-center gap-1 md:flex">
          <NuxtLink
            v-for="item in desktopNavItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors"
            :class="
              item.active
                ? 'bg-accented/60 text-highlighted'
                : 'text-muted hover:bg-white/5 hover:text-default'
            "
          >
            <UIcon
              :name="item.icon"
              class="size-5"
              :class="item.active ? 'text-default' : 'text-dimmed'"
            />
            {{ item.label }}
          </NuxtLink>
        </nav>
        <UButton
          to="/settings"
          icon="i-lucide-settings"
          color="neutral"
          variant="ghost"
          :aria-label="t('nav.settings')"
          :class="route.path.startsWith('/settings') ? 'text-primary' : ''"
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
