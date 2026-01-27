<script setup>
definePageMeta({
  middleware: 'auth'
})

// Initialize stores
const inventoryStore = useInventoryStore()
const settingsStore = useSettingsStore()

// Initialize composables
const { springs, loading, error, refresh } = useSpringInventory()
const { loading: salesLoading } = useWeeklySales()

// Watch for spring inventory changes and update store
watch(springs, (newSprings) => {
  inventoryStore.setSprings(newSprings)
}, { immediate: true, deep: true })

watch(loading, (isLoading) => {
  inventoryStore.setSpringsLoading(isLoading)
}, { immediate: true })

watch(error, (err) => {
  inventoryStore.setSpringsError(err)
}, { immediate: true })

// Load saved components and settings on mount
onMounted(() => {
  inventoryStore.loadComponentsFromStorage()
  settingsStore.loadFromStorage()
})

// Usage rates from live Directus data
const usageRates = computed(() => {
  const totalMonthly = Object.values(settingsStore.liveSalesRates.MONTHLY_SALES_RATE).reduce((a, b) => a + b, 0)
  return {
    MONTHLY_SALES_RATE: settingsStore.liveSalesRates.MONTHLY_SALES_RATE,
    FIRMNESS_DISTRIBUTION: settingsStore.liveSalesRates.FIRMNESS_DISTRIBUTION,
    TOTAL_MONTHLY_SALES: Math.round(totalMonthly)
  }
})

// Page title
useHead({
  title: 'AusBeds China Order'
})
</script>

<template>
  <div class="min-h-screen bg-background text-zinc-200 font-sans">
    <!-- Header -->
    <AppHeader />

    <!-- Main Content -->
    <main>
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand mx-auto mb-4"></div>
          <p class="text-zinc-400">Loading inventory from Directus...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="section-container py-8">
        <div class="bg-red-900/20 border border-red-800 rounded-lg p-6 text-center">
          <p class="text-red-400 font-semibold mb-2">Failed to load spring inventory</p>
          <p class="text-zinc-400 text-sm mb-4">{{ error }}</p>
          <button
            @click="refresh"
            class="btn-secondary"
          >
            Try Again
          </button>
        </div>
      </div>

      <!-- Main Views -->
      <template v-else>
        <ViewsOrderBuilderView v-if="settingsStore.isBuilderView" :usage-rates="usageRates" />
        <ViewsForecastView v-else-if="settingsStore.isForecastView" :usage-rates="usageRates" />
        <ViewsForecastV2View v-else :usage-rates="usageRates" />
      </template>
    </main>

  </div>
</template>
