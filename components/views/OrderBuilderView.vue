<script setup>
const latexSettingsStore = useLatexSettingsStore()
const latexUIStore = useLatexUIStore()
const latexOrdersStore = useLatexOrdersStore()
const latexInventoryStore = useLatexInventoryStore()

// Fetch latex sales data
const latexSales = useLatexSales()
const latexInventory = useLatexInventory()

// Toggle for showing yellow warning backgrounds (off by default)
const showYellowWarnings = ref(false)
const hideZeroDemandItems = ref(true)

// Check if there's a draft order being created (only when panel is open)
const hasDraftOrder = computed(() => latexUIStore.orderPanelOpen && latexUIStore.draftLatexOrder !== null)

// Use draft orders when available (panel open), otherwise null (no new order lane)
const activeLatexOrder = computed(() => {
  if (hasDraftOrder.value) {
    return latexUIStore.draftLatexOrder
  }
  return null
})

// Draft arrival week for timeline display
const draftArrivalWeek = computed(() => latexUIStore.draftArrivalWeek)

// Usage rates for timeline
const usageRates = computed(() => latexSettingsStore.planningLatexSalesRates)

const refreshLatexInventory = () => latexInventory.refresh()

watch(latexInventory.inventory, latexInventoryStore.setInventory, { immediate: true, deep: true })
watch(latexInventory.loading, latexInventoryStore.setLoading, { immediate: true })
watch(latexInventory.error, latexInventoryStore.setError, { immediate: true })

// Fetch orders on mount
onMounted(() => {
  latexSettingsStore.loadFromStorage()
  latexOrdersStore.fetchOrders()
})
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Controls - Sticky -->
    <div class="sticky top-0 z-30 bg-background border-b border-border">
      <div class="max-w-[1600px] mx-auto px-6 py-3">
        <div class="flex flex-wrap items-center gap-5">
          <!-- Warn low stock Toggle -->
          <div class="flex items-center gap-3">
            <label class="text-sm text-muted">Warn low stock</label>
            <button
              type="button"
              :class="[
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                showYellowWarnings ? 'bg-accent-latex' : 'bg-toggle-off'
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

          <!-- Hide zero demand items toggle -->
          <div class="flex items-center gap-3">
            <label for="latex-hide-zero-demand" class="text-sm text-muted">Hide zero demand items</label>
            <button
              id="latex-hide-zero-demand"
              type="button"
              role="switch"
              :aria-checked="hideZeroDemandItems"
              title="Hide items with demand below 0.05 per week"
              :class="[
                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                hideZeroDemandItems ? 'bg-accent-latex' : 'bg-toggle-off'
              ]"
              @click="hideZeroDemandItems = !hideZeroDemandItems"
            >
              <span
                :class="[
                  'inline-block h-3.5 w-3.5 transform rounded-full bg-toggle-knob transition-transform',
                  hideZeroDemandItems ? 'translate-x-5' : 'translate-x-0.5'
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
                latexSettingsStore.useSeasonalDemand ? 'bg-accent-latex' : 'bg-toggle-off'
              ]"
              @click="latexSettingsStore.toggleSeasonalDemand()"
            >
              <span
                :class="[
                  'inline-block h-3.5 w-3.5 transform rounded-full bg-toggle-knob transition-transform',
                  latexSettingsStore.useSeasonalDemand ? 'translate-x-5' : 'translate-x-0.5'
                ]"
              />
            </button>
          </div>

          <!-- Store split demand toggle -->
          <div class="flex items-center gap-3">
            <label class="text-sm text-muted">Store split demand</label>
            <button
              type="button"
              :class="[
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                latexSettingsStore.useStoreSplitDemand ? 'bg-accent-latex' : 'bg-toggle-off'
              ]"
              title="Use two-week sales volume with fixed mattress latex firmness percentages; pillow demand is unchanged"
              @click="latexSettingsStore.toggleStoreSplitDemand()"
            >
              <span
                :class="[
                  'inline-block h-3.5 w-3.5 transform rounded-full bg-toggle-knob transition-transform',
                  latexSettingsStore.useStoreSplitDemand ? 'translate-x-5' : 'translate-x-0.5'
                ]"
              />
            </button>
          </div>

          <!-- New order button -->
          <button
            @click="latexUIStore.openOrderPanelWithNewOrder()"
            class="ml-auto px-4 py-1.5 bg-accent-latex hover:bg-accent-latex-hover text-inverse text-sm font-medium rounded transition-colors"
          >
            + New order
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-[1600px] mx-auto px-6 py-8">
      <!-- Loading State -->
      <div v-if="latexSales.loading.value || latexInventoryStore.loading" class="text-center py-10">
        <div class="text-muted">Loading latex data...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="latexSales.error.value || latexInventoryStore.error" class="text-center py-10">
        <div class="text-danger">
          {{ latexSales.error.value || latexInventoryStore.error }}
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
        <LatexOrderList />

        <!-- Latex timeline -->
        <LatexTimeline
          :inventory="latexInventoryStore.inventory"
          :latex-order="activeLatexOrder"
          :has-draft-order="hasDraftOrder"
          :draft-arrival-week="draftArrivalWeek"
          :current-week="latexSettingsStore.currentWeekNumber"
          :usage-rates="usageRates"
          :show-yellow-warnings="showYellowWarnings"
          :hide-zero-demand-items="hideZeroDemandItems"
          :stored-orders="latexOrdersStore.orders"
          :use-seasonal-demand="latexSettingsStore.useSeasonalDemand"
        />
      </template>
    </div>

    <!-- Order Panel -->
    <LatexOrderPanel />
  </div>
</template>
