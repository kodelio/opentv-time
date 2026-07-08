<script setup lang="ts">
const route = useRoute()

await navigateTo(movieRoute(String(route.params.movieId)), { replace: true, redirectCode: 301 })
</script>

<template>
  <div />
</template>
