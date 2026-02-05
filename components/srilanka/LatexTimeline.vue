<script setup>
import { LATEX_FIRMNESSES, LATEX_SIZES, SEASONAL_DEMAND } from '~/lib/constants/index.js'

const WEEKS_TO_SHOW = 40

const sriLankaOrdersStore = useSriLankaOrdersStore()

const emit = defineEmits(['scroll'])

const scrollContainer = ref(null)

// Expose scroll container for external sync
defineExpose({
  scrollTo: (left) => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollLeft = left
    }
  }
})

const props = defineProps({
  inventory: {
    type: Object,
    required: true
  },
  latexOrder: {
    type: Object,
    default: null
  },
  hasDraftOrder: {
    type: Boolean,
    default: false
  },
  draftArrivalWeek: {
    type: Number,
    default: null
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
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(now.setDate(diff))
}

// Format date as "d Mon" (e.g., "26 Jan")
const formatShortDate = (date) => {
  const day = date.getDate()
  const month = date.toLocaleDateString('en-AU', { month: 'short' })
  return `${day} ${month}`
}

// Get current week date range
const currentWeekRange = computed(() => {
  const monday = getCurrentMonday()
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const startDay = monday.getDate()
  const endDay = sunday.getDate()
  const startMonth = monday.toLocaleDateString('en-AU', { month: 'short' })
  const endMonth = sunday.toLocaleDateString('en-AU', { month: 'short' })

  if (startMonth === endMonth) {
    return `${startDay}-${endDay} ${endMonth}`
  }
  return `${startDay} ${startMonth}-${endDay} ${endMonth}`
})

// Get week index for a stored order's expected arrival
const getOrderWeekIndex = (order) => {
  const monday = getCurrentMonday()
  const arrivalDate = new Date(order.expected_arrival)
  const diffMs = arrivalDate - monday
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
}

// Get latex quantity from a stored order for a specific firmness/size
const getOrderLatexQuantity = (order, firmness, size) => {
  if (!order.skus) return 0
  const skuString = `latex${firmness}${size.toLowerCase()}`
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

// Generate week numbers for display
const weeks = computed(() => {
  const result = []
  const startWeek = props.currentWeek
  const monday = getCurrentMonday()

  const draftArrivalIndex = props.hasDraftOrder ? props.draftArrivalWeek : null

  for (let i = 1; i <= WEEKS_TO_SHOW; i++) {
    let weekNum = startWeek + i
    if (weekNum > 52) weekNum -= 52

    const weekMonday = new Date(monday)
    weekMonday.setDate(monday.getDate() + (i * 7))

    const storedOrdersThisWeek = getOrdersArrivingInWeek(i)
    const hasStoredOrders = storedOrdersThisWeek.length > 0

    result.push({
      index: i,
      number: weekNum,
      date: formatShortDate(weekMonday),
      isDraftArrival: draftArrivalIndex !== null && i === draftArrivalIndex,
      storedOrders: storedOrdersThisWeek,
      hasStoredOrders
    })
  }
  return result
})

// Calculate remaining days in current week as a fraction
const getRemainingWeekFraction = () => {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysRemaining = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  return daysRemaining / 7
}

// Generate rows for each firmness/size combination (6 rows)
const rows = computed(() => {
  const useSeasonal = props.useSeasonalDemand
  const remainingWeekFraction = getRemainingWeekFraction()

  const result = []

  // Rows in order: Queen first (sells more), then King
  const orderedSizes = ['Queen', 'King']

  orderedSizes.forEach(size => {
    LATEX_FIRMNESSES.forEach(firmness => {
      // Get weekly rate from usage rates
      const weeklyRates = props.usageRates.WEEKLY_RATES || {}
      const weeklyRate = weeklyRates[firmness]?.[size] || 0

      const currentStock = props.inventory[firmness]?.[size] || 0
      const orderAmount = props.latexOrder?.latex[firmness]?.[size] || 0

      const projections = []

      // Start with current stock, minus remaining demand for this week
      const currentWeekSeasonalMultiplier = getSeasonalMultiplierForWeek(0)
      const remainingThisWeek = weeklyRate * currentWeekSeasonalMultiplier * remainingWeekFraction
      let stock = currentStock - remainingThisWeek

      const arrivalIndex = props.hasDraftOrder ? props.draftArrivalWeek : null

      for (let i = 1; i <= WEEKS_TO_SHOW; i++) {
        let addedThisWeek = 0

        // Add arrivals at BEGINNING of week
        if (i === arrivalIndex) {
          stock += orderAmount
          addedThisWeek += orderAmount
        }

        // Add stored order arrivals
        const storedOrdersThisWeek = getOrdersArrivingInWeek(i)
        for (const order of storedOrdersThisWeek) {
          const qty = getOrderLatexQuantity(order, firmness, size)
          stock += qty
          addedThisWeek += qty
        }

        const seasonalMultiplier = getSeasonalMultiplierForWeek(i)
        const adjustedRate = weeklyRate * seasonalMultiplier

        projections.push({
          week: i,
          stock: Math.round(stock),
          added: addedThisWeek,
          isCritical: stock < adjustedRate * 8
        })

        stock = stock - adjustedRate
      }

      // Capitalize firmness for display
      const firmLabel = firmness.charAt(0).toUpperCase() + firmness.slice(1)

      result.push({
        size,
        firmness,
        label: `${size} ${firmLabel}`,
        currentStock: Math.round(currentStock),
        orderAmount,
        weeklyRate: Math.round(weeklyRate * 10) / 10,
        projections
      })
    })
  })

  return result
})

// Get cell background based on stock level
const getCellBg = (stock, weeklyRate) => {
  if (stock <= 0) return 'bg-red-500/20'
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
      Latex timeline
      <span class="text-sm font-normal text-zinc-500">(6 rows: 2 sizes × 3 firmnesses)</span>
    </h3>

    <div ref="scrollContainer" class="overflow-x-auto" @scroll="$emit('scroll', $event.target.scrollLeft)">
      <table class="w-full text-xs">
        <thead>
          <tr class="bg-surfaceHover">
            <th class="table-header sticky left-0 bg-surfaceHover z-10 min-w-[140px]">Size/Firmness</th>
            <th class="table-header sticky left-[140px] bg-surfaceHover z-10 text-center w-[70px]">Demand</th>
            <th class="table-header sticky left-[210px] bg-zinc-700 z-10 text-center w-[70px] text-zinc-50">
              <div>Now</div>
              <div class="text-[9px] text-zinc-400 font-normal">{{ currentWeekRange }}</div>
            </th>
            <th
              v-for="week in weeks"
              :key="week.index"
              :class="[
                'table-header text-center',
                week.hasStoredOrders ? 'min-w-[95px] bg-green-500/10' : week.isDraftArrival ? 'min-w-[95px] bg-orange-500/10' : 'min-w-[62px]'
              ]"
            >
              <div>W{{ week.number }}</div>
              <div class="text-[9px] text-zinc-500 font-normal">{{ week.date }}</div>
              <span v-if="week.isDraftArrival" class="block text-[10px] text-orange-400">Draft</span>
              <div v-if="week.hasStoredOrders">
                <span
                  v-for="order in week.storedOrders"
                  :key="order.id"
                  class="block text-[10px] text-green-400"
                  :title="order.notes || 'No notes'"
                >
                  Order {{ sriLankaOrdersStore.getOrderLetter(order.id) }}
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
            <td class="table-cell sticky left-0 bg-background z-10 w-[140px] font-medium">{{ row.label }}</td>
            <td class="table-cell sticky left-[140px] bg-background z-10 text-center font-mono text-zinc-400 w-[70px]">{{ row.weeklyRate }}/wk</td>
            <td class="table-cell sticky left-[210px] bg-zinc-800 z-10 text-center font-mono w-[70px] text-zinc-50">{{ row.currentStock }}</td>
            <td
              v-for="proj in row.projections"
              :key="proj.week"
              :class="[
                'table-cell text-center font-mono',
                weeks[proj.week - 1]?.hasStoredOrders ? 'bg-green-500/10' : weeks[proj.week - 1]?.isDraftArrival ? 'bg-orange-500/10' : getCellBg(proj.stock, row.weeklyRate)
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
      Blue = overstock (&gt;30 weeks), Yellow = low stock (≤4 weeks), Red = depleted.
    </p>
  </div>
</template>
