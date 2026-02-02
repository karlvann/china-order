<script setup>
definePageMeta({
  middleware: 'auth'
})

// Initialize stores
const inventoryStore = useInventoryStore()
const settingsStore = useSettingsStore()

// Initialize composables
const { springs, loading: springsLoading, error: springsError, refresh: refreshSprings } = useSpringInventory()
const { components, loading: componentsLoading, error: componentsError, refresh: refreshComponents } = useComponentInventory()
const { loading: salesLoading } = useWeeklySales()

// Combined loading/error state
const loading = computed(() => springsLoading.value || componentsLoading.value)
const error = computed(() => springsError.value || componentsError.value)
const refresh = () => {
  refreshSprings()
  refreshComponents()
}

// Watch for spring inventory changes and update store
watch(springs, (newSprings) => {
  inventoryStore.setSprings(newSprings)
}, { immediate: true, deep: true })

watch(springsLoading, (isLoading) => {
  inventoryStore.setSpringsLoading(isLoading)
}, { immediate: true })

watch(springsError, (err) => {
  inventoryStore.setSpringsError(err)
}, { immediate: true })

// Watch for component inventory changes and update store
watch(components, (newComponents) => {
  inventoryStore.setComponents(newComponents)
}, { immediate: true, deep: true })

watch(componentsLoading, (isLoading) => {
  inventoryStore.setComponentsLoading(isLoading)
}, { immediate: true })

watch(componentsError, (err) => {
  inventoryStore.setComponentsError(err)
}, { immediate: true })

// Load settings on mount
onMounted(() => {
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
          <p class="text-red-400 font-semibold mb-2">Failed to load inventory</p>
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
        <ViewsForecastView v-else :usage-rates="usageRates" />
      </template>
    </main>

  </div>
</template>
