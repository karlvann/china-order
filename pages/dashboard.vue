<script setup>
definePageMeta({
  middleware: 'auth'
})

await navigateTo('/springs', { replace: true })
</script>
