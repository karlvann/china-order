<script setup>
import { MATTRESS_SIZES, COMPONENT_TYPES, MONTH_NAMES } from '~/lib/constants/index.js'

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

// Check if component applies to size
const componentApplies = (componentId, sizeId) => {
  if (['micro_coils', 'thin_latex'].includes(componentId) &&
      ['Double', 'King Single', 'Single'].includes(sizeId)) {
    return false
  }
  if (componentId === 'side_panel' && ['Single', 'King Single'].includes(sizeId)) {
    return false
  }
  return true
}

// Generate rows
const rows = computed(() => {
  if (!props.projection?.snapshots) return []

  const result = []

  COMPONENT_TYPES.forEach(comp => {
    MATTRESS_SIZES.forEach(size => {
      if (!componentApplies(comp.id, size.id)) return

      const monthlyRate = props.usageRates.MONTHLY_SALES_RATE[size.id] * comp.multiplier

      const projections = props.projection.snapshots.map((snapshot, index) => {
        const stock = snapshot.inventory.components[comp.id]?.[size.id] || 0
        return {
          month: index,
          stock: Math.round(stock)
        }
      })

      result.push({
        component: comp.id,
        size: size.id,
        label: `${comp.name} (${size.name})`,
        monthlyRate,
        projections
      })
    })
  })

  return result
})

// Get cell background
const getCellBg = (stock, monthlyRate) => {
  const months = monthlyRate > 0 ? stock / monthlyRate : Infinity
  if (months < 2) return 'bg-red-500/20'
  if (months < 3) return 'bg-yellow-500/20'
  return ''
}
</script>

<template>
  <div class="mb-8">
    <h3 class="text-lg font-semibold text-zinc-50 mb-4">
      Component Timeline (Annual Projection)
    </h3>

    <div v-if="months.length === 0" class="text-zinc-500 py-4">
      No projection data available
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="bg-surfaceHover">
            <th class="table-header sticky left-0 bg-surfaceHover z-10 min-w-[180px]">Component (Size)</th>
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
            :key="`${row.component}-${row.size}`"
            class="border-b border-border hover:bg-surfaceHover/30"
          >
            <td class="table-cell sticky left-0 bg-background font-medium text-xs">{{ row.label }}</td>
            <td
              v-for="proj in row.projections"
              :key="proj.month"
              :class="[
                'table-cell text-center font-mono',
                getCellBg(proj.stock, row.monthlyRate),
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
