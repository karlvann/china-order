<script setup>
definePageMeta({
  middleware: 'auth'
})

// Initialize stores
const inventoryStore = useInventoryStore()
const settingsStore = useSettingsStore()
const appModeStore = useAppModeStore()
const testInventoryStore = useTestInventoryStore()

const liveInventoryEnabled = computed(() => appModeStore.loaded && appModeStore.isLiveMode)

// Initialize composables
const { springs, loading: springsLoading, error: springsError, refresh: refreshSprings } = useSpringInventory({ enabled: liveInventoryEnabled })
const { components, loading: componentsLoading, error: componentsError, refresh: refreshComponents } = useComponentInventory({ enabled: liveInventoryEnabled })
const { loading: salesLoading, error: salesError, refresh: refreshSales } = useWeeklySales()

const activeChinaInventory = computed(() => {
  if (appModeStore.isTestMode) {
    return testInventoryStore.chinaInventory
  }

  return {
    springs: springs.value,
    components: components.value
  }
})

// Combined loading/error state
const loading = computed(() => {
  if (!appModeStore.loaded) return true
  if (appModeStore.isTestMode) return !testInventoryStore.loaded
  return springsLoading.value || componentsLoading.value || salesLoading.value
})

const error = computed(() => {
  if (!appModeStore.loaded || appModeStore.isTestMode) return null
  return springsError.value || componentsError.value || salesError.value
})

const refresh = () => {
  if (!appModeStore.isLiveMode) return
  refreshSprings()
  refreshComponents()
  refreshSales()
}

// Sync active inventory into the China inventory store
watch(activeChinaInventory, (inventory) => {
  inventoryStore.setSprings(inventory.springs)
  inventoryStore.setComponents(inventory.components)
}, { immediate: true, deep: true })

watch([
  () => appModeStore.loaded,
  () => appModeStore.isLiveMode,
  () => appModeStore.isTestMode,
  () => testInventoryStore.loaded,
  springsLoading
], ([modeLoaded, isLiveMode, isTestMode, testInventoryLoaded, isLoading]) => {
  inventoryStore.setSpringsLoading(!modeLoaded || (isTestMode && !testInventoryLoaded) || (isLiveMode && isLoading))
}, { immediate: true })

watch([() => appModeStore.loaded, () => appModeStore.isLiveMode, springsError], ([modeLoaded, isLiveMode, err]) => {
  inventoryStore.setSpringsError(modeLoaded && isLiveMode ? err : null)
}, { immediate: true })

watch([
  () => appModeStore.loaded,
  () => appModeStore.isLiveMode,
  () => appModeStore.isTestMode,
  () => testInventoryStore.loaded,
  componentsLoading
], ([modeLoaded, isLiveMode, isTestMode, testInventoryLoaded, isLoading]) => {
  inventoryStore.setComponentsLoading(!modeLoaded || (isTestMode && !testInventoryLoaded) || (isLiveMode && isLoading))
}, { immediate: true })

watch([() => appModeStore.loaded, () => appModeStore.isLiveMode, componentsError], ([modeLoaded, isLiveMode, err]) => {
  inventoryStore.setComponentsError(modeLoaded && isLiveMode ? err : null)
}, { immediate: true })

// Load settings on mount
onMounted(() => {
  appModeStore.loadFromStorage()
  testInventoryStore.loadFromStorage()
  settingsStore.loadFromStorage()
})

// Usage rates from live Directus data
const usageRates = computed(() => {
  const totalWeekly = Object.values(settingsStore.liveSalesRates.WEEKLY_SALES_RATE).reduce((a, b) => a + b, 0)
  return {
    WEEKLY_SALES_RATE: settingsStore.liveSalesRates.WEEKLY_SALES_RATE,
    FIRMNESS_DISTRIBUTION: settingsStore.liveSalesRates.FIRMNESS_DISTRIBUTION,
    MICRO_COIL_WEEKLY_DEMAND: settingsStore.liveSalesRates.MICRO_COIL_WEEKLY_DEMAND,
    THIN_LATEX_WEEKLY_DEMAND: settingsStore.liveSalesRates.THIN_LATEX_WEEKLY_DEMAND,
    TOTAL_WEEKLY_SALES: Math.round(totalWeekly * 10) / 10
  }
})

// Page title
useHead({
  title: 'AusBeds China Order'
})
</script>

<template>
  <div class="min-h-screen bg-background text-primary font-sans">
    <!-- Header -->
    <AppHeader />

    <!-- Main Content -->
    <main>
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand mx-auto mb-4"></div>
          <p class="text-muted">Loading Directus data...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="section-container py-8">
        <div class="bg-danger/20 border border-danger/30 rounded-lg p-6 text-center">
          <p class="text-danger font-semibold mb-2">Failed to load inventory</p>
          <p class="text-muted text-sm mb-4">{{ error }}</p>
          <button
            @click="refresh"
            class="btn-secondary"
          >
            Try again
          </button>
        </div>
      </div>

      <!-- Main Views -->
      <template v-else>
        <ViewsOrderBuilderView v-if="settingsStore.isBuilderView" :usage-rates="usageRates" />
        <ViewsForecastView v-else :usage-rates="usageRates" />
      </template>
    </main>

    <TestInventoryModal />
  </div>
</template>
