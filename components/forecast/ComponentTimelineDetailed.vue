<script setup>
import { SEASONAL_DEMAND } from '~/lib/constants/index.js'

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
  componentOrder: {
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

// Get component quantity from a stored order
const getOrderComponentQuantity = (order, componentType, size) => {
  if (!order.skus) return 0
  const prefixes = {
    micro_coils: 'microcoils',
    thin_latex: 'thinlatex',
    felt: 'felt',
    top_panel: 'paneltop',
    bottom_panel: 'panelbottom',
    side_panel: 'panelside'
  }
  const prefix = prefixes[componentType] || componentType
  const skuString = `${prefix}${size.toLowerCase().replace(' ', '')}`
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

  const algorithmArrivalIndex = props.orderWeekOffset + ARRIVAL_WEEK

  for (let i = 0; i < WEEKS_TO_SHOW; i++) {
    let weekNum = startWeek + i
    if (weekNum > 52) weekNum -= 52

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

/**
 * Component Inventory SKU Demand Mapping
 *
 * Based on mattress recipes and size mapping:
 * - microcoilsking: King (1x) + Single (0.5x), multiplied by model factor (Cloud=2, Aurora=1, Cooper=0)
 * - microcoilsqueen: Queen (1x) + Double (1x) + King Single (1x), multiplied by model factor
 * - thinlatexking: Same as microcoilsking
 * - thinlatexqueen: Same as microcoilsqueen
 * - felt{size}: 1:1 with mattress sales
 * - paneltop{size}: 1:1 with mattress sales
 * - panelbottom{size}: 1:1 with mattress sales
 * - panelsideking: King only (1:1)
 * - panelsidequeen: Queen only (1:1)
 * - panelsidedouble: Double + King Single + Single (all 1:1)
 */

// Define all component inventory rows with their demand sources (all weekly)
const componentRows = computed(() => {
  const rates = props.usageRates.WEEKLY_SALES_RATE
  // Direct demand from sales data (weekly rates)
  const microWeekly = props.usageRates.MICRO_COIL_WEEKLY_DEMAND || { King: 0, Queen: 0 }
  const latexWeekly = props.usageRates.THIN_LATEX_WEEKLY_DEMAND || { King: 0, Queen: 0 }

  return [
    // Micro Coils & Thin Latex - King inventory
    { id: 'micro_coils', inventorySize: 'King', label: 'Micro Coils (King)', weeklyDemand: microWeekly.King },
    { id: 'thin_latex', inventorySize: 'King', label: 'Thin Latex (King)', weeklyDemand: latexWeekly.King },
    // Micro Coils & Thin Latex - Queen inventory
    { id: 'micro_coils', inventorySize: 'Queen', label: 'Micro Coils (Queen)', weeklyDemand: microWeekly.Queen },
    { id: 'thin_latex', inventorySize: 'Queen', label: 'Thin Latex (Queen)', weeklyDemand: latexWeekly.Queen },
    // Felt - 1:1 with mattress sales by size
    { id: 'felt', inventorySize: 'King', label: 'Felt (King)', weeklyDemand: rates.King },
    { id: 'felt', inventorySize: 'Queen', label: 'Felt (Queen)', weeklyDemand: rates.Queen },
    { id: 'felt', inventorySize: 'Double', label: 'Felt (Double)', weeklyDemand: rates.Double },
    { id: 'felt', inventorySize: 'King Single', label: 'Felt (King Single)', weeklyDemand: rates['King Single'] },
    { id: 'felt', inventorySize: 'Single', label: 'Felt (Single)', weeklyDemand: rates.Single },
    // Top Panel - 1:1 with mattress sales by size
    { id: 'top_panel', inventorySize: 'King', label: 'Top Panel (King)', weeklyDemand: rates.King },
    { id: 'top_panel', inventorySize: 'Queen', label: 'Top Panel (Queen)', weeklyDemand: rates.Queen },
    { id: 'top_panel', inventorySize: 'Double', label: 'Top Panel (Double)', weeklyDemand: rates.Double },
    { id: 'top_panel', inventorySize: 'King Single', label: 'Top Panel (King Single)', weeklyDemand: rates['King Single'] },
    { id: 'top_panel', inventorySize: 'Single', label: 'Top Panel (Single)', weeklyDemand: rates.Single },
    // Bottom Panel - 1:1 with mattress sales by size
    { id: 'bottom_panel', inventorySize: 'King', label: 'Bottom Panel (King)', weeklyDemand: rates.King },
    { id: 'bottom_panel', inventorySize: 'Queen', label: 'Bottom Panel (Queen)', weeklyDemand: rates.Queen },
    { id: 'bottom_panel', inventorySize: 'Double', label: 'Bottom Panel (Double)', weeklyDemand: rates.Double },
    { id: 'bottom_panel', inventorySize: 'King Single', label: 'Bottom Panel (King Single)', weeklyDemand: rates['King Single'] },
    { id: 'bottom_panel', inventorySize: 'Single', label: 'Bottom Panel (Single)', weeklyDemand: rates.Single },
    // Side Panel - King (King only), Queen (Queen only), Double (Double + King Single + Single)
    { id: 'side_panel', inventorySize: 'King', label: 'Side Panel (King)', weeklyDemand: rates.King },
    { id: 'side_panel', inventorySize: 'Queen', label: 'Side Panel (Queen)', weeklyDemand: rates.Queen },
    { id: 'side_panel', inventorySize: 'Double', label: 'Side Panel (Double)', weeklyDemand: rates.Double + rates['King Single'] + rates.Single }
  ]
})

// Generate rows with projections
const rows = computed(() => {
  // Access reactive prop to ensure recomputation
  const useSeasonal = props.useSeasonalDemand

  const result = []

  componentRows.value.forEach(comp => {
    const weeklyRate = comp.weeklyDemand
    const currentStock = props.inventory.components[comp.id]?.[comp.inventorySize] || 0
    const orderAmount = props.componentOrder?.[comp.id]?.[comp.inventorySize] || 0

    const projections = []
    let stock = currentStock

    const arrivalIndex = props.orderWeekOffset + ARRIVAL_WEEK

    for (let i = 0; i < WEEKS_TO_SHOW; i++) {
      // Get seasonal multiplier for this week
      const seasonalMultiplier = getSeasonalMultiplierForWeek(i)
      const adjustedRate = weeklyRate * seasonalMultiplier

      // Deplete for this week (can go negative for backorders)
      stock = stock - adjustedRate

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
        const qty = getOrderComponentQuantity(order, comp.id, comp.inventorySize)
        stock += qty
        addedThisWeek += qty
      }

      projections.push({
        week: i,
        stock: Math.round(stock),
        added: addedThisWeek,
        isCritical: stock < adjustedRate * 8
      })
    }

    result.push({
      component: comp.id,
      size: comp.inventorySize,
      label: comp.label,
      currentStock,
      orderAmount,
      weeklyRate: Math.round(weeklyRate * 10) / 10,
      projections
    })
  })

  return result
})

// Get cell background based on weeks of stock
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
      Component timeline
      <span class="text-sm font-normal text-zinc-500">({{ rows.length }} rows)</span>
    </h3>

    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="bg-surfaceHover">
            <th class="table-header sticky left-0 bg-surfaceHover z-10 min-w-[180px]">Component (Size)</th>
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
            :key="`${row.component}-${row.size}`"
            class="border-b border-border hover:bg-surfaceHover/30"
          >
            <td class="table-cell sticky left-0 bg-background z-10 w-[180px] font-medium text-xs">{{ row.label }}</td>
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
      Blue = overstock (&gt;30 weeks), Yellow = low stock (≤4 weeks), Red = depleted.
      Micro coils/Thin latex demand calculated directly from Cloud/Aurora/Cooper sales (Cloud=2 layers, Aurora=1, Cooper=0).
      King inventory = King + 0.5×Single. Queen inventory = Queen + Double + King Single.
      Side Panel Double = Double + King Single + Single.
    </p>
  </div>
</template>
