<script setup>
const props = defineProps({
  usageRates: {
    type: Object,
    required: true
  }
})

const inventoryStore = useInventoryStore()
const orderStore = useOrderStore()
const settingsStore = useSettingsStore()
const uiStore = useUIStore()
const inventoryOrdersStore = useInventoryOrdersStore()

// Toggle for showing yellow warning backgrounds (off by default)
const showYellowWarnings = ref(false)

// Get the Monday of the current week
const getCurrentMonday = () => {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(now.getFullYear(), now.getMonth(), diff)
}

// Fetch orders on mount
onMounted(() => {
  inventoryOrdersStore.fetchOrders()
})

// Set order week to latest pending order's arrival week when orders load
watch(() => inventoryOrdersStore.pendingOrders, (pendingOrders) => {
  if (pendingOrders.length > 0) {
    // Get the latest pending order (sorted by arrival, so last one is latest)
    const latestOrder = pendingOrders[pendingOrders.length - 1]
    const monday = getCurrentMonday()
    const arrivalDate = new Date(latestOrder.expected_arrival)
    const diffMs = arrivalDate - monday
    const arrivalWeekIndex = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))

    // Set order week offset to arrival week (clamped to valid range)
    if (arrivalWeekIndex >= 0 && arrivalWeekIndex <= 20) {
      settingsStore.setOrderWeekOffset(arrivalWeekIndex)
    }
  }
}, { immediate: true })

// Format date as "d Mon" (e.g., "2 Feb")
const formatShortDate = (date) => {
  const day = date.getDate()
  const month = date.toLocaleDateString('en-AU', { month: 'short' })
  return `${day} ${month}`
}

// Generate order week options (current week + 0-20 weeks)
const orderWeekOptions = computed(() => {
  const options = []
  const monday = getCurrentMonday()

  for (let i = 0; i <= 20; i++) {
    let weekNum = settingsStore.currentWeekNumber + i
    if (weekNum > 52) weekNum -= 52

    // Calculate the Monday date for this week
    const weekMonday = new Date(monday)
    weekMonday.setDate(monday.getDate() + (i * 7))
    const dateStr = formatShortDate(weekMonday)

    options.push({
      value: i,
      label: i === 0 ? `Week ${weekNum} / ${dateStr} (Now)` : `Week ${weekNum} / ${dateStr}`
    })
  }
  return options
})

// Get number of pallets allocated to a size
const getPalletsForSize = (size) => {
  if (!orderStore.springOrder?.metadata) return 0
  const meta = orderStore.springOrder.metadata
  if (size === 'King') return meta.king_pallets || 0
  if (size === 'Queen') return meta.queen_pallets || 0
  // For small sizes, count from pallets array
  const pallets = orderStore.springOrder.pallets || []
  return pallets.filter(p => p.size === size).length
}

