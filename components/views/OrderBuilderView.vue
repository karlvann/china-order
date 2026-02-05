<script setup>
const sriLankaSettingsStore = useSriLankaSettingsStore()
const sriLankaUIStore = useSriLankaUIStore()
const sriLankaOrdersStore = useSriLankaOrdersStore()

// Fetch latex sales data
const latexSales = useLatexSales()
const latexInventory = useLatexInventory()

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

// Fetch orders on mount
onMounted(() => {
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
            <label class="text-sm text-zinc-300">Warn low stock</label>
            <button
              type="button"
              :class="[
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                showYellowWarnings ? 'bg-orange-500' : 'bg-zinc-600'
              ]"
              @click="showYellowWarnings = !showYellowWarnings"
            >
              <span
                :class="[
                  'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                  showYellowWarnings ? 'translate-x-5' : 'translate-x-0.5'
                ]"
              />
            </button>
          </div>

          <!-- Seasonal Demand Toggle -->
          <div class="flex items-center gap-3">
            <label class="text-sm text-zinc-300">Seasonal demand</label>
            <button
              type="button"
              :class="[
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                sriLankaSettingsStore.useSeasonalDemand ? 'bg-orange-500' : 'bg-zinc-600'
              ]"
              @click="sriLankaSettingsStore.toggleSeasonalDemand()"
            >
              <span
                :class="[
                  'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                  sriLankaSettingsStore.useSeasonalDemand ? 'translate-x-5' : 'translate-x-0.5'
                ]"
              />
            </button>
          </div>

          <!-- New order button -->
          <button
            @click="sriLankaUIStore.openOrderPanelWithNewOrder()"
            class="ml-auto px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded transition-colors"
          >
            + New order
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-[1600px] mx-auto px-6 py-8">
      <!-- Loading State -->
      <div v-if="latexSales.loading.value || latexInventory.loading.value" class="text-center py-10">
        <div class="text-zinc-400">Loading latex data...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="latexSales.error.value || latexInventory.error.value" class="text-center py-10">
        <div class="text-red-400">
          {{ latexSales.error.value || latexInventory.error.value }}
        </div>
        <button
          @click="latexSales.refresh(); latexInventory.refresh()"
          class="mt-4 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-50 rounded"
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
          :inventory="latexInventory.inventory.value"
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
