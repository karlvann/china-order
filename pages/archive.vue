<script setup>
definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

useHead({
  title: 'AusBeds order archive'
})
</script>

<template>
  <ViewsArchiveView />
</template>
