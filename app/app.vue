<script setup lang="ts">
import { de, en, es, fr, it, pt } from '@nuxt/ui/locale'

const { data: appSettings } = await useFetch('/api/settings', { key: 'app-settings' })
const { language, setLocalLanguage } = useAppLanguage()

if (appSettings.value) {
  setLocalLanguage(appSettings.value.displayLanguage)
}

watchEffect(() => {
  if (appSettings.value) {
    setLocalLanguage(appSettings.value.displayLanguage)
  }
})

const uiLocales = { de, en, es, fr, it, pt }
const uiLocale = computed(() => uiLocales[language.value] ?? en)

useHead(() => ({
  htmlAttrs: { lang: language.value },
}))
</script>

<template>
  <UApp :locale="uiLocale">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
