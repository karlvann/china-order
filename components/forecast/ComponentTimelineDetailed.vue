<script setup>
import { MATTRESS_SIZES, COMPONENT_TYPES, MONTH_NAMES } from '~/lib/constants/index.js'

const props = defineProps({
  inventory: {
    type: Object,
    required: true
  },
  springOrder: {
    type: Object,
    default: null
  },
  componentOrder: {
    type: Object,
    default: null
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

// Generate 12 months
const months = computed(() => {
  const result = []
  for (let i = 0; i < 12; i++) {
    const monthIndex = (props.startingMonth + i) % 12
    result.push({
      index: i,
      name: MONTH_NAMES[monthIndex],
      isArrival: i === 2
    })
  }
  return result
})

// Check if component applies to size
const componentApplies = (componentId, sizeId) => {
  // Micro coils and thin latex only for King/Queen
  if (['micro_coils', 'thin_latex'].includes(componentId) &&
      ['Double', 'King Single', 'Single'].includes(sizeId)) {
    return false
  }
  // Side panel consolidated for Single/King Single
  if (componentId === 'side_panel' && ['Single', 'King Single'].includes(sizeId)) {
    return false
  }
  return true
}

// Generate rows for each component/size combination
const rows = computed(() => {
  const result = []

  COMPONENT_TYPES.forEach(comp => {
    MATTRESS_SIZES.forEach(size => {
      if (!componentApplies(comp.id, size.id)) return

      const monthlyRate = props.usageRates.MONTHLY_SALES_RATE[size.id] * comp.multiplier
      const currentStock = props.inventory.components[comp.id]?.[size.id] || 0
      const orderAmount = props.componentOrder?.[comp.id]?.[size.id] || 0

      const projections = []
      let stock = currentStock

      for (let i = 0; i < 12; i++) {
        stock = Math.max(0, stock - monthlyRate)

        if (i === 2) {
          stock += orderAmount
        }

        projections.push({
          month: i,
          stock: Math.round(stock),
          isCritical: stock < monthlyRate * 2
        })
      }

      result.push({
        component: comp.id,
        componentName: comp.name,
        size: size.id,
        label: `${comp.name} (${size.name})`,
        currentStock,
        orderAmount,
        monthlyRate: Math.round(monthlyRate * 10) / 10,
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
    <h3 class="text-lg font-semibold text-zinc-50 mb-4 flex items-center gap-3">
      Component Timeline
      <span class="text-sm font-normal text-zinc-500">({{ rows.length }} rows)</span>
    </h3>

    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="bg-surfaceHover">
            <th class="table-header sticky left-0 bg-surfaceHover z-10 min-w-[180px]">Component (Size)</th>
            <th class="table-header text-center min-w-[50px]">Now</th>
            <th class="table-header text-center min-w-[40px]">+Order</th>
            <th
              v-for="month in months"
              :key="month.index"
              :class="[
                'table-header text-center min-w-[50px]',
                month.isArrival ? 'bg-brand/20' : ''
              ]"
            >
              {{ month.name }}
              <span v-if="month.isArrival" class="block text-[10px] text-brand-light">↑ Arrival</span>
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
            <td class="table-cell text-center font-mono">{{ row.currentStock }}</td>
            <td class="table-cell text-center font-mono text-brand-light">
              {{ row.orderAmount > 0 ? `+${row.orderAmount}` : '-' }}
            </td>
            <td
              v-for="proj in row.projections"
              :key="proj.month"
              :class="[
                'table-cell text-center font-mono',
                getCellBg(proj.stock, row.monthlyRate),
                months[proj.month]?.isArrival ? 'border-l-2 border-brand' : ''
              ]"
            >
              {{ proj.stock }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="text-xs text-zinc-500 mt-3">
      Components ordered to match spring runway (equal depletion). Side panels for Single/King Single are consolidated into Double.
    </p>
  </div>
</template>
