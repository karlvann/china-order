<script setup>
const props = defineProps({
  usageRates: {
    type: Object,
    required: true
  }
})

const inventoryStore = useInventoryStore()
const settingsStore = useSettingsStore()
const uiStore = useUIStore()
const inventoryOrdersStore = useInventoryOrdersStore()

// Toggle for showing yellow warning backgrounds (off by default)
const showYellowWarnings = ref(false)

// Check if there's a draft order being created (only when panel is open)
const hasDraftOrder = computed(() => uiStore.orderPanelOpen && uiStore.draftSpringOrder !== null)

// Use draft orders when available (panel open), otherwise null (no new order lane)
const activeSpringOrder = computed(() => {
  if (hasDraftOrder.value) {
    return uiStore.draftSpringOrder
  }
  return null
})

const activeComponentOrder = computed(() => {
  if (hasDraftOrder.value) {
    return uiStore.draftComponentOrder
  }
  return null
})

// Draft arrival week for timeline display
const draftArrivalWeek = computed(() => uiStore.draftArrivalWeek)

// Refs for syncing timeline scroll
const springTimelineRef = ref(null)
const componentTimelineRef = ref(null)
let isScrolling = false

// Sync scroll between timelines (prevent infinite loop with flag)
const onSpringScroll = (scrollLeft) => {
  if (isScrolling) return
  isScrolling = true
  componentTimelineRef.value?.scrollTo(scrollLeft)
  requestAnimationFrame(() => { isScrolling = false })
}

const onComponentScroll = (scrollLeft) => {
  if (isScrolling) return
  isScrolling = true
  springTimelineRef.value?.scrollTo(scrollLeft)
  requestAnimationFrame(() => { isScrolling = false })
}

// Fetch orders on mount
onMounted(() => {
  inventoryOrdersStore.fetchOrders()
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
                showYellowWarnings ? 'bg-brand' : 'bg-zinc-600'
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
                settingsStore.useSeasonalDemand ? 'bg-brand' : 'bg-zinc-600'
              ]"
              @click="settingsStore.toggleSeasonalDemand()"
            >
              <span
                :class="[
                  'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                  settingsStore.useSeasonalDemand ? 'translate-x-5' : 'translate-x-0.5'
                ]"
              />
            </button>
          </div>

          <!-- New order button -->
          <button
            @click="uiStore.openOrderPanelWithNewOrder()"
            class="ml-auto px-4 py-1.5 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded transition-colors"
          >
            + New order
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-[1600px] mx-auto px-6 py-8">
      <!-- Header -->
      <!-- <div class="mb-6">
        <h1 class="text-2xl font-bold text-zinc-50 mb-2">
          40-week inventory forecast
        </h1>
        <p class="text-sm text-zinc-400">
          Projected stock levels with container arrival {{ settingsStore.deliveryWeeks }} weeks from order. Components match spring quantities (1:1).
          <span v-if="usageRates" class="ml-3 text-brand-light">
            ({{ usageRates.TOTAL_WEEKLY_SALES }} units/week)
          </span>
        </p>
      </div> -->

      <!-- Pending orders -->
      <OrdersOrderList />

      <!-- Pallet Allocation Summary -->
      <!-- <div v-if="orderStore.springOrder" class="mb-6 p-4 bg-surface border border-border rounded-lg">
        <h3 class="text-sm font-semibold text-zinc-50 mb-3">New order breakdown</h3>
        <div class="flex flex-wrap items-center gap-4 text-sm">
          <div
            v-for="size in ['King', 'Queen', 'Double', 'King Single', 'Single']"
            :key="size"
            class="flex items-center gap-2"
          >
            <span class="text-zinc-400">{{ size }}:</span>
            <span class="font-mono text-zinc-50">
              {{ getPalletsForSize(size) }} pallets
              <span class="text-zinc-500">({{ getSpringsForSize(size) }})</span>
            </span>
          </div>
          <div class="ml-auto flex items-center gap-2 text-brand-light">
            <span class="font-semibold">Total:</span>
            <span class="font-mono">{{ orderStore.springOrder.metadata.total_pallets }} pallets ({{ orderStore.springOrder.metadata.total_springs }} springs)</span>
          </div>
        </div>
      </div> -->

      <!-- Spring timeline -->
      <ForecastSpringTimelineDetailed
        ref="springTimelineRef"
        :inventory="inventoryStore.fullInventory"
        :spring-order="activeSpringOrder"
        :has-draft-order="hasDraftOrder"
        :draft-arrival-week="draftArrivalWeek"
        :current-week="settingsStore.currentWeekNumber"
        :usage-rates="usageRates"
        :show-yellow-warnings="showYellowWarnings"
        :stored-orders="inventoryOrdersStore.orders"
        :use-seasonal-demand="settingsStore.useSeasonalDemand"
        @scroll="onSpringScroll"
      />

      <!-- Component timeline -->
      <ForecastComponentTimelineDetailed
        ref="componentTimelineRef"
        :inventory="inventoryStore.fullInventory"
        :spring-order="activeSpringOrder"
        :component-order="activeComponentOrder"
        :has-draft-order="hasDraftOrder"
        :draft-arrival-week="draftArrivalWeek"
        :current-week="settingsStore.currentWeekNumber"
        :usage-rates="usageRates"
        :show-yellow-warnings="showYellowWarnings"
        :stored-orders="inventoryOrdersStore.orders"
        :use-seasonal-demand="settingsStore.useSeasonalDemand"
        @scroll="onComponentScroll"
      />
    </div>

    <!-- Order Panel -->
    <OrdersOrderPanel />
  </div>
</template>
