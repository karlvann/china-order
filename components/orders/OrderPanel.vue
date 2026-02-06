<script setup>
import { calculateDemandBasedOrder } from '~/lib/algorithms/demandBasedOrder.js'
import { calculateComponentOrder } from '~/lib/algorithms/componentCalc.js'
import { getCurrentMonday } from '~/lib/utils/index.js'

const uiStore = useUIStore()
const inventoryOrdersStore = useInventoryOrdersStore()
const inventoryStore = useInventoryStore()
const settingsStore = useSettingsStore()
const skuLookup = useSkuLookup()

// Props for usage rates (passed from parent via provide/inject or we get from settings)
const usageRates = computed(() => settingsStore.liveSalesRates)

// Local order settings (independent of global settingsStore)
const localPalletCount = ref(8)
const localOrderWeekOffset = ref(0)
const localDeliveryWeeks = ref(10)
const localComponentScale = ref(1.0)

// Form state
const orderDate = ref('')
const expectedArrival = ref('')
const notes = ref('')
const ordered = ref(false)
const skuQuantities = ref({})
const saving = ref(false)
const error = ref(null)
const isInitializing = ref(false)

// Is editing existing order
const isEditing = computed(() => !!uiStore.editingOrderId)

// Computed arrival week index from expected arrival date (for timeline display)
const arrivalWeekIndex = computed(() => {
  if (!expectedArrival.value) return localOrderWeekOffset.value + localDeliveryWeeks.value
  const monday = getCurrentMonday()
  const arrivalDate = new Date(expectedArrival.value)
  const diffMs = arrivalDate - monday
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
})

