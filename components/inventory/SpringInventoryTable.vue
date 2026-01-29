<script setup>
import { MATTRESS_SIZES, FIRMNESS_TYPES } from '~/lib/constants/index.js'

const inventoryStore = useInventoryStore()
const { weeklyRates } = useWeeklySales()

// Get spring value for a firmness/size
const getSpringValue = (firmness, sizeId) => {
  return inventoryStore.springs[firmness]?.[sizeId] || 0
}

// Get monthly demand for a firmness/size
const getMonthlyDemand = (firmness, sizeId) => {
  const weeklyRate = weeklyRates.value[sizeId]?.[firmness] || 0
  return weeklyRate * (30 / 7)
}

// Get coverage in months for a firmness/size
const getCoverage = (firmness, sizeId) => {
  const inventory = getSpringValue(firmness, sizeId)
  const monthlyDemand = getMonthlyDemand(firmness, sizeId)
  if (monthlyDemand === 0) return null
  return inventory / monthlyDemand
}

// Get coverage color class
const getCoverageColor = (coverage) => {
  if (coverage === null) return 'text-zinc-500'
  if (coverage < 2) return 'text-red-400'
  if (coverage < 3) return 'text-yellow-400'
  return 'text-green-400'
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="bg-surfaceHover">
          <th class="table-header">Size</th>
          <th class="table-header text-center">Firm</th>
          <th class="table-header text-center">Medium</th>
          <th class="table-header text-center">Soft</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="size in MATTRESS_SIZES"
          :key="size.id"
          class="border-b border-border"
        >
          <td class="table-cell font-semibold">{{ size.name }}</td>
          <td
            v-for="firmness in FIRMNESS_TYPES"
            :key="firmness"
            class="table-cell text-center"
          >
            <span class="font-mono text-zinc-300">
              {{ getSpringValue(firmness, size.id) }}
            </span>
            <span
              v-if="getCoverage(firmness, size.id) !== null"
              :class="['text-xs ml-1', getCoverageColor(getCoverage(firmness, size.id))]"
            >
              ({{ getCoverage(firmness, size.id).toFixed(1) }}mo)
            </span>
            <span v-else class="text-xs text-zinc-600 ml-1">
              (-)
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Read-only notice -->
    <p class="text-xs text-zinc-500 mt-3 italic">
      Spring inventory is loaded from Directus and cannot be edited here.
    </p>
  </div>
</template>
