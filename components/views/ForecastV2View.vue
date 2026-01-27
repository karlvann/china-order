<script setup>
const props = defineProps({
  usageRates: {
    type: Object,
    required: true
  }
})

const orderStore = useOrderStore()
const settingsStore = useSettingsStore()
const { getMonthOptions } = useMonthNames()

const monthOptions = getMonthOptions()
const projection = computed(() => orderStore.annualProjection)
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-background overflow-y-auto">
    <div class="max-w-[1600px] mx-auto px-6 py-8">
      <!-- Header -->
      <div class="flex justify-between items-start mb-8 pb-6 border-b-2 border-border">
        <div>
          <h1 class="text-2xl font-bold text-zinc-50 mb-2">
            Annual Projection (Forecast V2)
          </h1>
          <p class="text-sm text-zinc-400">
            Multi-container annual simulation using your Order Builder settings.
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

      <!-- Loading/Error States -->
      <div v-if="!projection" class="text-center py-20 text-zinc-500">
        <p>Loading projection...</p>
      </div>

      <!-- Projection Content -->
      <template v-else>
        <!-- Summary Cards -->
        <div class="grid grid-cols-4 gap-4 mb-8">
          <div class="p-4 bg-surface rounded-lg border border-border">
            <div class="text-sm text-zinc-400 mb-1">Total Containers</div>
            <div class="text-2xl font-bold text-zinc-50">{{ projection.totalContainers }}</div>
          </div>
          <div class="p-4 bg-surface rounded-lg border border-border">
            <div class="text-sm text-zinc-400 mb-1">Total Pallets</div>
            <div class="text-2xl font-bold text-zinc-50">{{ projection.totalPallets }}</div>
          </div>
          <div class="p-4 bg-surface rounded-lg border border-border">
            <div class="text-sm text-zinc-400 mb-1">Total Springs</div>
            <div class="text-2xl font-bold text-zinc-50">{{ projection.totalSprings }}</div>
          </div>
          <div class="p-4 bg-surface rounded-lg border border-border">
            <div class="text-sm text-zinc-400 mb-1">Stockout Risk</div>
            <div :class="['text-2xl font-bold', projection.hasStockout ? 'text-red-400' : 'text-green-400']">
              {{ projection.hasStockout ? 'Yes' : 'No' }}
            </div>
          </div>
        </div>

        <!-- Orders Timeline -->
        <div v-if="projection.orders.length > 0" class="mb-8">
          <h3 class="text-lg font-semibold text-zinc-50 mb-4">Scheduled Orders</h3>
          <div class="space-y-3">
            <div
              v-for="order in projection.orders"
              :key="order.id"
              class="p-4 bg-surface rounded-lg border border-border"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-3">
                  <span class="font-semibold text-zinc-50">{{ order.id }}</span>
                  <span :class="[
                    'px-2 py-0.5 rounded text-xs font-medium',
                    order.urgency === 'urgent' ? 'bg-red-500/20 text-red-400' :
                    order.urgency === 'plan_soon' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  ]">
                    {{ order.urgency }}
                  </span>
                </div>
                <span class="text-sm text-zinc-400">
                  Order: {{ order.orderMonthName }} → Arrives: {{ order.arrivalMonthName }}
                </span>
              </div>
              <div class="text-sm text-zinc-400">
                {{ order.palletCount }} pallets | {{ order.reason }}
              </div>
              <div class="text-xs text-zinc-500 mt-1">
                Driving sizes: {{ order.drivingSizes.join(', ') }}
              </div>
            </div>
          </div>
        </div>

        <!-- Spring Timeline V2 -->
        <ForecastSpringTimelineV2
          :projection="projection"
          :starting-month="settingsStore.startingMonth"
          :usage-rates="usageRates"
        />

        <!-- Component Timeline V2 -->
        <ForecastComponentTimelineV2
          :projection="projection"
          :starting-month="settingsStore.startingMonth"
          :usage-rates="usageRates"
        />
      </template>
    </div>
  </div>
</template>
