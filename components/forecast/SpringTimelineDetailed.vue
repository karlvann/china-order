<script setup>
import { MATTRESS_SIZES, FIRMNESS_TYPES, FIRMNESS_DISTRIBUTION, MONTH_NAMES } from '~/lib/constants/index.js'

const props = defineProps({
  inventory: {
    type: Object,
    required: true
  },
  springOrder: {
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

// Generate 12 months of projections
const months = computed(() => {
  const result = []
  for (let i = 0; i < 12; i++) {
    const monthIndex = (props.startingMonth + i) % 12
    result.push({
      index: i,
      name: MONTH_NAMES[monthIndex],
      isArrival: i === 2 // Container arrives at week 10 (~month 2.5)
    })
  }
  return result
})

// Generate rows for each size/firmness combination
const rows = computed(() => {
  const result = []

  MATTRESS_SIZES.forEach(size => {
    FIRMNESS_TYPES.forEach(firmness => {
      const monthlyRate = props.usageRates.MONTHLY_SALES_RATE[size.id] * FIRMNESS_DISTRIBUTION[size.id][firmness]
      const currentStock = props.inventory.springs[firmness][size.id] || 0
      const orderAmount = props.springOrder?.springs[firmness][size.id] || 0

      const projections = []
      let stock = currentStock

      for (let i = 0; i < 12; i++) {
        // Deplete for this month
        stock = Math.max(0, stock - monthlyRate)

        // Add container arrival at month 2.5 (between month 2 and 3)
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
        size: size.id,
        firmness,
        label: `${size.name} ${firmness.charAt(0).toUpperCase() + firmness.slice(1)}`,
        currentStock,
        orderAmount,
        monthlyRate: Math.round(monthlyRate * 10) / 10,
        projections
      })
    })
  })

  return result
})

// Get cell background based on stock level
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
      Spring Timeline
      <span class="text-sm font-normal text-zinc-500">(15 rows: 5 sizes × 3 firmnesses)</span>
    </h3>

    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="bg-surfaceHover">
            <th class="table-header sticky left-0 bg-surfaceHover z-10 min-w-[140px]">Size/Firmness</th>
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
            :key="`${row.size}-${row.firmness}`"
            class="border-b border-border hover:bg-surfaceHover/30"
          >
            <td class="table-cell sticky left-0 bg-background font-medium">{{ row.label }}</td>
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
      Container arrives at Week 10 (between Month 2 and Month 3). Red cells indicate &lt;2 months coverage.
    </p>
  </div>
</template>
