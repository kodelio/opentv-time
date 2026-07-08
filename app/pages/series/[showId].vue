<script setup lang="ts">
const route = useRoute()

await navigateTo(showRoute(String(route.params.showId)), { replace: true, redirectCode: 301 })
</script>

<template>
  <div />
</template>