// Get today's date in YYYY-MM-DD format
const getTodayString = () => {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

// Convert component ID to SKU prefix
const componentIdToSkuPrefix = (compId) => {
  const mapping = {
    'micro_coils': 'microcoils',
    'thin_latex': 'thinlatex',
    'felt': 'felt',
    'top_panel': 'paneltop',
    'bottom_panel': 'panelbottom',
    'side_panel': 'panelside'
  }
  return mapping[compId] || compId
}

// Convert spring order to SKU quantities map
const convertSpringOrderToSkuQuantities = (springOrder) => {
  const quantities = {}
  if (!springOrder?.springs) return quantities

  const firmnesses = ['firm', 'medium', 'soft']
  const sizes = ['King', 'Queen', 'Double', 'King Single', 'Single']

  for (const firmness of firmnesses) {
    for (const size of sizes) {
      const qty = springOrder.springs[firmness]?.[size] || 0
      if (qty > 0) {
        const skuString = `springs${firmness}${size.toLowerCase().replace(' ', '')}`
        const skuData = skuLookup.getSkuData(skuString)
        if (skuData?.id) {
          quantities[skuData.id] = qty
        }
      }
    }
  }

  return quantities
}

// Convert component order to SKU quantities map
const convertComponentOrderToSkuQuantities = (componentOrder) => {
  const quantities = {}
  if (!componentOrder) return quantities

  const sizes = ['King', 'Queen', 'Double', 'King Single', 'Single']
  const componentIds = ['micro_coils', 'thin_latex', 'felt', 'top_panel', 'bottom_panel', 'side_panel']

  for (const compId of componentIds) {
    for (const size of sizes) {
      const qty = componentOrder[compId]?.[size] || 0
      if (qty > 0) {
        const skuPrefix = componentIdToSkuPrefix(compId)
        const skuString = `${skuPrefix}${size.toLowerCase().replace(' ', '')}`
        const skuData = skuLookup.getSkuData(skuString)
        if (skuData?.id) {
          quantities[skuData.id] = qty
        }
      }
    }
  }

  return quantities
}

// Convert SKU quantities back to spring order format (for draft preview)
const convertSkuQuantitiesToSpringOrder = () => {
  const springs = {
    firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    medium: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
    soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
  }

  const firmnesses = ['firm', 'medium', 'soft']
  const sizes = ['King', 'Queen', 'Double', 'King Single', 'Single']

  for (const firmness of firmnesses) {
    for (const size of sizes) {
      const skuString = `springs${firmness}${size.toLowerCase().replace(' ', '')}`
      const skuData = skuLookup.getSkuData(skuString)
      if (skuData?.id && skuQuantities.value[skuData.id]) {
        springs[firmness][size] = skuQuantities.value[skuData.id]
      }
    }
  }

  // Calculate totals
  let totalSprings = 0
  for (const firmness of firmnesses) {
    for (const size of sizes) {
      totalSprings += springs[firmness][size]
    }
  }

  return {
    springs,
    metadata: {
      total_springs: totalSprings,
      total_pallets: Math.ceil(totalSprings / 30)
    }
  }
}

// Convert SKU quantities back to component order format (for draft preview)
const convertSkuQuantitiesToComponentOrder = () => {
  const skuPrefixToComponentId = {
    'microcoils': 'micro_coils',
    'thinlatex': 'thin_latex',
    'felt': 'felt',
    'paneltop': 'top_panel',
    'panelbottom': 'bottom_panel',
    'panelside': 'side_panel'
  }

  const componentOrder = {}
  const componentIds = ['micro_coils', 'thin_latex', 'felt', 'top_panel', 'bottom_panel', 'side_panel']
  const sizes = ['King', 'Queen', 'Double', 'King Single', 'Single']

  // Initialize all to 0
  for (const compId of componentIds) {
    componentOrder[compId] = {}
    for (const size of sizes) {
      componentOrder[compId][size] = 0
    }
  }

  // Fill from SKU quantities
  for (const [skuPrefix, compId] of Object.entries(skuPrefixToComponentId)) {
    for (const size of sizes) {
      const skuString = `${skuPrefix}${size.toLowerCase().replace(' ', '')}`
      const skuData = skuLookup.getSkuData(skuString)
      if (skuData?.id && skuQuantities.value[skuData.id]) {
        componentOrder[compId][size] = skuQuantities.value[skuData.id]
      }
    }
  }

  return componentOrder
}


// Format date as "d Mon" (e.g., "2 Feb")
const formatShortDate = (date) => {
  const day = date.getDate()
  const month = date.toLocaleDateString('en-AU', { month: 'short' })
  return `${day} ${month}`
}

// Generate order week options with dates
const orderWeekOptions = computed(() => {
  const monday = getCurrentMonday()
  const options = []

  for (let i = 0; i <= 20; i++) {
    const weekMonday = new Date(monday)
    weekMonday.setDate(monday.getDate() + (i * 7))
    const dateStr = formatShortDate(weekMonday)

    // Calculate week number
    const startOfYear = new Date(weekMonday.getFullYear(), 0, 1)
    const days = Math.floor((weekMonday - startOfYear) / (24 * 60 * 60 * 1000))
    const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7)

    options.push({
      value: i,
      label: i === 0 ? `Now - ${dateStr}` : `W${weekNum} - ${dateStr}`
    })
  }

  return options
})

// Format date as YYYY-MM-DD in local timezone (not UTC)
const formatDateYMD = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Get Monday date for a given week offset
const getMondayForWeekOffset = (offset) => {
  const monday = getCurrentMonday()
  const targetMonday = new Date(monday)
  targetMonday.setDate(monday.getDate() + (offset * 7))
  return formatDateYMD(targetMonday)
}

// Calculate expected arrival from order date and delivery weeks
const calculateExpectedArrivalFromWeeks = (orderDateStr, deliveryWeeks) => {
  const orderDate = new Date(orderDateStr)
  const arrival = new Date(orderDate)
  arrival.setDate(orderDate.getDate() + (deliveryWeeks * 7))
  return formatDateYMD(arrival)
}

