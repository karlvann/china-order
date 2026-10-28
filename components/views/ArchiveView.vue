<script setup>
const archiveOrdersStore = useArchiveOrdersStore()
const archiveUIStore = useArchiveUIStore()

onMounted(() => {
  archiveOrdersStore.fetchOrders()
})

onUnmounted(() => {
  archiveUIStore.closeOrderPanel()
})
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="max-w-[1600px] mx-auto px-6 py-8">
      <ArchiveOrderList />
    </div>

    <ArchiveOrderPanel />
  </div>
</template>
