<script setup>
import { calculateLatexOrder, convertOrdersForLatexAlgorithm } from '~/lib/algorithms/latexOrder.js'
import { LATEX_FIRMNESSES, LATEX_SIZES, CONTAINER_CAPACITY, LATEX_LEAD_TIME_WEEKS } from '~/lib/constants/index.js'

const sriLankaUIStore = useSriLankaUIStore()
const sriLankaOrdersStore = useSriLankaOrdersStore()
const sriLankaSettingsStore = useSriLankaSettingsStore()
const latexInventory = useLatexInventory()

// Usage rates from settings store
const usageRates = computed(() => sriLankaSettingsStore.latexSalesRates)

// Local order settings (independent of global settings)
const localContainerSize = ref('40ft')
const localOrderWeekOffset = ref(0)
const localDeliveryWeeks = ref(LATEX_LEAD_TIME_WEEKS)

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
const isEditing = computed(() => !!sriLankaUIStore.editingOrderId)

// Container capacity
const containerCapacity = computed(() => CONTAINER_CAPACITY[localContainerSize.value] || 340)

// Computed arrival week for timeline display
const arrivalWeekIndex = computed(() => localOrderWeekOffset.value + localDeliveryWeeks.value)

// Get the Monday of the current week
const getCurrentMonday = () => {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(now.getFullYear(), now.getMonth(), diff)
}

// Format date as "d Mon" (e.g., "2 Feb")
const formatShortDate = (date) => {
  const day = date.getDate()
  const month = date.toLocaleDateString('en-AU', { month: 'short' })
  return `${day} ${month}`
}

// Generate order week options with dates (-10 to +20 weeks)
const orderWeekOptions = computed(() => {
  const monday = getCurrentMonday()
  const options = []

  for (let i = -10; i <= 20; i++) {
    const weekMonday = new Date(monday)
    weekMonday.setDate(monday.getDate() + (i * 7))
    const dateStr = formatShortDate(weekMonday)

    const startOfYear = new Date(weekMonday.getFullYear(), 0, 1)
    const days = Math.floor((weekMonday - startOfYear) / (24 * 60 * 60 * 1000))
    const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7)

    let label
    if (i === 0) {
      label = `Now - ${dateStr}`
    } else if (i < 0) {
      label = `${i} weeks - ${dateStr}`
    } else {
      label = `W${weekNum} - ${dateStr}`
    }

    options.push({
      value: i,
      label
    })
  }

  return options
})

// Format date as YYYY-MM-DD in local timezone
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
  const orderDateObj = new Date(orderDateStr + 'T00:00:00')
  const arrival = new Date(orderDateObj)
  arrival.setDate(orderDateObj.getDate() + (deliveryWeeks * 7))
  return formatDateYMD(arrival)
}

// Convert pending orders to algorithm format (exclude the one we're editing)
const convertPendingOrdersForAlgorithm = () => {
  const orders = sriLankaOrdersStore.pendingOrders || []
  const filteredOrders = sriLankaUIStore.editingOrderId
    ? orders.filter(o => o.id !== sriLankaUIStore.editingOrderId)
    : orders

  return convertOrdersForLatexAlgorithm(filteredOrders)
}

// Convert latex order to SKU quantities map
const convertLatexOrderToSkuQuantities = (latexOrder) => {
  const quantities = {}
  if (!latexOrder?.latex) return quantities

  const skuIdMap = latexInventory.getSkuIdMap()

  for (const firmness of LATEX_FIRMNESSES) {
    for (const size of LATEX_SIZES) {
      const qty = latexOrder.latex[firmness]?.[size] || 0
      if (qty > 0) {
        const skuString = `latex${firmness}${size.toLowerCase()}`
        const skuId = skuIdMap[skuString]
        if (skuId) {
          quantities[skuId] = qty
        }
      }
    }
  }

  return quantities
}

// Convert SKU quantities back to latex order format (for draft preview)
const convertSkuQuantitiesToLatexOrder = () => {
  const latex = {
    firm: { King: 0, Queen: 0 },
    medium: { King: 0, Queen: 0 },
    soft: { King: 0, Queen: 0 }
  }

  const skuIdMap = latexInventory.getSkuIdMap()

  for (const firmness of LATEX_FIRMNESSES) {
    for (const size of LATEX_SIZES) {
      const skuString = `latex${firmness}${size.toLowerCase()}`
      const skuId = skuIdMap[skuString]
      if (skuId && skuQuantities.value[skuId]) {
        latex[firmness][size] = skuQuantities.value[skuId]
      }
    }
  }

  // Calculate total
  let total = 0
  for (const firmness of LATEX_FIRMNESSES) {
    for (const size of LATEX_SIZES) {
      total += latex[firmness][size]
    }
  }

  return {
    latex,
    metadata: {
      total_items: total,
      container_capacity: containerCapacity.value
    }
  }
}

// Compute order from local settings using algorithm
const computeOrderFromSettings = () => {
  if (!usageRates.value?.WEEKLY_TOTAL_BY_SIZE) return null

  const pendingOrders = convertPendingOrdersForAlgorithm()

  return calculateLatexOrder(
    containerCapacity.value,
    latexInventory.inventory.value,
    usageRates.value,
    pendingOrders,
    localOrderWeekOffset.value,
    localDeliveryWeeks.value
  )
}

// Update draft orders and SKU quantities from algorithm when settings change
const updateFromAlgorithm = async () => {
  if (isInitializing.value || isEditing.value) return

  await latexInventory.refresh()

  const latexOrder = computeOrderFromSettings()
  if (!latexOrder) return

  // Convert to SKU quantities
  skuQuantities.value = convertLatexOrderToSkuQuantities(latexOrder)

  // Update draft order for forecast preview
  sriLankaUIStore.setDraftOrder(latexOrder, arrivalWeekIndex.value)
}

