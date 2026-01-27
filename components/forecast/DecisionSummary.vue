<script setup>
import { MONTHLY_SALES_RATE, SPRINGS_PER_PALLET } from '~/lib/constants/index.js'

const props = defineProps({
  inventory: {
    type: Object,
    required: true
  },
  springOrder: {
    type: Object,
    default: null
  },
  usageRates: {
    type: Object,
    required: true
  }
})

const orderStore = useOrderStore()

// Calculate coverage changes
const coverageChanges = computed(() => {
  if (!props.springOrder) return []

  const sizes = ['King', 'Queen', 'Double', 'King Single', 'Single']
  const result = []

  sizes.forEach(size => {
    const currentStock = ['firm', 'medium', 'soft'].reduce(
      (sum, f) => sum + (props.inventory.springs[f][size] || 0), 0
    )
    const orderStock = ['firm', 'medium', 'soft'].reduce(
      (sum, f) => sum + (props.springOrder.springs[f][size] || 0), 0
    )
    const monthlySales = props.usageRates.MONTHLY_SALES_RATE[size]

    const currentCoverage = monthlySales > 0 ? currentStock / monthlySales : 0
    const afterCoverage = monthlySales > 0 ? (currentStock + orderStock) / monthlySales : 0
    const pallets = props.springOrder.pallets.filter(p => p.size === size).length

    result.push({
      size,
      currentStock,
      orderStock,
      pallets,
      currentCoverage,
      afterCoverage,
      change: afterCoverage - currentCoverage
    })
  })

  return result
})

// Get coverage color
const getCoverageColor = (months) => {
  if (months < 2) return 'text-red-400'
  if (months < 3) return 'text-yellow-400'
  return 'text-green-400'
}
</script>

<template>
  <div class="bg-surface border border-border rounded-lg p-6">
    <h3 class="text-lg font-semibold text-zinc-50 mb-4">Order Summary & Coverage Impact</h3>

    <!-- Order Stats -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="p-3 bg-background rounded-lg">
        <div class="text-xs text-zinc-500 mb-1">Total Pallets</div>
        <div class="text-xl font-bold text-zinc-50">{{ orderStore.totalPallets }}</div>
      </div>
      <div class="p-3 bg-background rounded-lg">
        <div class="text-xs text-zinc-500 mb-1">Total Springs</div>
        <div class="text-xl font-bold text-zinc-50">{{ orderStore.totalSprings }}</div>
      </div>
      <div class="p-3 bg-background rounded-lg">
        <div class="text-xs text-zinc-500 mb-1">King Pallets</div>
        <div class="text-xl font-bold text-blue-400">{{ orderStore.springOrder?.metadata?.king_pallets || 0 }}</div>
      </div>
      <div class="p-3 bg-background rounded-lg">
        <div class="text-xs text-zinc-500 mb-1">Queen Pallets</div>
        <div class="text-xl font-bold text-purple-400">{{ orderStore.springOrder?.metadata?.queen_pallets || 0 }}</div>
      </div>
    </div>

    <!-- Coverage Changes Table -->
    <table class="w-full text-sm">
      <thead>
        <tr class="bg-surfaceHover">
          <th class="table-header">Size</th>
          <th class="table-header text-center">Pallets</th>
          <th class="table-header text-center">Springs</th>
          <th class="table-header text-center">Before</th>
          <th class="table-header text-center">After</th>
          <th class="table-header text-center">Change</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in coverageChanges"
          :key="item.size"
          class="border-b border-border"
        >
          <td class="table-cell font-semibold">{{ item.size }}</td>
          <td class="table-cell text-center font-mono">{{ item.pallets }}</td>
          <td class="table-cell text-center font-mono">{{ item.orderStock }}</td>
          <td :class="['table-cell text-center font-mono', getCoverageColor(item.currentCoverage)]">
            {{ item.currentCoverage.toFixed(1) }}mo
          </td>
          <td :class="['table-cell text-center font-mono', getCoverageColor(item.afterCoverage)]">
            {{ item.afterCoverage.toFixed(1) }}mo
          </td>
          <td class="table-cell text-center font-mono text-brand-light">
            {{ item.change > 0 ? '+' : '' }}{{ item.change.toFixed(1) }}mo
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Critical Sizes Note -->
    <div v-if="orderStore.springOrder?.metadata?.critical_sizes?.length > 0" class="mt-4 p-3 bg-amber-900/20 border border-amber-800 rounded-lg">
      <div class="text-sm text-amber-400 font-semibold mb-1">Critical Small Sizes Addressed</div>
      <div class="text-sm text-zinc-300">
        {{ orderStore.springOrder.metadata.critical_sizes.join(', ') }}
        ({{ orderStore.springOrder.metadata.small_size_pallets }} pallets allocated)
      </div>
    </div>
  </div>
</template>
