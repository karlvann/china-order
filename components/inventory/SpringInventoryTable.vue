<script setup>
import { MATTRESS_SIZES, FIRMNESS_TYPES } from '~/lib/constants/index.js'

const inventoryStore = useInventoryStore()
const orderStore = useOrderStore()

// Get spring value for a firmness/size
const getSpringValue = (firmness, sizeId) => {
  return inventoryStore.springs[firmness]?.[sizeId] || 0
}

// Get total for a size
const getSizeTotal = (sizeId) => {
  return FIRMNESS_TYPES.reduce((sum, firmness) =>
    sum + getSpringValue(firmness, sizeId), 0
  )
}

// Get coverage indicator
const getCoverageIndicator = (sizeId) => {
  const coverage = orderStore.coverageData?.[sizeId] || 0

  if (coverage < 2) {
    return { color: 'text-red-400', emoji: '⚠️', label: 'Critical' }
  } else if (coverage < 3) {
    return { color: 'text-yellow-400', emoji: '⚡', label: 'Low' }
  }
  return { color: 'text-green-400', emoji: '✓', label: 'Healthy' }
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
          <th class="table-header text-center">Total</th>
          <th class="table-header text-center">Coverage</th>
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
            <span class="font-mono text-zinc-300 bg-background px-3 py-1.5 rounded">
              {{ getSpringValue(firmness, size.id) }}
            </span>
          </td>
          <td class="table-cell text-center font-mono font-bold text-brand-light">
            {{ getSizeTotal(size.id) }}
          </td>
          <td class="table-cell text-center">
            <div class="flex items-center justify-center gap-1.5">
              <span>{{ getCoverageIndicator(size.id).emoji }}</span>
              <span :class="['font-mono font-semibold', getCoverageIndicator(size.id).color]">
                {{ (orderStore.coverageData?.[size.id] || 0).toFixed(1) }}mo
              </span>
            </div>
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
