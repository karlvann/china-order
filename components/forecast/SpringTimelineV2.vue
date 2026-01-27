<script setup>
import { MATTRESS_SIZES, FIRMNESS_TYPES, MONTH_NAMES } from '~/lib/constants/index.js'

const props = defineProps({
  projection: {
    type: Object,
    required: true
  },
  startingMonth: {
    type: Number,
    default: 0
  },
  usageRates: {
    type: Object,
    required: true
  }
})

// Generate months from snapshots
const months = computed(() => {
  if (!props.projection?.snapshots) return []

  return props.projection.snapshots.map((snapshot, index) => ({
    index,
    name: snapshot.monthName,
    hasArrival: props.projection.orders.some(o => Math.floor(o.arrivalMonth) === index)
  }))
})

// Generate rows for size totals (simplified view)
const rows = computed(() => {
  if (!props.projection?.snapshots) return []

  const result = []

  MATTRESS_SIZES.forEach(size => {
    const monthlyRate = props.usageRates.MONTHLY_SALES_RATE[size.id]

    const projections = props.projection.snapshots.map((snapshot, index) => {
      const stock = FIRMNESS_TYPES.reduce(
        (sum, f) => sum + (snapshot.inventory.springs[f][size.id] || 0), 0
      )
      return {
        month: index,
        stock: Math.round(stock),
        isCritical: snapshot.criticalSizes.includes(size.id)
      }
    })

    result.push({
      size: size.id,
      label: size.name,
      monthlyRate,
      projections
    })
  })

  return result
})

// Get cell background
const getCellBg = (stock, monthlyRate, isCritical) => {
  if (isCritical) return 'bg-red-500/30'
  const months = monthlyRate > 0 ? stock / monthlyRate : Infinity
  if (months < 2) return 'bg-red-500/20'
  if (months < 3) return 'bg-yellow-500/20'
  return ''
}
</script>

<template>
  <div class="mb-8">
    <h3 class="text-lg font-semibold text-zinc-50 mb-4">
      Spring Timeline (Annual Projection)
    </h3>

    <div v-if="months.length === 0" class="text-zinc-500 py-4">
      No projection data available
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="bg-surfaceHover">
            <th class="table-header sticky left-0 bg-surfaceHover z-10 min-w-[100px]">Size</th>
            <th
              v-for="month in months"
              :key="month.index"
              :class="[
                'table-header text-center min-w-[60px]',
                month.hasArrival ? 'bg-brand/20' : ''
              ]"
            >
              {{ month.name }}
              <span v-if="month.hasArrival" class="block text-[10px] text-brand-light">↑</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.size"
            class="border-b border-border hover:bg-surfaceHover/30"
          >
            <td class="table-cell sticky left-0 bg-background font-semibold">{{ row.label }}</td>
            <td
              v-for="proj in row.projections"
              :key="proj.month"
              :class="[
                'table-cell text-center font-mono',
                getCellBg(proj.stock, row.monthlyRate, proj.isCritical),
                months[proj.month]?.hasArrival ? 'border-l-2 border-brand' : ''
              ]"
            >
              {{ proj.stock }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
