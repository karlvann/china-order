<script setup>
import { MATTRESS_SIZES } from '~/lib/constants/index.js'

const {
  loading,
  error,
  demandBySize,
  weeklyRates,
  monthlyRates,
  firmnessDistribution,
  totalSales,
  dateRange,
  refresh
} = useWeeklySales()

// Format date for display
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

// Get firmness bar width
const getBarWidth = (value, max) => {
  if (max === 0) return '0%'
  return `${(value / max) * 100}%`
}

// Get max weekly rate for scaling bars
const maxWeeklyRate = computed(() => {
  return Math.max(...Object.values(weeklyRates.value).map(r => r.total), 1)
})

// Calculate monthly rate for a firmness (weekly * 30/7)
const getMonthlyRate = (weeklyRate) => {
  return Math.round(weeklyRate * (30 / 7) * 10) / 10
}
</script>

<template>
  <div class="bg-surface border border-border rounded-lg p-4">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-semibold text-zinc-50">Last 6 weeks of sales</h3>
        <p v-if="dateRange.start" class="text-xs text-zinc-500">
          {{ formatDate(dateRange.start) }} - {{ formatDate(dateRange.end) }} (6 weeks)
        </p>
      </div>
      <button
        @click="refresh"
        :disabled="loading"
        class="px-3 py-1.5 text-xs bg-brand/20 hover:bg-brand/30 text-brand-light rounded-lg transition-colors disabled:opacity-50"
      >
        <span v-if="loading">Loading...</span>
        <span v-else>Refresh</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !demandBySize.King" class="py-8 text-center text-zinc-500">
      <div class="animate-pulse">Fetching sales data from Directus...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="py-4 px-3 bg-red-500/10 border border-red-500/30 rounded-lg">
      <p class="text-sm text-red-400">Failed to load sales data: {{ error }}</p>
      <button
        @click="refresh"
        class="mt-2 text-xs text-red-400 hover:text-red-300 underline"
      >
        Try again
      </button>
    </div>

    <!-- Sales Data -->
    <div v-else>
      <!-- Summary Stats -->
      <div class="grid grid-cols-3 gap-3 mb-4">
        <div class="p-3 bg-background rounded-lg">
          <div class="text-xs text-zinc-500 mb-1">Total Mattresses</div>
          <div class="text-xl font-bold text-zinc-50">{{ totalSales }}</div>
          <div class="text-xs text-zinc-500">last 6 weeks</div>
        </div>
        <div class="p-3 bg-background rounded-lg">
          <div class="text-xs text-zinc-500 mb-1">Weekly Avg</div>
          <div class="text-xl font-bold text-brand-light">
            {{ Math.round(totalSales / 6) }}
          </div>
          <div class="text-xs text-zinc-500">mattresses/week</div>
        </div>
        <div class="p-3 bg-background rounded-lg">
          <div class="text-xs text-zinc-500 mb-1">Monthly Proj</div>
          <div class="text-xl font-bold text-blue-400">
            {{ Math.round(totalSales / 6 * 4.33) }}
          </div>
          <div class="text-xs text-zinc-500">mattresses/month</div>
        </div>
      </div>

      <!-- Demand by Size Table -->
      <table class="w-full text-sm mb-4">
        <thead>
          <tr class="bg-surfaceHover">
            <th class="table-header text-left">Size</th>
            <th class="table-header text-center">
              <span class="text-amber-400">Firm</span>
              <div class="text-[10px] text-zinc-500 font-normal">wk / mo</div>
            </th>
            <th class="table-header text-center">
              <span class="text-green-400">Medium</span>
              <div class="text-[10px] text-zinc-500 font-normal">wk / mo</div>
            </th>
            <th class="table-header text-center">
              <span class="text-purple-400">Soft</span>
              <div class="text-[10px] text-zinc-500 font-normal">wk / mo</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="size in MATTRESS_SIZES"
            :key="size.id"
            class="border-b border-border"
          >
            <td class="table-cell font-semibold">{{ size.name }}</td>
            <td class="table-cell text-center font-mono text-amber-400">
              <span>{{ weeklyRates[size.id]?.firm || 0 }}</span>
              <span class="text-zinc-500 mx-1">/</span>
              <span class="text-amber-300">{{ getMonthlyRate(weeklyRates[size.id]?.firm || 0) }}</span>
            </td>
            <td class="table-cell text-center font-mono text-green-400">
              <span>{{ weeklyRates[size.id]?.medium || 0 }}</span>
              <span class="text-zinc-500 mx-1">/</span>
              <span class="text-green-300">{{ getMonthlyRate(weeklyRates[size.id]?.medium || 0) }}</span>
            </td>
            <td class="table-cell text-center font-mono text-purple-400">
              <span>{{ weeklyRates[size.id]?.soft || 0 }}</span>
              <span class="text-zinc-500 mx-1">/</span>
              <span class="text-purple-300">{{ getMonthlyRate(weeklyRates[size.id]?.soft || 0) }}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Firmness Distribution -->
      <div class="mb-4">
        <h4 class="text-sm font-semibold text-zinc-400 mb-2">Firmness Distribution</h4>
        <div class="space-y-2">
          <div
            v-for="size in MATTRESS_SIZES"
            :key="size.id"
            class="flex items-center gap-2"
          >
            <span class="w-20 text-xs text-zinc-400">{{ size.name }}</span>
            <div class="flex-1 h-4 bg-background rounded overflow-hidden flex">
              <div
                class="h-full bg-amber-500/70"
                :style="{ width: `${firmnessDistribution[size.id]?.firm || 0}%` }"
                :title="`Firm: ${firmnessDistribution[size.id]?.firm || 0}%`"
              />
              <div
                class="h-full bg-green-500/70"
                :style="{ width: `${firmnessDistribution[size.id]?.medium || 0}%` }"
                :title="`Medium: ${firmnessDistribution[size.id]?.medium || 0}%`"
              />
              <div
                class="h-full bg-purple-500/70"
                :style="{ width: `${firmnessDistribution[size.id]?.soft || 0}%` }"
                :title="`Soft: ${firmnessDistribution[size.id]?.soft || 0}%`"
              />
            </div>
            <span class="w-24 text-xs text-zinc-500 text-right">
              {{ firmnessDistribution[size.id]?.firm || 0 }}/{{ firmnessDistribution[size.id]?.medium || 0 }}/{{ firmnessDistribution[size.id]?.soft || 0 }}%
            </span>
          </div>
        </div>
        <div class="flex gap-4 mt-2 text-xs text-zinc-500">
          <span class="flex items-center gap-1">
            <span class="w-3 h-3 bg-amber-500/70 rounded" /> Firm (11+)
          </span>
          <span class="flex items-center gap-1">
            <span class="w-3 h-3 bg-green-500/70 rounded" /> Medium (5-10)
          </span>
          <span class="flex items-center gap-1">
            <span class="w-3 h-3 bg-purple-500/70 rounded" /> Soft (2-4)
          </span>
        </div>
      </div>

    </div>
  </div>
</template>
