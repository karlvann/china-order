<script setup>
import { MATTRESS_SIZES, FIRMNESS_TYPES, SEASONAL_DEMAND } from '~/lib/constants/index.js'

const WEEKS_TO_SHOW = 40
const ARRIVAL_WEEK = 10 // Container arrives 10 weeks after order

const inventoryOrdersStore = useInventoryOrdersStore()

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
  },
  storedOrders: {
    type: Array,
    default: () => []
  },
  useSeasonalDemand: {
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

// Get week index for a stored order's expected arrival
const getOrderWeekIndex = (order) => {
  const monday = getCurrentMonday()
  const arrivalDate = new Date(order.expected_arrival)
  const diffMs = arrivalDate - monday
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
}

// Get spring quantity from a stored order for a specific firmness/size
const getOrderSpringQuantity = (order, firmness, size) => {
  if (!order.skus) return 0
  const skuString = `springs${firmness}${size.toLowerCase().replace(' ', '')}`
  const skuItem = order.skus.find(item => item.skus_id?.sku === skuString)
  return skuItem?.quantity || 0
}

// Get stored orders arriving in a specific week
const getOrdersArrivingInWeek = (weekIndex) => {
  return props.storedOrders.filter(order => getOrderWeekIndex(order) === weekIndex)
}

// Get seasonal multiplier for a given week index
const getSeasonalMultiplierForWeek = (weekIndex) => {
  if (!props.useSeasonalDemand) return 1.0
  const monday = getCurrentMonday()
  const weekDate = new Date(monday)
  weekDate.setDate(monday.getDate() + (weekIndex * 7))
  const monthIndex = weekDate.getMonth()
  return SEASONAL_DEMAND[monthIndex] || 1.0
}

// Generate week numbers for display (current week + 22 weeks)
const weeks = computed(() => {
  const result = []
  const startWeek = props.currentWeek
  const monday = getCurrentMonday()

  // Algorithm order arrival index
  const algorithmArrivalIndex = props.orderWeekOffset + ARRIVAL_WEEK

  for (let i = 0; i < WEEKS_TO_SHOW; i++) {
    let weekNum = startWeek + i
    if (weekNum > 52) weekNum -= 52

    // Calculate the Monday date for this week
    const weekMonday = new Date(monday)
    weekMonday.setDate(monday.getDate() + (i * 7))

    // Check for stored orders arriving this week
    const storedOrdersThisWeek = getOrdersArrivingInWeek(i)
    const hasStoredOrders = storedOrdersThisWeek.length > 0

    result.push({
      index: i,
      number: weekNum,
      date: formatShortDate(weekMonday),
      isArrival: i === algorithmArrivalIndex,
      storedOrders: storedOrdersThisWeek,
      hasStoredOrders
    })
  }
  return result
})

// Generate rows for each size/firmness combination
const rows = computed(() => {
  // Access reactive prop to ensure recomputation
  const useSeasonal = props.useSeasonalDemand

  const result = []

  MATTRESS_SIZES.forEach(size => {
    FIRMNESS_TYPES.forEach(firmness => {
      // Use weekly rate directly, apply firmness distribution
      const firmnessDistribution = props.usageRates.FIRMNESS_DISTRIBUTION?.[size.id]?.[firmness] || 0
      const weeklyRate = props.usageRates.WEEKLY_SALES_RATE[size.id] * firmnessDistribution

      const currentStock = props.inventory.springs[firmness][size.id] || 0
      const orderAmount = props.springOrder?.springs[firmness][size.id] || 0

      const projections = []
      let stock = currentStock

      // Arrival index for algorithm order: orderWeekOffset + ARRIVAL_WEEK
      const arrivalIndex = props.orderWeekOffset + ARRIVAL_WEEK

      for (let i = 0; i < WEEKS_TO_SHOW; i++) {
        // Get seasonal multiplier for this week
        const seasonalMultiplier = getSeasonalMultiplierForWeek(i)
        const adjustedRate = weeklyRate * seasonalMultiplier

        // Deplete for this week
        stock = Math.max(0, stock - adjustedRate)

        // Track additions this week
        let addedThisWeek = 0

        // Add algorithm order arrival
        if (i === arrivalIndex) {
          stock += orderAmount
          addedThisWeek += orderAmount
        }

        // Add stored order arrivals
        const storedOrdersThisWeek = getOrdersArrivingInWeek(i)
        for (const order of storedOrdersThisWeek) {
          const qty = getOrderSpringQuantity(order, firmness, size.id)
          stock += qty
          addedThisWeek += qty
        }

        projections.push({
          week: i,
          stock: Math.round(stock),
          added: addedThisWeek,
          isCritical: stock < adjustedRate * 8 // Less than 8 weeks worth
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
      Spring timeline
      <span class="text-sm font-normal text-zinc-500">(15 rows: 5 sizes × 3 firmnesses)</span>
    </h3>

    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="bg-surfaceHover">
            <th class="table-header sticky left-0 bg-surfaceHover z-10 min-w-[180px]">Size/Firmness</th>
            <th class="table-header sticky left-[180px] bg-surfaceHover z-10 text-center w-[70px]">Demand</th>
            <th class="table-header sticky left-[250px] bg-surfaceHover z-10 text-center w-[50px]">Now</th>
            <th
              v-for="week in weeks"
              :key="week.index"
              :class="[
                'table-header text-center',
                week.hasStoredOrders ? 'min-w-[85px] bg-green-500/10' : week.isArrival ? 'min-w-[62px] bg-blue-500/10' : 'min-w-[62px]'
              ]"
            >
              <div>W{{ week.number }}</div>
              <div class="text-[9px] text-zinc-500 font-normal">{{ week.date }}</div>
              <span v-if="week.isArrival" class="block text-[10px] text-brand-light">Recommended</span>
              <div v-if="week.hasStoredOrders">
                <span
                  v-for="order in week.storedOrders"
                  :key="order.id"
                  class="block text-[10px] text-green-400"
                  :title="order.notes || 'No notes'"
                >
                  Order {{ inventoryOrdersStore.getOrderLetter(order.id) }}
                </span>
              </div>
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
            <td
              v-for="proj in row.projections"
              :key="proj.week"
              :class="[
                'table-cell text-center font-mono',
                weeks[proj.week]?.hasStoredOrders ? 'bg-green-500/10' : weeks[proj.week]?.isArrival ? 'bg-blue-500/10' : getCellBg(proj.stock, row.weeklyRate)
              ]"
            >
              <span>{{ proj.stock }}</span>
              <span v-if="proj.added > 0" class="text-green-400 text-[10px]"> (+{{ proj.added }})</span>
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
