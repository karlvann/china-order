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
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-background overflow-y-auto">
    <div class="max-w-[1600px] mx-auto px-6 py-8">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-zinc-50 mb-2">
          40-week inventory forecast
        </h1>
        <p class="text-sm text-zinc-400">
          Projected stock levels with container arrival at Week 10 from order. Components and springs calculated to deplete together.
          <span v-if="usageRates" class="ml-3 text-brand-light">
            ({{ usageRates.TOTAL_WEEKLY_SALES }} units/week)
          </span>
        </p>
      </div>

      <!-- Pending orders -->
      <OrdersOrderList />

      <!-- Controls -->
      <div class="flex items-center gap-6 mb-8 pb-6 border-b-2 border-border">
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
      </div>

      <!-- Spring timeline -->
      <ForecastSpringTimelineDetailed
        :inventory="inventoryStore.fullInventory"
        :spring-order="orderStore.springOrder"
        :order-week-offset="settingsStore.orderWeekOffset"
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
