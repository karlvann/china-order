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
const { microMultiplier } = useWeeklySales()

// Toggle for showing yellow warning backgrounds (off by default)
const showYellowWarnings = ref(false)

// Generate order week options (current week + 0-6 weeks)
const orderWeekOptions = computed(() => {
  const options = []
  for (let i = 0; i <= 6; i++) {
    let weekNum = settingsStore.currentWeekNumber + i
    if (weekNum > 52) weekNum -= 52
    options.push({
      value: i,
      label: i === 0 ? `Week ${weekNum} (Now)` : `Week ${weekNum} (+${i})`
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
          22-Week Inventory Forecast
        </h1>
        <p class="text-sm text-zinc-400">
          Projected stock levels with container arrival at Week 10 from order. Components and springs calculated to deplete together.
          <span v-if="usageRates" class="ml-3 text-brand-light">
            ({{ Math.round(usageRates.TOTAL_MONTHLY_SALES / 4.33) }} units/week)
          </span>
        </p>
      </div>

      <!-- Controls -->
      <div class="flex items-center gap-6 mb-8 pb-6 border-b-2 border-border">
        <!-- Order Week Selector -->
        <div class="flex items-center gap-3">
          <label class="text-sm font-semibold text-zinc-50 whitespace-nowrap">Order Week:</label>
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
          <span class="text-sm text-zinc-400">Low Stock Warnings</span>
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
      </div>

      <!-- Spring Timeline -->
      <ForecastSpringTimelineDetailed
        :inventory="inventoryStore.fullInventory"
        :spring-order="orderStore.springOrder"
        :order-week-offset="settingsStore.orderWeekOffset"
        :current-week="settingsStore.currentWeekNumber"
        :usage-rates="usageRates"
        :show-yellow-warnings="showYellowWarnings"
      />

      <!-- Component Timeline -->
      <ForecastComponentTimelineDetailed
        :inventory="inventoryStore.fullInventory"
        :spring-order="orderStore.springOrder"
        :component-order="orderStore.componentOrder"
        :order-week-offset="settingsStore.orderWeekOffset"
        :current-week="settingsStore.currentWeekNumber"
        :usage-rates="usageRates"
        :micro-multiplier="microMultiplier"
        :show-yellow-warnings="showYellowWarnings"
      />

      <!-- Decision Summary -->
      <ForecastDecisionSummary
        :inventory="inventoryStore.fullInventory"
        :spring-order="orderStore.springOrder"
        :usage-rates="usageRates"
      />
    </div>
  </div>
</template>
