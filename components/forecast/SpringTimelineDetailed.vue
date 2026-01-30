<script setup>
import { MATTRESS_SIZES, FIRMNESS_TYPES } from '~/lib/constants/index.js'

const WEEKS_TO_SHOW = 22
const ARRIVAL_WEEK = 10 // Container arrives 10 weeks after order

const props = defineProps({
  inventory: {
    type: Object,
    required: true
  },
  springOrder: {
    type: Object,
    default: null
  },
  orderWeekOffset: {
    type: Number,
    default: 0
  },
  currentWeek: {
    type: Number,
    default: 1
  },
  usageRates: {
    type: Object,
    required: true
  },
  showYellowWarnings: {
    type: Boolean,
    default: false
  }
})

// Get the Monday of the current week
const getCurrentMonday = () => {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
  return new Date(now.setDate(diff))
}

// Format date as "d Mon" (e.g., "26 Jan")
const formatShortDate = (date) => {
  const day = date.getDate()
  const month = date.toLocaleDateString('en-AU', { month: 'short' })
  return `${day} ${month}`
}

// Generate week numbers for display (current week + 22 weeks)
const weeks = computed(() => {
  const result = []
  const startWeek = props.currentWeek
  const monday = getCurrentMonday()

  for (let i = 0; i < WEEKS_TO_SHOW; i++) {
    let weekNum = startWeek + i
    if (weekNum > 52) weekNum -= 52

    // Calculate the Monday date for this week
    const weekMonday = new Date(monday)
    weekMonday.setDate(monday.getDate() + (i * 7))

    // Arrival happens at ARRIVAL_WEEK weeks from the order week
    // Order week is current week + orderWeekOffset
    // So arrival is at index: orderWeekOffset + ARRIVAL_WEEK
    const arrivalIndex = props.orderWeekOffset + ARRIVAL_WEEK

    result.push({
      index: i,
      number: weekNum,
      date: formatShortDate(weekMonday),
      isArrival: i === arrivalIndex
    })
  }
  return result
})

// Generate rows for each size/firmness combination
const rows = computed(() => {
  const result = []

  MATTRESS_SIZES.forEach(size => {
    FIRMNESS_TYPES.forEach(firmness => {
      // Convert monthly rate to weekly rate (divide by ~4.33 weeks/month)
      // Use live firmness distribution from sales data
      const firmnessDistribution = props.usageRates.FIRMNESS_DISTRIBUTION?.[size.id]?.[firmness] || 0
      const monthlyRate = props.usageRates.MONTHLY_SALES_RATE[size.id] * firmnessDistribution
      const weeklyRate = monthlyRate / (30 / 7)

      const currentStock = props.inventory.springs[firmness][size.id] || 0
      const orderAmount = props.springOrder?.springs[firmness][size.id] || 0

      const projections = []
      let stock = currentStock

      // Arrival index: orderWeekOffset + ARRIVAL_WEEK
      const arrivalIndex = props.orderWeekOffset + ARRIVAL_WEEK

      for (let i = 0; i < WEEKS_TO_SHOW; i++) {
        // Deplete for this week
        stock = Math.max(0, stock - weeklyRate)

        // Add container arrival
        if (i === arrivalIndex) {
          stock += orderAmount
        }

        projections.push({
          week: i,
          stock: Math.round(stock),
          isCritical: stock < weeklyRate * 8 // Less than 2 months worth
        })
      }

      result.push({
        size: size.id,
        firmness,
        label: `${size.name} ${firmness.charAt(0).toUpperCase() + firmness.slice(1)}`,
        currentStock,
        orderAmount,
        weeklyRate: Math.round(weeklyRate * 10) / 10,
        projections
      })
    })
  })

  return result
})

// Get cell background based on stock level (weeks of coverage)
const getCellBg = (stock, weeklyRate) => {
  if (stock === 0) return 'bg-red-500/20'
  const weeksOfStock = weeklyRate > 0 ? stock / weeklyRate : Infinity
  if (weeksOfStock > 30) return 'bg-blue-500/20'
  if (!props.showYellowWarnings) return ''
  if (weeksOfStock <= 4) return 'bg-yellow-500/20'
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
            <th class="table-header sticky left-0 bg-surfaceHover z-10 min-w-[180px]">Size/Firmness</th>
            <th class="table-header sticky left-[180px] bg-surfaceHover z-10 text-center w-[70px]">Demand</th>
            <th class="table-header sticky left-[250px] bg-surfaceHover z-10 text-center w-[50px]">Now</th>
            <th class="table-header sticky left-[300px] bg-surfaceHover z-10 text-center w-[50px]">+Order</th>
            <th
              v-for="week in weeks"
              :key="week.index"
              :class="[
                'table-header text-center min-w-[62px]',
                week.isArrival ? 'bg-brand/20' : ''
              ]"
            >
              <div>W{{ week.number }}</div>
              <div class="text-[9px] text-zinc-500 font-normal">{{ week.date }}</div>
              <span v-if="week.isArrival" class="block text-[10px] text-brand-light">Arrival</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="`${row.size}-${row.firmness}`"
            class="border-b border-border hover:bg-surfaceHover/30"
          >
            <td class="table-cell sticky left-0 bg-background z-10 w-[180px] font-medium">{{ row.label }}</td>
            <td class="table-cell sticky left-[180px] bg-background z-10 text-center font-mono text-zinc-400 w-[70px]">{{ row.weeklyRate }}/wk</td>
            <td class="table-cell sticky left-[250px] bg-background z-10 text-center font-mono w-[50px]">{{ row.currentStock }}</td>
            <td class="table-cell sticky left-[300px] bg-background z-10 text-center font-mono text-brand-light w-[50px]">
              {{ row.orderAmount > 0 ? `+${row.orderAmount}` : '-' }}
            </td>
            <td
              v-for="proj in row.projections"
              :key="proj.week"
              :class="[
                'table-cell text-center font-mono',
                getCellBg(proj.stock, row.weeklyRate),
                weeks[proj.week]?.isArrival ? 'border-l-2 border-brand' : ''
              ]"
            >
              {{ proj.stock }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="text-xs text-zinc-500 mt-3">
      Container arrives 10 weeks after order week. Blue = overstock (&gt;30 weeks), Yellow = low stock (≤4 weeks), Red = depleted.
    </p>
  </div>
</template>
