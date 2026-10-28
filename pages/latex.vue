<script setup>
definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

useHead({
  title: 'AusBeds latex ordering'
})
</script>

<template>
  <ViewsLatexView />
</template>