// Convert pending orders to algorithm format (exclude the one we're editing)
const convertPendingOrdersForAlgorithm = () => {
  const monday = getCurrentMonday()
  const orders = inventoryOrdersStore.pendingOrders || []
  const filteredOrders = uiStore.editingOrderId
    ? orders.filter(o => o.id !== uiStore.editingOrderId)
    : orders

  return filteredOrders.map(order => {
    const arrivalDate = new Date(order.expected_arrival)
    const diffMs = arrivalDate - monday
    const arrivalWeekIndex = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))

    const springsByFirmness = {
      firm: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
      medium: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
      soft: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
    }

    if (order.skus) {
      for (const item of order.skus) {
        const sku = item.skus_id?.sku || ''
        const qty = item.quantity || 0
        if (sku.startsWith('springs')) {
          let firmness = null
          if (sku.includes('firm')) firmness = 'firm'
          else if (sku.includes('medium')) firmness = 'medium'
          else if (sku.includes('soft')) firmness = 'soft'
          if (!firmness) continue

          if (sku.includes('king') && !sku.includes('kingsingle')) springsByFirmness[firmness].King += qty
          else if (sku.includes('queen')) springsByFirmness[firmness].Queen += qty
          else if (sku.includes('double')) springsByFirmness[firmness].Double += qty
          else if (sku.includes('kingsingle')) springsByFirmness[firmness]['King Single'] += qty
          else if (sku.includes('single')) springsByFirmness[firmness].Single += qty
        }
      }
    }
    return { arrivalWeekIndex, springsByFirmness }
  })
}

// Convert pending orders to component algorithm format
const convertPendingOrdersForComponentAlgorithm = () => {
  const monday = getCurrentMonday()
  const orders = inventoryOrdersStore.pendingOrders || []
  const filteredOrders = uiStore.editingOrderId
    ? orders.filter(o => o.id !== uiStore.editingOrderId)
    : orders

  const componentPrefixes = {
    microcoils: 'micro_coils',
    thinlatex: 'thin_latex',
    felt: 'felt',
    paneltop: 'top_panel',
    panelbottom: 'bottom_panel',
    panelside: 'side_panel'
  }

  return filteredOrders.map(order => {
    const arrivalDate = new Date(order.expected_arrival)
    const diffMs = arrivalDate - monday
    const arrivalWeekIndex = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))

    const components = {
      micro_coils: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
      thin_latex: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
      felt: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
      top_panel: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
      bottom_panel: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 },
      side_panel: { King: 0, Queen: 0, Double: 0, 'King Single': 0, Single: 0 }
    }

    if (order.skus) {
      for (const item of order.skus) {
        const sku = item.skus_id?.sku || ''
        const qty = item.quantity || 0
        if (sku.startsWith('springs')) continue

        let compType = null
        for (const [prefix, type] of Object.entries(componentPrefixes)) {
          if (sku.startsWith(prefix)) { compType = type; break }
        }
        if (!compType) continue

        if (sku.includes('king') && !sku.includes('kingsingle')) components[compType].King += qty
        else if (sku.includes('queen')) components[compType].Queen += qty
        else if (sku.includes('double')) components[compType].Double += qty
        else if (sku.includes('kingsingle')) components[compType]['King Single'] += qty
        else if (sku.includes('single')) components[compType].Single += qty
      }
    }
    return { arrivalWeekIndex, components }
  })
}

// Compute order from local settings using algorithms
const computeOrderFromSettings = () => {
  if (!usageRates.value?.WEEKLY_SALES_RATE) return { springOrder: null, componentOrder: null }

  const pendingOrders = convertPendingOrdersForAlgorithm()

  const springOrder = calculateDemandBasedOrder(
    localPalletCount.value,
    inventoryStore.fullInventory,
    usageRates.value,
    pendingOrders,
    localOrderWeekOffset.value
  )

  const pendingComponentOrders = convertPendingOrdersForComponentAlgorithm()

  const componentOrder = calculateComponentOrder(
    springOrder,
    inventoryStore.springs,
    inventoryStore.components,
    usageRates.value,
    pendingComponentOrders,
    localOrderWeekOffset.value,
    localDeliveryWeeks.value,
    localPalletCount.value,
    localComponentScale.value
  )

  return { springOrder, componentOrder }
}

