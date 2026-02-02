<script setup>
import { MATTRESS_SIZES, FIRMNESS_TYPES } from '~/lib/constants/index.js'

const inventoryStore = useInventoryStore()
const { weeklyRates } = useWeeklySales()

// Get spring value for a firmness/size
const getSpringValue = (firmness, sizeId) => {
  return inventoryStore.springs[firmness]?.[sizeId] || 0
}

// Get coverage in weeks for a firmness/size
const getCoverage = (firmness, sizeId) => {
  const inventory = getSpringValue(firmness, sizeId)
  const weeklyDemand = weeklyRates.value[sizeId]?.[firmness] || 0
  if (weeklyDemand === 0) return null
  return inventory / weeklyDemand
}

// Get coverage color class (thresholds in weeks: <8 red, <12 yellow, else green)
const getCoverageColor = (coverage) => {
  if (coverage === null) return 'text-zinc-500'
  if (coverage < 8) return 'text-red-400'
  if (coverage < 12) return 'text-yellow-400'
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
              ({{ getCoverage(firmness, size.id).toFixed(0) }}wk)
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
