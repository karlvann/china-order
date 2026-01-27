<script setup>
// Global app setup
useHead({
  htmlAttrs: {
    class: 'dark'
  }
})
</script>

<template>
  <NuxtPage />
</template>

<style>
/* Ensure dark theme is applied to html element */
html.dark {
  color-scheme: dark;
}
</style>
