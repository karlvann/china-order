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
const { loading: salesLoading, error: salesError, refresh: refreshSales } = useWeeklySales()

// Combined loading/error state
const loading = computed(() => springsLoading.value || componentsLoading.value || salesLoading.value)
const error = computed(() => springsError.value || componentsError.value || salesError.value)

const refresh = () => {
  refreshSprings()
  refreshComponents()
  refreshSales()
}

watch(springs, inventoryStore.setSprings, { immediate: true, deep: true })
watch(springsLoading, inventoryStore.setSpringsLoading, { immediate: true })
watch(springsError, inventoryStore.setSpringsError, { immediate: true })
watch(components, inventoryStore.setComponents, { immediate: true, deep: true })
watch(componentsLoading, inventoryStore.setComponentsLoading, { immediate: true })
watch(componentsError, inventoryStore.setComponentsError, { immediate: true })

onMounted(settingsStore.loadFromStorage)

// Usage rates from live Directus data
const usageRates = computed(() => {
  const rates = settingsStore.planningSalesRates
  const totalWeekly = Object.values(rates.WEEKLY_SALES_RATE).reduce((a, b) => a + b, 0)

  return {
    WEEKLY_SALES_RATE: rates.WEEKLY_SALES_RATE,
    FIRMNESS_DISTRIBUTION: rates.FIRMNESS_DISTRIBUTION,
    RAW_SKU_WEEKLY_DEMAND: rates.RAW_SKU_WEEKLY_DEMAND,
    WEEKLY_SALES_SPIKE: rates.WEEKLY_SALES_SPIKE,
    SKU_WEEKLY_DEMAND_SPIKE: rates.SKU_WEEKLY_DEMAND_SPIKE,
    MICRO_COIL_WEEKLY_DEMAND: rates.MICRO_COIL_WEEKLY_DEMAND,
    MICRO_COIL_WEEKLY_SPIKE: rates.MICRO_COIL_WEEKLY_SPIKE,
    THIN_LATEX_WEEKLY_DEMAND: rates.THIN_LATEX_WEEKLY_DEMAND,
    THIN_LATEX_WEEKLY_SPIKE: rates.THIN_LATEX_WEEKLY_SPIKE,
    SIDE_PANEL_WEEKLY_SPIKE: rates.SIDE_PANEL_WEEKLY_SPIKE,
    STORE_SKU_SPLIT: rates.STORE_SKU_SPLIT,
    TOTAL_WEEKLY_SALES: Math.round(totalWeekly * 10) / 10
  }
})

// Page title
useHead({
  title: 'AusBeds springs and latex ordering'
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

  </div>
</template>