// Get total springs for a size (across all firmnesses)
const getSpringsForSize = (size) => {
  if (!orderStore.springOrder?.springs) return 0
  const springs = orderStore.springOrder.springs
  return (springs.firm[size] || 0) + (springs.medium[size] || 0) + (springs.soft[size] || 0)
}
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-background">
    <!-- Controls - Sticky (top-16 = 64px to clear fixed header) -->
    <div class="sticky top-16 z-30 bg-background border-b border-border">
      <div class="max-w-[1600px] mx-auto px-6 py-3">
        <div class="flex items-center gap-6">
          <!-- Pallet Count Selector -->
          <div class="flex items-center gap-3">
            <label class="text-sm font-semibold text-zinc-50 whitespace-nowrap">Pallets:</label>
            <div class="flex items-center gap-1">
              <button
                @click="settingsStore.decrementPallets()"
                :disabled="settingsStore.isMinPallets"
                :class="[
                  'w-8 h-8 flex items-center justify-center rounded-lg text-lg font-bold transition-colors',
                  settingsStore.isMinPallets
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-surface hover:bg-surfaceHover text-zinc-50'
                ]"
              >
                −
              </button>
              <span class="w-10 text-center text-zinc-50 font-semibold">{{ settingsStore.palletCount }}</span>
              <button
                @click="settingsStore.incrementPallets()"
                :disabled="settingsStore.isMaxPallets"
                :class="[
                  'w-8 h-8 flex items-center justify-center rounded-lg text-lg font-bold transition-colors',
                  settingsStore.isMaxPallets
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-surface hover:bg-surfaceHover text-zinc-50'
                ]"
              >
                +
              </button>
            </div>
            <span class="text-xs text-zinc-500">({{ settingsStore.palletCount * 30 }} springs)</span>
          </div>

          <!-- Order week Selector -->
          <div class="flex items-center gap-3">
            <label class="text-sm font-semibold text-zinc-50 whitespace-nowrap">Order week:</label>
            <select
              :value="settingsStore.orderWeekOffset"
              @change="settingsStore.setOrderWeekOffset(parseInt($event.target.value))"
              class="py-2.5 px-4 bg-surface border border-border rounded-lg text-zinc-50 text-sm font-semibold cursor-pointer min-w-[160px]"
            >
              <option
                v-for="option in orderWeekOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Delivery Weeks Selector -->
          <div class="flex items-center gap-3">
            <label class="text-sm font-semibold text-zinc-50 whitespace-nowrap">Delivery weeks:</label>
            <select
              :value="settingsStore.deliveryWeeks"
              @change="settingsStore.setDeliveryWeeks(parseInt($event.target.value))"
              class="py-2.5 px-4 bg-surface border border-border rounded-lg text-zinc-50 text-sm font-semibold cursor-pointer min-w-[80px]"
            >
              <option v-for="n in 15" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>

          <!-- Yellow Warnings Toggle -->
          <label class="flex items-center gap-2 cursor-pointer">
            <span class="text-sm text-zinc-400">Low stock warnings</span>
            <button
              type="button"
              :class="[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                showYellowWarnings ? 'bg-brand' : 'bg-zinc-600'
              ]"
              @click="showYellowWarnings = !showYellowWarnings"
            >
              <span
                :class="[
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  showYellowWarnings ? 'translate-x-6' : 'translate-x-1'
                ]"
              />
            </button>
          </label>

          <!-- Seasonal Demand Toggle -->
          <label class="flex items-center gap-2 cursor-pointer">
            <span class="text-sm text-zinc-400">Seasonal demand</span>
            <button
              type="button"
              :class="[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                settingsStore.useSeasonalDemand ? 'bg-brand' : 'bg-zinc-600'
              ]"
              @click="settingsStore.toggleSeasonalDemand()"
            >
              <span
                :class="[
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  settingsStore.useSeasonalDemand ? 'translate-x-6' : 'translate-x-1'
                ]"
              />
            </button>
          </label>

          <!-- Save Recommendation Button -->
          <button
            v-if="orderStore.springOrder"
            @click="uiStore.openOrderModalWithRecommendation()"
            class="ml-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Save recommendation
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-[1600px] mx-auto px-6 py-8">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-zinc-50 mb-2">
          40-week inventory forecast
        </h1>
        <p class="text-sm text-zinc-400">
          Projected stock levels with container arrival {{ settingsStore.deliveryWeeks }} weeks from order. Components match spring quantities (1:1).
          <span v-if="usageRates" class="ml-3 text-brand-light">
            ({{ usageRates.TOTAL_WEEKLY_SALES }} units/week)
          </span>
        </p>
      </div>

      <!-- Pending orders -->
      <OrdersOrderList />

      <!-- Pallet Allocation Summary -->
      <!-- <div v-if="orderStore.springOrder" class="mb-6 p-4 bg-surface border border-border rounded-lg">
        <h3 class="text-sm font-semibold text-zinc-50 mb-3">Recommended order breakdown</h3>
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
        :inventory="inventoryStore.fullInventory"
        :spring-order="orderStore.springOrder"
        :order-week-offset="settingsStore.orderWeekOffset"
        :delivery-weeks="settingsStore.deliveryWeeks"
        :current-week="settingsStore.currentWeekNumber"
        :usage-rates="usageRates"
        :show-yellow-warnings="showYellowWarnings"
        :stored-orders="inventoryOrdersStore.orders"
        :use-seasonal-demand="settingsStore.useSeasonalDemand"
      />

      <!-- Component timeline -->
      <ForecastComponentTimelineDetailed
        :inventory="inventoryStore.fullInventory"
        :spring-order="orderStore.springOrder"
        :component-order="orderStore.componentOrder"
        :order-week-offset="settingsStore.orderWeekOffset"
        :delivery-weeks="settingsStore.deliveryWeeks"
        :current-week="settingsStore.currentWeekNumber"
        :usage-rates="usageRates"
        :show-yellow-warnings="showYellowWarnings"
        :stored-orders="inventoryOrdersStore.orders"
        :use-seasonal-demand="settingsStore.useSeasonalDemand"
      />
    </div>

    <!-- Order Modal -->
    <OrdersOrderModal v-if="uiStore.orderModalOpen" />
  </div>
</template>