// Update draft orders and SKU quantities from algorithm when settings change
const updateFromAlgorithm = async () => {
  if (isInitializing.value || isEditing.value) return

  await skuLookup.fetchSkus()

  const { springOrder, componentOrder } = computeOrderFromSettings()
  if (!springOrder) return

  // Convert to SKU quantities
  const quantities = {}
  Object.assign(quantities, convertSpringOrderToSkuQuantities(springOrder))
  Object.assign(quantities, convertComponentOrderToSkuQuantities(componentOrder))

  skuQuantities.value = quantities

  // Update draft orders for forecast preview
  uiStore.setDraftOrders(springOrder, componentOrder, arrivalWeekIndex.value)
}

// Watch local settings and update draft orders
watch([localPalletCount, localComponentScale], () => {
  updateFromAlgorithm()
})

// Watch order week offset - update order date and recalculate
watch(localOrderWeekOffset, (offset) => {
  if (isInitializing.value || isEditing.value) return
  orderDate.value = getMondayForWeekOffset(offset)
  expectedArrival.value = calculateExpectedArrivalFromWeeks(orderDate.value, localDeliveryWeeks.value)
  updateFromAlgorithm()
})

// Watch delivery weeks - update expected arrival and recalculate
watch(localDeliveryWeeks, (weeks) => {
  if (isInitializing.value || isEditing.value) return
  expectedArrival.value = calculateExpectedArrivalFromWeeks(orderDate.value, weeks)
  updateFromAlgorithm()
})

// Update draft orders in store whenever SKU quantities change (manual edits)
watch(skuQuantities, () => {
  if (!uiStore.orderPanelOpen || isInitializing.value) return

  const springOrder = convertSkuQuantitiesToSpringOrder()
  const componentOrder = convertSkuQuantitiesToComponentOrder()
  uiStore.setDraftOrders(springOrder, componentOrder, arrivalWeekIndex.value)
}, { deep: true })

// Initialize with algorithm when creating new order
const initializeNewOrder = async () => {
  await skuLookup.fetchSkus()

  const { springOrder, componentOrder } = computeOrderFromSettings()
  if (!springOrder) return

  // Convert to SKU quantities
  const quantities = {}
  Object.assign(quantities, convertSpringOrderToSkuQuantities(springOrder))
  Object.assign(quantities, convertComponentOrderToSkuQuantities(componentOrder))

  skuQuantities.value = quantities

  // Set initial draft orders for real-time preview
  uiStore.setDraftOrders(springOrder, componentOrder, arrivalWeekIndex.value)
}

// Initialize form with order data or defaults
const initForm = () => {
  isInitializing.value = true

  if (uiStore.editingOrderId) {
    // Editing existing order
    const order = inventoryOrdersStore.getOrderById(uiStore.editingOrderId)
    if (order) {
      orderDate.value = order.order_date
      expectedArrival.value = order.expected_arrival
      notes.value = order.notes || ''
      ordered.value = order.ordered || false

      // Calculate arrival week from expected arrival date
      const arrivalDate = new Date(order.expected_arrival)
      const now = new Date()
      const monday = new Date(now)
      monday.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
      const diffMs = arrivalDate - monday
      const arrivalWeek = Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)))

      // Convert order SKUs to quantity map
      const quantities = {}
      if (order.skus) {
        order.skus.forEach(item => {
          if (item.skus_id?.id && item.quantity > 0) {
            quantities[item.skus_id.id] = item.quantity
          }
        })
      }
      skuQuantities.value = quantities

      // Set draft orders for real-time preview (ensure SKUs loaded first)
      skuLookup.fetchSkus().then(() => {
        const springOrder = convertSkuQuantitiesToSpringOrder()
        const componentOrder = convertSkuQuantitiesToComponentOrder()
        uiStore.setDraftOrders(springOrder, componentOrder, arrivalWeek)
      })

      // Mark initialization complete
      nextTick(() => {
        isInitializing.value = false
      })
    }
  } else {
    // Creating new order - use algorithm
    // Reset local settings to defaults
    localPalletCount.value = 8
    localOrderWeekOffset.value = 0
    localDeliveryWeeks.value = 10
    localComponentScale.value = 1.0

    // Set dates based on order week (Now = current Monday)
    orderDate.value = getMondayForWeekOffset(0)
    expectedArrival.value = calculateExpectedArrivalFromWeeks(orderDate.value, localDeliveryWeeks.value)
    notes.value = ''
    ordered.value = false

    // Initialize with algorithm-generated order
    nextTick(() => {
      isInitializing.value = false
      initializeNewOrder()
    })
  }
}