// Watch local settings and update draft orders
watch(localContainerSize, () => {
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
  if (!sriLankaUIStore.orderPanelOpen || isInitializing.value) return

  const latexOrder = convertSkuQuantitiesToLatexOrder()
  sriLankaUIStore.setDraftOrder(latexOrder, arrivalWeekIndex.value)
}, { deep: true })

// Initialize with algorithm when creating new order
const initializeNewOrder = async () => {
  await latexInventory.refresh()

  const latexOrder = computeOrderFromSettings()
  if (!latexOrder) return

  skuQuantities.value = convertLatexOrderToSkuQuantities(latexOrder)
  sriLankaUIStore.setDraftOrder(latexOrder, arrivalWeekIndex.value)
}

// Initialize form with order data or defaults
const initForm = () => {
  isInitializing.value = true

  if (sriLankaUIStore.editingOrderId) {
    // Editing existing order
    const order = sriLankaOrdersStore.getOrderById(sriLankaUIStore.editingOrderId)
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

      // Set draft order for real-time preview
      latexInventory.refresh().then(() => {
        const latexOrder = convertSkuQuantitiesToLatexOrder()
        sriLankaUIStore.setDraftOrder(latexOrder, arrivalWeek)
      })

      nextTick(() => {
        isInitializing.value = false
      })
    }
  } else {
    // Creating new order - use algorithm
    localContainerSize.value = '40ft'
    localOrderWeekOffset.value = 0
    localDeliveryWeeks.value = LATEX_LEAD_TIME_WEEKS

    orderDate.value = getMondayForWeekOffset(0)
    expectedArrival.value = calculateExpectedArrivalFromWeeks(orderDate.value, localDeliveryWeeks.value)
    notes.value = ''
    ordered.value = false

    nextTick(() => {
      isInitializing.value = false
      initializeNewOrder()
    })
  }
}

// Watch for order date changes to recalculate arrival
watch(orderDate, (newDate) => {
  if (isInitializing.value) return
  if (!newDate) return
  if (!isEditing.value) {
    expectedArrival.value = calculateExpectedArrivalFromWeeks(newDate, localDeliveryWeeks.value)
  }
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
      result = await sriLankaOrdersStore.updateOrder(sriLankaUIStore.editingOrderId, orderData, skuItems)
    } else {
      result = await sriLankaOrdersStore.createOrder(orderData, skuItems)
    }

    if (result) {
      sriLankaUIStore.closeOrderPanel()
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
  sriLankaUIStore.closeOrderPanel()
}

// Initialize on mount
onMounted(() => {
  initForm()
})

// Re-initialize when panel opens or editingOrderId changes
watch(() => sriLankaUIStore.orderPanelOpen, (isOpen) => {
  if (isOpen) {
    initForm()
  }
})

watch(() => sriLankaUIStore.editingOrderId, () => {
  if (sriLankaUIStore.orderPanelOpen) {
    initForm()
  }
})

// Get SKU ID map from inventory composable
const skuIdMap = computed(() => latexInventory.getSkuIdMap())
const currentInventory = computed(() => latexInventory.inventory.value)
</script>

<template>
  <Transition name="slide">
    <aside
      v-if="sriLankaUIStore.orderPanelOpen"
      class="fixed right-0 top-0 h-screen w-[30rem] bg-[#0a0a0b] border-l border-border shadow-[-4px_0_15px_rgba(0,0,0,0.3)] z-40 flex flex-col"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-border bg-zinc-900/50 shrink-0">
        <h2 class="text-lg font-semibold text-orange-400">
          {{ isEditing ? 'Edit latex order' : 'New latex order' }}
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

          <!-- Container Size -->
          <div class="flex items-center justify-between">
            <label class="text-sm text-zinc-400">Container</label>
            <div class="flex gap-1 bg-zinc-700 rounded-lg p-0.5">
              <button
                @click="localContainerSize = '40ft'"
                :class="[
                  'px-3 py-1 text-sm rounded-md transition-colors',
                  localContainerSize === '40ft'
                    ? 'bg-orange-500 text-white'
                    : 'text-zinc-400 hover:text-zinc-50'
                ]"
              >
                40ft (340)
              </button>
              <button
                @click="localContainerSize = '20ft'"
                :class="[
                  'px-3 py-1 text-sm rounded-md transition-colors',
                  localContainerSize === '20ft'
                    ? 'bg-orange-500 text-white'
                    : 'text-zinc-400 hover:text-zinc-50'
                ]"
              >
                20ft (170)
              </button>
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
              placeholder="e.g., Soft latex priority"
              class="w-full px-3 py-2 bg-zinc-800 border border-border rounded-lg text-zinc-50 text-sm placeholder-zinc-500"
            />
          </div>

          <!-- Ordered Checkbox -->
          <div class="flex items-center">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="ordered"
                type="checkbox"
                class="w-4 h-4 rounded border-border bg-zinc-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-0"
              />
              <span class="text-sm text-zinc-300">Order placed with supplier</span>
            </label>
          </div>
        </div>

        <!-- SKU Picker -->
        <div class="border-t border-border pt-4">
          <h3 class="text-sm font-medium text-zinc-300 mb-4">Latex items</h3>
          <SrilankaLatexSkuPicker
            v-model="skuQuantities"
            :sku-id-map="skuIdMap"
            :current-inventory="currentInventory"
          />
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-border bg-zinc-900/50 shrink-0">
        <div class="text-sm text-zinc-400">
          Total: <span class="font-medium text-orange-400">{{ totalItems }}</span> / {{ containerCapacity }} items
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
                : 'bg-orange-500 hover:bg-orange-600 text-white'
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
