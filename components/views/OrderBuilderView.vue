<script setup>
const sriLankaSettingsStore = useSriLankaSettingsStore()
const sriLankaUIStore = useSriLankaUIStore()
const sriLankaOrdersStore = useSriLankaOrdersStore()
const appModeStore = useAppModeStore()
const testInventoryStore = useTestInventoryStore()
const sriLankaInventoryStore = useSriLankaInventoryStore()

const latexInventoryEnabled = computed(() => appModeStore.loaded && appModeStore.isLiveMode)

// Fetch latex sales data
const latexSales = useLatexSales()
const latexInventory = useLatexInventory({ enabled: latexInventoryEnabled })

// Toggle for showing yellow warning backgrounds (off by default)
const showYellowWarnings = ref(false)

// Check if there's a draft order being created (only when panel is open)
const hasDraftOrder = computed(() => sriLankaUIStore.orderPanelOpen && sriLankaUIStore.draftLatexOrder !== null)

// Use draft orders when available (panel open), otherwise null (no new order lane)
const activeLatexOrder = computed(() => {
  if (hasDraftOrder.value) {
    return sriLankaUIStore.draftLatexOrder
  }
  return null
})

// Draft arrival week for timeline display
const draftArrivalWeek = computed(() => sriLankaUIStore.draftArrivalWeek)

// Usage rates for timeline
const usageRates = computed(() => sriLankaSettingsStore.latexSalesRates)

const activeSriLankaInventory = computed(() => {
  if (appModeStore.isTestMode) {
    return testInventoryStore.sriLankaInventory
  }

  return latexInventory.inventory.value
})

const refreshLatexInventory = () => {
  if (!appModeStore.isLiveMode) return
  latexInventory.refresh()
}

watch(activeSriLankaInventory, (inventory) => {
  sriLankaInventoryStore.setInventory(inventory)
}, { immediate: true, deep: true })

watch([
  () => appModeStore.loaded,
  () => appModeStore.isLiveMode,
  () => appModeStore.isTestMode,
  () => testInventoryStore.loaded,
  latexInventory.loading
], ([modeLoaded, isLiveMode, isTestMode, testInventoryLoaded, isLoading]) => {
  sriLankaInventoryStore.setLoading(!modeLoaded || (isTestMode && !testInventoryLoaded) || (isLiveMode && isLoading))
}, { immediate: true })

watch([() => appModeStore.loaded, () => appModeStore.isLiveMode, latexInventory.error], ([modeLoaded, isLiveMode, err]) => {
  sriLankaInventoryStore.setError(modeLoaded && isLiveMode ? err : null)
}, { immediate: true })

// Fetch orders on mount
onMounted(() => {
  appModeStore.loadFromStorage()
  testInventoryStore.loadFromStorage()
  sriLankaSettingsStore.loadFromStorage()
  sriLankaOrdersStore.fetchOrders()
})
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Controls - Sticky -->
    <div class="sticky top-0 z-30 bg-background border-b border-border">
      <div class="max-w-[1600px] mx-auto px-6 py-3">
        <div class="flex items-center gap-5">
          <!-- Warn low stock Toggle -->
          <div class="flex items-center gap-3">
            <label class="text-sm text-muted">Warn low stock</label>
            <button
              type="button"
              :class="[
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                showYellowWarnings ? 'bg-accent-sri-lanka' : 'bg-toggle-off'
              ]"
              @click="showYellowWarnings = !showYellowWarnings"
            >
              <span
                :class="[
                  'inline-block h-3.5 w-3.5 transform rounded-full bg-toggle-knob transition-transform',
                  showYellowWarnings ? 'translate-x-5' : 'translate-x-0.5'
                ]"
              />
            </button>
          </div>

          <!-- Seasonal Demand Toggle -->
          <div class="flex items-center gap-3">
            <label class="text-sm text-muted">Seasonal demand</label>
            <button
              type="button"
              :class="[
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                sriLankaSettingsStore.useSeasonalDemand ? 'bg-accent-sri-lanka' : 'bg-toggle-off'
              ]"
              @click="sriLankaSettingsStore.toggleSeasonalDemand()"
            >
              <span
                :class="[
                  'inline-block h-3.5 w-3.5 transform rounded-full bg-toggle-knob transition-transform',
                  sriLankaSettingsStore.useSeasonalDemand ? 'translate-x-5' : 'translate-x-0.5'
                ]"
              />
            </button>
          </div>

          <!-- Test inventory button -->
          <button
            v-if="appModeStore.isTestMode"
            @click="appModeStore.openTestInventoryModal()"
            class="ml-auto px-4 py-1.5 bg-surface hover:bg-surface-hover border border-border text-primary text-sm font-medium rounded transition-colors"
          >
            Test inventory
          </button>

          <!-- New order button -->
          <button
            @click="sriLankaUIStore.openOrderPanelWithNewOrder()"
            :class="[
              'px-4 py-1.5 bg-accent-sri-lanka hover:bg-accent-sri-lanka-hover text-inverse text-sm font-medium rounded transition-colors',
              appModeStore.isLiveMode ? 'ml-auto' : ''
            ]"
          >
            + New order
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-[1600px] mx-auto px-6 py-8">
      <!-- Loading State -->
      <div v-if="latexSales.loading.value || sriLankaInventoryStore.loading" class="text-center py-10">
        <div class="text-muted">Loading latex data...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="latexSales.error.value || sriLankaInventoryStore.error" class="text-center py-10">
        <div class="text-danger">
          {{ latexSales.error.value || sriLankaInventoryStore.error }}
        </div>
        <button
          @click="latexSales.refresh(); refreshLatexInventory()"
          class="mt-4 px-4 py-2 bg-control-surface hover:bg-control-hover text-primary rounded"
        >
          Retry
        </button>
      </div>

      <!-- Main Content -->
      <template v-else>
        <!-- Pending orders -->
        <SrilankaSriLankaOrderList />

        <!-- Latex timeline -->
        <SrilankaLatexTimeline
          :inventory="sriLankaInventoryStore.inventory"
          :latex-order="activeLatexOrder"
          :has-draft-order="hasDraftOrder"
          :draft-arrival-week="draftArrivalWeek"
          :current-week="sriLankaSettingsStore.currentWeekNumber"
          :usage-rates="usageRates"
          :show-yellow-warnings="showYellowWarnings"
          :stored-orders="sriLankaOrdersStore.orders"
          :use-seasonal-demand="sriLankaSettingsStore.useSeasonalDemand"
        />
      </template>
    </div>

    <!-- Order Panel -->
    <SrilankaSriLankaOrderPanel />
  </div>
</template>
