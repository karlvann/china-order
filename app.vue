<script setup>
const appModeStore = useAppModeStore()

useHead(() => ({
  htmlAttrs: {
    class: ['dark', appModeStore.isTestMode ? 'test-mode' : null].filter(Boolean).join(' ')
  }
}))

onMounted(() => {
  appModeStore.loadFromStorage()
})
</script>

<template>
  <NuxtPage />
</template>

<style>
/* Ensure dark theme is applied to html element */
html.dark:not(.test-mode) {
  color-scheme: dark;
}
</style>
