<script setup>
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
  microMultiplier: {
    type: Object,
    default: () => ({
      King: 0,
      Queen: 0,
      Double: 0,
      'King Single': 0,
      Single: 0
    })
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

// Generate week numbers for display
const weeks = computed(() => {
  const result = []
  const startWeek = props.currentWeek
  const monday = getCurrentMonday()

  for (let i = 0; i < WEEKS_TO_SHOW; i++) {
    let weekNum = startWeek + i
    if (weekNum > 52) weekNum -= 52

    const weekMonday = new Date(monday)
    weekMonday.setDate(monday.getDate() + (i * 7))

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

// Define all component inventory rows with their demand sources
const componentRows = computed(() => {
  const rates = props.usageRates.MONTHLY_SALES_RATE
  const microMult = props.microMultiplier

  // Helper to convert monthly to weekly
  const toWeekly = (monthly) => monthly / (30 / 7)

  return [
    // Micro Coils - King inventory (used by King + 0.5×Single)
    {
      id: 'micro_coils',
      inventorySize: 'King',
      label: 'Micro Coils (King)',
      monthlyDemand: (rates.King * microMult.King) + (rates.Single * 0.5 * microMult.Single)
    },
    // Micro Coils - Queen inventory (used by Queen + Double + King Single)
    {
      id: 'micro_coils',
      inventorySize: 'Queen',
      label: 'Micro Coils (Queen)',
      monthlyDemand: (rates.Queen * microMult.Queen) + (rates.Double * microMult.Double) + (rates['King Single'] * microMult['King Single'])
    },
    // Thin Latex - King inventory (used by King + 0.5×Single)
    {
      id: 'thin_latex',
      inventorySize: 'King',
      label: 'Thin Latex (King)',
      monthlyDemand: (rates.King * microMult.King) + (rates.Single * 0.5 * microMult.Single)
    },
    // Thin Latex - Queen inventory (used by Queen + Double + King Single)
    {
      id: 'thin_latex',
      inventorySize: 'Queen',
      label: 'Thin Latex (Queen)',
      monthlyDemand: (rates.Queen * microMult.Queen) + (rates.Double * microMult.Double) + (rates['King Single'] * microMult['King Single'])
    },
    // Felt - 1:1 with mattress sales by size
    { id: 'felt', inventorySize: 'King', label: 'Felt (King)', monthlyDemand: rates.King },
    { id: 'felt', inventorySize: 'Queen', label: 'Felt (Queen)', monthlyDemand: rates.Queen },
    { id: 'felt', inventorySize: 'Double', label: 'Felt (Double)', monthlyDemand: rates.Double },
    { id: 'felt', inventorySize: 'King Single', label: 'Felt (King Single)', monthlyDemand: rates['King Single'] },
    { id: 'felt', inventorySize: 'Single', label: 'Felt (Single)', monthlyDemand: rates.Single },
    // Top Panel - 1:1 with mattress sales by size
    { id: 'top_panel', inventorySize: 'King', label: 'Top Panel (King)', monthlyDemand: rates.King },
    { id: 'top_panel', inventorySize: 'Queen', label: 'Top Panel (Queen)', monthlyDemand: rates.Queen },
    { id: 'top_panel', inventorySize: 'Double', label: 'Top Panel (Double)', monthlyDemand: rates.Double },
    { id: 'top_panel', inventorySize: 'King Single', label: 'Top Panel (King Single)', monthlyDemand: rates['King Single'] },
    { id: 'top_panel', inventorySize: 'Single', label: 'Top Panel (Single)', monthlyDemand: rates.Single },
    // Bottom Panel - 1:1 with mattress sales by size
    { id: 'bottom_panel', inventorySize: 'King', label: 'Bottom Panel (King)', monthlyDemand: rates.King },
    { id: 'bottom_panel', inventorySize: 'Queen', label: 'Bottom Panel (Queen)', monthlyDemand: rates.Queen },
    { id: 'bottom_panel', inventorySize: 'Double', label: 'Bottom Panel (Double)', monthlyDemand: rates.Double },
    { id: 'bottom_panel', inventorySize: 'King Single', label: 'Bottom Panel (King Single)', monthlyDemand: rates['King Single'] },
    { id: 'bottom_panel', inventorySize: 'Single', label: 'Bottom Panel (Single)', monthlyDemand: rates.Single },
    // Side Panel - King (King only), Queen (Queen only), Double (Double + King Single + Single)
    { id: 'side_panel', inventorySize: 'King', label: 'Side Panel (King)', monthlyDemand: rates.King },
    { id: 'side_panel', inventorySize: 'Queen', label: 'Side Panel (Queen)', monthlyDemand: rates.Queen },
    { id: 'side_panel', inventorySize: 'Double', label: 'Side Panel (Double)', monthlyDemand: rates.Double + rates['King Single'] + rates.Single }
  ]
})

// Generate rows with projections
const rows = computed(() => {
  const result = []

  componentRows.value.forEach(comp => {
    const weeklyRate = comp.monthlyDemand / (30 / 7)
    const currentStock = props.inventory.components[comp.id]?.[comp.inventorySize] || 0
    const orderAmount = props.componentOrder?.[comp.id]?.[comp.inventorySize] || 0

    const projections = []
    let stock = currentStock

    const arrivalIndex = props.orderWeekOffset + ARRIVAL_WEEK

    for (let i = 0; i < WEEKS_TO_SHOW; i++) {
      stock = Math.max(0, stock - weeklyRate)

      if (i === arrivalIndex) {
        stock += orderAmount
      }

      projections.push({
        week: i,
        stock: Math.round(stock),
        isCritical: stock < weeklyRate * 8
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
      Component Timeline
      <span class="text-sm font-normal text-zinc-500">({{ rows.length }} rows)</span>
    </h3>

    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="bg-surfaceHover">
            <th class="table-header sticky left-0 bg-surfaceHover z-10 min-w-[180px]">Component (Size)</th>
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
            :key="`${row.component}-${row.size}`"
            class="border-b border-border hover:bg-surfaceHover/30"
          >
            <td class="table-cell sticky left-0 bg-background z-10 w-[180px] font-medium text-xs">{{ row.label }}</td>
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
      Blue = overstock (&gt;30 weeks), Yellow = low stock (≤4 weeks), Red = depleted.
      Demand based on inventory SKU mapping: Micro coils/Thin latex King = King + 0.5×Single (×model factor), Queen = Queen + Double + King Single (×model factor).
      Side Panel Double = Double + King Single + Single. Model factor: Cloud=2, Aurora=1, Cooper=0.
    </p>
  </div>
</template>