// Watch for order date changes to recalculate arrival (new orders only)
watch(orderDate, (newDate) => {
  if (isInitializing.value) return
  if (!newDate) return
  if (!isEditing.value) {
    // New order: use local delivery weeks
    expectedArrival.value = calculateExpectedArrivalFromWeeks(newDate, localDeliveryWeeks.value)
  }
})

// Watch for expected arrival changes to update draft orders (when user edits date directly)
watch(expectedArrival, () => {
  if (isInitializing.value || !uiStore.orderPanelOpen) return
  const springOrder = convertSkuQuantitiesToSpringOrder()
  const componentOrder = convertSkuQuantitiesToComponentOrder()
  uiStore.setDraftOrders(springOrder, componentOrder, arrivalWeekIndex.value)
})

// Total items count
const totalItems = computed(() => {
  return Object.values(skuQuantities.value).reduce((sum, qty) => sum + (qty || 0), 0)
})

// Convert quantities map to API format
const getSkuItemsForApi = () => {
  return Object.entries(skuQuantities.value)
    .filter(([id, qty]) => qty > 0)
    .map(([id, qty]) => ({
      skus_id: parseInt(id),
      quantity: qty
    }))
}

// Save order
const handleSave = async () => {
  saving.value = true
  error.value = null

  try {
    const orderData = {
      order_date: orderDate.value,
      expected_arrival: expectedArrival.value,
      notes: notes.value,
      ordered: ordered.value
    }

    const skuItems = getSkuItemsForApi()

    let result
    if (isEditing.value) {
      result = await inventoryOrdersStore.updateOrder(uiStore.editingOrderId, orderData, skuItems)
    } else {
      result = await inventoryOrdersStore.createOrder(orderData, skuItems)
    }

    if (result) {
      uiStore.closeOrderPanel()
    } else {
      error.value = 'Failed to save order'
    }
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

// Close panel
const handleClose = () => {
  uiStore.closeOrderPanel()
}

// Initialize on mount
onMounted(() => {
  initForm()
})

// Re-initialize when panel opens or editingOrderId changes
watch(() => uiStore.orderPanelOpen, (isOpen) => {
  if (isOpen) {
    initForm()
  }
})

watch(() => uiStore.editingOrderId, () => {
  if (uiStore.orderPanelOpen) {
    initForm()
  }
})
</script>

<template>
  <Transition name="slide">
    <aside
      v-if="uiStore.orderPanelOpen"
      class="fixed right-0 top-0 h-screen w-[30rem] bg-[#0a0a0b] border-l border-border shadow-[-4px_0_15px_rgba(0,0,0,0.3)] z-40 flex flex-col"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-border bg-zinc-900/50 shrink-0">
        <h2 class="text-lg font-semibold text-zinc-50">
          {{ isEditing ? 'Edit order' : 'New order' }}
        </h2>
        <button
          @click="handleClose"
          class="text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-4 scrollbar-hide">
        <!-- Error -->
        <div v-if="error" class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {{ error }}
        </div>

        <!-- Order Settings (only for new orders) -->
        <div v-if="!isEditing" class="mb-6 p-3 bg-zinc-800/50 rounded-lg space-y-4">
          <h3 class="text-sm font-medium text-zinc-300">Order settings</h3>

          <!-- Pallet Count -->
          <div class="flex items-center justify-between">
            <label class="text-sm text-zinc-400">Pallets</label>
            <div class="flex items-center gap-2">
              <button
                @click="localPalletCount = Math.max(0, localPalletCount - 1)"
                :disabled="localPalletCount <= 0"
                :class="[
                  'w-7 h-7 flex items-center justify-center rounded text-sm font-bold transition-colors',
                  localPalletCount <= 0
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-50'
                ]"
              >
                −
              </button>
              <span class="w-8 text-center text-zinc-50 font-medium text-sm">{{ localPalletCount }}</span>
              <button
                @click="localPalletCount = Math.min(12, localPalletCount + 1)"
                :disabled="localPalletCount >= 12"
                :class="[
                  'w-7 h-7 flex items-center justify-center rounded text-sm font-bold transition-colors',
                  localPalletCount >= 12
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-50'
                ]"
              >
                +
              </button>
              <span class="text-xs text-zinc-500 ml-1">({{ localPalletCount * 30 }})</span>
            </div>
          </div>

          <!-- Order Week -->
          <div class="flex items-center justify-between">
            <label class="text-sm text-zinc-400">Order week</label>
            <select
              v-model="localOrderWeekOffset"
              class="py-1.5 px-2 bg-zinc-700 border border-zinc-600 rounded text-zinc-50 text-sm"
            >
              <option v-for="opt in orderWeekOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <!-- Delivery Weeks -->
          <div class="flex items-center justify-between">
            <label class="text-sm text-zinc-400">Delivery weeks</label>
            <select
              v-model="localDeliveryWeeks"
              class="py-1.5 px-2 bg-zinc-700 border border-zinc-600 rounded text-zinc-50 text-sm"
            >
              <option v-for="n in 15" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>

          <!-- Component Scale -->
          <div class="flex items-center justify-between">
            <label class="text-sm text-zinc-400">
              Component adjust
              <span class="text-zinc-500 ml-1">{{ localComponentScale.toFixed(1) }}×</span>
            </label>
            <div class="flex items-center gap-2">
              <input
                type="range"
                min="0.3"
                max="2"
                step="0.1"
                v-model.number="localComponentScale"
                class="w-20 h-1.5 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-brand"
              />
              <button
                v-if="localComponentScale !== 1"
                @click="localComponentScale = 1"
                class="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <!-- Form Fields -->
        <div class="space-y-4 mb-6">
          <!-- Order Date -->
          <div>
            <label class="block text-sm font-medium text-zinc-300 mb-1">Order date</label>
            <input
              v-model="orderDate"
              type="date"
              class="w-full px-3 py-2 bg-zinc-800 border border-border rounded-lg text-zinc-50 text-sm"
            />
          </div>

          <!-- Expected Arrival -->
          <div>
            <label class="block text-sm font-medium text-zinc-300 mb-1">Expected arrival</label>
            <input
              v-model="expectedArrival"
              type="date"
              class="w-full px-3 py-2 bg-zinc-800 border border-border rounded-lg text-zinc-50 text-sm"
            />
            <p class="text-xs text-zinc-500 mt-1">Auto-calculated, can be adjusted</p>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-zinc-300 mb-1">Notes</label>
            <input
              v-model="notes"
              type="text"
              placeholder="e.g., Emergency King order"
              class="w-full px-3 py-2 bg-zinc-800 border border-border rounded-lg text-zinc-50 text-sm placeholder-zinc-500"
            />
          </div>

          <!-- Ordered Checkbox -->
          <div class="flex items-center">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="ordered"
                type="checkbox"
                class="w-4 h-4 rounded border-border bg-zinc-800 text-brand focus:ring-brand focus:ring-offset-0"
              />
              <span class="text-sm text-zinc-300">Order placed with supplier</span>
            </label>
          </div>
        </div>

        <!-- SKU Picker -->
        <div class="border-t border-border pt-4">
          <h3 class="text-sm font-medium text-zinc-300 mb-4">Order items</h3>
          <OrdersOrderSkuPicker
            v-model="skuQuantities"
            :sku-lookup="skuLookup"
          />
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-border bg-zinc-900/50 shrink-0">
        <div class="text-sm text-zinc-400">
          Total: <span class="font-medium text-zinc-50">{{ totalItems }}</span> items
        </div>
        <div class="flex gap-3">
          <button
            @click="handleClose"
            class="px-3 py-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="handleSave"
            :disabled="saving || totalItems === 0"
            :class="[
              'px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors',
              saving || totalItems === 0
                ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                : 'bg-brand hover:bg-brand-hover text-white'
            ]"
          >
            {{ saving ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
          </button>
        </div>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.2s ease-out;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
