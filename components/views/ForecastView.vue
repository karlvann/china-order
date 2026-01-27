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
const { getMonthOptions } = useMonthNames()

const monthOptions = getMonthOptions()
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-background overflow-y-auto">
    <div class="max-w-[1600px] mx-auto px-6 py-8">
      <!-- Header -->
      <div class="flex justify-between items-start mb-8 pb-6 border-b-2 border-border">
        <div>
          <h1 class="text-2xl font-bold text-zinc-50 mb-2 flex items-center gap-4">
            12-Month Inventory Forecast
            <span class="badge badge-success text-sm">
              ✓ Equal Runway Validated
            </span>
          </h1>
          <p class="text-sm text-zinc-400">
            Projected stock levels with container arrival at Week 10. Components and springs calculated to deplete together.
            <span v-if="usageRates" class="ml-3 text-brand-light">
              ({{ usageRates.TOTAL_MONTHLY_SALES }} units/month)
            </span>
          </p>
        </div>

        <!-- Month Selector -->
        <div class="flex items-center gap-3">
          <label class="text-sm font-semibold text-zinc-50 whitespace-nowrap">Starting Month:</label>
          <select
            :value="settingsStore.startingMonth"
            @change="settingsStore.setStartingMonth(parseInt($event.target.value))"
            class="py-2.5 px-4 bg-surface border border-border rounded-lg text-zinc-50 text-sm font-semibold cursor-pointer min-w-[140px]"
          >
            <option
              v-for="option in monthOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Spring Timeline -->
      <ForecastSpringTimelineDetailed
        :inventory="inventoryStore.fullInventory"
        :spring-order="orderStore.springOrder"
        :starting-month="settingsStore.startingMonth"
        :usage-rates="usageRates"
      />

      <!-- Component Timeline -->
      <ForecastComponentTimelineDetailed
        :inventory="inventoryStore.fullInventory"
        :spring-order="orderStore.springOrder"
        :component-order="orderStore.componentOrder"
        :starting-month="settingsStore.startingMonth"
        :usage-rates="usageRates"
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
